import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Target, Cpu, FileCheck, Inbox, Plus, CheckCircle2, AlertTriangle,
  Clock, TrendingUp, Zap, ChevronRight, X, Check, Building2,
  GitBranch, Heart, DollarSign, Shield, Wrench, Activity, Power,
  Trash2, Edit, ArrowRight, AlertCircle, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Tab = "okrs" | "fleet" | "org" | "heartbeat" | "budget" | "poo" | "inbox" | "governance";

export default function MissionControl() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("okrs");
  const [showAddOkr, setShowAddOkr] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showAddDept, setShowAddDept] = useState(false);
  const [showAddGate, setShowAddGate] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [newOkr, setNewOkr] = useState({ objective: "", keyResult: "", targetValue: "", unit: "", dueDate: "", level: "company" });
  const [newAgent, setNewAgent] = useState({ name: "", type: "specialist", roleTitle: "", description: "", heartbeatCron: "", monthlyBudget: "" });
  const [newDept, setNewDept] = useState({ name: "", budget: "" });
  const [newGate, setNewGate] = useState({ gateType: "spend", threshold: "", description: "", autoApproveBelow: "" });

  const utils = trpc.useUtils();

  // Seed defaults
  const seedCompanies = trpc.companies.seedDefaults.useMutation({ onSuccess: () => utils.companies.list.invalidate() });
  const seedAgents = trpc.agents.seedDefaults.useMutation({ onSuccess: () => utils.agents.list.invalidate() });
  const seedOkrs = trpc.okrs.seedDefaults.useMutation({ onSuccess: () => utils.okrs.list.invalidate() });
  const seedMarketplace = trpc.marketplace.seedDefaults.useMutation();
  const seedCreators = trpc.creators.seedDefaults.useMutation();
  const seedBlueprints = trpc.blueprints.seedDefaults.useMutation();
  const seedSkills = trpc.skills.seedDefaults.useMutation();
  const seedGov = trpc.governance.seedDefaults.useMutation({ onSuccess: () => { if (selectedCompanyId) utils.governance.gates.invalidate({ companyId: selectedCompanyId }); } });
  const seedTools = trpc.integrations.seedDefaults.useMutation();

  useEffect(() => {
    seedCompanies.mutate();
    seedAgents.mutate();
    seedOkrs.mutate();
    seedMarketplace.mutate();
    seedCreators.mutate();
    seedBlueprints.mutate();
    seedSkills.mutate();
    seedGov.mutate();
    seedTools.mutate();
  }, []);

  // Queries
  const companiesQ = trpc.companies.list.useQuery();
  const agentsQ = trpc.agents.list.useQuery();
  const okrsQ = trpc.okrs.list.useQuery();
  const pooQ = trpc.poo.list.useQuery();
  const pooSummaryQ = trpc.poo.summary.useQuery();
  const inboxQ = trpc.inbox.list.useQuery();

  // Set default company
  useEffect(() => {
    if (companiesQ.data && companiesQ.data.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companiesQ.data[0]!.id);
    }
  }, [companiesQ.data, selectedCompanyId]);

  // Company-scoped queries
  const deptsQ = trpc.departments.list.useQuery({ companyId: selectedCompanyId ?? 0 }, { enabled: !!selectedCompanyId });
  const companyAgentsQ = trpc.agents.listByCompany.useQuery({ companyId: selectedCompanyId ?? 0 }, { enabled: !!selectedCompanyId });
  const pnlQ = trpc.companies.pnl.useQuery({ companyId: selectedCompanyId ?? 0 }, { enabled: !!selectedCompanyId });
  const gatesQ = trpc.governance.gates.useQuery({ companyId: selectedCompanyId ?? 0 }, { enabled: !!selectedCompanyId });
  const auditQ = trpc.governance.auditLog.useQuery({ companyId: selectedCompanyId ?? 0 }, { enabled: !!selectedCompanyId });
  const toolsQ = trpc.integrations.tools.useQuery({ companyId: selectedCompanyId ?? 0 }, { enabled: !!selectedCompanyId });

  // Mutations
  const createOkr = trpc.okrs.create.useMutation({ onSuccess: () => { utils.okrs.list.invalidate(); setShowAddOkr(false); setNewOkr({ objective: "", keyResult: "", targetValue: "", unit: "", dueDate: "", level: "company" }); toast.success("OKR created"); } });
  const resolveInbox = trpc.inbox.resolve.useMutation({ onSuccess: () => utils.inbox.list.invalidate() });
  const dismissInbox = trpc.inbox.dismiss.useMutation({ onSuccess: () => utils.inbox.list.invalidate() });
  const updateAgentStatus = trpc.agents.updateStatus.useMutation({ onSuccess: () => { utils.agents.list.invalidate(); if (selectedCompanyId) utils.agents.listByCompany.invalidate({ companyId: selectedCompanyId }); } });
  const createAgentMut = trpc.agents.create.useMutation({ onSuccess: () => { utils.agents.list.invalidate(); if (selectedCompanyId) utils.agents.listByCompany.invalidate({ companyId: selectedCompanyId }); setShowAddAgent(false); toast.success("Agent deployed"); } });
  const deleteAgentMut = trpc.agents.remove.useMutation({ onSuccess: () => { utils.agents.list.invalidate(); if (selectedCompanyId) utils.agents.listByCompany.invalidate({ companyId: selectedCompanyId }); toast.success("Agent removed"); } });
  const createDeptMut = trpc.departments.create.useMutation({ onSuccess: () => { if (selectedCompanyId) utils.departments.list.invalidate({ companyId: selectedCompanyId }); setShowAddDept(false); toast.success("Department created"); } });
  const triggerHeartbeat = trpc.agents.triggerHeartbeat.useMutation({ onSuccess: (data) => { toast.success(`Heartbeat: ${data.tasksChecked} checked, ${data.tasksActedOn} acted on`); utils.agents.list.invalidate(); } });
  const createGateMut = trpc.governance.createGate.useMutation({ onSuccess: () => { if (selectedCompanyId) utils.governance.gates.invalidate({ companyId: selectedCompanyId }); setShowAddGate(false); toast.success("Approval gate created"); } });
  const removeGateMut = trpc.governance.removeGate.useMutation({ onSuccess: () => { if (selectedCompanyId) utils.governance.gates.invalidate({ companyId: selectedCompanyId }); } });
  const killSwitchMut = trpc.governance.killSwitch.useMutation({ onSuccess: (data) => { toast.error(`KILL SWITCH: ${data.agentsPaused} agents paused`); utils.agents.list.invalidate(); utils.inbox.list.invalidate(); if (selectedCompanyId) utils.agents.listByCompany.invalidate({ companyId: selectedCompanyId }); } });

  const agents = agentsQ.data ?? [];
  const companyAgents = companyAgentsQ.data ?? [];
  const okrs = okrsQ.data ?? [];
  const pooReceipts = pooQ.data ?? [];
  const inboxItems = inboxQ.data ?? [];
  const departments = deptsQ.data ?? [];
  const gates = gatesQ.data ?? [];
  const auditEntries = auditQ.data ?? [];
  const tools = toolsQ.data ?? [];
  const unread = inboxItems.filter(i => i.status === "unread").length;
  const companies = companiesQ.data ?? [];
  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const totalValue = Number(pooSummaryQ.data?.totalValue ?? 0);
  const totalHours = Number(pooSummaryQ.data?.totalHours ?? 0);
  const totalReceipts = Number(pooSummaryQ.data?.totalReceipts ?? 0);
  const totalCosts = Number(pooSummaryQ.data?.totalCosts ?? 0);
  const activeAgents = agents.filter(a => a.status === "active").length;

  // Org chart hierarchy
  const orgTree = useMemo(() => {
    const ceo = companyAgents.find(a => a.type === "ceo");
    const byParent = new Map<number | null, typeof companyAgents>();
    companyAgents.forEach(a => {
      const parentId = a.parentAgentId ?? null;
      if (!byParent.has(parentId)) byParent.set(parentId, []);
      byParent.get(parentId)!.push(a);
    });
    return { ceo, byParent };
  }, [companyAgents]);

  const tabs: { id: Tab; label: string; icon: typeof Target; badge?: number }[] = [
    { id: "okrs", label: "OKRs", icon: Target },
    { id: "fleet", label: "FLEET", icon: Cpu },
    { id: "org", label: "ORG CHART", icon: GitBranch },
    { id: "heartbeat", label: "HEARTBEAT", icon: Heart },
    { id: "budget", label: "P&L", icon: DollarSign },
    { id: "poo", label: "PoO LEDGER", icon: FileCheck },
    { id: "inbox", label: "INBOX", icon: Inbox, badge: unread },
    { id: "governance", label: "GOVERNANCE", icon: Shield },
  ];

  const typeColors: Record<string, string> = {
    ceo: "text-accent border-accent", cto: "text-[oklch(0.62_0.18_240)] border-[oklch(0.62_0.18_240)]",
    cmo: "text-[oklch(0.72_0.18_330)] border-[oklch(0.72_0.18_330)]", cfo: "text-[oklch(0.82_0.18_90)] border-[oklch(0.82_0.18_90)]",
    vp: "text-[oklch(0.65_0.18_142)] border-[oklch(0.65_0.18_142)]", manager: "text-[oklch(0.65_0.15_200)] border-[oklch(0.65_0.15_200)]",
    specialist: "text-foreground border-foreground", marketing: "text-[oklch(0.72_0.18_330)] border-[oklch(0.72_0.18_330)]",
    research: "text-[oklch(0.82_0.18_90)] border-[oklch(0.82_0.18_90)]", sales: "text-[oklch(0.65_0.18_142)] border-[oklch(0.65_0.18_142)]",
    admin: "text-muted-foreground border-muted-foreground", custom: "text-foreground border-foreground",
  };

  const renderOrgNode = (agent: typeof companyAgents[0], depth: number) => {
    const children = orgTree.byParent.get(agent.id) ?? [];
    return (
      <div key={agent.id} className="relative" style={{ marginLeft: depth * 32 }}>
        <div className="brutal-card-hover p-4 flex items-center gap-4 mb-2">
          {depth > 0 && <div className="absolute left-[-16px] top-1/2 w-4 h-px bg-border" />}
          <div className={`w-10 h-10 flex items-center justify-center border ${typeColors[agent.type] ?? "border-foreground"}`}>
            <span className="font-condensed font-black text-xs">{agent.type.toUpperCase().slice(0, 3)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-condensed font-bold text-sm text-foreground truncate">{agent.name}</div>
            <div className="section-label text-[0.6rem]">{agent.roleTitle ?? agent.type.toUpperCase()}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 ${agent.status === "active" ? "bg-[oklch(0.65_0.18_142)] animate-pulse" : agent.status === "error" ? "bg-accent" : "bg-muted-foreground"}`} />
            <span className="font-mono text-[0.6rem] text-muted-foreground uppercase">{agent.status}</span>
          </div>
        </div>
        {children.length > 0 && (
          <div className="border-l border-border ml-5">
            {children.map(child => renderOrgNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="section-label">OPENCOMMAND</div>
          {companies.length > 0 && (
            <div className="flex items-center gap-2">
              <Building2 size={12} className="text-muted-foreground" />
              <Select value={String(selectedCompanyId ?? "")} onValueChange={v => setSelectedCompanyId(Number(v))}>
                <SelectTrigger className="bg-input border-border text-foreground font-condensed font-bold text-xs uppercase w-auto min-w-[180px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {companies.map(c => (
                    <SelectItem key={c.id} value={String(c.id)} className="font-condensed font-bold text-xs uppercase">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="red-line mb-4" />
        <div className="flex items-end justify-between">
          <h1 className="text-display text-5xl lg:text-6xl text-foreground">MISSION CONTROL</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[oklch(0.65_0.18_142)] animate-pulse" />
            <span className="section-label">ARIA ONLINE</span>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-border mb-6">
        {[
          { label: "VALUE CREATED", value: `$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 0 })}`, icon: TrendingUp, color: "text-[oklch(0.65_0.18_142)]" },
          { label: "TOTAL COSTS", value: `$${totalCosts.toFixed(2)}`, icon: DollarSign, color: "text-accent" },
          { label: "HOURS SAVED", value: `${totalHours.toFixed(0)} HRS`, icon: Clock, color: "text-[oklch(0.62_0.18_240)]" },
          { label: "PoO RECEIPTS", value: totalReceipts.toString(), icon: FileCheck, color: "text-[oklch(0.82_0.18_90)]" },
          { label: "ACTIVE AGENTS", value: `${activeAgents} / ${agents.length}`, icon: Zap, color: "text-foreground" },
        ].map((kpi, i) => (
          <div key={i} className="bg-background brutal-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="section-label">{kpi.label}</span>
              <kpi.icon size={14} className={kpi.color} />
            </div>
            <div className={`font-condensed font-black text-2xl ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border mb-6 scrollbar-hide">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 font-condensed font-bold text-xs uppercase tracking-wide transition-colors border-b-2 -mb-px whitespace-nowrap ${tab === t.id ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <t.icon size={12} />
            {t.label}
            {t.badge ? <span className="bg-accent text-foreground text-[0.6rem] font-mono px-1.5 py-0.5">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* ═══ OKR TRACKER ═══ */}
      {tab === "okrs" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="section-label">OBJECTIVES & KEY RESULTS</div>
            <Button onClick={() => setShowAddOkr(true)} size="sm" className="bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide text-xs gap-1">
              <Plus size={12} /> ADD OKR
            </Button>
          </div>
          {okrs.length === 0 ? (
            <div className="brutal-card p-8 text-center">
              <Target size={32} className="text-muted-foreground mx-auto mb-3" />
              <div className="font-condensed font-bold text-lg text-muted-foreground">NO OKRs DEFINED</div>
            </div>
          ) : (
            <div className="space-y-3">
              {okrs.map(okr => {
                const progress = Math.min(100, (Number(okr.currentValue) / Number(okr.targetValue)) * 100);
                const sc: Record<string, string> = { on_track: "tag-on-track", at_risk: "tag-at-risk", achieved: "tag-achieved", missed: "tag-missed" };
                return (
                  <div key={okr.id} className="brutal-card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="section-label">{(okr as any).level?.toUpperCase() ?? "COMPANY"}</span>
                          <span className="text-muted-foreground text-[0.6rem]">·</span>
                          <span className="section-label">OBJECTIVE</span>
                        </div>
                        <div className="font-condensed font-bold text-lg text-foreground">{okr.objective}</div>
                        <div className="text-muted-foreground text-sm mt-1">{okr.keyResult}</div>
                      </div>
                      <span className={`font-mono text-xs border px-2 py-1 uppercase ml-4 ${sc[okr.status]}`}>{okr.status.replace("_", " ")}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 progress-bar-bg"><div className={progress >= 100 ? "progress-bar-fill-green" : "progress-bar-fill"} style={{ width: `${progress}%` }} /></div>
                      <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{Number(okr.currentValue).toLocaleString()} / {Number(okr.targetValue).toLocaleString()} {okr.unit}</span>
                      <span className="font-condensed font-bold text-sm text-foreground">{progress.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ AGENT FLEET ═══ */}
      {tab === "fleet" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="section-label">AGENT FLEET — {agents.length} UNITS DEPLOYED</div>
            <Button onClick={() => setShowAddAgent(true)} size="sm" className="bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide text-xs gap-1">
              <Plus size={12} /> DEPLOY AGENT
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map(agent => (
              <div key={agent.id} className="brutal-card-hover p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className={`font-mono text-xs border px-2 py-0.5 uppercase ${typeColors[agent.type] ?? "text-foreground border-foreground"}`}>{agent.type}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 ${agent.status === "active" ? "bg-[oklch(0.65_0.18_142)] animate-pulse" : agent.status === "error" ? "bg-accent" : "bg-muted-foreground"}`} />
                    <span className="font-mono text-xs text-muted-foreground uppercase">{agent.status}</span>
                  </div>
                </div>
                <div className="font-condensed font-black text-lg text-foreground mb-0.5">{agent.name}</div>
                {(agent as any).roleTitle && <div className="section-label mb-2">{(agent as any).roleTitle}</div>}
                <p className="text-muted-foreground text-xs leading-relaxed mb-4 line-clamp-2">{agent.description}</p>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div><span className="section-label">TASKS</span><div className="font-condensed font-bold text-foreground">{agent.tasksCompleted}</div></div>
                  <div><span className="section-label">VALUE</span><div className="font-condensed font-bold text-[oklch(0.65_0.18_142)]">${Number(agent.totalValueCreated ?? 0).toFixed(0)}</div></div>
                  <div><span className="section-label">COST</span><div className="font-condensed font-bold text-accent">${Number((agent as any).totalCostIncurred ?? 0).toFixed(2)}</div></div>
                </div>
                {Number((agent as any).monthlyBudget ?? 0) > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="section-label">BUDGET</span>
                      <span className="font-mono text-[0.6rem] text-muted-foreground">${Number((agent as any).budgetUsed ?? 0).toFixed(2)} / ${Number((agent as any).monthlyBudget ?? 0).toFixed(0)}</span>
                    </div>
                    <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${Math.min(100, (Number((agent as any).budgetUsed ?? 0) / Number((agent as any).monthlyBudget ?? 1)) * 100)}%` }} /></div>
                  </div>
                )}
                <div className="flex gap-2">
                  {agent.status === "idle" && (
                    <button onClick={() => updateAgentStatus.mutate({ id: agent.id, status: "active" })} className="flex-1 bg-[oklch(0.65_0.18_142)]/10 border border-[oklch(0.65_0.18_142)] text-[oklch(0.65_0.18_142)] font-condensed font-bold text-xs py-1.5 uppercase tracking-wide hover:bg-[oklch(0.65_0.18_142)]/20 transition-colors">ACTIVATE</button>
                  )}
                  {agent.status === "active" && (
                    <button onClick={() => updateAgentStatus.mutate({ id: agent.id, status: "idle" })} className="flex-1 bg-muted/10 border border-border text-muted-foreground font-condensed font-bold text-xs py-1.5 uppercase tracking-wide hover:bg-muted/20 transition-colors">PAUSE</button>
                  )}
                  {agent.status === "paused" && (
                    <button onClick={() => updateAgentStatus.mutate({ id: agent.id, status: "active" })} className="flex-1 bg-[oklch(0.65_0.18_142)]/10 border border-[oklch(0.65_0.18_142)] text-[oklch(0.65_0.18_142)] font-condensed font-bold text-xs py-1.5 uppercase tracking-wide hover:bg-[oklch(0.65_0.18_142)]/20 transition-colors">RESUME</button>
                  )}
                  <button onClick={() => { if (confirm("Remove this agent?")) deleteAgentMut.mutate({ id: agent.id }); }} className="bg-accent/10 border border-accent text-accent font-condensed font-bold text-xs px-3 py-1.5 uppercase tracking-wide hover:bg-accent/20 transition-colors">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ ORG CHART ═══ */}
      {tab === "org" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="section-label">ORGANIZATIONAL HIERARCHY — {selectedCompany?.name?.toUpperCase()}</div>
            <div className="flex gap-2">
              <Button onClick={() => setShowAddDept(true)} size="sm" className="bg-secondary text-foreground hover:bg-secondary/80 font-condensed font-bold uppercase tracking-wide text-xs gap-1">
                <Plus size={12} /> DEPARTMENT
              </Button>
              <Button onClick={() => setShowAddAgent(true)} size="sm" className="bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide text-xs gap-1">
                <Plus size={12} /> AGENT
              </Button>
            </div>
          </div>

          {/* Departments */}
          {departments.length > 0 && (
            <div className="mb-6">
              <div className="section-label mb-3">DEPARTMENTS</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {departments.map(dept => (
                  <div key={dept.id} className="brutal-card p-4">
                    <div className="font-condensed font-bold text-sm text-foreground">{dept.name}</div>
                    {Number(dept.budget ?? 0) > 0 && <div className="font-mono text-xs text-muted-foreground mt-1">${Number(dept.budget).toLocaleString()} budget</div>}
                    <div className="font-mono text-[0.6rem] text-muted-foreground mt-1">{companyAgents.filter(a => a.departmentId === dept.id).length} agents</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hierarchy */}
          <div className="section-label mb-3">AGENT HIERARCHY</div>
          {companyAgents.length === 0 ? (
            <div className="brutal-card p-8 text-center">
              <GitBranch size={32} className="text-muted-foreground mx-auto mb-3" />
              <div className="font-condensed font-bold text-lg text-muted-foreground">NO AGENTS IN THIS COMPANY</div>
            </div>
          ) : (
            <div className="space-y-1">
              {orgTree.ceo && renderOrgNode(orgTree.ceo, 0)}
              {(orgTree.byParent.get(null) ?? []).filter(a => a.id !== orgTree.ceo?.id).map(a => renderOrgNode(a, 0))}
            </div>
          )}
        </div>
      )}

      {/* ═══ HEARTBEAT ═══ */}
      {tab === "heartbeat" && (
        <div>
          <div className="section-label mb-4">HEARTBEAT SCHEDULER — AUTONOMOUS EXECUTION CYCLES</div>
          <div className="space-y-3">
            {agents.map(agent => (
              <div key={agent.id} className="brutal-card p-5 flex items-center gap-4">
                <div className={`w-10 h-10 flex items-center justify-center border ${typeColors[agent.type] ?? "border-foreground"}`}>
                  <Heart size={16} className={agent.status === "active" ? "text-[oklch(0.65_0.18_142)] animate-pulse" : "text-muted-foreground"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-condensed font-bold text-sm text-foreground">{agent.name}</div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="section-label">{(agent as any).heartbeatCron || "NO SCHEDULE"}</span>
                    {(agent as any).lastHeartbeat && <span className="font-mono text-[0.6rem] text-muted-foreground">Last: {new Date((agent as any).lastHeartbeat).toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-xs px-2 py-1 border uppercase ${(agent as any).heartbeatEnabled ? "text-[oklch(0.65_0.18_142)] border-[oklch(0.65_0.18_142)]" : "text-muted-foreground border-border"}`}>
                    {(agent as any).heartbeatEnabled ? "ENABLED" : "DISABLED"}
                  </span>
                  <button
                    onClick={() => triggerHeartbeat.mutate({ agentId: agent.id })}
                    disabled={triggerHeartbeat.isPending}
                    className="bg-accent/10 border border-accent text-accent font-condensed font-bold text-xs px-3 py-1.5 uppercase tracking-wide hover:bg-accent/20 transition-colors disabled:opacity-50"
                  >
                    <Activity size={11} className="inline mr-1" /> PULSE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ P&L DASHBOARD ═══ */}
      {tab === "budget" && (
        <div>
          <div className="section-label mb-4">PROFIT & LOSS — {selectedCompany?.name?.toUpperCase()}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border mb-6">
            <div className="bg-background brutal-card p-5">
              <div className="section-label mb-2">TOTAL REVENUE</div>
              <div className="font-condensed font-black text-3xl text-[oklch(0.65_0.18_142)]">${Number(pnlQ.data?.totalRevenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-background brutal-card p-5">
              <div className="section-label mb-2">TOTAL COSTS</div>
              <div className="font-condensed font-black text-3xl text-accent">${Number(pnlQ.data?.totalCosts ?? 0).toFixed(2)}</div>
            </div>
            <div className="bg-background brutal-card p-5">
              <div className="section-label mb-2">NET PROFIT</div>
              <div className={`font-condensed font-black text-3xl ${Number(pnlQ.data?.netProfit ?? 0) >= 0 ? "text-[oklch(0.65_0.18_142)]" : "text-accent"}`}>
                ${Number(pnlQ.data?.netProfit ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Agent cost breakdown */}
          <div className="section-label mb-3">AGENT COST BREAKDOWN</div>
          <div className="space-y-2">
            {agents.filter(a => Number((a as any).totalCostIncurred ?? 0) > 0 || Number(a.totalValueCreated ?? 0) > 0).map(agent => {
              const cost = Number((agent as any).totalCostIncurred ?? 0);
              const value = Number(agent.totalValueCreated ?? 0);
              const roi = cost > 0 ? ((value - cost) / cost * 100) : 0;
              return (
                <div key={agent.id} className="brutal-card p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-condensed font-bold text-sm text-foreground">{agent.name}</div>
                    <div className="section-label">{agent.type.toUpperCase()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs text-[oklch(0.65_0.18_142)]">+${value.toFixed(2)}</div>
                    <div className="font-mono text-xs text-accent">-${cost.toFixed(2)}</div>
                  </div>
                  <div className={`font-condensed font-bold text-sm min-w-[60px] text-right ${roi >= 0 ? "text-[oklch(0.65_0.18_142)]" : "text-accent"}`}>
                    {roi.toFixed(0)}% ROI
                  </div>
                </div>
              );
            })}
            {agents.filter(a => Number((a as any).totalCostIncurred ?? 0) > 0 || Number(a.totalValueCreated ?? 0) > 0).length === 0 && (
              <div className="brutal-card p-8 text-center">
                <BarChart3 size={32} className="text-muted-foreground mx-auto mb-3" />
                <div className="font-condensed font-bold text-lg text-muted-foreground">NO COST DATA YET</div>
                <p className="text-muted-foreground text-sm mt-2">Execute tasks to generate cost and revenue data.</p>
              </div>
            )}
          </div>

          {/* Company budget */}
          {selectedCompany && Number(selectedCompany.monthlyBudget ?? 0) > 0 && (
            <div className="mt-6">
              <div className="section-label mb-3">COMPANY BUDGET</div>
              <div className="brutal-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-condensed font-bold text-sm text-foreground">Monthly Budget</span>
                  <span className="font-mono text-xs text-muted-foreground">${Number(pnlQ.data?.totalCosts ?? 0).toFixed(2)} / ${Number(selectedCompany.monthlyBudget).toLocaleString()}</span>
                </div>
                <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${Math.min(100, (Number(pnlQ.data?.totalCosts ?? 0) / Number(selectedCompany.monthlyBudget)) * 100)}%` }} /></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ PoO LEDGER ═══ */}
      {tab === "poo" && (
        <div>
          <div className="section-label mb-4">PROOF OF OUTCOME LEDGER — {pooReceipts.length} RECEIPTS</div>
          {pooReceipts.length === 0 ? (
            <div className="brutal-card p-8 text-center">
              <FileCheck size={32} className="text-muted-foreground mx-auto mb-3" />
              <div className="font-condensed font-bold text-lg text-muted-foreground">NO PoO RECEIPTS YET</div>
              <p className="text-muted-foreground text-sm mt-2">Execute tasks via the Intent Engine to generate receipts.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pooReceipts.map(receipt => (
                <div key={receipt.id} className="brutal-card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="ticker-line mb-1">{receipt.receiptNumber}</div>
                      <div className="font-condensed font-bold text-lg text-foreground">{receipt.taskTitle}</div>
                    </div>
                    <span className={`font-mono text-xs border px-2 py-1 uppercase ${receipt.verificationStatus === "verified" ? "tag-achieved" : "tag-at-risk"}`}>{receipt.verificationStatus}</span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{receipt.outcome}</p>
                  <div className="grid grid-cols-4 gap-4 pt-3 border-t border-border">
                    <div><div className="section-label mb-1">VALUE</div><div className="font-condensed font-black text-xl text-[oklch(0.65_0.18_142)]">${Number(receipt.dollarValueCreated).toLocaleString()}</div></div>
                    <div><div className="section-label mb-1">COST</div><div className="font-condensed font-black text-xl text-accent">${Number((receipt as any).costIncurred ?? 0).toFixed(4)}</div></div>
                    <div><div className="section-label mb-1">HOURS SAVED</div><div className="font-condensed font-black text-xl text-foreground">{Number(receipt.laborHoursSaved).toFixed(1)}</div></div>
                    <div><div className="section-label mb-1">ISSUED</div><div className="font-mono text-xs text-muted-foreground mt-1">{new Date(receipt.createdAt).toLocaleDateString()}</div></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ INBOX ═══ */}
      {tab === "inbox" && (
        <div>
          <div className="section-label mb-4">HUMAN-IN-THE-LOOP INBOX — {unread} UNREAD</div>
          {inboxItems.length === 0 ? (
            <div className="brutal-card p-8 text-center">
              <Inbox size={32} className="text-muted-foreground mx-auto mb-3" />
              <div className="font-condensed font-bold text-lg text-muted-foreground">INBOX CLEAR</div>
            </div>
          ) : (
            <div className="space-y-3">
              {inboxItems.filter(i => i.status !== "dismissed").map(item => {
                const pc: Record<string, string> = { critical: "text-accent border-accent", high: "text-[oklch(0.82_0.18_90)] border-[oklch(0.82_0.18_90)]", medium: "text-muted-foreground border-muted-foreground", low: "text-muted-foreground/50 border-muted-foreground/50" };
                return (
                  <div key={item.id} className={`brutal-card p-5 ${item.status === "unread" ? "border-l-2 border-l-accent" : ""}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-condensed font-bold text-base text-foreground">{item.title}</div>
                        <div className="section-label mt-0.5">{item.type.replace(/_/g, " ")} · {new Date(item.createdAt).toLocaleString()}</div>
                      </div>
                      <span className={`font-mono text-xs border px-2 py-1 uppercase ${pc[item.priority]}`}>{item.priority}</span>
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">{item.body}</p>
                    {item.status !== "resolved" && (
                      <div className="flex gap-2">
                        <button onClick={() => resolveInbox.mutate({ id: item.id, resolution: "Acknowledged" })} className="flex items-center gap-1.5 bg-[oklch(0.65_0.18_142)]/10 border border-[oklch(0.65_0.18_142)] text-[oklch(0.65_0.18_142)] font-condensed font-bold text-xs px-3 py-1.5 uppercase tracking-wide hover:bg-[oklch(0.65_0.18_142)]/20 transition-colors"><Check size={11} /> RESOLVE</button>
                        <button onClick={() => dismissInbox.mutate({ id: item.id })} className="flex items-center gap-1.5 bg-muted/10 border border-border text-muted-foreground font-condensed font-bold text-xs px-3 py-1.5 uppercase tracking-wide hover:bg-muted/20 transition-colors"><X size={11} /> DISMISS</button>
                      </div>
                    )}
                    {item.status === "resolved" && <div className="flex items-center gap-2 text-[oklch(0.65_0.18_142)]"><CheckCircle2 size={12} /><span className="section-label text-[oklch(0.65_0.18_142)]">RESOLVED</span></div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ GOVERNANCE ═══ */}
      {tab === "governance" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="section-label">GOVERNANCE & COMPLIANCE — {selectedCompany?.name?.toUpperCase()}</div>
            <div className="flex gap-2">
              <Button onClick={() => setShowAddGate(true)} size="sm" className="bg-secondary text-foreground hover:bg-secondary/80 font-condensed font-bold uppercase tracking-wide text-xs gap-1">
                <Plus size={12} /> ADD GATE
              </Button>
              <Button onClick={() => { if (selectedCompanyId && confirm("EMERGENCY: This will pause ALL agents in this company. Continue?")) killSwitchMut.mutate({ companyId: selectedCompanyId }); }} size="sm" className="bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide text-xs gap-1" disabled={!selectedCompanyId}>
                <Power size={12} /> KILL SWITCH
              </Button>
            </div>
          </div>

          {/* Approval Gates */}
          <div className="section-label mb-3">APPROVAL GATES</div>
          {gates.length === 0 ? (
            <div className="brutal-card p-6 text-center mb-6">
              <Shield size={24} className="text-muted-foreground mx-auto mb-2" />
              <div className="font-condensed font-bold text-sm text-muted-foreground">NO GATES CONFIGURED</div>
            </div>
          ) : (
            <div className="space-y-2 mb-6">
              {gates.map(gate => (
                <div key={gate.id} className="brutal-card p-4 flex items-center gap-4">
                  <Shield size={16} className={gate.isActive ? "text-[oklch(0.65_0.18_142)]" : "text-muted-foreground"} />
                  <div className="flex-1">
                    <div className="font-condensed font-bold text-sm text-foreground uppercase">{gate.gateType} GATE</div>
                    <div className="text-muted-foreground text-xs">{gate.description}</div>
                  </div>
                  {gate.threshold && <span className="font-mono text-xs text-accent">${Number(gate.threshold).toLocaleString()}</span>}
                  <span className={`font-mono text-xs border px-2 py-0.5 uppercase ${gate.isActive ? "text-[oklch(0.65_0.18_142)] border-[oklch(0.65_0.18_142)]" : "text-muted-foreground border-border"}`}>{gate.isActive ? "ACTIVE" : "OFF"}</span>
                  <button onClick={() => removeGateMut.mutate({ id: gate.id })} className="text-muted-foreground hover:text-accent"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}

          {/* Tool Registry */}
          <div className="section-label mb-3">TOOL REGISTRY — {tools.length} INTEGRATIONS</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {tools.map(tool => (
              <div key={tool.id} className="brutal-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-condensed font-bold text-sm text-foreground">{tool.name}</div>
                  <Wrench size={12} className={tool.isActive ? "text-[oklch(0.65_0.18_142)]" : "text-muted-foreground"} />
                </div>
                <div className="section-label">{tool.category}</div>
                <div className="text-muted-foreground text-xs mt-1">{tool.description}</div>
                {Number(tool.costPerUse ?? 0) > 0 && <div className="font-mono text-[0.6rem] text-accent mt-2">${Number(tool.costPerUse).toFixed(4)}/use</div>}
              </div>
            ))}
          </div>

          {/* Audit Log */}
          <div className="section-label mb-3">AUDIT LOG</div>
          {auditEntries.length === 0 ? (
            <div className="brutal-card p-6 text-center">
              <div className="font-condensed font-bold text-sm text-muted-foreground">NO AUDIT ENTRIES</div>
            </div>
          ) : (
            <div className="space-y-1">
              {auditEntries.slice(0, 20).map(entry => (
                <div key={entry.id} className="brutal-card p-3 flex items-center gap-3">
                  <div className="font-mono text-[0.6rem] text-muted-foreground whitespace-nowrap">{new Date(entry.createdAt).toLocaleString()}</div>
                  <div className={`font-condensed font-bold text-xs uppercase ${entry.action.includes("KILL") ? "text-accent" : "text-foreground"}`}>{entry.action}</div>
                  <div className="text-muted-foreground text-xs flex-1 truncate">{entry.details}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ DIALOGS ═══ */}

      {/* Add OKR */}
      <Dialog open={showAddOkr} onOpenChange={setShowAddOkr}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader><div className="red-line mb-4" /><DialogTitle className="font-condensed font-black text-2xl uppercase">ADD NEW OKR</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="section-label mb-2 block">OBJECTIVE</label><Input value={newOkr.objective} onChange={e => setNewOkr(p => ({ ...p, objective: e.target.value }))} placeholder="e.g. Reach Product-Market Fit" className="bg-input border-border text-foreground" /></div>
            <div><label className="section-label mb-2 block">KEY RESULT</label><Textarea value={newOkr.keyResult} onChange={e => setNewOkr(p => ({ ...p, keyResult: e.target.value }))} placeholder="e.g. Achieve $50K MRR" className="bg-input border-border text-foreground resize-none" rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="section-label mb-2 block">TARGET</label><Input type="number" value={newOkr.targetValue} onChange={e => setNewOkr(p => ({ ...p, targetValue: e.target.value }))} className="bg-input border-border text-foreground" /></div>
              <div><label className="section-label mb-2 block">UNIT</label><Input value={newOkr.unit} onChange={e => setNewOkr(p => ({ ...p, unit: e.target.value }))} placeholder="USD/mo" className="bg-input border-border text-foreground" /></div>
              <div><label className="section-label mb-2 block">LEVEL</label>
                <Select value={newOkr.level} onValueChange={v => setNewOkr(p => ({ ...p, level: v }))}>
                  <SelectTrigger className="bg-input border-border text-foreground h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border"><SelectItem value="company">Company</SelectItem><SelectItem value="department">Department</SelectItem><SelectItem value="agent">Agent</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => createOkr.mutate({ objective: newOkr.objective, keyResult: newOkr.keyResult, targetValue: Number(newOkr.targetValue), unit: newOkr.unit, companyId: selectedCompanyId ?? undefined, level: newOkr.level as any })} disabled={!newOkr.objective || !newOkr.keyResult || !newOkr.targetValue || createOkr.isPending} className="flex-1 bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide">{createOkr.isPending ? "CREATING..." : "CREATE OKR"}</Button>
              <Button variant="outline" onClick={() => setShowAddOkr(false)} className="border-border text-muted-foreground font-condensed font-bold uppercase">CANCEL</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Agent */}
      <Dialog open={showAddAgent} onOpenChange={setShowAddAgent}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader><div className="red-line mb-4" /><DialogTitle className="font-condensed font-black text-2xl uppercase">DEPLOY NEW AGENT</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="section-label mb-2 block">AGENT NAME</label><Input value={newAgent.name} onChange={e => setNewAgent(p => ({ ...p, name: e.target.value }))} placeholder="e.g. NOVA — CMO" className="bg-input border-border text-foreground" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="section-label mb-2 block">TYPE</label>
                <Select value={newAgent.type} onValueChange={v => setNewAgent(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="bg-input border-border text-foreground h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">{["ceo","cto","cmo","cfo","vp","manager","specialist","marketing","research","sales","admin","custom"].map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="section-label mb-2 block">ROLE TITLE</label><Input value={newAgent.roleTitle} onChange={e => setNewAgent(p => ({ ...p, roleTitle: e.target.value }))} placeholder="Chief Marketing Officer" className="bg-input border-border text-foreground" /></div>
            </div>
            <div><label className="section-label mb-2 block">DESCRIPTION</label><Textarea value={newAgent.description} onChange={e => setNewAgent(p => ({ ...p, description: e.target.value }))} className="bg-input border-border text-foreground resize-none" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="section-label mb-2 block">HEARTBEAT CRON</label><Input value={newAgent.heartbeatCron} onChange={e => setNewAgent(p => ({ ...p, heartbeatCron: e.target.value }))} placeholder="*/30 * * * *" className="bg-input border-border text-foreground" /></div>
              <div><label className="section-label mb-2 block">MONTHLY BUDGET ($)</label><Input type="number" value={newAgent.monthlyBudget} onChange={e => setNewAgent(p => ({ ...p, monthlyBudget: e.target.value }))} placeholder="500" className="bg-input border-border text-foreground" /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => createAgentMut.mutate({ name: newAgent.name, type: newAgent.type as any, roleTitle: newAgent.roleTitle || undefined, description: newAgent.description || undefined, heartbeatCron: newAgent.heartbeatCron || undefined, monthlyBudget: newAgent.monthlyBudget ? Number(newAgent.monthlyBudget) : undefined, companyId: selectedCompanyId ?? undefined })} disabled={!newAgent.name || createAgentMut.isPending} className="flex-1 bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide">{createAgentMut.isPending ? "DEPLOYING..." : "DEPLOY AGENT"}</Button>
              <Button variant="outline" onClick={() => setShowAddAgent(false)} className="border-border text-muted-foreground font-condensed font-bold uppercase">CANCEL</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Department */}
      <Dialog open={showAddDept} onOpenChange={setShowAddDept}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader><div className="red-line mb-4" /><DialogTitle className="font-condensed font-black text-2xl uppercase">ADD DEPARTMENT</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="section-label mb-2 block">NAME</label><Input value={newDept.name} onChange={e => setNewDept(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Marketing" className="bg-input border-border text-foreground" /></div>
            <div><label className="section-label mb-2 block">BUDGET ($)</label><Input type="number" value={newDept.budget} onChange={e => setNewDept(p => ({ ...p, budget: e.target.value }))} placeholder="2000" className="bg-input border-border text-foreground" /></div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => { if (selectedCompanyId) createDeptMut.mutate({ companyId: selectedCompanyId, name: newDept.name, budget: newDept.budget ? Number(newDept.budget) : undefined }); }} disabled={!newDept.name || !selectedCompanyId || createDeptMut.isPending} className="flex-1 bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide">{createDeptMut.isPending ? "CREATING..." : "CREATE"}</Button>
              <Button variant="outline" onClick={() => setShowAddDept(false)} className="border-border text-muted-foreground font-condensed font-bold uppercase">CANCEL</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Approval Gate */}
      <Dialog open={showAddGate} onOpenChange={setShowAddGate}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader><div className="red-line mb-4" /><DialogTitle className="font-condensed font-black text-2xl uppercase">ADD APPROVAL GATE</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="section-label mb-2 block">GATE TYPE</label>
              <Select value={newGate.gateType} onValueChange={v => setNewGate(p => ({ ...p, gateType: v }))}>
                <SelectTrigger className="bg-input border-border text-foreground h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">{["spend","hire","strategy","terminate","custom"].map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="section-label mb-2 block">THRESHOLD ($)</label><Input type="number" value={newGate.threshold} onChange={e => setNewGate(p => ({ ...p, threshold: e.target.value }))} placeholder="500" className="bg-input border-border text-foreground" /></div>
            <div><label className="section-label mb-2 block">DESCRIPTION</label><Input value={newGate.description} onChange={e => setNewGate(p => ({ ...p, description: e.target.value }))} placeholder="Spending over $500 requires approval" className="bg-input border-border text-foreground" /></div>
            <div><label className="section-label mb-2 block">AUTO-APPROVE BELOW ($)</label><Input type="number" value={newGate.autoApproveBelow} onChange={e => setNewGate(p => ({ ...p, autoApproveBelow: e.target.value }))} placeholder="100" className="bg-input border-border text-foreground" /></div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => { if (selectedCompanyId) createGateMut.mutate({ companyId: selectedCompanyId, gateType: newGate.gateType as any, threshold: newGate.threshold ? Number(newGate.threshold) : undefined, description: newGate.description || undefined, autoApproveBelow: newGate.autoApproveBelow ? Number(newGate.autoApproveBelow) : undefined }); }} disabled={!selectedCompanyId || createGateMut.isPending} className="flex-1 bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide">{createGateMut.isPending ? "CREATING..." : "CREATE GATE"}</Button>
              <Button variant="outline" onClick={() => setShowAddGate(false)} className="border-border text-muted-foreground font-condensed font-bold uppercase">CANCEL</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
