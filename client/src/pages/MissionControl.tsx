import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { useAnalytics } from "@/hooks/useAnalytics";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { JSX } from "react";
import { Streamdown } from "streamdown";
import { QuickTour } from "@/components/QuickTour";
import { SigmaBadge } from "@/components/SigmaBadge";
import {
  Target, Zap, Plus, Trash2, Check, X, Clock, TrendingUp, DollarSign, FileCheck,
  Inbox, Building2, GitBranch, Heart, Activity, BarChart3, Shield, Power, Wrench,
  CheckCircle2, Sparkles, ArrowRight, Bot, BookOpen, RefreshCw, Calendar, Pencil,
  Plug, Eye, EyeOff, ExternalLink, Search, Code, Layers, ChevronRight, Users, Flag
} from "lucide-react";

// Provider badge config — used on agent cards and BYOA selector
const PROVIDER_BADGE: Record<string, { label: string; color: string; logo?: string }> = {
  internal:   { label: "OpenCommand AI", color: "text-accent",  logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663354746985/WP82CNZ6C5SdwCUYfYptJQ/opencommand-ai-owl-icon-e3SxVtUebh4P2Phx8gqNjM.webp" },
  openai:     { label: "OpenAI",         color: "text-blue-400" },
  anthropic:  { label: "Anthropic",      color: "text-violet-400" },
  gemini:     { label: "Gemini",         color: "text-amber-400" },
  custom_api: { label: "Custom API",     color: "text-pink-400" },
  crewai:     { label: "CrewAI",         color: "text-cyan-400" },
};

type Tab = "okrs" | "fleet" | "org" | "heartbeat" | "budget" | "poo" | "inbox" | "governance" | "strategy";

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: "okrs", label: "OKRs", icon: Target },
  { id: "fleet", label: "Fleet", icon: Zap },
  { id: "org", label: "Org Chart", icon: GitBranch },
  { id: "heartbeat", label: "Heartbeat", icon: Heart },
  { id: "budget", label: "P&L", icon: DollarSign },
  { id: "poo", label: "PoO Ledger", icon: FileCheck },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "governance", label: "Governance", icon: Shield },
  { id: "strategy", label: "Strategy", icon: BookOpen },
];

const typeColors: Record<string, string> = {
  ceo: "text-amber-400 border-amber-400/30",
  cto: "text-blue-400 border-blue-400/30",
  cmo: "text-pink-400 border-pink-400/30",
  cfo: "text-accent border-accent/30",
  vp: "text-violet-400 border-violet-400/30",
  manager: "text-cyan-400 border-cyan-400/30",
  specialist: "text-orange-400 border-orange-400/30",
};

// ─── Onboarding Resume Banner Component ──────────────────────────────────────
const EXEC_ICONS: Record<string, string> = { ceo: "👑", cto: "⚡", cmo: "✦", cfo: "◈" };

