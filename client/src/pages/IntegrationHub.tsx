import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Users, Mail, BarChart3, Kanban, CreditCard, MessageSquare, Inbox, ShoppingCart,
  Plug, Unplug, RefreshCw, Loader2, CheckCircle2, XCircle, AlertTriangle, Zap,
  ArrowRight, Shield, Layers, Globe, ExternalLink, Eye,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  crm: <Users className="w-5 h-5" />,
  email_marketing: <Mail className="w-5 h-5" />,
  analytics: <BarChart3 className="w-5 h-5" />,
  project_mgmt: <Kanban className="w-5 h-5" />,
  payments: <CreditCard className="w-5 h-5" />,
  communication: <MessageSquare className="w-5 h-5" />,
  personal_email: <Inbox className="w-5 h-5" />,
  ecommerce: <ShoppingCart className="w-5 h-5" />,
};

const STATUS_COLORS: Record<string, string> = {
  connected: "text-green-500",
  disconnected: "text-zinc-500",
  error: "text-red-500",
  expired: "text-yellow-500",
};

// Providers that support real OAuth2 via our backend
const OAUTH2_PROVIDERS = ["hubspot", "mailchimp", "slack", "stripe_connect"];

export default function IntegrationHub() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
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
    onSuccess: () => {
      categoriesQuery.refetch();
      providersQuery.refetch();
      toast.success("Seeded 8 categories and 21 providers");
    },
  });

  const connectMutation = trpc.hub.connect.useMutation({
    onSuccess: () => {
      connectionsQuery.refetch();
      setConnectDialogOpen(false);
      setAccountName("");
      setApiKey("");
      toast.success("Tool connected successfully");
    },
  });

  const disconnectMutation = trpc.hub.disconnect.useMutation({
    onSuccess: () => {
      connectionsQuery.refetch();
      toast.success("Tool disconnected");
    },
  });

  const categories = categoriesQuery.data ?? [];
  const providers = providersQuery.data ?? [];
  const connections = connectionsQuery.data ?? [];

  // Handle OAuth callback return (URL params set by backend redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const account = params.get("account");
    const error = params.get("error");

    if (connected) {
      toast.success(`✓ ${account ?? connected} connected successfully via OAuth`);
      connectionsQuery.refetch();
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (error) {
      toast.error(error);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const connectedCategoryIds = useMemo(() => {
    return Array.from(new Set(connections.filter(c => c.status === "connected").map(c => c.categoryId)));
  }, [connections]);

  const providersByCategory = useMemo(() => {
    const map: Record<number, typeof providers> = {};
    for (const p of providers) {
      if (!map[p.categoryId]) map[p.categoryId] = [];
      map[p.categoryId].push(p);
    }
    return map;
  }, [providers]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Plug className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-4xl font-black text-white uppercase tracking-tight mb-4">INTEGRATION HUB</h1>
          <p className="text-zinc-400 mb-6">Connect your tools to power the Self-Contextualizing Engine</p>
          <a href={getLoginUrl()}>
            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase">Sign In to Connect Tools</Button>
          </a>
        </div>
      </div>
    );
  }

  // Start real OAuth2 flow — redirect to backend which redirects to provider
  const handleOAuthConnect = (provider: any) => {
    const origin = window.location.origin;
    const userId = user?.id;
    if (!userId) return;
    const url = `/api/integration/oauth/start?provider=${encodeURIComponent(provider.slug)}&userId=${userId}&origin=${encodeURIComponent(origin)}`;
    window.location.href = url;
  };

  // Open connect dialog for API key providers
  const handleConnect = (provider: any) => {
    if (OAUTH2_PROVIDERS.includes(provider.slug)) {
      handleOAuthConnect(provider);
    } else {
      setSelectedProvider(provider);
      setConnectDialogOpen(true);
    }
  };

  const submitConnection = () => {
    if (!selectedProvider) return;
    connectMutation.mutate({
      providerId: selectedProvider.id,
      categoryId: selectedProvider.categoryId,
      accountName: accountName || selectedProvider.name,
      accountId: apiKey ? `key-${Date.now()}` : undefined,
      accessToken: apiKey || undefined,
    });
  };

  const fetchPreview = async (conn: any) => {
    setPreviewLoading(prev => ({ ...prev, [conn.id]: true }));
    try {
      const res = await fetch(`/api/integration/oauth/preview?connectionId=${conn.id}&userId=${user?.id}`);
      const data = await res.json();
      setPreviewData(prev => ({ ...prev, [conn.id]: data.preview }));
    } catch {
      setPreviewData(prev => ({ ...prev, [conn.id]: { error: "Preview unavailable" } }));
    } finally {
      setPreviewLoading(prev => ({ ...prev, [conn.id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Plug className="w-8 h-8 text-red-600" />
              <h1 className="text-3xl font-black uppercase tracking-tight">INTEGRATION HUB</h1>
            </div>
            <p className="text-zinc-400 text-sm">
              Tool Abstraction Layer — Connect any tool, agents speak one language
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-zinc-700 text-zinc-300 px-3 py-1">
              {connections.filter(c => c.status === "connected").length} Connected
            </Badge>
            <Badge variant="outline" className="border-zinc-700 text-zinc-300 px-3 py-1">
              {categories.length} Categories
            </Badge>
            {categories.length === 0 && (
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs"
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
              >
                {seedMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
                Seed Defaults
              </Button>
            )}
          </div>
        </div>
        <div className="h-[2px] bg-red-600 mt-4" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6 py-4">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-zinc-400 uppercase text-xs font-bold">Overview</TabsTrigger>
          <TabsTrigger value="connections" className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-zinc-400 uppercase text-xs font-bold">My Connections</TabsTrigger>
          <TabsTrigger value="abstraction" className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-zinc-400 uppercase text-xs font-bold">Abstraction Layer</TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ─── */}
        <TabsContent value="overview" className="mt-4">
          {/* OAuth2 Providers Banner */}
          <Card className="bg-zinc-950 border border-red-900/40 mb-6">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-white text-sm uppercase tracking-tight">OAuth2-Enabled Providers</h3>
                <Badge className="bg-red-900/30 text-red-400 border-red-800 text-[10px]">Real OAuth</Badge>
              </div>
              <p className="text-zinc-500 text-xs mb-4">These providers use real OAuth2 authorization. Clicking Connect will redirect you to their login page.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["hubspot", "mailchimp", "slack", "stripe_connect"].map((slug) => {
                  const provider = providers.find(p => p.slug === slug);
                  const conn = connections.find(c => c.providerId === provider?.id && c.status === "connected");
                  if (!provider) return null;
                  return (
                    <div key={slug} className={`p-3 rounded border ${conn ? "border-green-800 bg-green-900/10" : "border-zinc-800 bg-zinc-900/50"} flex flex-col gap-2`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{provider.name}</span>
                        {conn ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <ExternalLink className="w-3 h-3 text-zinc-600" />}
                      </div>
                      <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-[10px] w-fit">OAuth2</Badge>
                      {conn ? (
                        <div className="space-y-1">
                          <p className="text-green-400 text-xs">{conn.accountName}</p>
                          <Button size="sm" variant="outline" className="border-red-900 text-red-500 text-xs h-6 w-full"
                            onClick={() => disconnectMutation.mutate({ connectionId: conn.id })}>
                            <Unplug className="w-3 h-3 mr-1" /> Disconnect
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs h-7 font-bold uppercase"
                          onClick={() => handleOAuthConnect(provider)}>
                          <ExternalLink className="w-3 h-3 mr-1" /> Connect
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {categories.map((cat) => {
              const isConnected = connectedCategoryIds.includes(cat.id);
              const catProviders = providersByCategory[cat.id] ?? [];
              const catConnections = connections.filter(c => c.categoryId === cat.id && c.status === "connected");
              return (
                <Card key={cat.id} className={`bg-zinc-950 border ${isConnected ? "border-green-800" : "border-zinc-800"} hover:border-zinc-600 transition-colors cursor-pointer`}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded ${isConnected ? "bg-green-900/30" : "bg-zinc-900"}`}>
                          {CATEGORY_ICONS[cat.slug] ?? <Globe className="w-5 h-5" />}
                        </div>
                        <CardTitle className="text-sm font-bold uppercase tracking-tight text-white">{cat.name}</CardTitle>
                      </div>
                      {isConnected ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-zinc-600" />}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-zinc-500 text-xs mb-3">{cat.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-600">{catProviders.length} providers</span>
                      <span className={isConnected ? "text-green-500" : "text-zinc-600"}>
                        {catConnections.length} connected
                      </span>
                    </div>
                    {(cat.abstractActions as string[] | null)?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {((cat.abstractActions as string[]).slice(0, 3)).map((a) => (
                          <Badge key={a} variant="outline" className="border-zinc-800 text-zinc-500 text-[10px] px-1.5 py-0">{a}</Badge>
                        ))}
                        {(cat.abstractActions as string[]).length > 3 && (
                          <Badge variant="outline" className="border-zinc-800 text-zinc-500 text-[10px] px-1.5 py-0">+{(cat.abstractActions as string[]).length - 3}</Badge>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Expanded Category Detail */}
          {selectedCategory && (
            <Card className="bg-zinc-950 border border-zinc-800 mb-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  {CATEGORY_ICONS[categories.find(c => c.id === selectedCategory)?.slug ?? ""] ?? <Globe className="w-5 h-5" />}
                  <CardTitle className="text-lg font-black uppercase tracking-tight text-white">
                    {categories.find(c => c.id === selectedCategory)?.name} — Available Providers
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(providersByCategory[selectedCategory] ?? []).map((provider) => {
                    const conn = connections.find(c => c.providerId === provider.id && c.status === "connected");
                    const isOAuth2 = OAUTH2_PROVIDERS.includes(provider.slug);
                    return (
                      <div key={provider.id} className={`p-4 rounded border ${conn ? "border-green-800 bg-green-900/10" : "border-zinc-800 bg-zinc-900/50"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-white text-sm">{provider.name}</h4>
                          <div className="flex items-center gap-1">
                            {isOAuth2 && <Badge className="bg-blue-900/30 text-blue-400 border-blue-800 text-[10px]">OAuth2</Badge>}
                            <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px] uppercase">{provider.authType}</Badge>
                          </div>
                        </div>
                        <p className="text-zinc-500 text-xs mb-3">{provider.description}</p>
                        {conn ? (
                          <div className="flex items-center justify-between">
                            <span className="text-green-500 text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {conn.accountName ?? "Connected"}</span>
                            <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 text-xs h-7"
                              onClick={(e) => { e.stopPropagation(); disconnectMutation.mutate({ connectionId: conn.id }); }}>
                              <Unplug className="w-3 h-3 mr-1" /> Disconnect
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs h-7 w-full font-bold uppercase"
                            onClick={(e) => { e.stopPropagation(); handleConnect(provider); }}>
                            {isOAuth2 ? <ExternalLink className="w-3 h-3 mr-1" /> : <Plug className="w-3 h-3 mr-1" />}
                            {isOAuth2 ? "Authorize" : "Connect"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── My Connections Tab ─── */}
        <TabsContent value="connections" className="mt-4">
          {connections.length === 0 ? (
            <Card className="bg-zinc-950 border border-zinc-800">
              <CardContent className="py-12 text-center">
                <Unplug className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white uppercase mb-2">No Connections Yet</h3>
                <p className="text-zinc-500 text-sm mb-4">Connect your first tool from the Overview tab to power the Self-Contextualizing Engine</p>
                <Button className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase" onClick={() => setActiveTab("overview")}>
                  Browse Categories
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {connections.map((conn) => {
                const provider = providers.find(p => p.id === conn.providerId);
                const category = categories.find(c => c.id === conn.categoryId);
                const preview = previewData[conn.id];
                const isLoadingPreview = previewLoading[conn.id];
                return (
                  <Card key={conn.id} className="bg-zinc-950 border border-zinc-800">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded bg-zinc-900">
                            {CATEGORY_ICONS[category?.slug ?? ""] ?? <Globe className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-sm">{provider?.name ?? "Unknown"}</h4>
                              <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px] uppercase">{category?.name}</Badge>
                              {OAUTH2_PROVIDERS.includes(provider?.slug ?? "") && (
                                <Badge className="bg-blue-900/30 text-blue-400 border-blue-800 text-[10px]">OAuth2</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                              <span className={`flex items-center gap-1 ${STATUS_COLORS[conn.status]}`}>
                                {conn.status === "connected" ? <CheckCircle2 className="w-3 h-3" /> : conn.status === "error" ? <AlertTriangle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {conn.status.toUpperCase()}
                              </span>
                              {conn.accountName && <span>Account: <strong className="text-zinc-300">{conn.accountName}</strong></span>}
                              {conn.lastSyncAt && <span>Last sync: {new Date(conn.lastSyncAt).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {conn.status === "connected" && (
                            <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 text-xs h-7"
                              onClick={() => fetchPreview(conn)}
                              disabled={isLoadingPreview}>
                              {isLoadingPreview ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3 mr-1" />}
                              Preview
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 text-xs h-7"
                            onClick={() => { connectionsQuery.refetch(); toast.success("Synced"); }}>
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-900 text-red-500 text-xs h-7"
                            onClick={() => disconnectMutation.mutate({ connectionId: conn.id })}>
                            <Unplug className="w-3 h-3 mr-1" /> Disconnect
                          </Button>
                        </div>
                      </div>
                      {/* Live Data Preview */}
                      {preview && (
                        <div className="mt-3 p-3 rounded bg-zinc-900 border border-zinc-800">
                          <p className="text-zinc-500 text-xs uppercase font-bold mb-2 flex items-center gap-1">
                            <Eye className="w-3 h-3" /> Live Data Preview
                          </p>
                          {preview.error ? (
                            <p className="text-red-400 text-xs">{preview.error}</p>
                          ) : (
                            <pre className="text-zinc-300 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(preview, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Abstraction Layer Tab ─── */}
        <TabsContent value="abstraction" className="mt-4">
          <Card className="bg-zinc-950 border border-zinc-800 mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-red-600" /> Tool Abstraction Layer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 text-sm mb-6">
                The abstraction layer translates generic actions into provider-specific API calls. Agents speak one language — "read_pipeline" — and the layer routes to HubSpot, Salesforce, or Pipedrive depending on what you've connected.
              </p>
              <div className="space-y-4">
                {categories.map((cat) => {
                  const actions = (cat.abstractActions as string[] | null) ?? [];
                  const catProviders = providersByCategory[cat.id] ?? [];
                  const isConnected = connectedCategoryIds.includes(cat.id);
                  return (
                    <div key={cat.id} className="p-4 rounded border border-zinc-800 bg-zinc-900/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {CATEGORY_ICONS[cat.slug] ?? <Globe className="w-4 h-4" />}
                          <h4 className="font-bold text-white text-sm uppercase">{cat.name}</h4>
                          {isConnected && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                        </div>
                        <span className="text-zinc-600 text-xs">{catProviders.length} providers</span>
                      </div>
                      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
                        {catProviders.map((p) => {
                          const conn = connections.find(c => c.providerId === p.id && c.status === "connected");
                          return (
                            <Badge key={p.id} variant="outline" className={`text-[10px] px-2 py-0.5 whitespace-nowrap ${conn ? "border-green-800 text-green-400" : "border-zinc-800 text-zinc-500"}`}>
                              {p.name}
                            </Badge>
                          );
                        })}
                      </div>
                      {actions.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {actions.map((action) => (
                            <div key={action} className="flex items-center gap-2 text-xs p-2 rounded bg-zinc-950 border border-zinc-800">
                              <ArrowRight className="w-3 h-3 text-red-600 shrink-0" />
                              <code className="text-zinc-300 font-mono text-[11px]">{action}</code>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600" /> How Context Routing Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { step: "1", title: "Interpret", desc: "LLM analyzes your request and infers which tool categories are relevant" },
                  { step: "2", title: "Gather", desc: "Pulls live state from your connected tools and recent execution history" },
                  { step: "3", title: "Contextualize", desc: "Enriches parameters with real data and produces a confidence-scored execution plan" },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="p-4 rounded border border-zinc-800 bg-zinc-900/30 text-center">
                    <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-3">
                      <span className="text-red-500 font-black text-lg">{step}</span>
                    </div>
                    <h4 className="font-bold text-white text-sm uppercase mb-2">{title}</h4>
                    <p className="text-zinc-500 text-xs">{desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Connect Dialog (API key providers) */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">
              Connect {selectedProvider?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-zinc-400 text-xs uppercase font-bold">Account Name</Label>
              <Input
                className="bg-zinc-900 border-zinc-800 text-white mt-1"
                placeholder={`My ${selectedProvider?.name} Account`}
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>
            {selectedProvider?.authType === "api_key" && (
              <div>
                <Label className="text-zinc-400 text-xs uppercase font-bold">API Key</Label>
                <Input
                  className="bg-zinc-900 border-zinc-800 text-white mt-1"
                  type="password"
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
            )}
            <Button
              className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase w-full"
              onClick={submitConnection}
              disabled={connectMutation.isPending}
            >
              {connectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plug className="w-4 h-4 mr-2" />}
              Connect {selectedProvider?.name}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
