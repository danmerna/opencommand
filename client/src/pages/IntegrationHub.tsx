import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Users, Mail, BarChart3, Kanban, CreditCard, MessageSquare, Inbox, ShoppingCart,
  Plug, Unplug, RefreshCw, Loader2, CheckCircle2, XCircle, AlertTriangle, Zap,
  ArrowRight, Shield, Layers, Globe, ExternalLink, Eye, Clock, Sparkles, Send,
  TrendingUp,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  crm: <Users size={16} />, email_marketing: <Mail size={16} />, analytics: <BarChart3 size={16} />,
  project_mgmt: <Kanban size={16} />, payments: <CreditCard size={16} />, communication: <MessageSquare size={16} />,
  personal_email: <Inbox size={16} />, ecommerce: <ShoppingCart size={16} />, digital_ads: <Zap size={16} />,
  paid_ads: <TrendingUp size={16} />,
};

// ─── Provider Availability Tiers ─────────────────────────────────────────────
// LIVE: OAuth fully configured and credentials set — real connection works
// COMING_SOON: OAuth code exists but credentials not yet configured
// PLANNED: Seeded in DB but no OAuth implementation at all

const LIVE_PROVIDERS = new Set(["hubspot"]);

const COMING_SOON_PROVIDERS = new Set([
  "salesforce", "google_ads", "ga4", "meta_ads", "tiktok_ads",
]);

// Everything else in the DB is PLANNED
const OAUTH2_PROVIDERS = ["hubspot", "mailchimp", "slack", "stripe_connect", "salesforce", "meta_ads", "google_ads", "tiktok_ads", "ga4"];
const NANGO_PROVIDERS = ["salesforce"];

type ProviderTier = "live" | "coming_soon" | "planned";

function getProviderTier(slug: string): ProviderTier {
  if (LIVE_PROVIDERS.has(slug)) return "live";
  if (COMING_SOON_PROVIDERS.has(slug)) return "coming_soon";
  return "planned";
}

const TIER_CONFIG: Record<ProviderTier, { label: string; color: string; borderColor: string; bgColor: string; icon: React.ReactNode }> = {
  live: { label: "Live", color: "text-emerald-400", borderColor: "border-emerald-500/30", bgColor: "bg-emerald-500/10", icon: <CheckCircle2 size={10} className="text-emerald-400" /> },
  coming_soon: { label: "Coming Soon", color: "text-amber-400", borderColor: "border-amber-500/30", bgColor: "bg-amber-500/10", icon: <Clock size={10} className="text-amber-400" /> },
  planned: { label: "Planned", color: "text-muted-foreground", borderColor: "border-border", bgColor: "bg-secondary", icon: <Sparkles size={10} className="text-muted-foreground" /> },
};

type Tab = "overview" | "connections" | "abstraction";