function OnboardingBanner({ companyId, navigate }: { companyId: number | null; navigate: (to: string) => void }) {
  const onboardingQ = trpc.onboarding.status.useQuery(
    { companyId: companyId ?? undefined },
    { enabled: !!companyId }
  );
  const generateStrategy = trpc.onboarding.generateStrategy.useMutation({
    onSuccess: () => {
      toast.success("Strategy proposal generated!", { description: "ARCH has produced a formal strategic plan." });
    },
    onError: (err: any) => toast.error("Failed to generate strategy", { description: err.message }),
  });

  const data = onboardingQ.data;
  if (!data || data.total === 0) return null;

  const roleColors: Record<string, { text: string; bg: string; border: string; ring: string }> = {
    ceo: { text: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30", ring: "ring-amber-400/20" },
    cto: { text: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30", ring: "ring-blue-400/20" },
    cmo: { text: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/30", ring: "ring-pink-400/20" },
    cfo: { text: "text-accent", bg: "bg-accent/10", border: "border-accent/30", ring: "ring-accent/20" },
  };

  const progressPct = Math.round((data.completed / data.total) * 100);

  // All onboarded — show completion state
  if (data.allOnboarded) {
    return (
      <div className="mb-6 border border-accent/20 rounded-xl p-5 bg-accent/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-accent">All agents onboarded</p>
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

  // Incomplete — show resume banner with progress
  return (
    <div className="mb-6 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-background to-blue-500/5 overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-border/50">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-accent transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Bot size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Continue Building Your Agent Team</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.completed} of {data.total} agents contextualized — {data.total - data.completed} remaining to unlock strategy proposals
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-1.5 text-xs shrink-0"
            onClick={() => navigate("/onboarding/pro")}
          >
            Resume Onboarding <ArrowRight size={12} />
          </Button>
        </div>

        {/* Agent cards grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {data.agents.map((a: any) => {
            const colors = roleColors[a.agentType] ?? { text: "text-foreground", bg: "bg-zinc-800", border: "border-border", ring: "ring-border" };
            const icon = EXEC_ICONS[a.agentType] ?? "🤖";
            return (
              <button
                key={a.agentId}
                onClick={() => a.isOnboarded ? undefined : navigate(`/onboarding/${a.agentId}`)}
                className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all ${
                  a.isOnboarded
                    ? "bg-accent/5 border-accent/20 cursor-default"
                    : `${colors.bg} ${colors.border} hover:ring-1 ${colors.ring} cursor-pointer`
                }`}
              >
                <span className="text-sm">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${a.isOnboarded ? "text-accent" : colors.text}`}>
                    {a.agentName}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{a.agentType}</p>
                </div>
                {a.isOnboarded ? (
                  <CheckCircle2 size={14} className="text-accent shrink-0" />
                ) : (
                  <ArrowRight size={12} className={`${colors.text} shrink-0 opacity-60`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Context explanation */}
        <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground/60">
          <span className="flex items-center gap-1"><CheckCircle2 size={9} className="text-accent" /> Contextualized</span>
          <span className="flex items-center gap-1"><ArrowRight size={9} /> Awaiting interview</span>
          <span className="ml-auto">Each interview takes ~2 min</span>
        </div>
      </div>
    </div>
  );
}

export default function MissionControl() {
  const { isAuthenticated } = useAuth();
  const subscription = useSubscription();
  const { track } = useAnalytics();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("okrs");
  const [showAddOkr, setShowAddOkr] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showAddDept, setShowAddDept] = useState(false);
  const [showAddGate, setShowAddGate] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [newOkr, setNewOkr] = useState({ objective: "", keyResult: "", targetValue: "", unit: "USD", level: "company" });
  const [newAgent, setNewAgent] = useState({ name: "", type: "specialist", roleTitle: "", description: "", heartbeatCron: "", monthlyBudget: "", connectorType: "internal", apiKey: "", model: "", url: "", authHeader: "" });
  const [showAgentApiKey, setShowAgentApiKey] = useState(false);
  const [fleetView, setFleetView] = useState<"fleet" | "templates" | "goals">("fleet");
  const [showTemplateDeployModal, setShowTemplateDeployModal] = useState<string | null>(null);
  const [templateAgentName, setTemplateAgentName] = useState("");
  const [templateConnector, setTemplateConnector] = useState<"internal" | "openai" | "anthropic" | "gemini" | "custom_api" | "crewai">("internal");
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: "", description: "", priority: "medium", targetDate: "" });
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
  const proposalsQ = trpc.onboarding.proposals.useQuery(
    { companyId: effectiveCompanyId ?? undefined },
    { enabled: isAuthenticated && tab === "strategy" }
  );
  const proposals = proposalsQ.data ?? [];
  const latestProposal = proposals[0] ?? null;
  const generateStrategyMut = trpc.onboarding.generateStrategy.useMutation({
    onSuccess: () => { proposalsQ.refetch(); toast.success("Strategy generated!"); },
    onError: (err: any) => toast.error("Failed to generate strategy", { description: err.message }),
  });
  const acceptStrategyMut = trpc.onboarding.acceptStrategy.useMutation({
    onSuccess: (data) => {
      proposalsQ.refetch();
      okrsQ.refetch();
      toast.success("Strategy accepted!", { description: data.okrsCreated > 0 ? `${data.okrsCreated} OKRs auto-created from Key Metrics.` : "ARCH will begin execution." });
    },
    onError: (err: any) => toast.error("Failed to accept strategy", { description: err.message }),
  });
  const updateCompanyMut = trpc.companies.update.useMutation({
    onSuccess: () => { companiesQ.refetch(); toast.success("Briefing frequency updated."); },
    onError: (err: any) => toast.error("Failed to update", { description: err.message }),
  });
  const [editingFrequency, setEditingFrequency] = useState(false);

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
          <div className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-accent animate-pulse-subtle" : "bg-zinc-700"}`} />
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
  const createAgentMut = trpc.agents.create.useMutation({ onSuccess: () => { utils.agents.list.invalidate(); setShowAddAgent(false); track("agent", "created", { type: newAgent.type, name: newAgent.name }); setNewAgent({ name: "", type: "specialist", roleTitle: "", description: "", heartbeatCron: "", monthlyBudget: "", connectorType: "internal", apiKey: "", model: "", url: "", authHeader: "" }); toast.success("Agent deployed"); } });
  const deleteAgentMut = trpc.agents.remove.useMutation({ onSuccess: () => { utils.agents.list.invalidate(); toast.success("Agent removed"); } });
  const updateAgentStatus = trpc.agents.updateStatus.useMutation({ onSuccess: () => { utils.agents.list.invalidate(); } });
  const createDeptMut = trpc.departments.create.useMutation({ onSuccess: () => { utils.departments.list.invalidate(); setShowAddDept(false); setNewDept({ name: "", budget: "" }); toast.success("Department created"); } });
  const resolveInbox = trpc.inbox.resolve.useMutation({ onSuccess: () => { utils.inbox.list.invalidate(); toast.success("Resolved"); } });
  const dismissInbox = trpc.inbox.dismiss.useMutation({ onSuccess: () => { utils.inbox.list.invalidate(); } });
  const triggerHeartbeat = trpc.agents.triggerHeartbeat.useMutation({ onSuccess: () => { toast.success("Heartbeat triggered"); } });
  const createGateMut = trpc.governance.createGate.useMutation({ onSuccess: () => { utils.governance.gates.invalidate(); setShowAddGate(false); setNewGate({ gateType: "spend", description: "", threshold: "" }); toast.success("Gate created"); } });
  const removeGateMut = trpc.governance.removeGate.useMutation({ onSuccess: () => { utils.governance.gates.invalidate(); toast.success("Gate removed"); } });
  const killSwitchMut = trpc.governance.killSwitch.useMutation({ onSuccess: () => { utils.agents.list.invalidate(); toast.success("Kill switch activated — all agents paused"); } });
  const agentTemplatesQ = trpc.agents.listTemplates.useQuery();
  const agentTemplates = agentTemplatesQ.data ?? [];
  const deployFromTemplateMut = trpc.agents.deployFromTemplate.useMutation({
    onSuccess: (data) => { utils.agents.list.invalidate(); setShowTemplateDeployModal(null); setTemplateAgentName(""); toast.success(data.message); },
    onError: (err: any) => toast.error("Deploy failed", { description: err.message }),
  });
  const goalsQ = trpc.goals.list.useQuery({ companyId: effectiveCompanyId! }, { enabled: isAuthenticated && !!effectiveCompanyId && fleetView === "goals" });
  const goals = goalsQ.data ?? [];
  const createGoalMut = trpc.goals.create.useMutation({
    onSuccess: () => { goalsQ.refetch(); setShowAddGoal(false); setNewGoal({ title: "", description: "", priority: "medium", targetDate: "" }); toast.success("Workplace goal created"); },
    onError: (err: any) => toast.error("Failed to create goal", { description: err.message }),
  });
  const deleteGoalMut = trpc.goals.delete.useMutation({ onSuccess: () => goalsQ.refetch() });

  const TEMPLATE_ICONS: Record<string, any> = { TrendingUp, BarChart3, Search, DollarSign, Heart, Code };
  const TEMPLATE_COLORS: Record<string, string> = { emerald: "text-accent border-accent/30 bg-accent/5", blue: "text-blue-400 border-blue-400/30 bg-blue-400/5", violet: "text-violet-400 border-violet-400/30 bg-violet-400/5", amber: "text-amber-400 border-amber-400/30 bg-amber-400/5", pink: "text-pink-400 border-pink-400/30 bg-pink-400/5", cyan: "text-cyan-400 border-cyan-400/30 bg-cyan-400/5" };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      {/* Empty state — no company yet */}
      {companies.length === 0 && !companiesQ.isLoading && (
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="max-w-lg w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
              <Sparkles size={28} className="text-amber-400" />
            </div>
            <h1 className="text-3xl font-light text-foreground tracking-tight mb-3">Build Your AI Agent Team</h1>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4 max-w-md mx-auto">
              OpenCommand's self-contextualizing engine connects to your existing tools, pulls real data, and uses it to build personalized agents that understand your business from day one.
            </p>
            <div className="flex items-center justify-center gap-6 text-[11px] text-muted-foreground mb-8">
              <span className="flex items-center gap-1.5"><Wrench size={11} className="text-blue-400" /> Connect tools</span>
              <ArrowRight size={10} className="text-muted-foreground/40" />
              <span className="flex items-center gap-1.5"><Activity size={11} className="text-purple-400" /> Context pulled</span>
              <ArrowRight size={10} className="text-muted-foreground/40" />
              <span className="flex items-center gap-1.5"><Bot size={11} className="text-amber-400" /> Personalized team</span>
            </div>
            <Button className="h-11 px-8 gap-2" onClick={() => navigate("/onboarding/pro")}>
              Start Agent Onboarding <ArrowRight size={14} />
            </Button>
            <p className="text-[11px] text-muted-foreground mt-3">Takes about 10 minutes. You can skip any agent and come back later.</p>
          </div>
        </div>
      )}

      {/* Header — only show when company exists */}
      <div className={`mb-8 ${companies.length === 0 && !companiesQ.isLoading ? 'hidden' : ''}`}>
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
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-subtle" />
              <span className="text-label text-[10px]">ARCH Online</span>
            </div>
          </div>
        </div>
        <div className="accent-line" />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        {[
          { label: "Value Created", value: `$${totalValue.toLocaleString()}`, color: "text-accent" },
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

      {/* ─── STRATEGY PINNED CARD (shown when proposal exists and not on strategy tab) ─── */}
      {latestProposal && tab !== "strategy" && (
        <div className="mb-6 border border-amber-500/20 rounded-xl p-4 bg-amber-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles size={15} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Combined Strategy available</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{latestProposal.executiveSummary ?? "ARCH has produced a formal strategic plan."}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8 shrink-0" onClick={() => setTab("strategy")}>
            <BookOpen size={12} /> View Strategy
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border mb-8 scrollbar-hide">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            data-tour={t.id === "strategy" ? "strategy" : t.id === "fleet" ? "fleet" : undefined}
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
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-label text-[10px]">{(okr as any).level?.toUpperCase() ?? "COMPANY"}</span>
                          {(okr as any).source === "strategy" && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-violet-400/30 bg-violet-400/5 text-violet-400">
                              ✦ Generated from strategy
                            </span>
                          )}
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
          {/* Fleet sub-nav */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-1 bg-white/[0.03] border border-border rounded-lg p-1">
              {(["fleet", "templates", "goals"] as const).map(v => (
                <button key={v} onClick={() => setFleetView(v)}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                    fleetView === v ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {v === "fleet" ? `Active Fleet (${agents.length})` : v === "templates" ? "Templates" : "Workplace Goals"}
                </button>
              ))}
            </div>
            {fleetView === "fleet" && (
              <div className="flex gap-2">
                <Button onClick={() => setFleetView("templates")} size="sm" variant="outline" className="text-xs gap-1.5 h-8">
                  <Layers size={13} /> From Template
                </Button>
                <Button
                  onClick={() => {
                    if (subscription.isFree || (subscription.isStarter && agents.length >= 1)) {
                      toast.error(subscription.isFree ? "Sign up for a plan to deploy agents." : "Starter plan is limited to 1 agent. Upgrade to Pro for unlimited agents.", { action: { label: "Upgrade", onClick: () => navigate("/pricing") } });
                      return;
                    }
                    setShowAddAgent(true);
                  }}
                  size="sm" className="btn-primary text-xs gap-1.5 h-8"
                >
                  <Plus size={13} /> Custom Agent
                </Button>
              </div>
            )}
            {fleetView === "goals" && (
              <Button onClick={() => setShowAddGoal(true)} size="sm" className="btn-primary text-xs gap-1.5 h-8" disabled={!effectiveCompanyId}>
                <Plus size={13} /> New Goal
              </Button>
            )}
          </div>

          {/* ── ACTIVE FLEET VIEW ── */}
          {fleetView === "fleet" && (
            <>
              {/* Fleet monitoring summary */}
              {agents.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <div className="card-minimal text-center py-3">
                    <div className="text-xl font-bold text-accent">{agents.filter(a => a.status === "active").length}</div>
                    <div className="text-label text-[10px] mt-0.5">Active</div>
                  </div>
                  <div className="card-minimal text-center py-3">
                    <div className="text-xl font-bold text-foreground">{agents.filter(a => a.status === "idle").length}</div>
                    <div className="text-label text-[10px] mt-0.5">Idle</div>
                  </div>
                  <div className="card-minimal text-center py-3">
                    <div className="text-xl font-bold text-amber-400">{agents.filter(a => a.status === "error").length}</div>
                    <div className="text-label text-[10px] mt-0.5">Error</div>
                  </div>
                  <div className="card-minimal text-center py-3">
                    <div className="text-xl font-bold text-blue-400">${agents.reduce((s, a) => s + Number((a as any).totalValueCreated ?? 0), 0).toFixed(0)}</div>
                    <div className="text-label text-[10px] mt-0.5">Total Value</div>
                  </div>
                </div>
              )}
              {agents.length === 0 ? (
                <div className="card-minimal text-center py-16">
                  <Bot size={32} className="text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
                  <h3 className="text-foreground font-medium mb-2">No agents deployed yet</h3>
                  <p className="text-muted-foreground text-sm mb-5 max-w-sm mx-auto">Start with a pre-built template for instant deployment, or configure a custom agent from scratch.</p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => setFleetView("templates")} size="sm" className="btn-primary text-xs gap-1.5">
                      <Layers size={13} /> Browse Templates
                    </Button>
                    <Button onClick={() => setShowAddAgent(true)} size="sm" variant="outline" className="text-xs gap-1.5">
                      <Plus size={13} /> Custom Agent
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {agents.map(agent => (
                    <div key={agent.id} className="card-minimal">
                      <div className="flex items-start justify-between mb-3">
                        <span className={`text-mono text-xs border px-1.5 py-0.5 rounded ${typeColors[agent.type] ?? "text-foreground border-border"}`}>{agent.type}</span>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${agent.status === "active" ? "bg-accent animate-pulse-subtle" : agent.status === "error" ? "bg-red-500" : "bg-zinc-600"}`} />
                          <span className="text-mono text-[11px] text-muted-foreground">{agent.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="font-semibold text-foreground">{agent.name}</h3>
                        {(agent as any).builtWithSigma && <SigmaBadge />}
                        {(() => {
                          const ct = (agent as any).connectorType ?? "internal";
                          const badge = PROVIDER_BADGE[ct] ?? PROVIDER_BADGE.internal;
                          return (
                            <span className={`flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider border border-current/20 rounded px-1.5 py-0.5 ${badge.color}`}>
                              {badge.logo ? <img src={badge.logo} alt="" className="w-3 h-3 rounded-sm object-cover" /> : null}
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>
                      {(agent as any).roleTitle && <p className="text-label text-[10px] mb-2">{(agent as any).roleTitle}</p>}
                      <p className="text-muted-foreground text-xs leading-relaxed mb-4 line-clamp-2">{agent.description}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                        <div><span className="text-label text-[10px]">Tasks</span><div className="font-semibold text-foreground">{agent.tasksCompleted}</div></div>
                        <div><span className="text-label text-[10px]">Value</span><div className="font-semibold text-accent">${Number(agent.totalValueCreated ?? 0).toFixed(0)}</div></div>
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
              )}
            </>
          )}

          {/* ── TEMPLATES VIEW ── */}
          {fleetView === "templates" && (
            <div>
              <div className="mb-6">
                <h3 className="text-foreground font-semibold mb-1">Agent Templates</h3>
                <p className="text-muted-foreground text-sm">Pre-configured agents ready to deploy in one click. Each template includes role definition, capabilities, and tool integrations.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agentTemplates.map((tmpl: any) => {
                  const IconComp = TEMPLATE_ICONS[tmpl.icon] ?? Bot;
                  const colorCls = TEMPLATE_COLORS[tmpl.color] ?? "text-foreground border-border bg-white/[0.02]";
                  return (
                    <div key={tmpl.id} className="card-minimal flex flex-col">
                      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center mb-3 ${colorCls}`}>
                        <IconComp size={16} strokeWidth={1.5} />
                      </div>
                      <h4 className="font-semibold text-foreground mb-1">{tmpl.name}</h4>
                      <p className="text-muted-foreground text-xs leading-relaxed mb-3 flex-1">{tmpl.description}</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {tmpl.tools.slice(0, 3).map((t: string) => (
                          <span key={t} className="text-[9px] font-medium px-1.5 py-0.5 rounded border border-border text-muted-foreground">{t}</span>
                        ))}
                        {tmpl.tools.length > 3 && <span className="text-[9px] text-muted-foreground/60">+{tmpl.tools.length - 3} more</span>}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-accent font-medium">{tmpl.estimatedROI}</span>
                        <Button
                          size="sm"
                          className="btn-primary text-xs h-7 gap-1"
                          onClick={() => {
                            if (subscription.isFree || (subscription.isStarter && agents.length >= 1)) {
                              toast.error(subscription.isFree ? "Sign up to deploy agents." : "Upgrade to Pro for unlimited agents.", { action: { label: "Upgrade", onClick: () => navigate("/pricing") } });
                              return;
                            }
                            setShowTemplateDeployModal(tmpl.id);
                            setTemplateAgentName(tmpl.roleTitle);
                          }}
                        >
                          Deploy <ChevronRight size={11} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── WORKPLACE GOALS VIEW ── */}
          {fleetView === "goals" && (
            <div>
              <div className="mb-6">
                <h3 className="text-foreground font-semibold mb-1">Workplace Goals</h3>
                <p className="text-muted-foreground text-sm">Set multi-agent goals across your fleet. Agents coordinate autonomously to hit targets, track progress, and escalate blockers.</p>
              </div>
              {!effectiveCompanyId ? (
                <div className="card-minimal text-center py-12">
                  <Flag size={28} className="text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-muted-foreground text-sm">Set up a company workspace first to create workplace goals.</p>
                </div>
              ) : goals.length === 0 ? (
                <div className="card-minimal text-center py-16">
                  <Flag size={32} className="text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
                  <h3 className="text-foreground font-medium mb-2">No workplace goals yet</h3>
                  <p className="text-muted-foreground text-sm mb-5 max-w-sm mx-auto">Create a goal and assign agents to it. They will coordinate autonomously to hit the target.</p>
                  <Button onClick={() => setShowAddGoal(true)} size="sm" className="btn-primary text-xs gap-1.5">
                    <Plus size={13} /> Create First Goal
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {goals.map((goal: any) => {
                    const assignedAgents = goal.assignedAgents ?? [];
                    const avgProgress = assignedAgents.length > 0
                      ? Math.round(assignedAgents.reduce((s: number, a: any) => s + (a.completionPercentage ?? 0), 0) / assignedAgents.length)
                      : 0;
                    const priorityColors: Record<string, string> = { critical: "text-red-400", high: "text-amber-400", medium: "text-blue-400", low: "text-muted-foreground" };
                    return (
                      <div key={goal.id} className="card-minimal">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-semibold uppercase tracking-wider ${priorityColors[goal.priority] ?? "text-muted-foreground"}`}>{goal.priority}</span>
                              <span className="text-[10px] text-muted-foreground/60">•</span>
                              <span className="text-[10px] text-muted-foreground">{goal.status}</span>
                            </div>
                            <h4 className="font-semibold text-foreground">{goal.title}</h4>
                            {goal.description && <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{goal.description}</p>}
                          </div>
                          <button onClick={() => { if (confirm("Delete this goal?")) deleteGoalMut.mutate({ goalId: goal.id }); }} className="text-muted-foreground hover:text-red-400 transition-colors ml-3">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        {assignedAgents.length > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-label text-[10px]">Agent Progress</span>
                              <span className="text-mono text-[10px] text-muted-foreground">{avgProgress}% avg</span>
                            </div>
                            <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${avgProgress}%` }} /></div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {assignedAgents.map((a: any) => (
                                <span key={a.agentId} className="text-[9px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                                  {a.agentName} — {a.completionPercentage ?? 0}%
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {assignedAgents.length === 0 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                            <Users size={11} />
                            <span>No agents assigned yet. Assign agents from the Fleet view.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
                <Heart size={16} className={agent.status === "active" ? "text-accent animate-pulse-subtle" : "text-muted-foreground"} strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground">{agent.name}</div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-mono text-xs text-muted-foreground">{(agent as any).heartbeatCron || "No schedule"}</span>
                    {(agent as any).lastHeartbeat && <span className="text-mono text-[10px] text-muted-foreground">Last: {new Date((agent as any).lastHeartbeat).toLocaleString()}</span>}
                  </div>
                </div>
                <span className={`badge-minimal text-[10px] ${(agent as any).heartbeatEnabled ? "!text-accent !border-accent/30 !bg-accent/10" : ""}`}>
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
            <div className="stat-card"><div className="stat-label">Total Revenue</div><div className="stat-value text-accent">${Number(pnlQ.data?.totalRevenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div></div>
            <div className="stat-card"><div className="stat-label">Total Costs</div><div className="stat-value text-amber-400">${Number(pnlQ.data?.totalCosts ?? 0).toFixed(2)}</div></div>
            <div className="stat-card"><div className="stat-label">Net Profit</div><div className={`stat-value ${Number(pnlQ.data?.netProfit ?? 0) >= 0 ? "text-accent" : "text-red-400"}`}>${Number(pnlQ.data?.netProfit ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div></div>
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
                    <div className="text-mono text-xs text-accent">+${value.toFixed(2)}</div>
                    <div className="text-mono text-xs text-amber-400">-${cost.toFixed(2)}</div>
                  </div>
                  <div className={`font-semibold text-sm min-w-[60px] text-right ${roi >= 0 ? "text-accent" : "text-red-400"}`}>
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
                    <div><div className="text-label text-[10px] mb-1">Value</div><div className="font-semibold text-lg text-accent">${Number(receipt.dollarValueCreated).toLocaleString()}</div></div>
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
                      <div className="flex items-center gap-1.5 text-accent"><CheckCircle2 size={13} /><span className="text-xs font-medium">Resolved</span></div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── STRATEGY ─── */}
      {tab === "strategy" && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h2 className="text-heading text-lg">Combined Strategy</h2>
              {/* Briefing frequency badge + quick-edit */}
              {selectedCompany && (
                editingFrequency ? (
                  <Select
                    value={(selectedCompany as any).briefingFrequency ?? "weekly"}
                    onValueChange={(val) => {
                      if (effectiveCompanyId) updateCompanyMut.mutate({ id: effectiveCompanyId, briefingFrequency: val as any });
                      setEditingFrequency(false);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs w-32 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingFrequency(true)}
                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground border border-border rounded-full px-2.5 py-1 hover:border-foreground/40 transition-colors"
                    >
                      <Calendar size={10} />
                      {((selectedCompany as any).briefingFrequency ?? "weekly").charAt(0).toUpperCase() + ((selectedCompany as any).briefingFrequency ?? "weekly").slice(1)} briefings
                      <Pencil size={9} className="opacity-50" />
                    </button>
                    <button
                      onClick={() => navigate("/briefings")}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <BookOpen size={10} />
                      History
                    </button>
                  </div>
                )
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 h-8"
              onClick={() => effectiveCompanyId && generateStrategyMut.mutate({ companyId: effectiveCompanyId })}
              disabled={!effectiveCompanyId || generateStrategyMut.isPending}
            >
              {generateStrategyMut.isPending ? <><RefreshCw size={12} className="animate-spin" /> Generating...</> : <><RefreshCw size={12} /> Regenerate</>}
            </Button>
          </div>

          {proposalsQ.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw size={18} className="animate-spin text-muted-foreground" />
            </div>
          ) : !latestProposal ? (
            <div className="card-minimal text-center py-16">
              <BookOpen size={28} className="text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-foreground text-sm font-medium mb-1">No strategy generated yet</p>
              <p className="text-muted-foreground text-xs mb-6 max-w-xs mx-auto">Complete the agent onboarding interviews, then generate your combined strategic plan.</p>
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => effectiveCompanyId && generateStrategyMut.mutate({ companyId: effectiveCompanyId })}
                disabled={!effectiveCompanyId || generateStrategyMut.isPending}
              >
                <Sparkles size={12} /> Generate Strategy
              </Button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="badge-minimal text-[10px]">{latestProposal.status?.toUpperCase() ?? "PROPOSED"}</span>
                <span className="text-muted-foreground text-xs">{new Date(latestProposal.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
              </div>
              {latestProposal.executiveSummary && (
                <div className="card-minimal mb-6 border-amber-500/20 bg-amber-500/5">
                  <p className="text-label mb-1.5">Executive Summary</p>
                  <p className="text-sm text-foreground leading-relaxed">{latestProposal.executiveSummary}</p>
                </div>
              )}
              <div className="prose prose-sm max-w-none text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:mt-5 [&_h3]:mb-2">
                <Streamdown>{latestProposal.content ?? ""}</Streamdown>
              </div>
              <div className="flex gap-3 mt-8 pt-6 border-t border-border">
                <Button
                  size="sm"
                  className="gap-1.5 text-xs bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20"
                  onClick={() => {
                    if (latestProposal && effectiveCompanyId) {
                      acceptStrategyMut.mutate({ proposalId: latestProposal.id, companyId: effectiveCompanyId });
                    }
                  }}
                  disabled={acceptStrategyMut.isPending || latestProposal?.status === "accepted"}
                >
                  {acceptStrategyMut.isPending
                    ? <><RefreshCw size={12} className="animate-spin" /> Accepting...</>
                    : latestProposal?.status === "accepted"
                    ? <><CheckCircle2 size={12} /> Accepted</>
                    : <><Check size={12} /> Accept Strategy</>}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => effectiveCompanyId && generateStrategyMut.mutate({ companyId: effectiveCompanyId })}
                  disabled={generateStrategyMut.isPending}
                >
                  <RefreshCw size={12} /> Revise
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

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
                  <Shield size={15} className={gate.isActive ? "text-accent" : "text-muted-foreground"} strokeWidth={1.5} />
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
                  <Wrench size={13} className={tool.isActive ? "text-accent" : "text-muted-foreground"} strokeWidth={1.5} />
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

            {/* BYOA — Connector */}
            <div className="rounded-xl border border-border bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Plug size={13} className="text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Agent Provider</span>
                <span className="ml-auto text-[10px] text-muted-foreground">Bring Your Own Agent</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["internal", "openai", "anthropic", "gemini", "custom_api", "crewai"] as const).map(ct => {
                  const badge = PROVIDER_BADGE[ct];
                  const isActive = newAgent.connectorType === ct;
                  return (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => setNewAgent(p => ({ ...p, connectorType: ct }))}
                      className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                        isActive
                          ? "border-white/20 bg-white/[0.08] text-foreground"
                          : "border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                      }`}
                    >
                      {badge?.logo ? <img src={badge.logo} alt="" className="w-3.5 h-3.5 rounded-sm object-cover" /> : null}
                      {badge?.label ?? ct}
                    </button>
                  );
                })}
              </div>
              {newAgent.connectorType !== "internal" && (
                <div className="space-y-2 pt-1">
                  {["openai", "anthropic", "gemini"].includes(newAgent.connectorType) && (
                    <div className="relative">
                      <Input
                        type={showAgentApiKey ? "text" : "password"}
                        value={newAgent.apiKey}
                        onChange={e => setNewAgent(p => ({ ...p, apiKey: e.target.value }))}
                        placeholder="API Key (optional — configure later)"
                        className="bg-input border-border text-foreground font-mono text-xs pr-9"
                      />
                      <button type="button" onClick={() => setShowAgentApiKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showAgentApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  )}
                  {["custom_api", "crewai"].includes(newAgent.connectorType) && (
                    <Input
                      value={newAgent.url}
                      onChange={e => setNewAgent(p => ({ ...p, url: e.target.value }))}
                      placeholder="Endpoint URL (optional — configure later)"
                      className="bg-input border-border text-foreground font-mono text-xs"
                    />
                  )}
                  <Input
                    value={newAgent.model}
                    onChange={e => setNewAgent(p => ({ ...p, model: e.target.value }))}
                    placeholder="Model override (optional)"
                    className="bg-input border-border text-foreground font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">Credentials stored AES-256 encrypted. You can also configure this later in the Connector tab.</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={() => {
                const payload: any = { name: newAgent.name, type: newAgent.type as any, roleTitle: newAgent.roleTitle || undefined, description: newAgent.description || undefined, heartbeatCron: newAgent.heartbeatCron || undefined, monthlyBudget: newAgent.monthlyBudget ? Number(newAgent.monthlyBudget) : undefined, companyId: effectiveCompanyId ?? undefined, connectorType: newAgent.connectorType as any };
                if (newAgent.apiKey) payload.apiKey = newAgent.apiKey;
                if (newAgent.model) payload.model = newAgent.model;
                if (newAgent.url) payload.url = newAgent.url;
                createAgentMut.mutate(payload);
              }} disabled={!newAgent.name || createAgentMut.isPending} className="flex-1 btn-primary">{createAgentMut.isPending ? "Deploying..." : "Deploy Agent"}</Button>
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

      {/* Template Deploy Modal */}
      <Dialog open={!!showTemplateDeployModal} onOpenChange={() => setShowTemplateDeployModal(null)}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader><DialogTitle className="text-heading text-xl">Deploy from Template</DialogTitle></DialogHeader>
          {showTemplateDeployModal && (() => {
            const tmpl = agentTemplates.find((t: any) => t.id === showTemplateDeployModal) as any;
            if (!tmpl) return null;
            return (
              <div className="space-y-4 mt-2">
                <div className="card-minimal bg-white/[0.02]">
                  <p className="text-xs font-semibold text-foreground mb-1">{tmpl.name}</p>
                  <p className="text-muted-foreground text-xs">{tmpl.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tmpl.tools.map((t: string) => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">{t}</span>)}
                  </div>
                </div>
                <div>
                  <label className="text-label block mb-1.5">Agent Name</label>
                  <Input value={templateAgentName} onChange={e => setTemplateAgentName(e.target.value)} placeholder={tmpl.roleTitle} className="bg-input border-border text-foreground" />
                </div>
                <div>
                  <label className="text-label block mb-1.5">Provider</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["internal", "openai", "anthropic", "gemini", "custom_api", "crewai"] as const).map(ct => {
                      const badge = PROVIDER_BADGE[ct];
                      return (
                        <button key={ct} type="button" onClick={() => setTemplateConnector(ct)}
                          className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                            templateConnector === ct ? "border-white/20 bg-white/[0.08] text-foreground" : "border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                          }`}>
                          {badge?.logo ? <img src={badge.logo} alt="" className="w-3.5 h-3.5 rounded-sm object-cover" /> : null}
                          {badge?.label ?? ct}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => deployFromTemplateMut.mutate({ templateId: showTemplateDeployModal, name: templateAgentName || undefined, companyId: effectiveCompanyId ?? undefined, connectorType: templateConnector })}
                    disabled={deployFromTemplateMut.isPending}
                    className="flex-1 btn-primary"
                  >{deployFromTemplateMut.isPending ? "Deploying..." : `Deploy ${tmpl.name}`}</Button>
                  <Button variant="outline" onClick={() => setShowTemplateDeployModal(null)}>Cancel</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Add Workplace Goal */}
      <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader><DialogTitle className="text-heading text-xl">Create Workplace Goal</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="text-label block mb-1.5">Goal Title</label><Input value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Grow MRR to $50K by Q3" className="bg-input border-border text-foreground" /></div>
            <div><label className="text-label block mb-1.5">Description</label><Textarea value={newGoal.description} onChange={e => setNewGoal(p => ({ ...p, description: e.target.value }))} placeholder="What does success look like? What agents will work on this?" className="bg-input border-border text-foreground resize-none" rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-label block mb-1.5">Priority</label>
                <Select value={newGoal.priority} onValueChange={v => setNewGoal(p => ({ ...p, priority: v }))}>
                  <SelectTrigger className="bg-input border-border text-foreground h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-label block mb-1.5">Target Date</label><Input type="date" value={newGoal.targetDate} onChange={e => setNewGoal(p => ({ ...p, targetDate: e.target.value }))} className="bg-input border-border text-foreground" /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => {
                  if (!effectiveCompanyId) return;
                  createGoalMut.mutate({
                    companyId: effectiveCompanyId,
                    title: newGoal.title,
                    description: newGoal.description || undefined,
                    priority: newGoal.priority as any,
                    targetDate: newGoal.targetDate ? new Date(newGoal.targetDate).getTime() : undefined,
                  });
                }}
                disabled={!newGoal.title || !effectiveCompanyId || createGoalMut.isPending}
                className="flex-1 btn-primary"
              >{createGoalMut.isPending ? "Creating..." : "Create Goal"}</Button>
              <Button variant="outline" onClick={() => setShowAddGoal(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Tour for first-time users after onboarding */}
      {companies.length > 0 && (
        <QuickTour isFirstTime={companies.length > 0 && !companiesQ.isLoading} />
      )}
    </div>
  );
}
