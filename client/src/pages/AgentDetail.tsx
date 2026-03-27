import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Bot, Pencil, Activity, Heart, Zap, DollarSign,
  Clock, Loader2, Shield, Wrench, Play, Pause, AlertTriangle,
  Power, BarChart3, CheckCircle2, XCircle, Settings, FileText,
  RefreshCw, Wifi, WifiOff, Plug, Eye, EyeOff, FlaskConical,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

type Tab = "overview" | "capabilities" | "heartbeat" | "budget" | "autonomy" | "connector" | "settings";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview",     label: "Overview",      icon: BarChart3 },
  { id: "capabilities", label: "Capabilities",  icon: Zap },
  { id: "heartbeat",    label: "Heartbeat",     icon: Heart },
  { id: "budget",       label: "Budget",        icon: DollarSign },
  { id: "autonomy",     label: "Autonomy",      icon: Shield },
  { id: "connector",    label: "Connector",     icon: Plug },
  { id: "settings",     label: "Settings",      icon: Settings },
];

const typeColors: Record<string, string> = {
  ceo: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  cto: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  cmo: "text-pink-400 border-pink-400/30 bg-pink-400/10",
  cfo: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  vp: "text-violet-400 border-violet-400/30 bg-violet-400/10",
  manager: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  specialist: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  marketing: "text-pink-400 border-pink-400/30 bg-pink-400/10",
  research: "text-indigo-400 border-indigo-400/30 bg-indigo-400/10",
  sales: "text-green-400 border-green-400/30 bg-green-400/10",
  admin: "text-gray-400 border-gray-400/30 bg-gray-400/10",
  custom: "text-purple-400 border-purple-400/30 bg-purple-400/10",
};

const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  idle:       { color: "text-zinc-400",   icon: Clock,          label: "Idle" },
  active:     { color: "text-emerald-400", icon: Play,           label: "Active" },
  paused:     { color: "text-amber-400",   icon: Pause,          label: "Paused" },
  error:      { color: "text-red-400",     icon: AlertTriangle,  label: "Error" },
  terminated: { color: "text-zinc-600",    icon: XCircle,        label: "Terminated" },
};

