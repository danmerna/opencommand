import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Users, Mail, BarChart3, Kanban, CreditCard, MessageSquare, Inbox, ShoppingCart,
  Plug, Unplug, RefreshCw, Loader2, CheckCircle2, XCircle, AlertTriangle, Zap,
  ArrowRight, Shield, Layers, Globe, ExternalLink, Eye,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  crm: <Users size={16} />, email_marketing: <Mail size={16} />, analytics: <BarChart3 size={16} />,
  project_mgmt: <Kanban size={16} />, payments: <CreditCard size={16} />, communication: <MessageSquare size={16} />,
  personal_email: <Inbox size={16} />, ecommerce: <ShoppingCart size={16} />, digital_ads: <Zap size={16} />,
};

const OAUTH2_PROVIDERS = ["hubspot", "mailchimp", "slack", "stripe_connect", "salesforce", "meta_ads", "google_ads", "tiktok_ads", "ga4"];

type Tab = "overview" | "connections" | "abstraction";

export default function IntegrationHub() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [accountName, setAccountName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [previewData, setPreviewData] = useState<Record<number, any>>({});
  const [previewLoading, setPreviewLoading] = useState<Record<number, boolean>>({});

  const categoriesQuery = trpc.hub.categories.useQuery();
  const providersQuery = trpc.hub.providers.useQuery();
  const connectionsQuery = trpc.hub.connections.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();

  const seedMutation = trpc.hub.seedDefaults.useMutation({
    onSuccess: () => { categoriesQuery.refetch(); providersQuery.refetch(); toast.success("Seeded 8 categories and 21 providers"); },
  });
  const connectMutation = trpc.hub.connect.useMutation({
    onSuccess: () => { connectionsQuery.refetch(); setConnectDialogOpen(false); setAccountName(""); setApiKey(""); toast.success("Tool connected"); },
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

  const handleOAuthConnect = (provider: any) => {
    const origin = window.location.origin;
    window.location.href = `/api/integration/oauth/start?provider=${encodeURIComponent(provider.slug)}&userId=${user?.id}&origin=${encodeURIComponent(origin)}`;
  };

  const handleConnect = (provider: any) => {
    if (OAUTH2_PROVIDERS.includes(provider.slug)) { handleOAuthConnect(provider); } else { setSelectedProvider(provider); setConnectDialogOpen(true); }
  };

  const submitConnection = () => {
    if (!selectedProvider) return;
    connectMutation.mutate({ providerId: selectedProvider.id, categoryId: selectedProvider.categoryId, accountName: accountName || selectedProvider.name, accountId: apiKey ? `key-${Date.now()}` : undefined, accessToken: apiKey || undefined });
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
    { id: "connections", label: "My Connections" },
    { id: "abstraction", label: "Abstraction Layer" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">OpenCommand</p>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-light text-foreground tracking-tight">Integration Hub</h1>
            <p className="text-muted-foreground text-sm mt-2 max-w-xl">Tool Abstraction Layer — connect any tool, agents speak one language.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{connections.filter(c => c.status === "connected").length} connected</span>
            {categories.length === 0 && (
              <Button size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} className="gap-1.5">
                {seedMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} Seed Defaults
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex border-b border-border mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div>
          {/* OAuth2 Banner */}
          <div className="card-minimal p-5 mb-6 border-l-2 border-l-blue-500/50">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-blue-400" />
              <h3 className="text-sm font-medium text-foreground">OAuth2-Enabled Providers</h3>
              <span className="text-[10px] text-blue-400 border border-blue-400/30 px-1.5 py-0 rounded">Real OAuth</span>
            </div>
            <p className="text-muted-foreground text-xs mb-4">These providers use real OAuth2 authorization. Clicking Connect redirects to their login page.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {["hubspot", "salesforce", "meta_ads", "google_ads", "tiktok_ads", "ga4", "mailchimp", "slack", "stripe_connect"].map(slug => {
                const provider = providers.find(p => p.slug === slug);
                const conn = connections.find(c => c.providerId === provider?.id && c.status === "connected");
                if (!provider) return null;
                return (
                  <div key={slug} className={`card-minimal p-3 ${conn ? "border-emerald-500/20" : ""}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">{provider.name}</span>
                      {conn ? <CheckCircle2 size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-muted-foreground opacity-30" />}
                    </div>
                    {conn ? (
                      <div className="space-y-1.5">
                        <p className="text-emerald-400 text-xs">{conn.accountName}</p>
                        <Button size="sm" variant="outline" className="text-xs h-7 w-full" onClick={() => disconnectMutation.mutate({ connectionId: conn.id })}>
                          <Unplug size={10} className="mr-1" /> Disconnect
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" className="text-xs h-7 w-full gap-1" onClick={() => handleOAuthConnect(provider)}>
                        <ExternalLink size={10} /> Connect
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {categories.map(cat => {
              const isConnected = connectedCategoryIds.includes(cat.id);
              const catProviders = providersByCategory[cat.id] ?? [];
              const catConnections = connections.filter(c => c.categoryId === cat.id && c.status === "connected");
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
                    {isConnected ? <CheckCircle2 size={12} className="text-emerald-400" /> : <XCircle size={12} className="text-muted-foreground opacity-20" />}
                  </div>
                  <p className="text-muted-foreground text-xs mb-2">{cat.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{catProviders.length} providers</span>
                    <span className={isConnected ? "text-emerald-400" : ""}>{catConnections.length} connected</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expanded Category */}
          {selectedCategory && (
            <div className="card-minimal p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                {CATEGORY_ICONS[categories.find(c => c.id === selectedCategory)?.slug ?? ""] ?? <Globe size={16} />}
                <h3 className="text-base font-medium text-foreground">{categories.find(c => c.id === selectedCategory)?.name} — Providers</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(providersByCategory[selectedCategory] ?? []).map(provider => {
                  const conn = connections.find(c => c.providerId === provider.id && c.status === "connected");
                  const isOAuth2 = OAUTH2_PROVIDERS.includes(provider.slug);
                  return (
                    <div key={provider.id} className={`card-minimal p-4 ${conn ? "border-emerald-500/20" : ""}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{provider.name}</span>
                        <div className="flex items-center gap-1">
                          {isOAuth2 && <span className="text-[10px] text-blue-400 border border-blue-400/30 px-1 py-0 rounded">OAuth2</span>}
                          <span className="text-[10px] text-muted-foreground border border-border px-1 py-0 rounded">{provider.authType}</span>
                        </div>
                      </div>
                      <p className="text-muted-foreground text-xs mb-3">{provider.description}</p>
                      {conn ? (
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle2 size={10} /> {conn.accountName ?? "Connected"}</span>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={e => { e.stopPropagation(); disconnectMutation.mutate({ connectionId: conn.id }); }}>
                            <Unplug size={10} className="mr-1" /> Disconnect
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" className="text-xs h-7 w-full gap-1" onClick={e => { e.stopPropagation(); handleConnect(provider); }}>
                          {isOAuth2 ? <ExternalLink size={10} /> : <Plug size={10} />} {isOAuth2 ? "Authorize" : "Connect"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* My Connections */}
      {activeTab === "connections" && (
        <div>
          {connections.length === 0 ? (
            <div className="card-minimal p-10 text-center">
              <Unplug size={28} className="text-muted-foreground mx-auto mb-3 opacity-50" />
              <div className="text-base font-medium text-muted-foreground">No Connections Yet</div>
              <p className="text-muted-foreground text-sm mt-2 mb-4">Connect your first tool from the Overview tab.</p>
              <Button onClick={() => setActiveTab("overview")}>Browse Categories</Button>
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
                            {OAUTH2_PROVIDERS.includes(provider?.slug ?? "") && <span className="text-[10px] text-blue-400 border border-blue-400/30 px-1 py-0 rounded">OAuth2</span>}
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

      {/* Abstraction Layer */}
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
                        return <span key={p.id} className={`text-[10px] px-1.5 py-0 border rounded ${conn ? "border-emerald-500/30 text-emerald-400" : "border-border text-muted-foreground"}`}>{p.name}</span>;
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

      {/* Connect Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-light">Connect {selectedProvider?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Account Name</label>
              <Input placeholder={`My ${selectedProvider?.name} Account`} value={accountName} onChange={e => setAccountName(e.target.value)} />
            </div>
            {selectedProvider?.authType === "api_key" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">API Key</label>
                <Input type="password" placeholder="Enter your API key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
              </div>
            )}
            <Button className="w-full gap-2" onClick={submitConnection} disabled={connectMutation.isPending}>
              {connectMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />}
              Connect {selectedProvider?.name}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
