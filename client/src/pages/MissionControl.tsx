import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Target, Cpu, FileCheck, Inbox, Plus, CheckCircle2, AlertTriangle,
  Clock, TrendingUp, Zap, RefreshCw, ChevronRight, X, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Tab = "okrs" | "fleet" | "poo" | "inbox";

export default function MissionControl() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("okrs");
  const [showAddOkr, setShowAddOkr] = useState(false);
  const [newOkr, setNewOkr] = useState({ objective: "", keyResult: "", targetValue: "", unit: "", dueDate: "" });

  const utils = trpc.useUtils();

  // Seed defaults on first load
  const seedAgents = trpc.agents.seedDefaults.useMutation({ onSuccess: () => utils.agents.list.invalidate() });
  const seedOkrs = trpc.okrs.seedDefaults.useMutation({ onSuccess: () => utils.okrs.list.invalidate() });
  const seedMarketplace = trpc.marketplace.seedDefaults.useMutation();
  const seedCreators = trpc.creators.seedDefaults.useMutation();

  useEffect(() => {
    seedAgents.mutate();
    seedOkrs.mutate();
    seedMarketplace.mutate();
    seedCreators.mutate();
  }, []);

  const agentsQ = trpc.agents.list.useQuery();
  const okrsQ = trpc.okrs.list.useQuery();
  const pooQ = trpc.poo.list.useQuery();
  const pooSummaryQ = trpc.poo.summary.useQuery();
  const inboxQ = trpc.inbox.list.useQuery();

  const createOkr = trpc.okrs.create.useMutation({
    onSuccess: () => { utils.okrs.list.invalidate(); setShowAddOkr(false); setNewOkr({ objective: "", keyResult: "", targetValue: "", unit: "", dueDate: "" }); toast.success("OKR created"); },
  });

  const resolveInbox = trpc.inbox.resolve.useMutation({ onSuccess: () => utils.inbox.list.invalidate() });
  const dismissInbox = trpc.inbox.dismiss.useMutation({ onSuccess: () => utils.inbox.list.invalidate() });
  const updateAgentStatus = trpc.agents.updateStatus.useMutation({ onSuccess: () => utils.agents.list.invalidate() });

  const agents = agentsQ.data ?? [];
  const okrs = okrsQ.data ?? [];
  const pooReceipts = pooQ.data ?? [];
  const inboxItems = inboxQ.data ?? [];
  const unread = inboxItems.filter(i => i.status === "unread").length;

  const totalValue = Number(pooSummaryQ.data?.totalValue ?? 0);
  const totalHours = Number(pooSummaryQ.data?.totalHours ?? 0);
  const totalReceipts = Number(pooSummaryQ.data?.totalReceipts ?? 0);
  const activeAgents = agents.filter(a => a.status === "active").length;

  const tabs: { id: Tab; label: string; icon: typeof Target; badge?: number }[] = [
    { id: "okrs", label: "OKR TRACKER", icon: Target },
    { id: "fleet", label: "AGENT FLEET", icon: Cpu },
    { id: "poo", label: "PoO LEDGER", icon: FileCheck },
    { id: "inbox", label: "INBOX", icon: Inbox, badge: unread },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="section-label mb-2">OPENCOMMAND</div>
        <div className="red-line mb-4" />
        <div className="flex items-end justify-between">
          <h1 className="text-display text-6xl text-foreground">MISSION CONTROL</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[oklch(0.65_0.18_142)] animate-pulse" />
            <span className="section-label">ARIA ONLINE</span>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border mb-8">
        {[
          { label: "VALUE CREATED", value: `$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: "text-[oklch(0.65_0.18_142)]" },
          { label: "HOURS SAVED", value: `${totalHours.toFixed(1)} HRS`, icon: Clock, color: "text-[oklch(0.62_0.18_240)]" },
          { label: "PoO RECEIPTS", value: totalReceipts.toString(), icon: FileCheck, color: "text-accent" },
          { label: "ACTIVE AGENTS", value: `${activeAgents} / ${agents.length}`, icon: Zap, color: "text-[oklch(0.82_0.18_90)]" },
        ].map((kpi, i) => (
          <div key={i} className="bg-background brutal-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="section-label">{kpi.label}</span>
              <kpi.icon size={16} className={kpi.color} />
            </div>
            <div className={`font-condensed font-black text-3xl ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 font-condensed font-bold text-sm uppercase tracking-wide transition-colors border-b-2 -mb-px ${tab === t.id ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <t.icon size={14} />
            {t.label}
            {t.badge ? <span className="bg-accent text-foreground text-xs font-mono px-1.5 py-0.5">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* OKR Tracker */}
      {tab === "okrs" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="section-label">OBJECTIVES & KEY RESULTS</div>
            <Button onClick={() => setShowAddOkr(true)} size="sm" className="bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide text-xs gap-1">
              <Plus size={12} /> ADD OKR
            </Button>
          </div>
          {okrsQ.isLoading ? (
            <div className="text-muted-foreground font-mono text-sm py-8 text-center">LOADING OKRs...</div>
          ) : okrs.length === 0 ? (
            <div className="brutal-card p-8 text-center">
              <Target size={32} className="text-muted-foreground mx-auto mb-3" />
              <div className="font-condensed font-bold text-lg text-muted-foreground">NO OKRs DEFINED</div>
              <p className="text-muted-foreground text-sm mt-2">Add your first objective to start tracking progress.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {okrs.map(okr => {
                const progress = Math.min(100, (Number(okr.currentValue) / Number(okr.targetValue)) * 100);
                const statusColors: Record<string, string> = { on_track: "tag-on-track", at_risk: "tag-at-risk", achieved: "tag-achieved", missed: "tag-missed" };
                return (
                  <div key={okr.id} className="brutal-card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="section-label mb-1">OBJECTIVE</div>
                        <div className="font-condensed font-bold text-lg text-foreground">{okr.objective}</div>
                        <div className="section-label mt-2 mb-1">KEY RESULT</div>
                        <div className="text-muted-foreground text-sm">{okr.keyResult}</div>
                      </div>
                      <span className={`font-mono text-xs border px-2 py-1 uppercase ml-4 ${statusColors[okr.status]}`}>
                        {okr.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex-1 progress-bar-bg">
                        <div className={progress >= 100 ? "progress-bar-fill-green" : "progress-bar-fill"} style={{ width: `${progress}%` }} />
                      </div>
                      <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {Number(okr.currentValue).toLocaleString()} / {Number(okr.targetValue).toLocaleString()} {okr.unit}
                      </span>
                      <span className="font-condensed font-bold text-sm text-foreground">{progress.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Agent Fleet */}
      {tab === "fleet" && (
        <div>
          <div className="section-label mb-4">AGENT FLEET — {agents.length} UNITS DEPLOYED</div>
          {agentsQ.isLoading ? (
            <div className="text-muted-foreground font-mono text-sm py-8 text-center">LOADING FLEET...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.map(agent => {
                const statusClass: Record<string, string> = { active: "status-active", idle: "status-idle", paused: "status-paused", error: "status-error" };
                const typeColors: Record<string, string> = { ceo: "text-accent border-accent", marketing: "text-[oklch(0.62_0.18_240)] border-[oklch(0.62_0.18_240)]", research: "text-[oklch(0.82_0.18_90)] border-[oklch(0.82_0.18_90)]", sales: "text-[oklch(0.65_0.18_142)] border-[oklch(0.65_0.18_142)]", admin: "text-muted-foreground border-muted-foreground", custom: "text-foreground border-foreground" };
                return (
                  <div key={agent.id} className="brutal-card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className={`font-mono text-xs border px-2 py-0.5 uppercase ${typeColors[agent.type] ?? "text-foreground border-foreground"}`}>
                          {agent.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-[oklch(0.65_0.18_142)] animate-pulse" : agent.status === "error" ? "bg-accent" : "bg-muted-foreground"}`} />
                        <span className={`font-mono text-xs uppercase ${statusClass[agent.status]}`}>{agent.status}</span>
                      </div>
                    </div>
                    <div className="font-condensed font-black text-lg text-foreground mb-1">{agent.name}</div>
                    <p className="text-muted-foreground text-xs leading-relaxed mb-4">{agent.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="section-label">{agent.tasksCompleted} TASKS</span>
                      <span className="section-label">${Number(agent.totalValueCreated ?? 0).toFixed(0)} VALUE</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {agent.status === "idle" && (
                        <button
                          onClick={() => updateAgentStatus.mutate({ id: agent.id, status: "active" })}
                          className="flex-1 bg-[oklch(0.65_0.18_142)]/10 border border-[oklch(0.65_0.18_142)] text-[oklch(0.65_0.18_142)] font-condensed font-bold text-xs py-1.5 uppercase tracking-wide hover:bg-[oklch(0.65_0.18_142)]/20 transition-colors"
                        >
                          ACTIVATE
                        </button>
                      )}
                      {agent.status === "active" && (
                        <button
                          onClick={() => updateAgentStatus.mutate({ id: agent.id, status: "idle" })}
                          className="flex-1 bg-muted/10 border border-border text-muted-foreground font-condensed font-bold text-xs py-1.5 uppercase tracking-wide hover:bg-muted/20 transition-colors"
                        >
                          PAUSE
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PoO Ledger */}
      {tab === "poo" && (
        <div>
          <div className="section-label mb-4">PROOF OF OUTCOME LEDGER — {pooReceipts.length} RECEIPTS</div>
          {pooQ.isLoading ? (
            <div className="text-muted-foreground font-mono text-sm py-8 text-center">LOADING LEDGER...</div>
          ) : pooReceipts.length === 0 ? (
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
                    <span className={`font-mono text-xs border px-2 py-1 uppercase ${receipt.verificationStatus === "verified" ? "tag-achieved" : receipt.verificationStatus === "disputed" ? "tag-missed" : "tag-at-risk"}`}>
                      {receipt.verificationStatus}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{receipt.outcome}</p>
                  <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border">
                    <div>
                      <div className="section-label mb-1">VALUE CREATED</div>
                      <div className="font-condensed font-black text-xl text-[oklch(0.65_0.18_142)]">${Number(receipt.dollarValueCreated).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                      <div className="section-label mb-1">HOURS SAVED</div>
                      <div className="font-condensed font-black text-xl text-foreground">{Number(receipt.laborHoursSaved).toFixed(1)} HRS</div>
                    </div>
                    <div>
                      <div className="section-label mb-1">ISSUED</div>
                      <div className="font-mono text-xs text-muted-foreground mt-1">{new Date(receipt.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inbox */}
      {tab === "inbox" && (
        <div>
          <div className="section-label mb-4">HUMAN-IN-THE-LOOP INBOX — {unread} UNREAD</div>
          {inboxQ.isLoading ? (
            <div className="text-muted-foreground font-mono text-sm py-8 text-center">LOADING INBOX...</div>
          ) : inboxItems.length === 0 ? (
            <div className="brutal-card p-8 text-center">
              <Inbox size={32} className="text-muted-foreground mx-auto mb-3" />
              <div className="font-condensed font-bold text-lg text-muted-foreground">INBOX CLEAR</div>
              <p className="text-muted-foreground text-sm mt-2">No pending decisions or alerts.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inboxItems.filter(i => i.status !== "dismissed").map(item => {
                const priorityColors: Record<string, string> = { critical: "text-accent border-accent", high: "text-[oklch(0.82_0.18_90)] border-[oklch(0.82_0.18_90)]", medium: "text-muted-foreground border-muted-foreground", low: "text-muted-foreground/50 border-muted-foreground/50" };
                const typeIcons: Record<string, typeof CheckCircle2> = { decision_required: AlertTriangle, budget_approval: TrendingUp, task_review: CheckCircle2, alert: AlertTriangle, poo_generated: FileCheck };
                const TypeIcon = typeIcons[item.type] ?? Inbox;
                return (
                  <div key={item.id} className={`brutal-card p-5 ${item.status === "unread" ? "border-l-2 border-l-accent" : ""}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <TypeIcon size={16} className={item.status === "unread" ? "text-accent" : "text-muted-foreground"} />
                        <div>
                          <div className="font-condensed font-bold text-base text-foreground">{item.title}</div>
                          <div className="section-label mt-0.5">{item.type.replace(/_/g, " ")} · {new Date(item.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                      <span className={`font-mono text-xs border px-2 py-1 uppercase ${priorityColors[item.priority]}`}>{item.priority}</span>
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">{item.body}</p>
                    {item.status !== "resolved" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => resolveInbox.mutate({ id: item.id, resolution: "Acknowledged by operator" })}
                          className="flex items-center gap-1.5 bg-[oklch(0.65_0.18_142)]/10 border border-[oklch(0.65_0.18_142)] text-[oklch(0.65_0.18_142)] font-condensed font-bold text-xs px-3 py-1.5 uppercase tracking-wide hover:bg-[oklch(0.65_0.18_142)]/20 transition-colors"
                        >
                          <Check size={11} /> RESOLVE
                        </button>
                        <button
                          onClick={() => dismissInbox.mutate({ id: item.id })}
                          className="flex items-center gap-1.5 bg-muted/10 border border-border text-muted-foreground font-condensed font-bold text-xs px-3 py-1.5 uppercase tracking-wide hover:bg-muted/20 transition-colors"
                        >
                          <X size={11} /> DISMISS
                        </button>
                      </div>
                    )}
                    {item.status === "resolved" && (
                      <div className="flex items-center gap-2 text-[oklch(0.65_0.18_142)]">
                        <CheckCircle2 size={12} />
                        <span className="section-label text-[oklch(0.65_0.18_142)]">RESOLVED</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add OKR Dialog */}
      <Dialog open={showAddOkr} onOpenChange={setShowAddOkr}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <div className="red-line mb-4" />
            <DialogTitle className="font-condensed font-black text-2xl uppercase">ADD NEW OKR</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="section-label mb-2 block">OBJECTIVE</label>
              <Input value={newOkr.objective} onChange={e => setNewOkr(p => ({ ...p, objective: e.target.value }))} placeholder="e.g. Reach Product-Market Fit" className="bg-input border-border text-foreground font-sans" />
            </div>
            <div>
              <label className="section-label mb-2 block">KEY RESULT</label>
              <Textarea value={newOkr.keyResult} onChange={e => setNewOkr(p => ({ ...p, keyResult: e.target.value }))} placeholder="e.g. Achieve $50K Monthly Recurring Revenue" className="bg-input border-border text-foreground font-sans resize-none" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="section-label mb-2 block">TARGET VALUE</label>
                <Input type="number" value={newOkr.targetValue} onChange={e => setNewOkr(p => ({ ...p, targetValue: e.target.value }))} placeholder="50000" className="bg-input border-border text-foreground" />
              </div>
              <div>
                <label className="section-label mb-2 block">UNIT</label>
                <Input value={newOkr.unit} onChange={e => setNewOkr(p => ({ ...p, unit: e.target.value }))} placeholder="USD/mo" className="bg-input border-border text-foreground" />
              </div>
            </div>
            <div>
              <label className="section-label mb-2 block">DUE DATE (OPTIONAL)</label>
              <Input type="date" value={newOkr.dueDate} onChange={e => setNewOkr(p => ({ ...p, dueDate: e.target.value }))} className="bg-input border-border text-foreground" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => createOkr.mutate({ objective: newOkr.objective, keyResult: newOkr.keyResult, targetValue: Number(newOkr.targetValue), unit: newOkr.unit, dueDate: newOkr.dueDate || undefined })}
                disabled={!newOkr.objective || !newOkr.keyResult || !newOkr.targetValue || createOkr.isPending}
                className="flex-1 bg-accent text-foreground hover:bg-accent/80 font-condensed font-bold uppercase tracking-wide"
              >
                {createOkr.isPending ? "CREATING..." : "CREATE OKR"}
              </Button>
              <Button variant="outline" onClick={() => setShowAddOkr(false)} className="border-border text-muted-foreground hover:text-foreground font-condensed font-bold uppercase">
                CANCEL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