export default function AgentDetail() {
  const [, params] = useRoute("/agents/:id");
  const [, navigate] = useLocation();
  const agentId = Number(params?.id);
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [descVal, setDescVal] = useState("");
  const [jobDescVal, setJobDescVal] = useState("");

  const { isAuthenticated } = useAuth();
  const { data: agent, isLoading } = trpc.agents.get.useQuery({ id: agentId }, { enabled: !!agentId });
  const { data: onboardingData } = trpc.onboarding.getForAgent.useQuery({ agentId }, { enabled: !!agentId && activeTab === "overview" });
  const { data: capabilities = [] } = trpc.agents.capabilities.useQuery({ agentId }, { enabled: !!agentId && activeTab === "capabilities" });
  const { data: heartbeatLog = [] } = trpc.agents.heartbeatLog.useQuery({ agentId }, { enabled: !!agentId && activeTab === "heartbeat" });
  const { data: connections = [] } = trpc.hub.connections.useQuery(undefined, { enabled: isAuthenticated && activeTab === "overview" });
  const { data: providers = [] } = trpc.hub.providers.useQuery(undefined, { enabled: activeTab === "overview" });

  const reAnalyzeMutation = trpc.onboarding.reAnalyzeGaps.useMutation({
    onSuccess: () => { utils.onboarding.getForAgent.invalidate({ agentId }); toast.success("Gap analysis updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = trpc.agents.updateFull.useMutation({
    onSuccess: () => { utils.agents.get.invalidate({ id: agentId }); utils.agents.list.invalidate(); toast.success("Agent updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const statusMutation = trpc.agents.updateStatus.useMutation({
    onSuccess: () => { utils.agents.get.invalidate({ id: agentId }); utils.agents.list.invalidate(); toast.success("Status updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const heartbeatMutation = trpc.agents.triggerHeartbeat.useMutation({
    onSuccess: (data: any) => {
      utils.agents.heartbeatLog.invalidate({ agentId });
      utils.agents.get.invalidate({ id: agentId });
      toast.success(`Heartbeat complete`, { description: `Checked ${data.tasksChecked} tasks, acted on ${data.tasksActedOn}` });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = trpc.agents.remove.useMutation({
    onSuccess: () => { utils.agents.list.invalidate(); toast.success("Agent deleted"); navigate("/mission-control"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Sync agent data into local state
  const [synced, setSynced] = useState(false);
  if (agent && !synced) {
    setNameVal(agent.name);
    setDescVal(agent.description ?? "");
    setJobDescVal(agent.jobDescription ?? "");
    setSynced(true);
  }

  // Budget calculations
  const budgetUsed = Number(agent?.budgetUsed ?? 0);
  const monthlyBudget = Number(agent?.monthlyBudget ?? 0);
  const budgetPercent = monthlyBudget > 0 ? Math.min((budgetUsed / monthlyBudget) * 100, 100) : 0;
  const budgetThreshold = Number(agent?.budgetAlertThreshold ?? 75);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-6 text-center">
        <Bot size={32} className="text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Agent not found.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/mission-control")}>
          Back to Mission Control
        </Button>
      </div>
    );
  }

  const status = statusConfig[agent.status] ?? statusConfig.idle;
  const StatusIcon = status.icon;
  const typeClass = typeColors[agent.type] ?? typeColors.custom;

  const handleSaveName = () => {
    if (!nameVal.trim()) return;
    updateMutation.mutate({ id: agentId, name: nameVal.trim() });
    setEditingName(false);
  };

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 bg-[oklch(0.03_0_0)]">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate("/mission-control")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} />
          </button>

          {/* Status dot */}
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            agent.status === "active" ? "bg-emerald-400" :
            agent.status === "error" ? "bg-red-400" :
            agent.status === "paused" ? "bg-amber-400" :
            "bg-zinc-500"
          }`} />

          {/* Agent name */}
          {editingName ? (
            <Input
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={e => e.key === "Enter" && handleSaveName()}
              className="h-7 text-base font-semibold max-w-xs"
              autoFocus
            />
          ) : (
            <h1
              className="text-lg font-semibold text-foreground cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2"
              onClick={() => setEditingName(true)}
            >
              {agent.name}
              <Pencil size={12} className="text-muted-foreground" />
            </h1>
          )}

          {/* Type badge */}
          <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${typeClass}`}>
            {agent.roleTitle ?? agent.type}
          </Badge>

          {/* Status badge */}
          <div className={`ml-auto flex items-center gap-1.5 text-xs font-medium ${status.color}`}>
            <StatusIcon size={13} />
            {status.label}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-white/[0.08] text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                }`}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-6">

        {/* ── Overview ─────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="max-w-3xl space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Tasks Completed</div>
                <div className="text-xl font-bold text-foreground">{agent.tasksCompleted}</div>
              </div>
              <div className="rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Value Created</div>
                <div className="text-xl font-bold text-emerald-400">${Number(agent.totalValueCreated).toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Cost Incurred</div>
                <div className="text-xl font-bold text-foreground">${Number(agent.totalCostIncurred).toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Resource Usage</div>
                <div className="text-xl font-bold text-foreground">{Number(agent.resourceUsage)}%</div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Description</label>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {agent.description || <span className="text-muted-foreground italic">No description set.</span>}
              </p>
            </div>

            {/* Tools & Connector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="text-xs font-medium text-muted-foreground mb-2">Connector</div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                  {agent.connectorType}
                </Badge>
              </div>
              <div className="rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="text-xs font-medium text-muted-foreground mb-2">Tools</div>
                <div className="flex flex-wrap gap-1.5">
                  {(agent.tools as string[] | null)?.length ? (
                    (agent.tools as string[]).map(tool => (
                      <Badge key={tool} variant="outline" className="text-[10px]">
                        <Wrench size={9} className="mr-1" />{tool}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No tools configured</span>
                  )}
                </div>
              </div>
            </div>

            {/* Integration health indicators for connected tools */}
            {connections.length > 0 && (() => {
              const connectedTools = connections.filter(c => c.status === "connected");
              if (connectedTools.length === 0) return null;
              return (
                <div className="rounded-xl border border-border/50 bg-card/30 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wifi size={14} className="text-emerald-400" />
                    <span className="text-xs font-medium text-muted-foreground">Connected integrations</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {connectedTools.map(conn => {
                      const provider = providers.find(p => p.id === conn.providerId);
                      const lastSync = conn.lastSyncAt ? new Date(conn.lastSyncAt) : null;
                      const now = new Date();
                      const hoursSinceSync = lastSync ? (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60) : null;
                      const isFresh = hoursSinceSync !== null && hoursSinceSync < 24;
                      const isStale = hoursSinceSync !== null && hoursSinceSync >= 72;
                      const tokenExpired = conn.tokenExpiresAt ? new Date(conn.tokenExpiresAt) < now : false;
                      return (
                        <div key={conn.id} className="flex items-center gap-2 rounded-lg border border-border/30 bg-secondary/30 px-3 py-2">
                          <div className={`w-2 h-2 rounded-full ${tokenExpired ? "bg-red-400" : isStale ? "bg-amber-400" : isFresh ? "bg-emerald-400" : "bg-zinc-400"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{provider?.name ?? "Unknown"}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {tokenExpired ? "Token expired" : lastSync ? `Synced ${lastSync.toLocaleDateString()} ${lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Never synced"}
                            </p>
                          </div>
                          {(tokenExpired || isStale) && <WifiOff size={10} className="text-amber-400 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Suggested integrations from onboarding gap detection (auto-dismiss connected) */}
            {onboardingData?.context && (() => {
              const allSuggestions = ((onboardingData.context as any).suggestedIntegrations ?? []) as { slug: string; name: string; reason: string }[];
              const connectedSlugs = new Set(connections.filter(c => c.status === "connected").map(c => {
                const p = providers.find(pr => pr.id === c.providerId);
                return p?.slug;
              }).filter(Boolean));
              const filtered = allSuggestions.filter(s => !connectedSlugs.has(s.slug));
              if (filtered.length === 0) return null;
              return (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-amber-400" />
                      <span className="text-xs font-medium text-amber-400">Recommended integrations based on onboarding insights</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[10px] h-6 gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => reAnalyzeMutation.mutate({ agentId })}
                      disabled={reAnalyzeMutation.isPending}
                    >
                      {reAnalyzeMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                      Re-analyze
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {filtered.map((integration) => (
                      <div key={integration.slug} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/50 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{integration.name}</p>
                          <p className="text-xs text-muted-foreground">{integration.reason}</p>
                        </div>
                        <Button size="sm" variant="outline" className="shrink-0 text-xs h-7" onClick={() => navigate("/integration-hub")}>
                          Connect
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              {agent.status === "idle" || agent.status === "paused" ? (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => statusMutation.mutate({ id: agentId, status: "active" })}>
                  <Play size={13} /> Activate
                </Button>
              ) : agent.status === "active" ? (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => statusMutation.mutate({ id: agentId, status: "paused" })}>
                  <Pause size={13} /> Pause
                </Button>
              ) : null}
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => heartbeatMutation.mutate({ agentId })} disabled={heartbeatMutation.isPending}>
                <Heart size={13} /> {heartbeatMutation.isPending ? "Running..." : "Trigger Heartbeat"}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/onboarding/${agentId}`)}>
                <FileText size={13} /> Onboarding
              </Button>
            </div>
          </div>
        )}

        {/* ── Capabilities ────────────────────────────────────────────── */}
        {activeTab === "capabilities" && (
          <div className="max-w-2xl space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Agent Capabilities</h2>

            {/* Inline capabilities from agent JSON */}
            {(agent.capabilities as string[] | null)?.length ? (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Core Capabilities</div>
                <div className="flex flex-wrap gap-2">
                  {(agent.capabilities as string[]).map(cap => (
                    <Badge key={cap} variant="outline" className="text-[11px]">{cap}</Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Registered capabilities from DB */}
            {capabilities.length > 0 ? (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Registered Capabilities</div>
                <div className="space-y-2">
                  {capabilities.map((cap: any) => (
                    <div key={cap.id} className="flex items-center gap-3 rounded-lg border border-border bg-white/[0.02] px-4 py-2.5">
                      <Zap size={12} className="text-amber-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{cap.capability}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{cap.category}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{cap.proficiency}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              !((agent.capabilities as string[] | null)?.length) && (
                <div className="text-center py-16 border border-dashed border-border rounded-xl">
                  <Zap size={28} className="text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No capabilities registered yet.</p>
                </div>
              )
            )}
          </div>
        )}

        {/* ── Heartbeat ───────────────────────────────────────────────── */}
        {activeTab === "heartbeat" && (
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Heartbeat Log</h2>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => heartbeatMutation.mutate({ agentId })} disabled={heartbeatMutation.isPending}>
                <Heart size={13} /> {heartbeatMutation.isPending ? "Running..." : "Trigger Now"}
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Heartbeat Enabled</div>
                <div className="text-sm font-semibold text-foreground">{agent.heartbeatEnabled ? "Yes" : "No"}</div>
              </div>
              <div className="rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Schedule</div>
                <div className="text-sm font-semibold text-foreground font-mono">{agent.heartbeatCron || "—"}</div>
              </div>
              <div className="rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Last Heartbeat</div>
                <div className="text-sm font-semibold text-foreground">
                  {agent.lastHeartbeat ? new Date(agent.lastHeartbeat).toLocaleString() : "Never"}
                </div>
              </div>
            </div>

            {heartbeatLog.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-xl">
                <Heart size={28} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No heartbeat entries yet. Trigger one to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(heartbeatLog as any[]).slice(0, 20).map((entry: any) => (
                  <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-border bg-white/[0.02] px-4 py-2.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${entry.status === "success" ? "bg-emerald-400" : "bg-red-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-foreground">
                        Checked {entry.tasksChecked} tasks, acted on {entry.tasksActedOn}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()} · {entry.duration}ms · {entry.tokenCost} tokens
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${entry.status === "success" ? "text-emerald-400 border-emerald-400/30" : "text-red-400 border-red-400/30"}`}>
                      {entry.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Budget ──────────────────────────────────────────────────── */}
        {activeTab === "budget" && (
          <div className="max-w-2xl space-y-6">
            <h2 className="text-sm font-semibold text-foreground">Budget & Costs</h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Monthly Budget</div>
                <div className="text-xl font-bold text-foreground">${monthlyBudget.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Budget Used</div>
                <div className={`text-xl font-bold ${budgetPercent >= budgetThreshold ? "text-amber-400" : "text-foreground"}`}>
                  ${budgetUsed.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Budget Utilization</div>
                <div className={`text-xl font-bold ${budgetPercent >= budgetThreshold ? "text-amber-400" : "text-emerald-400"}`}>
                  {budgetPercent.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Budget bar */}
            {monthlyBudget > 0 && (
              <div>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>$0</span>
                  <span>${monthlyBudget.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      budgetPercent >= budgetThreshold ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                    style={{ width: `${budgetPercent}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Alert threshold: {budgetThreshold}%
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Value Created</div>
                <div className="text-lg font-bold text-emerald-400">${Number(agent.totalValueCreated).toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Cost Incurred</div>
                <div className="text-lg font-bold text-foreground">${Number(agent.totalCostIncurred).toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Autonomy & RALF ─────────────────────────────────────────────── */}
        {activeTab === "autonomy" && <AutonomyTab agentId={agentId} agentName={agent.name} />}

        {/* ── Connector (BYOA) ──────────────────────────────────────────────── */}
        {activeTab === "connector" && <ConnectorTab agentId={agentId} currentType={agent.connectorType} hasConfig={!!agent.connectorConfig} />}

        {/* ── Settings ──────────────────────────────────────────────────────── */}
        {activeTab === "settings" && (
          <div className="max-w-2xl space-y-6">
            <h2 className="text-sm font-semibold text-foreground">Agent Settings</h2>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Description</label>
              <Textarea
                value={descVal}
                onChange={e => setDescVal(e.target.value)}
                onBlur={() => updateMutation.mutate({ id: agentId, description: descVal.trim() || undefined } as any)}
                placeholder="What does this agent do?"
                rows={3}
                className="resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Job Description</label>
              <Textarea
                value={jobDescVal}
                onChange={e => setJobDescVal(e.target.value)}
                onBlur={() => updateMutation.mutate({ id: agentId, jobDescription: jobDescVal.trim() || undefined })}
                placeholder="Detailed role and responsibilities..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Role Title</label>
              <Input
                defaultValue={agent.roleTitle ?? ""}
                onBlur={e => {
                  const val = e.target.value.trim();
                  if (val !== (agent.roleTitle ?? "")) {
                    updateMutation.mutate({ id: agentId, roleTitle: val || undefined });
                  }
                }}
                placeholder="e.g. Chief Technology Officer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Monthly Budget ($)</label>
                <Input
                  type="number"
                  defaultValue={monthlyBudget}
                  onBlur={e => {
                    const val = Number(e.target.value);
                    if (!isNaN(val)) updateMutation.mutate({ id: agentId, monthlyBudget: val });
                  }}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Budget Alert Threshold (%)</label>
                <Input
                  type="number"
                  defaultValue={budgetThreshold}
                  onBlur={e => {
                    const val = Number(e.target.value);
                    if (!isNaN(val) && val >= 0 && val <= 100) updateMutation.mutate({ id: agentId, budgetAlertThreshold: val });
                  }}
                  placeholder="75"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Heartbeat Cron Schedule</label>
              <Input
                defaultValue={agent.heartbeatCron ?? ""}
                onBlur={e => {
                  const val = e.target.value.trim();
                  updateMutation.mutate({ id: agentId, heartbeatCron: val || null, heartbeatEnabled: !!val });
                }}
                placeholder="*/30 * * * * (every 30 minutes)"
                className="font-mono text-sm"
              />
            </div>

            {/* Danger zone */}
            <div className="pt-6 border-t border-border">
              <h3 className="text-sm font-semibold text-red-400 mb-3">Danger Zone</h3>
              <div className="flex flex-wrap gap-2">
                {agent.status !== "terminated" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-red-400 border-red-400/30 hover:bg-red-400/10"
                    onClick={() => statusMutation.mutate({ id: agentId, status: "terminated" })}
                  >
                    <Power size={13} /> Terminate Agent
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-red-400 border-red-400/30 hover:bg-red-400/10"
                  onClick={() => {
                    if (confirm("Are you sure you want to permanently delete this agent?")) {
                      deleteMutation.mutate({ id: agentId });
                    }
                  }}
                >
                  <XCircle size={13} /> Delete Agent
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Connector (BYOA) Tab ─────────────────────────────────────────────── */
const CONNECTOR_OPTIONS = [
  { value: "internal",   label: "OpenCommand AI", desc: "Powered by OpenCommand's built-in AI — no key required",  badge: "Managed",   color: "text-emerald-400", logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663354746985/WP82CNZ6C5SdwCUYfYptJQ/opencommand-ai-owl-icon-e3SxVtUebh4P2Phx8gqNjM.webp" },
  { value: "openai",     label: "OpenAI",         desc: "GPT-4o, GPT-4 Turbo, or any OpenAI model",                badge: "BYOA",      color: "text-blue-400" },
  { value: "anthropic",  label: "Anthropic",      desc: "Claude 3.5 Sonnet, Claude 3 Opus, and more",              badge: "BYOA",      color: "text-violet-400" },
  { value: "gemini",     label: "Gemini",         desc: "Google Gemini Pro or Ultra — get key at aistudio.google.com/apikey", badge: "BYOA", color: "text-amber-400", keyLink: "https://aistudio.google.com/apikey" },
  { value: "custom_api", label: "Custom API",     desc: "Any HTTP endpoint that accepts a task payload",           badge: "BYOA",      color: "text-pink-400" },
  { value: "crewai",     label: "CrewAI",         desc: "CrewAI crew endpoint via /kickoff",                       badge: "BYOA",      color: "text-cyan-400" },
] as const;

type ConnectorType = typeof CONNECTOR_OPTIONS[number]["value"];

function ConnectorTab({ agentId, currentType, hasConfig }: { agentId: number; currentType: string; hasConfig: boolean }) {
  const utils = trpc.useUtils();
  const [selectedType, setSelectedType] = useState<ConnectorType>((currentType as ConnectorType) ?? "internal");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [url, setUrl] = useState("");
  const [authHeader, setAuthHeader] = useState("");
  const [crewName, setCrewName] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savedMasked, setSavedMasked] = useState<string | null>(null);

  const updateConnector = trpc.agents.updateConnector.useMutation({
    onSuccess: (data: any) => {
      utils.agents.get.invalidate({ id: agentId });
      if (data.maskedApiKey) setSavedMasked(data.maskedApiKey);
      setApiKey(""); // clear raw key from state after save
      toast.success("Connector saved", { description: `Using ${data.connectorType}` });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const testConnection = trpc.agents.testConnection.useMutation({
    onSuccess: (data: any) => {
      if (data.ok) toast.success("Connection verified", { description: data.message });
      else toast.error("Connection failed", { description: data.message });
    },
    onError: (e: any) => toast.error("Test failed", { description: e.message }),
  });

  const handleSave = () => {
    const payload: any = { id: agentId, connectorType: selectedType };
    if (apiKey) payload.apiKey = apiKey;
    if (model) payload.model = model;
    if (url) payload.url = url;
    if (authHeader) payload.authHeader = authHeader;
    if (crewName) payload.crewName = crewName;
    updateConnector.mutate(payload);
  };

  const needsApiKey = ["openai", "anthropic", "gemini"].includes(selectedType);
  const needsUrl = ["custom_api", "crewai"].includes(selectedType);
  const configSaved = hasConfig || !!savedMasked;

  return (
    <div className="max-w-2xl space-y-8">
      {/* Provider selector */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-1">Agent Provider</h2>
        <p className="text-xs text-muted-foreground mb-4">Choose which AI powers this agent's execution and RALF loop</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CONNECTOR_OPTIONS.map(opt => {
            const isActive = selectedType === opt.value;
            const hasLogo = !!(opt as any).logo;
            const keyLink = (opt as any).keyLink as string | undefined;
            return (
              <button
                key={opt.value}
                onClick={() => setSelectedType(opt.value)}
                className={`text-left rounded-xl border p-4 transition-all ${
                  isActive ? "border-white/20 bg-white/[0.06]" : "border-border bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {hasLogo
                    ? <img src={(opt as any).logo} alt="" className="w-4 h-4 rounded-sm object-cover" />
                    : <span className={`w-2 h-2 rounded-full ${isActive ? "bg-current" : "bg-zinc-600"} ${opt.color}`} />
                  }
                  <span className={`text-sm font-medium ${isActive ? opt.color : "text-foreground"}`}>{opt.label}</span>
                  <span className="ml-auto text-[9px] font-medium uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">{opt.badge}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                {keyLink && isActive && (
                  <a
                    href={keyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="mt-2 inline-flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 underline underline-offset-2"
                  >
                    Get Gemini API key → aistudio.google.com/apikey
                  </a>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Credentials */}
      {selectedType !== "internal" && (
        <div className="rounded-xl border border-border bg-white/[0.02] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Plug size={14} className="text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Credentials</h3>
            {configSaved && (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400">
                <CheckCircle2 size={10} /> Saved
              </span>
            )}
          </div>

          {needsApiKey && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">API Key</label>
              {savedMasked && !apiKey ? (
                <div className="flex items-center gap-2">
                  <Input value={savedMasked} readOnly className="font-mono text-sm flex-1" />
                  <Button size="sm" variant="outline" onClick={() => setSavedMasked(null)} className="shrink-0">Replace</Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={`sk-... (${selectedType} API key)`}
                    className="font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-1.5">Stored AES-256 encrypted. Never returned after save.</p>
            </div>
          )}

          {(needsApiKey || needsUrl) && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Model {needsUrl ? "/ Crew Name" : "(optional)"}</label>
              <Input
                value={needsUrl ? crewName : model}
                onChange={e => needsUrl ? setCrewName(e.target.value) : setModel(e.target.value)}
                placeholder={needsUrl ? "my-crew" : "gpt-4o, claude-3-5-sonnet-20241022, gemini-1.5-pro"}
                className="font-mono text-sm"
              />
            </div>
          )}

          {needsUrl && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Endpoint URL</label>
              <Input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://your-agent.example.com/api"
                className="font-mono text-sm"
              />
              {selectedType === "custom_api" && (
                <div className="mt-2">
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Auth Header (optional)</label>
                  <Input
                    value={authHeader}
                    onChange={e => setAuthHeader(e.target.value)}
                    placeholder="Bearer sk-..."
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={updateConnector.isPending}
          className="gap-2"
        >
          {updateConnector.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />}
          Save Connector
        </Button>
        {selectedType !== "internal" && configSaved && (
          <Button
            variant="outline"
            onClick={() => testConnection.mutate({ id: agentId })}
            disabled={testConnection.isPending}
            className="gap-2"
          >
            {testConnection.isPending ? <Loader2 size={13} className="animate-spin" /> : <FlaskConical size={13} />}
            Test Connection
          </Button>
        )}
      </div>

      {/* Info box for internal */}
      {selectedType === "internal" && (
        <div className="rounded-xl border border-border/50 bg-white/[0.02] p-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Internal</strong> uses OpenCommand's built-in AI — no API key required.
            Switch to OpenAI, Anthropic, Gemini, or a custom endpoint to bring your own model.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Autonomy & RALF Tab ──────────────────────────────────────────────── */
const AUTONOMY_LEVELS = [
  { value: "full_auto", label: "Full Auto", desc: "Agent acts independently, no approvals needed", color: "text-emerald-400" },
  { value: "supervised", label: "Supervised", desc: "Agent acts but logs everything for review", color: "text-blue-400" },
  { value: "approval_required", label: "Approval Required", desc: "Agent proposes, human approves before execution", color: "text-amber-400" },
  { value: "manual_only", label: "Manual Only", desc: "Agent only responds when directly asked", color: "text-red-400" },
] as const;

function AutonomyTab({ agentId, agentName }: { agentId: number; agentName: string }) {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.autonomy.get.useQuery({ agentId });
  const { data: ralfLogs = [] } = trpc.ralf.logsByAgent.useQuery({ agentId, limit: 20 });

  const updateMutation = trpc.autonomy.update.useMutation({
    onSuccess: () => {
      utils.autonomy.get.invalidate({ agentId });
      toast.success("Autonomy settings updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentLevel = AUTONOMY_LEVELS.find(l => l.value === settings.autonomyLevel) ?? AUTONOMY_LEVELS[1];

  return (
    <div className="max-w-3xl space-y-8">
      {/* Autonomy Level Selector */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-1">Autonomy Level</h2>
        <p className="text-xs text-muted-foreground mb-4">Controls how independently {agentName} can act</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AUTONOMY_LEVELS.map(level => {
            const isActive = settings.autonomyLevel === level.value;
            return (
              <button
                key={level.value}
                onClick={() => updateMutation.mutate({ agentId, autonomyLevel: level.value })}
                className={`text-left rounded-xl border p-4 transition-all ${
                  isActive
                    ? "border-white/20 bg-white/[0.06]"
                    : "border-border bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${isActive ? "bg-current" : "bg-zinc-600"} ${level.color}`} />
                  <span className={`text-sm font-medium ${isActive ? level.color : "text-foreground"}`}>{level.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{level.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Guardrails */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-4">Guardrails</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-white/[0.02] p-4">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 block">Max Spend Per Task ($)</label>
            <Input
              type="number"
              defaultValue={Number(settings.maxSpendPerTask ?? 50)}
              onBlur={e => {
                const val = Number(e.target.value);
                if (!isNaN(val) && val >= 0) updateMutation.mutate({ agentId, maxSpendPerTask: val });
              }}
              className="h-8"
            />
          </div>
          <div className="rounded-xl border border-border bg-white/[0.02] p-4">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 block">Max Tasks Per Day</label>
            <Input
              type="number"
              defaultValue={settings.maxTasksPerDay ?? 10}
              onBlur={e => {
                const val = Number(e.target.value);
                if (!isNaN(val) && val >= 0) updateMutation.mutate({ agentId, maxTasksPerDay: val });
              }}
              className="h-8"
            />
          </div>
          <div className="rounded-xl border border-border bg-white/[0.02] p-4">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 block">Require Approval Above ($)</label>
            <Input
              type="number"
              defaultValue={Number(settings.requireApprovalAbove ?? 100)}
              onBlur={e => {
                const val = Number(e.target.value);
                if (!isNaN(val) && val >= 0) updateMutation.mutate({ agentId, requireApprovalAbove: val });
              }}
              className="h-8"
            />
          </div>
          <div className="rounded-xl border border-border bg-white/[0.02] p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Cross-Model Verification</div>
              <div className="text-[11px] text-muted-foreground">Second AI validates outputs</div>
            </div>
            <button
              onClick={() => updateMutation.mutate({ agentId, crossModelVerification: !settings.crossModelVerification })}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                settings.crossModelVerification ? "bg-emerald-500" : "bg-zinc-700"
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.crossModelVerification ? "left-5" : "left-0.5"
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* RALF Toggle */}
      <div className="rounded-xl border border-border bg-white/[0.02] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-0.5">RALF Loop Execution</h2>
            <p className="text-[11px] text-muted-foreground">Reason → Act → Learn → Feedback cycle for every task</p>
          </div>
          <button
            onClick={() => updateMutation.mutate({ agentId, ralfEnabled: !settings.ralfEnabled })}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              settings.ralfEnabled ? "bg-emerald-500" : "bg-zinc-700"
            }`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              settings.ralfEnabled ? "left-5" : "left-0.5"
            }`} />
          </button>
        </div>
      </div>

      {/* Recent RALF Execution History */}
      {ralfLogs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Recent RALF Executions</h2>
          <div className="space-y-2">
            {ralfLogs.slice(0, 10).map((log: any) => {
              const phaseColors: Record<string, string> = {
                reason: "text-blue-400 bg-blue-400/10 border-blue-400/20",
                act: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
                learn: "text-amber-400 bg-amber-400/10 border-amber-400/20",
                feedback: "text-purple-400 bg-purple-400/10 border-purple-400/20",
              };
              const statusIcons: Record<string, React.ElementType> = {
                completed: CheckCircle2,
                failed: XCircle,
                running: Loader2,
                pending: Clock,
              };
              const StatusIcon = statusIcons[log.status] ?? Clock;
              return (
                <div key={log.id} className="flex items-center gap-3 rounded-lg border border-border bg-white/[0.02] px-4 py-2.5">
                  <Badge variant="outline" className={`text-[10px] uppercase ${phaseColors[log.phase] ?? ""}`}>
                    {log.phase}
                  </Badge>
                  <span className="flex-1 text-xs text-muted-foreground truncate">{log.output?.slice(0, 80) ?? "—"}</span>
                  <StatusIcon size={13} className={log.status === "completed" ? "text-emerald-400" : log.status === "failed" ? "text-red-400" : "text-muted-foreground"} />
                  <span className="text-[10px] text-muted-foreground">
                    {log.confidence ? `${(Number(log.confidence) * 100).toFixed(0)}%` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