export default function IntegrationHub() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestProvider, setRequestProvider] = useState<string>("");
  const [requestEmail, setRequestEmail] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [previewData, setPreviewData] = useState<Record<number, any>>({});
  const [previewLoading, setPreviewLoading] = useState<Record<number, boolean>>({});

  const categoriesQuery = trpc.hub.categories.useQuery();
  const providersQuery = trpc.hub.providers.useQuery();
  const connectionsQuery = trpc.hub.connections.useQuery(undefined, { enabled: isAuthenticated });

  const seedMutation = trpc.hub.seedDefaults.useMutation({
    onSuccess: () => { categoriesQuery.refetch(); providersQuery.refetch(); toast.success("Seeded categories and providers"); },
  });
  const disconnectMutation = trpc.hub.disconnect.useMutation({
    onSuccess: () => { connectionsQuery.refetch(); toast.success("Tool disconnected"); },
  });

  const categories = categoriesQuery.data ?? [];
  const providers = providersQuery.data ?? [];
  const connections = connectionsQuery.data ?? [];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const account = params.get("account");
    const error = params.get("error");
    if (connected) { toast.success(`${account ?? connected} connected via OAuth`); connectionsQuery.refetch(); window.history.replaceState({}, "", window.location.pathname); }
    if (error) { toast.error(error); window.history.replaceState({}, "", window.location.pathname); }
  }, []);

  const connectedCategoryIds = useMemo(() => Array.from(new Set(connections.filter(c => c.status === "connected").map(c => c.categoryId))), [connections]);
  const providersByCategory = useMemo(() => {
    const map: Record<number, typeof providers> = {};
    for (const p of providers) { if (!map[p.categoryId]) map[p.categoryId] = []; map[p.categoryId].push(p); }
    return map;
  }, [providers]);

  // Sort providers: live first, then coming_soon, then planned
  const sortedProviders = useMemo(() => {
    const tierOrder: Record<ProviderTier, number> = { live: 0, coming_soon: 1, planned: 2 };
    return [...providers].sort((a, b) => tierOrder[getProviderTier(a.slug)] - tierOrder[getProviderTier(b.slug)]);
  }, [providers]);

  const liveProviders = useMemo(() => sortedProviders.filter(p => getProviderTier(p.slug) === "live"), [sortedProviders]);
  const comingSoonProviders = useMemo(() => sortedProviders.filter(p => getProviderTier(p.slug) === "coming_soon"), [sortedProviders]);
  const plannedProviders = useMemo(() => sortedProviders.filter(p => getProviderTier(p.slug) === "planned"), [sortedProviders]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
        <Plug size={32} className="text-muted-foreground opacity-50" />
        <h1 className="text-2xl font-light text-foreground">Integration Hub</h1>
        <p className="text-muted-foreground text-sm">Connect your tools to power the Self-Contextualizing Engine.</p>
        <a href={getLoginUrl()}><Button>Sign In</Button></a>
      </div>
    );
  }

  const handleOAuthConnect = async (provider: any) => {
    const tier = getProviderTier(provider.slug);
    if (tier !== "live") {
      toast.info(`${provider.name} integration is ${tier === "coming_soon" ? "coming soon" : "planned"}. We'll notify you when it's available.`);
      setRequestProvider(provider.name);
      setRequestDialogOpen(true);
      return;
    }

    const origin = window.location.origin;

    if (NANGO_PROVIDERS.includes(provider.slug)) {
      try {
        const res = await fetch("/api/nango/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: provider.slug, userId: user?.id, origin }),
        });
        const data = await res.json();
        if (!res.ok || !data.connectUrl) {
          toast.error(data.error ?? "Failed to start connection session");
          return;
        }
        const popup = window.open(data.connectUrl, "nango-connect", "width=600,height=700,scrollbars=yes");
        if (!popup) { window.location.href = data.connectUrl; }
        const timer = setInterval(() => {
          if (popup?.closed) { clearInterval(timer); connectionsQuery.refetch(); toast.success(`${provider.name} connection updated`); }
        }, 1000);
      } catch (err: any) {
        toast.error(`Failed to connect ${provider.name}: ${err.message}`);
      }
      return;
    }

    window.location.href = `/api/integration/oauth/start?provider=${encodeURIComponent(provider.slug)}&userId=${user?.id}&origin=${encodeURIComponent(origin)}`;
  };

  const handleConnect = (provider: any) => {
    const tier = getProviderTier(provider.slug);
    if (tier !== "live") {
      toast.info(`${provider.name} integration is ${tier === "coming_soon" ? "coming soon" : "planned"}.`);
      setRequestProvider(provider.name);
      setRequestDialogOpen(true);
      return;
    }
    if (OAUTH2_PROVIDERS.includes(provider.slug)) {
      handleOAuthConnect(provider);
    } else {
      toast.info("Feature coming soon");
    }
  };

  const requestMutation = trpc.hub.requestIntegration.useMutation({
    onSuccess: () => {
      toast.success(`Request submitted for ${requestProvider}. We'll notify you when it's available.`);
      setRequestDialogOpen(false);
      setRequestEmail("");
      setRequestNote("");
      setRequestProvider("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleRequestSubmit = () => {
    requestMutation.mutate({
      providerName: requestProvider,
      email: requestEmail || undefined,
      note: requestNote || undefined,
    });
  };

  const fetchPreview = async (conn: any) => {
    setPreviewLoading(prev => ({ ...prev, [conn.id]: true }));
    try {
      const res = await fetch(`/api/integration/oauth/preview?connectionId=${conn.id}&userId=${user?.id}`);
      const data = await res.json();
      setPreviewData(prev => ({ ...prev, [conn.id]: data.preview }));
    } catch { setPreviewData(prev => ({ ...prev, [conn.id]: { error: "Preview unavailable" } })); }
    finally { setPreviewLoading(prev => ({ ...prev, [conn.id]: false })); }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "connections", label: `My Connections (${connections.filter(c => c.status === "connected").length})` },
    { id: "abstraction", label: "Abstraction Layer" },
  ];

  const ProviderCard = ({ provider, size = "normal" }: { provider: any; size?: "normal" | "compact" }) => {
    const tier = getProviderTier(provider.slug);
    const tierCfg = TIER_CONFIG[tier];
    const conn = connections.find(c => c.providerId === provider.id && c.status === "connected");
    const isCompact = size === "compact";

    return (
      <div className={`card-minimal p-${isCompact ? "3" : "4"} transition-all ${conn ? "border-emerald-500/20 bg-emerald-500/[0.02]" : tier === "planned" ? "opacity-60" : ""}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium text-foreground ${tier === "planned" ? "opacity-70" : ""}`}>{provider.name}</span>
            {conn ? (
              <span className="text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 rounded-full flex items-center gap-0.5">
                <CheckCircle2 size={8} /> Connected
              </span>
            ) : (
              <span className={`text-[10px] ${tierCfg.color} border ${tierCfg.borderColor} ${tierCfg.bgColor} px-1.5 py-0 rounded-full flex items-center gap-0.5`}>
                {tierCfg.icon} {tierCfg.label}
              </span>
            )}
          </div>
        </div>
        {!isCompact && <p className="text-muted-foreground text-xs mb-3">{provider.description}</p>}
        {conn ? (
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 text-xs">{conn.accountName ?? "Connected"}</span>
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={e => { e.stopPropagation(); disconnectMutation.mutate({ connectionId: conn.id }); }}>
              <Unplug size={10} className="mr-1" /> Disconnect
            </Button>
          </div>
        ) : tier === "live" ? (
          <Button size="sm" className="text-xs h-7 w-full gap-1" onClick={e => { e.stopPropagation(); handleConnect(provider); }}>
            <ExternalLink size={10} /> Connect with OAuth
          </Button>
        ) : tier === "coming_soon" ? (
          <Button size="sm" variant="outline" className="text-xs h-7 w-full gap-1 border-amber-500/20 text-amber-400 hover:text-amber-300 hover:bg-amber-500/5" onClick={e => { e.stopPropagation(); setRequestProvider(provider.name); setRequestDialogOpen(true); }}>
            <Clock size={10} /> Notify Me
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="text-xs h-7 w-full gap-1 opacity-50" onClick={e => { e.stopPropagation(); setRequestProvider(provider.name); setRequestDialogOpen(true); }}>
            <Sparkles size={10} /> Request Access
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">OpenCommand</p>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-light text-foreground tracking-tight">Integration Hub</h1>
            <p className="text-muted-foreground text-sm mt-2 max-w-xl">Tool Abstraction Layer — connect any tool, agents speak one language.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-400" /> {liveProviders.length} live</span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1"><Clock size={10} className="text-amber-400" /> {comingSoonProviders.length} coming soon</span>
              <span className="text-border">|</span>
              <span>{plannedProviders.length} planned</span>
            </div>
            {categories.length === 0 && (
              <Button size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} className="gap-1.5">
                {seedMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} Seed Defaults
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Overview Tab ─── */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Live Integrations */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-lg font-medium text-foreground">Live Integrations</h2>
              <span className="text-xs text-muted-foreground">Ready to connect now</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {liveProviders.map(provider => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
            {liveProviders.length === 0 && (
              <div className="card-minimal p-6 text-center text-muted-foreground text-sm">
                No live integrations yet. Seed defaults to get started.
              </div>
            )}
          </section>

          {/* Coming Soon */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} className="text-amber-400" />
              <h2 className="text-lg font-medium text-foreground">Coming Soon</h2>
              <span className="text-xs text-muted-foreground">OAuth configured, credentials pending</span>
            </div>
            <p className="text-muted-foreground text-xs mb-4">
              These integrations have full OAuth2 support built in. They'll go live once API credentials are configured. Click "Notify Me" to get alerted when they're ready.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {comingSoonProviders.map(provider => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          </section>

          {/* Planned */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={14} className="text-muted-foreground" />
              <h2 className="text-lg font-medium text-foreground">Planned Integrations</h2>
              <span className="text-xs text-muted-foreground">On the roadmap</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {plannedProviders.map(provider => (
                <ProviderCard key={provider.id} provider={provider} size="compact" />
              ))}
            </div>
          </section>

          {/* Category Grid */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Layers size={14} className="text-muted-foreground" />
              <h2 className="text-lg font-medium text-foreground">By Category</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {categories.map(cat => {
                const isConnected = connectedCategoryIds.includes(cat.id);
                const catProviders = providersByCategory[cat.id] ?? [];
                const catConnections = connections.filter(c => c.categoryId === cat.id && c.status === "connected");
                const liveCatProviders = catProviders.filter(p => getProviderTier(p.slug) === "live");
                const comingSoonCatProviders = catProviders.filter(p => getProviderTier(p.slug) === "coming_soon");
                return (
                  <div key={cat.id} onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                    className={`card-minimal p-4 cursor-pointer transition-colors hover:border-foreground/20 ${selectedCategory === cat.id ? "border-foreground/30" : ""}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded flex items-center justify-center ${isConnected ? "bg-emerald-500/10 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>
                          {CATEGORY_ICONS[cat.slug] ?? <Globe size={16} />}
                        </div>
                        <span className="text-sm font-medium text-foreground">{cat.name}</span>
                      </div>
                      {isConnected ? <CheckCircle2 size={12} className="text-emerald-400" /> : null}
                    </div>
                    <p className="text-muted-foreground text-xs mb-2">{cat.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      {liveCatProviders.length > 0 && <span className="text-emerald-400">{liveCatProviders.length} live</span>}
                      {comingSoonCatProviders.length > 0 && <span className="text-amber-400">{comingSoonCatProviders.length} soon</span>}
                      <span>{catProviders.length} total</span>
                      {catConnections.length > 0 && <span className="text-emerald-400 ml-auto">{catConnections.length} connected</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Expanded Category */}
          {selectedCategory && (
            <div className="card-minimal p-5">
              <div className="flex items-center gap-2 mb-4">
                {CATEGORY_ICONS[categories.find(c => c.id === selectedCategory)?.slug ?? ""] ?? <Globe size={16} />}
                <h3 className="text-base font-medium text-foreground">{categories.find(c => c.id === selectedCategory)?.name} — Providers</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(providersByCategory[selectedCategory] ?? [])
                  .sort((a, b) => {
                    const tierOrder: Record<ProviderTier, number> = { live: 0, coming_soon: 1, planned: 2 };
                    return tierOrder[getProviderTier(a.slug)] - tierOrder[getProviderTier(b.slug)];
                  })
                  .map(provider => (
                    <ProviderCard key={provider.id} provider={provider} />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── My Connections Tab ─── */}
      {activeTab === "connections" && (
        <div>
          {connections.length === 0 ? (
            <div className="card-minimal p-10 text-center">
              <Unplug size={28} className="text-muted-foreground mx-auto mb-3 opacity-50" />
              <div className="text-base font-medium text-muted-foreground">No Connections Yet</div>
              <p className="text-muted-foreground text-sm mt-2 mb-4">Connect your first tool from the Overview tab.</p>
              <Button onClick={() => setActiveTab("overview")}>Browse Integrations</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map(conn => {
                const provider = providers.find(p => p.id === conn.providerId);
                const category = categories.find(c => c.id === conn.categoryId);
                const preview = previewData[conn.id];
                const isLoadingPreview = previewLoading[conn.id];
                return (
                  <div key={conn.id} className="card-minimal p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded flex items-center justify-center bg-secondary text-muted-foreground">
                          {CATEGORY_ICONS[category?.slug ?? ""] ?? <Globe size={14} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{provider?.name ?? "Unknown"}</span>
                            <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0 rounded">{category?.name}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span className={`flex items-center gap-1 ${conn.status === "connected" ? "text-emerald-400" : conn.status === "error" ? "text-red-400" : "text-muted-foreground"}`}>
                              {conn.status === "connected" ? <CheckCircle2 size={10} /> : conn.status === "error" ? <AlertTriangle size={10} /> : <XCircle size={10} />}
                              {conn.status}
                            </span>
                            {conn.accountName && <span>Account: {conn.accountName}</span>}
                            {conn.lastSyncAt && (() => {
                              const lastSync = new Date(conn.lastSyncAt);
                              const hours = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
                              const freshColor = hours < 24 ? "text-emerald-400" : hours < 72 ? "text-amber-400" : "text-red-400";
                              const freshLabel = hours < 1 ? "just now" : hours < 24 ? `${Math.round(hours)}h ago` : hours < 168 ? `${Math.round(hours / 24)}d ago` : lastSync.toLocaleDateString();
                              return <span className={freshColor}>Synced {freshLabel}</span>;
                            })()}
                            {conn.tokenExpiresAt && new Date(conn.tokenExpiresAt) < new Date() && (
                              <span className="text-red-400 flex items-center gap-0.5"><AlertTriangle size={9} /> Token expired</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {conn.status === "connected" && (
                          <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => fetchPreview(conn)} disabled={isLoadingPreview}>
                            {isLoadingPreview ? <Loader2 size={10} className="animate-spin" /> : <Eye size={10} />} Preview
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { connectionsQuery.refetch(); toast.success("Synced"); }}><RefreshCw size={10} /></Button>
                        <Button size="sm" variant="outline" className="text-xs h-7 text-red-400 hover:text-red-300" onClick={() => disconnectMutation.mutate({ connectionId: conn.id })}>
                          <Unplug size={10} className="mr-1" /> Disconnect
                        </Button>
                      </div>
                    </div>
                    {preview && (
                      <div className="mt-3 p-3 rounded-md bg-secondary/50 border border-border">
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Eye size={10} /> Live Data Preview</p>
                        {preview.error ? <p className="text-red-400 text-xs">{preview.error}</p> : (
                          <pre className="text-foreground text-xs font-mono overflow-x-auto whitespace-pre-wrap">{JSON.stringify(preview, null, 2)}</pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Abstraction Layer Tab ─── */}
      {activeTab === "abstraction" && (
        <div className="space-y-6">
          <div className="card-minimal p-5">
            <div className="flex items-center gap-2 mb-3">
              <Layers size={14} className="text-muted-foreground" />
              <h3 className="text-base font-medium text-foreground">Tool Abstraction Layer</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-6">
              The abstraction layer translates generic actions into provider-specific API calls. Agents speak one language — "read_pipeline" — and the layer routes to HubSpot, Salesforce, or Pipedrive depending on what you've connected.
            </p>
            <div className="space-y-3">
              {categories.map(cat => {
                const actions = (cat.abstractActions as string[] | null) ?? [];
                const catProviders = providersByCategory[cat.id] ?? [];
                const isConnected = connectedCategoryIds.includes(cat.id);
                return (
                  <div key={cat.id} className="card-minimal p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {CATEGORY_ICONS[cat.slug] ?? <Globe size={14} />}
                        <span className="text-sm font-medium text-foreground">{cat.name}</span>
                        {isConnected && <CheckCircle2 size={10} className="text-emerald-400" />}
                      </div>
                      <span className="text-xs text-muted-foreground">{catProviders.length} providers</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                      {catProviders.map(p => {
                        const conn = connections.find(c => c.providerId === p.id && c.status === "connected");
                        const tier = getProviderTier(p.slug);
                        return (
                          <span key={p.id} className={`text-[10px] px-1.5 py-0 border rounded ${conn ? "border-emerald-500/30 text-emerald-400" : tier === "coming_soon" ? "border-amber-500/20 text-amber-400/70" : "border-border text-muted-foreground"}`}>
                            {p.name}
                          </span>
                        );
                      })}
                    </div>
                    {actions.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                        {actions.map(action => (
                          <div key={action} className="flex items-center gap-1.5 text-xs p-1.5 rounded bg-secondary/50 border border-border">
                            <ArrowRight size={10} className="text-muted-foreground shrink-0" />
                            <code className="text-foreground text-[11px] font-mono">{action}</code>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card-minimal p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={14} className="text-muted-foreground" />
              <h3 className="text-base font-medium text-foreground">How Context Routing Works</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { step: "1", title: "Interpret", desc: "LLM analyzes your request and infers which tool categories are relevant" },
                { step: "2", title: "Gather", desc: "Pulls live state from your connected tools and recent execution history" },
                { step: "3", title: "Contextualize", desc: "Enriches parameters with real data and produces a confidence-scored execution plan" },
              ].map(({ step, title, desc }) => (
                <div key={step} className="card-minimal p-4 text-center">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                    <span className="text-foreground font-medium text-sm">{step}</span>
                  </div>
                  <h4 className="text-sm font-medium text-foreground mb-2">{title}</h4>
                  <p className="text-muted-foreground text-xs">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Request Integration Dialog ─── */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-light">Request {requestProvider} Integration</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              We'll notify you when {requestProvider} is available. Your request helps us prioritize our integration roadmap.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Email (optional)</label>
              <Input placeholder={user?.email ?? "your@email.com"} value={requestEmail} onChange={e => setRequestEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">What would you use it for? (optional)</label>
              <Input placeholder="e.g., Pull campaign metrics into morning briefings" value={requestNote} onChange={e => setRequestNote(e.target.value)} />
            </div>
            <Button className="w-full gap-2" onClick={handleRequestSubmit}>
              <Send size={14} /> Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
