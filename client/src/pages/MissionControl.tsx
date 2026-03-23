import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { JSX } from "react";
import {
  Target, Zap, Plus, Trash2, Check, X, Clock, TrendingUp, DollarSign, FileCheck,
  Inbox, Building2, GitBranch, Heart, Activity, BarChart3, Shield, Power, Wrench,
  CheckCircle2, Sparkles, ArrowRight, Bot
} from "lucide-react";

type Tab = "okrs" | "fleet" | "org" | "heartbeat" | "budget" | "poo" | "inbox" | "governance";

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: "okrs", label: "OKRs", icon: Target },
  { id: "fleet", label: "Fleet", icon: Zap },
  { id: "org", label: "Org Chart", icon: GitBranch },
  { id: "heartbeat", label: "Heartbeat", icon: Heart },
  { id: "budget", label: "P&L", icon: DollarSign },
  { id: "poo", label: "PoO Ledger", icon: FileCheck },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "governance", label: "Governance", icon: Shield },
];

const typeColors: Record<string, string> = {
  ceo: "text-amber-400 border-amber-400/30",
  cto: "text-blue-400 border-blue-400/30",
  cmo: "text-pink-400 border-pink-400/30",
  cfo: "text-emerald-400 border-emerald-400/30",
  vp: "text-violet-400 border-violet-400/30",
  manager: "text-cyan-400 border-cyan-400/30",
  specialist: "text-orange-400 border-orange-400/30",
};

// ─── Onboarding Banner Component ──────────────────────────────────────────────
function OnboardingBanner({ companyId, navigate }: { companyId: number | null; navigate: (to: string) => void }) {
  const onboardingQ = trpc.onboarding.status.useQuery(
    { companyId: companyId ?? undefined },
    { enabled: !!companyId }
  );
  const generateStrategy = trpc.onboarding.generateStrategy.useMutation({
    onSuccess: () => {
      toast.success("Strategy proposal generated!", { description: "Arch has produced a formal strategic plan." });
    },
    onError: (err: any) => toast.error("Failed to generate strategy", { description: err.message }),
  });

  const data = onboardingQ.data;
  if (!data || data.total === 0) return null;

  const roleColors: Record<string, string> = {
    ceo: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    cto: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    cmo: "text-pink-400 bg-pink-400/10 border-pink-400/20",
    cfo: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    vp: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  };

  if (data.allOnboarded) {
    return (
      <div className="mb-6 border border-emerald-500/20 rounded-xl p-4 bg-emerald-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-400">All executives onboarded</p>
              <p className="text-xs text-muted-foreground">Baseline context established for {data.total} C-suite agents.</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => companyId && generateStrategy.mutate({ companyId })}
            disabled={generateStrategy.isPending}
            className="gap-1.5 text-xs"
          >
            <Sparkles size={12} />
            {generateStrategy.isPending ? "Generating..." : "Generate Strategy"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 border border-amber-500/20 rounded-xl p-4 bg-amber-500/5">
      <div className="flex items-center gap-3 mb-3">
        <Bot size={18} className="text-amber-400" />
        <div>
          <p className="text-sm font-medium text-amber-400">Executive Onboarding Required</p>
          <p className="text-xs text-muted-foreground">
            {data.completed} of {data.total} C-suite agents onboarded. Complete all to unlock Arch's strategy proposal.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.agents.map((a: any) => (
          <button
            key={a.agentId}
            onClick={() => navigate(`/onboarding/${a.agentId}`)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:opacity-80 ${
              a.isOnboarded
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : roleColors[a.agentType] ?? "text-foreground bg-zinc-800 border-border"
            }`}
          >
            {a.isOnboarded ? <CheckCircle2 size={12} /> : <ArrowRight size={12} />}
            {a.agentName}
            <span className="text-[10px] opacity-60">{a.agentType.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MissionControl() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("okrs");
  const [showAddOkr, setShowAddOkr] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showAddDept, setShowAddDept] = useState(false);
  const [showAddGate, setShowAddGate] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [newOkr, setNewOkr] = useState({ objective: "", keyResult: "", targetValue: "", unit: "USD", level: "company" });
  const [newAgent, setNewAgent] = useState({ name: "", type: "specialist", roleTitle: "", description: "", heartbeatCron: "", monthlyBudget: "" });
  const [newDept, setNewDept] = useState({ name: "", budget: "" });
  const [newGate, setNewGate] = useState({ gateType: "spend", description: "", threshold: "" });

  // Queries
  const companiesQ = trpc.companies.list.useQuery(undefined, { enabled: isAuthenticated });
  const companies = companiesQ.data ?? [];
  const company0 = companies[0];
  const effectiveCompanyId = selectedCompanyId ?? company0?.id ?? null;
  const selectedCompany = companies.find((c: any) => c.id === effectiveCompanyId) ?? null;

  const agentsQ = trpc.agents.list.useQuery(undefined, { enabled: isAuthenticated });
  const agents = agentsQ.data ?? [];
  const companyAgents = agents.filter(a => (a as any).companyId === effectiveCompanyId || !effectiveCompanyId);

  const okrsQ = trpc.okrs.list.useQuery(undefined, { enabled: isAuthenticated });
  const okrs = okrsQ.data ?? [];

  const pooQ = trpc.poo.list.useQuery(undefined, { enabled: isAuthenticated });
  const pooReceipts = pooQ.data ?? [];

  const inboxQ = trpc.inbox.list.useQuery(undefined, { enabled: isAuthenticated });
  const inboxItems = inboxQ.data ?? [];
  const unread = inboxItems.filter(i => i.status === "unread").length;

  const deptsQ = trpc.departments.list.useQuery({ companyId: effectiveCompanyId! }, { enabled: isAuthenticated && !!effectiveCompanyId });
  const departments = deptsQ.data ?? [];

  const gatesQ = trpc.governance.gates.useQuery({ companyId: effectiveCompanyId! }, { enabled: isAuthenticated && !!effectiveCompanyId });
  const gates = gatesQ.data ?? [];

  const toolsQ = trpc.integrations.tools.useQuery({ companyId: effectiveCompanyId! }, { enabled: isAuthenticated && !!effectiveCompanyId });
  const tools = toolsQ.data ?? [];

  const auditQ = trpc.governance.auditLog.useQuery({ companyId: effectiveCompanyId! }, { enabled: isAuthenticated && !!effectiveCompanyId });
  const auditEntries = auditQ.data ?? [];

  const pnlQ = trpc.companies.pnl.useQuery({ companyId: effectiveCompanyId! }, { enabled: isAuthenticated && !!effectiveCompanyId });

  // Computed
  const totalValue = pooReceipts.reduce((s, r) => s + Number(r.dollarValueCreated), 0);
  const totalCosts = agents.reduce((s, a) => s + Number((a as any).totalCostIncurred ?? 0), 0);
  const totalHours = pooReceipts.reduce((s, r) => s + Number(r.laborHoursSaved), 0);
  const totalReceipts = pooReceipts.length;
  const activeAgents = agents.filter(a => a.status === "active").length;

  // Org tree
  const orgTree = useMemo(() => {
    const byParent = new Map<number | null, typeof companyAgents>();
    let ceo: (typeof companyAgents)[0] | null = null;
    for (const a of companyAgents) {
      if (a.type === "ceo") ceo = a;
      const pid = (a as any).parentAgentId ?? null;
      if (!byParent.has(pid)) byParent.set(pid, []);
      byParent.get(pid)!.push(a);
    }
    return { ceo, byParent };
  }, [companyAgents]);

  const renderOrgNode = (agent: (typeof companyAgents)[0], depth: number): JSX.Element | null => {
    const children = orgTree.byParent.get(agent.id) ?? [];
    return (
      <div key={agent.id} style={{ marginLeft: depth * 28 }} className="animate-fade-in">
        <div className="card-minimal flex items-center gap-3 mb-1.5">
          <div className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-emerald-500 animate-pulse-subtle" : "bg-zinc-700"}`} />
          <span className={`text-mono text-xs border px-1.5 py-0.5 rounded ${typeColors[agent.type] ?? "text-foreground border-border"}`}>{agent.type}</span>
          <span className="font-medium text-sm text-foreground">{agent.name}</span>
          {(agent as any).roleTitle && <span className="text-muted-foreground text-xs">— {(agent as any).roleTitle}</span>}
        </div>
        {children.map(c => renderOrgNode(c, depth + 1))}
      </div>
    );
  };

  // Mutations
  const utils = trpc.useUtils();
  const createOkr = trpc.okrs.create.useMutation({ onSuccess: () => { utils.okrs.list.invalidate(); setShowAddOkr(false); setNewOkr({ objective: "", keyResult: "", targetValue: "", unit: "USD", level: "company" }); toast.success("OKR created"); } });
  const createAgentMut = trpc.agents.create.useMutation({ onSuccess: () => { utils.agents.list.invalidate(); setShowAddAgent(false); setNewAgent({ name: "", type: "specialist", roleTitle: "", description: "", heartbeatCron: "", monthlyBudget: "" }); toast.success("Agent deployed"); } });
  const deleteAgentMut = trpc.agents.remove.useMutation({ onSuccess: () => { utils.agents.list.invalidate(); toast.success("Agent removed"); } });
  const updateAgentStatus = trpc.agents.updateStatus.useMutation({ onSuccess: () => { utils.agents.list.invalidate(); } });
  const createDeptMut = trpc.departments.create.useMutation({ onSuccess: () => { utils.departments.list.invalidate(); setShowAddDept(false); setNewDept({ name: "", budget: "" }); toast.success("Department created"); } });
  const resolveInbox = trpc.inbox.resolve.useMutation({ onSuccess: () => { utils.inbox.list.invalidate(); toast.success("Resolved"); } });
  const dismissInbox = trpc.inbox.dismiss.useMutation({ onSuccess: () => { utils.inbox.list.invalidate(); } });
  const triggerHeartbeat = trpc.agents.triggerHeartbeat.useMutation({ onSuccess: () => { toast.success("Heartbeat triggered"); } });
  const createGateMut = trpc.governance.createGate.useMutation({ onSuccess: () => { utils.governance.gates.invalidate(); setShowAddGate(false); setNewGate({ gateType: "spend", description: "", threshold: "" }); toast.success("Gate created"); } });
  const removeGateMut = trpc.governance.removeGate.useMutation({ onSuccess: () => { utils.governance.gates.invalidate(); toast.success("Gate removed"); } });
  const killSwitchMut = trpc.governance.killSwitch.useMutation({ onSuccess: () => { utils.agents.list.invalidate(); toast.success("Kill switch activated — all agents paused"); } });

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-display text-3xl lg:text-4xl text-foreground">Mission Control</h1>
            <p className="text-muted-foreground text-sm mt-1.5">Monitor, manage, and optimize your agent organization.</p>
          </div>
          <div className="flex items-center gap-3">
            {companies.length > 0 && (
              <Select value={String(effectiveCompanyId ?? "")} onValueChange={v => setSelectedCompanyId(Number(v))}>
                <SelectTrigger className="bg-input border-border text-foreground text-xs w-auto min-w-[160px] h-8 rounded-md">
                  <Building2 size={12} className="mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {companies.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-subtle" />
              <span className="text-label text-[10px]">Arch Online</span>
            </div>
          </div>
        </div>
        <div className="accent-line" />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        {[
          { label: "Value Created", value: `$${totalValue.toLocaleString()}`, color: "text-emerald-400" },
          { label: "Total Costs", value: `$${totalCosts.toFixed(2)}`, color: "text-amber-400" },
          { label: "Hours Saved", value: `${totalHours.toFixed(0)} hrs`, color: "text-blue-400" },
          { label: "PoO Receipts", value: totalReceipts.toString(), color: "text-violet-400" },
          { label: "Active Agents", value: `${activeAgents} / ${agents.length}`, color: "text-foreground" },
        ].map((kpi, i) => (
          <div key={i} className="stat-card">
            <div className="stat-label">{kpi.label}</div>
            <div className={`stat-value ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* ─── ONBOARDING BANNER ─── */}
      <OnboardingBanner companyId={effectiveCompanyId} navigate={navigate} />

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border mb-8 scrollbar-hide">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            <t.icon size={14} strokeWidth={1.5} />
            {t.label}
            {t.id === "inbox" && unread > 0 && <span className="badge-accent text-[10px] px-1.5 py-0 ml-1">{unread}</span>}
          </button>
        ))}
      </div>

      {/* ─── OKR TRACKER ─── */}
      {tab === "okrs" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-heading text-lg">Objectives & Key Results</h2>
            <Button onClick={() => setShowAddOkr(true)} size="sm" className="btn-primary text-xs gap-1.5 h-8">
              <Plus size={13} /> Add OKR
            </Button>
          </div>
          {okrs.length === 0 ? (
            <div className="card-minimal text-center py-12">
              <Target size={28} className="text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-muted-foreground text-sm">No OKRs defined yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {okrs.map(okr => {
                const progress = Math.min(100, (Number(okr.currentValue) / Number(okr.targetValue)) * 100);
                const sc: Record<string, string> = { on_track: "badge-success", at_risk: "badge-accent", achieved: "badge-success", missed: "badge-minimal" };
                return (
                  <div key={okr.id} className="card-minimal">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-label text-[10px]">{(okr as any).level?.toUpperCase() ?? "COMPANY"}</span>
                        </div>
                        <h3 className="font-semibold text-foreground">{okr.objective}</h3>
                        <p className="text-muted-foreground text-sm mt-0.5">{okr.keyResult}</p>
                      </div>
                      <span className={`${sc[okr.status] ?? "badge-minimal"} ml-4`}>{okr.status.replace("_", " ")}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 progress-bar-bg"><div className={progress >= 100 ? "progress-bar-fill-green" : "progress-bar-fill"} style={{ width: `${progress}%` }} /></div>
                      <span className="text-mono text-xs text-muted-foreground whitespace-nowrap">{Number(okr.currentValue).toLocaleString()} / {Number(okr.targetValue).toLocaleString()} {okr.unit}</span>
                      <span className="font-semibold text-sm text-foreground">{progress.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── AGENT FLEET ─── */}
      {tab === "fleet" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-heading text-lg">Agent Fleet — {agents.length} units</h2>
            <Button onClick={() => setShowAddAgent(true)} size="sm" className="btn-primary text-xs gap-1.5 h-8">
              <Plus size={13} /> Deploy Agent
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map(agent => (
              <div key={agent.id} className="card-minimal">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-mono text-xs border px-1.5 py-0.5 rounded ${typeColors[agent.type] ?? "text-foreground border-border"}`}>{agent.type}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${agent.status === "active" ? "bg-emerald-500 animate-pulse-subtle" : agent.status === "error" ? "bg-red-500" : "bg-zinc-600"}`} />
                    <span className="text-mono text-[11px] text-muted-foreground">{agent.status}</span>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-0.5">{agent.name}</h3>
                {(agent as any).roleTitle && <p className="text-label text-[10px] mb-2">{(agent as any).roleTitle}</p>}
                <p className="text-muted-foreground text-xs leading-relaxed mb-4 line-clamp-2">{agent.description}</p>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div><span className="text-label text-[10px]">Tasks</span><div className="font-semibold text-foreground">{agent.tasksCompleted}</div></div>
                  <div><span className="text-label text-[10px]">Value</span><div className="font-semibold text-emerald-400">${Number(agent.totalValueCreated ?? 0).toFixed(0)}</div></div>
                  <div><span className="text-label text-[10px]">Cost</span><div className="font-semibold text-amber-400">${Number((agent as any).totalCostIncurred ?? 0).toFixed(2)}</div></div>
                </div>
                {Number((agent as any).monthlyBudget ?? 0) > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-label text-[10px]">Budget</span>
                      <span className="text-mono text-[10px] text-muted-foreground">${Number((agent as any).budgetUsed ?? 0).toFixed(2)} / ${Number((agent as any).monthlyBudget ?? 0).toFixed(0)}</span>
                    </div>
                    <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${Math.min(100, (Number((agent as any).budgetUsed ?? 0) / Number((agent as any).monthlyBudget ?? 1)) * 100)}%` }} /></div>
                  </div>
                )}
                <div className="flex gap-2">
                  {agent.status === "idle" && (
                    <button onClick={() => updateAgentStatus.mutate({ id: agent.id, status: "active" })} className="flex-1 btn-outline text-xs py-1.5">Activate</button>
                  )}
                  {agent.status === "active" && (
                    <button onClick={() => updateAgentStatus.mutate({ id: agent.id, status: "idle" })} className="flex-1 btn-outline text-xs py-1.5">Pause</button>
                  )}
                  {agent.status === "paused" && (
                    <button onClick={() => updateAgentStatus.mutate({ id: agent.id, status: "active" })} className="flex-1 btn-outline text-xs py-1.5">Resume</button>
                  )}
                  <button onClick={() => { if (confirm("Remove this agent?")) deleteAgentMut.mutate({ id: agent.id }); }} className="btn-outline text-xs px-3 py-1.5 text-red-400 border-red-400/30 hover:bg-red-400/10">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── ORG CHART ─── */}
      {tab === "org" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-heading text-lg">Organizational Hierarchy</h2>
            <div className="flex gap-2">
              <Button onClick={() => setShowAddDept(true)} size="sm" variant="outline" className="text-xs gap-1.5 h-8">
                <Plus size={13} /> Department
              </Button>
              <Button onClick={() => setShowAddAgent(true)} size="sm" className="btn-primary text-xs gap-1.5 h-8">
                <Plus size={13} /> Agent
              </Button>
            </div>
          </div>
          {departments.length > 0 && (
            <div className="mb-6">
              <p className="text-label mb-3">Departments</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {departments.map((dept: any) => (
                  <div key={dept.id} className="stat-card">
                    <div className="font-medium text-sm text-foreground">{dept.name}</div>
                    {Number(dept.budget ?? 0) > 0 && <div className="text-mono text-xs text-muted-foreground mt-1">${Number(dept.budget).toLocaleString()} budget</div>}
                    <div className="text-mono text-[10px] text-muted-foreground mt-1">{companyAgents.filter(a => a.departmentId === dept.id).length} agents</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-label mb-3">Agent Hierarchy</p>
          {companyAgents.length === 0 ? (
            <div className="card-minimal text-center py-12">
              <GitBranch size={28} className="text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-muted-foreground text-sm">No agents in this company.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {orgTree.ceo && renderOrgNode(orgTree.ceo, 0)}
              {(orgTree.byParent.get(null) ?? []).filter(a => a.id !== orgTree.ceo?.id).map(a => renderOrgNode(a, 0))}
            </div>
          )}
        </div>
      )}

      {/* ─── HEARTBEAT ─── */}
      {tab === "heartbeat" && (
        <div className="animate-fade-in">
          <h2 className="text-heading text-lg mb-5">Heartbeat Scheduler</h2>
          <div className="space-y-2">
            {agents.map(agent => (
              <div key={agent.id} className="card-minimal flex items-center gap-4">
                <Heart size={16} className={agent.status === "active" ? "text-emerald-500 animate-pulse-subtle" : "text-muted-foreground"} strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground">{agent.name}</div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-mono text-xs text-muted-foreground">{(agent as any).heartbeatCron || "No schedule"}</span>
                    {(agent as any).lastHeartbeat && <span className="text-mono text-[10px] text-muted-foreground">Last: {new Date((agent as any).lastHeartbeat).toLocaleString()}</span>}
                  </div>
                </div>
                <span className={`badge-minimal text-[10px] ${(agent as any).heartbeatEnabled ? "!text-emerald-400 !border-emerald-400/30 !bg-emerald-400/10" : ""}`}>
                  {(agent as any).heartbeatEnabled ? "Enabled" : "Disabled"}
                </span>
                <button onClick={() => triggerHeartbeat.mutate({ agentId: agent.id })} disabled={triggerHeartbeat.isPending} className="btn-outline text-xs px-3 py-1.5 gap-1">
                  <Activity size={12} /> Pulse
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── P&L DASHBOARD ─── */}
      {tab === "budget" && (
        <div className="animate-fade-in">
          <h2 className="text-heading text-lg mb-5">Profit & Loss</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
            <div className="stat-card"><div className="stat-label">Total Revenue</div><div className="stat-value text-emerald-400">${Number(pnlQ.data?.totalRevenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div></div>
            <div className="stat-card"><div className="stat-label">Total Costs</div><div className="stat-value text-amber-400">${Number(pnlQ.data?.totalCosts ?? 0).toFixed(2)}</div></div>
            <div className="stat-card"><div className="stat-label">Net Profit</div><div className={`stat-value ${Number(pnlQ.data?.netProfit ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>${Number(pnlQ.data?.netProfit ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div></div>
          </div>
          <p className="text-label mb-3">Agent Cost Breakdown</p>
          <div className="space-y-2">
            {agents.filter(a => Number((a as any).totalCostIncurred ?? 0) > 0 || Number(a.totalValueCreated ?? 0) > 0).map(agent => {
              const cost = Number((agent as any).totalCostIncurred ?? 0);
              const value = Number(agent.totalValueCreated ?? 0);
              const roi = cost > 0 ? ((value - cost) / cost * 100) : 0;
              return (
                <div key={agent.id} className="card-minimal flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">{agent.name}</div>
                    <span className="text-label text-[10px]">{agent.type}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-mono text-xs text-emerald-400">+${value.toFixed(2)}</div>
                    <div className="text-mono text-xs text-amber-400">-${cost.toFixed(2)}</div>
                  </div>
                  <div className={`font-semibold text-sm min-w-[60px] text-right ${roi >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {roi.toFixed(0)}% ROI
                  </div>
                </div>
              );
            })}
            {agents.filter(a => Number((a as any).totalCostIncurred ?? 0) > 0 || Number(a.totalValueCreated ?? 0) > 0).length === 0 && (
              <div className="card-minimal text-center py-12">
                <BarChart3 size={28} className="text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-muted-foreground text-sm">No cost data yet. Execute tasks to generate data.</p>
              </div>
            )}
          </div>
          {selectedCompany && Number(selectedCompany.monthlyBudget ?? 0) > 0 && (
            <div className="mt-6">
              <p className="text-label mb-3">Company Budget</p>
              <div className="card-minimal">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-foreground">Monthly Budget</span>
                  <span className="text-mono text-xs text-muted-foreground">${Number(pnlQ.data?.totalCosts ?? 0).toFixed(2)} / ${Number(selectedCompany.monthlyBudget).toLocaleString()}</span>
                </div>
                <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${Math.min(100, (Number(pnlQ.data?.totalCosts ?? 0) / Number(selectedCompany.monthlyBudget)) * 100)}%` }} /></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── PoO LEDGER ─── */}
      {tab === "poo" && (
        <div className="animate-fade-in">
          <h2 className="text-heading text-lg mb-5">Proof of Outcome Ledger — {pooReceipts.length} receipts</h2>
          {pooReceipts.length === 0 ? (
            <div className="card-minimal text-center py-12">
              <FileCheck size={28} className="text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-muted-foreground text-sm">No PoO receipts yet. Execute tasks via the Intent Engine.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pooReceipts.map(receipt => (
                <div key={receipt.id} className="card-minimal">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-mono text-xs text-muted-foreground">{receipt.receiptNumber}</span>
                      <h3 className="font-semibold text-foreground mt-0.5">{receipt.taskTitle}</h3>
                    </div>
                    <span className={receipt.verificationStatus === "verified" ? "badge-success" : "badge-accent"}>{receipt.verificationStatus}</span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{receipt.outcome}</p>
                  <div className="grid grid-cols-4 gap-4 pt-3 border-t border-border">
                    <div><div className="text-label text-[10px] mb-1">Value</div><div className="font-semibold text-lg text-emerald-400">${Number(receipt.dollarValueCreated).toLocaleString()}</div></div>
                    <div><div className="text-label text-[10px] mb-1">Cost</div><div className="font-semibold text-lg text-amber-400">${Number((receipt as any).costIncurred ?? 0).toFixed(4)}</div></div>
                    <div><div className="text-label text-[10px] mb-1">Hours Saved</div><div className="font-semibold text-lg text-foreground">{Number(receipt.laborHoursSaved).toFixed(1)}</div></div>
                    <div><div className="text-label text-[10px] mb-1">Issued</div><div className="text-mono text-xs text-muted-foreground mt-1">{new Date(receipt.createdAt).toLocaleDateString()}</div></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── INBOX ─── */}
      {tab === "inbox" && (
        <div className="animate-fade-in">
          <h2 className="text-heading text-lg mb-5">Human-in-the-Loop Inbox — {unread} unread</h2>
          {inboxItems.length === 0 ? (
            <div className="card-minimal text-center py-12">
              <Inbox size={28} className="text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-muted-foreground text-sm">Inbox clear.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inboxItems.filter(i => i.status !== "dismissed").map(item => {
                const pc: Record<string, string> = { critical: "badge-accent", high: "badge-accent", medium: "badge-minimal", low: "badge-minimal" };
                return (
                  <div key={item.id} className={`card-minimal ${item.status === "unread" ? "!border-l-2 !border-l-amber-400" : ""}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-foreground">{item.title}</h3>
                        <span className="text-label text-[10px]">{item.type.replace(/_/g, " ")} · {new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                      <span className={pc[item.priority] ?? "badge-minimal"}>{item.priority}</span>
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">{item.body}</p>
                    {item.status !== "resolved" ? (
                      <div className="flex gap-2">
                        <button onClick={() => resolveInbox.mutate({ id: item.id, resolution: "Acknowledged" })} className="btn-primary text-xs py-1.5 px-4 gap-1"><Check size={12} /> Resolve</button>
                        <button onClick={() => dismissInbox.mutate({ id: item.id })} className="btn-outline text-xs py-1.5 px-4 gap-1"><X size={12} /> Dismiss</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 size={13} /><span className="text-xs font-medium">Resolved</span></div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── GOVERNANCE ─── */}
      {tab === "governance" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-heading text-lg">Governance & Compliance</h2>
            <div className="flex gap-2">
              <Button onClick={() => setShowAddGate(true)} size="sm" variant="outline" className="text-xs gap-1.5 h-8">
                <Plus size={13} /> Add Gate
              </Button>
              <Button onClick={() => { if (effectiveCompanyId && confirm("EMERGENCY: Pause ALL agents?")) killSwitchMut.mutate({ companyId: effectiveCompanyId }); }} size="sm" className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 text-xs gap-1.5 h-8" disabled={!effectiveCompanyId}>
                <Power size={13} /> Kill Switch
              </Button>
            </div>
          </div>

          <p className="text-label mb-3">Approval Gates</p>
          {gates.length === 0 ? (
            <div className="card-minimal text-center py-8 mb-6">
              <Shield size={24} className="text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-muted-foreground text-sm">No gates configured.</p>
            </div>
          ) : (
            <div className="space-y-2 mb-6">
              {gates.map(gate => (
                <div key={gate.id} className="card-minimal flex items-center gap-4">
                  <Shield size={15} className={gate.isActive ? "text-emerald-400" : "text-muted-foreground"} strokeWidth={1.5} />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-foreground capitalize">{gate.gateType} Gate</div>
                    <p className="text-muted-foreground text-xs">{gate.description}</p>
                  </div>
                  {gate.threshold && <span className="text-mono text-xs text-amber-400">${Number(gate.threshold).toLocaleString()}</span>}
                  <span className={gate.isActive ? "badge-success" : "badge-minimal"}>{gate.isActive ? "Active" : "Off"}</span>
                  <button onClick={() => removeGateMut.mutate({ id: gate.id })} className="text-muted-foreground hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}

          <p className="text-label mb-3">Tool Registry — {tools.length} integrations</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {tools.map(tool => (
              <div key={tool.id} className="stat-card">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium text-sm text-foreground">{tool.name}</span>
                  <Wrench size={13} className={tool.isActive ? "text-emerald-400" : "text-muted-foreground"} strokeWidth={1.5} />
                </div>
                <span className="text-label text-[10px]">{tool.category}</span>
                <p className="text-muted-foreground text-xs mt-1">{tool.description}</p>
                {Number(tool.costPerUse ?? 0) > 0 && <div className="text-mono text-[10px] text-amber-400 mt-2">${Number(tool.costPerUse).toFixed(4)}/use</div>}
              </div>
            ))}
          </div>

          <p className="text-label mb-3">Audit Log</p>
          {auditEntries.length === 0 ? (
            <div className="card-minimal text-center py-8">
              <p className="text-muted-foreground text-sm">No audit entries.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {auditEntries.slice(0, 20).map(entry => (
                <div key={entry.id} className="card-minimal !py-2.5 flex items-center gap-3">
                  <span className="text-mono text-[10px] text-muted-foreground whitespace-nowrap">{new Date(entry.createdAt).toLocaleString()}</span>
                  <span className={`font-medium text-xs ${entry.action.includes("KILL") ? "text-red-400" : "text-foreground"}`}>{entry.action}</span>
                  <span className="text-muted-foreground text-xs flex-1 truncate">{entry.details}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── DIALOGS ─── */}

      {/* Add OKR */}
      <Dialog open={showAddOkr} onOpenChange={setShowAddOkr}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader><DialogTitle className="text-heading text-xl">Add New OKR</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="text-label block mb-1.5">Objective</label><Input value={newOkr.objective} onChange={e => setNewOkr(p => ({ ...p, objective: e.target.value }))} placeholder="e.g. Reach Product-Market Fit" className="bg-input border-border text-foreground" /></div>
            <div><label className="text-label block mb-1.5">Key Result</label><Textarea value={newOkr.keyResult} onChange={e => setNewOkr(p => ({ ...p, keyResult: e.target.value }))} placeholder="e.g. Achieve $50K MRR" className="bg-input border-border text-foreground resize-none" rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-label block mb-1.5">Target</label><Input type="number" value={newOkr.targetValue} onChange={e => setNewOkr(p => ({ ...p, targetValue: e.target.value }))} className="bg-input border-border text-foreground" /></div>
              <div><label className="text-label block mb-1.5">Unit</label><Input value={newOkr.unit} onChange={e => setNewOkr(p => ({ ...p, unit: e.target.value }))} placeholder="USD/mo" className="bg-input border-border text-foreground" /></div>
              <div><label className="text-label block mb-1.5">Level</label>
                <Select value={newOkr.level} onValueChange={v => setNewOkr(p => ({ ...p, level: v }))}>
                  <SelectTrigger className="bg-input border-border text-foreground h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border"><SelectItem value="company">Company</SelectItem><SelectItem value="department">Department</SelectItem><SelectItem value="agent">Agent</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => createOkr.mutate({ objective: newOkr.objective, keyResult: newOkr.keyResult, targetValue: Number(newOkr.targetValue), unit: newOkr.unit, companyId: effectiveCompanyId ?? undefined, level: newOkr.level as any })} disabled={!newOkr.objective || !newOkr.keyResult || !newOkr.targetValue || createOkr.isPending} className="flex-1 btn-primary">{createOkr.isPending ? "Creating..." : "Create OKR"}</Button>
              <Button variant="outline" onClick={() => setShowAddOkr(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Agent */}
      <Dialog open={showAddAgent} onOpenChange={setShowAddAgent}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader><DialogTitle className="text-heading text-xl">Deploy New Agent</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="text-label block mb-1.5">Agent Name</label><Input value={newAgent.name} onChange={e => setNewAgent(p => ({ ...p, name: e.target.value }))} placeholder="e.g. NOVA — CMO" className="bg-input border-border text-foreground" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-label block mb-1.5">Type</label>
                <Select value={newAgent.type} onValueChange={v => setNewAgent(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="bg-input border-border text-foreground h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">{["ceo","cto","cmo","cfo","vp","manager","specialist","marketing","research","sales","admin","custom"].map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-label block mb-1.5">Role Title</label><Input value={newAgent.roleTitle} onChange={e => setNewAgent(p => ({ ...p, roleTitle: e.target.value }))} placeholder="Chief Marketing Officer" className="bg-input border-border text-foreground" /></div>
            </div>
            <div><label className="text-label block mb-1.5">Description</label><Textarea value={newAgent.description} onChange={e => setNewAgent(p => ({ ...p, description: e.target.value }))} className="bg-input border-border text-foreground resize-none" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-label block mb-1.5">Heartbeat Cron</label><Input value={newAgent.heartbeatCron} onChange={e => setNewAgent(p => ({ ...p, heartbeatCron: e.target.value }))} placeholder="*/30 * * * *" className="bg-input border-border text-foreground" /></div>
              <div><label className="text-label block mb-1.5">Monthly Budget ($)</label><Input type="number" value={newAgent.monthlyBudget} onChange={e => setNewAgent(p => ({ ...p, monthlyBudget: e.target.value }))} placeholder="500" className="bg-input border-border text-foreground" /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => createAgentMut.mutate({ name: newAgent.name, type: newAgent.type as any, roleTitle: newAgent.roleTitle || undefined, description: newAgent.description || undefined, heartbeatCron: newAgent.heartbeatCron || undefined, monthlyBudget: newAgent.monthlyBudget ? Number(newAgent.monthlyBudget) : undefined, companyId: effectiveCompanyId ?? undefined })} disabled={!newAgent.name || createAgentMut.isPending} className="flex-1 btn-primary">{createAgentMut.isPending ? "Deploying..." : "Deploy Agent"}</Button>
              <Button variant="outline" onClick={() => setShowAddAgent(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Department */}
      <Dialog open={showAddDept} onOpenChange={setShowAddDept}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader><DialogTitle className="text-heading text-xl">Add Department</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="text-label block mb-1.5">Name</label><Input value={newDept.name} onChange={e => setNewDept(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Marketing" className="bg-input border-border text-foreground" /></div>
            <div><label className="text-label block mb-1.5">Budget ($)</label><Input type="number" value={newDept.budget} onChange={e => setNewDept(p => ({ ...p, budget: e.target.value }))} placeholder="2000" className="bg-input border-border text-foreground" /></div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => { if (effectiveCompanyId) createDeptMut.mutate({ companyId: effectiveCompanyId, name: newDept.name, budget: newDept.budget ? Number(newDept.budget) : undefined }); }} disabled={!newDept.name || !effectiveCompanyId || createDeptMut.isPending} className="flex-1 btn-primary">{createDeptMut.isPending ? "Creating..." : "Create"}</Button>
              <Button variant="outline" onClick={() => setShowAddDept(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Approval Gate */}
      <Dialog open={showAddGate} onOpenChange={setShowAddGate}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader><DialogTitle className="text-heading text-xl">Add Approval Gate</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="text-label block mb-1.5">Gate Type</label>
              <Select value={newGate.gateType} onValueChange={v => setNewGate(p => ({ ...p, gateType: v }))}>
                <SelectTrigger className="bg-input border-border text-foreground h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border"><SelectItem value="spend">Spend</SelectItem><SelectItem value="hire">Hire</SelectItem><SelectItem value="strategy">Strategy</SelectItem><SelectItem value="external">External</SelectItem></SelectContent>
              </Select>
            </div>
            <div><label className="text-label block mb-1.5">Description</label><Input value={newGate.description} onChange={e => setNewGate(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Requires approval for spend > $500" className="bg-input border-border text-foreground" /></div>
            <div><label className="text-label block mb-1.5">Threshold ($)</label><Input type="number" value={newGate.threshold} onChange={e => setNewGate(p => ({ ...p, threshold: e.target.value }))} placeholder="500" className="bg-input border-border text-foreground" /></div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => { if (effectiveCompanyId) createGateMut.mutate({ companyId: effectiveCompanyId, gateType: newGate.gateType as any, description: newGate.description, threshold: newGate.threshold ? Number(newGate.threshold) : undefined }); }} disabled={!newGate.description || !effectiveCompanyId || createGateMut.isPending} className="flex-1 btn-primary">{createGateMut.isPending ? "Creating..." : "Create Gate"}</Button>
              <Button variant="outline" onClick={() => setShowAddGate(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
