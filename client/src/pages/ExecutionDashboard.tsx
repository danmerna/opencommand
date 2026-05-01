import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Activity, Bot, Zap, Clock, CheckCircle2, XCircle,
  Loader2, Play, Users, Sparkles, Shield, TrendingUp, AlertTriangle,
  ChevronDown, ChevronUp, Rocket,
} from "lucide-react";

type DashTab = "activity" | "ralf" | "recommendations";

const DASH_TABS: { id: DashTab; label: string; icon: React.ElementType }[] = [
  { id: "activity", label: "Agent Activity", icon: Activity },
  { id: "ralf", label: "RALF Executions", icon: Zap },
  { id: "recommendations", label: "Sub-Agent Recs", icon: Users },
];

const statusColors: Record<string, string> = {
  idle: "text-zinc-400",
  active: "text-emerald-400",
  paused: "text-amber-400",
  error: "text-red-400",
  terminated: "text-zinc-600",
};

const phaseColors: Record<string, string> = {
  reason: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  act: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  learn: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  feedback: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

const ralfStatusIcons: Record<string, React.ElementType> = {
  completed: CheckCircle2,
  failed: XCircle,
  running: Loader2,
  pending: Clock,
  skipped: AlertTriangle,
};

export default function ExecutionDashboard() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<DashTab>("activity");
  const [expandedAgent, setExpandedAgent] = useState<number | null>(null);

  // Data queries
  const companiesQ = trpc.companies.list.useQuery(undefined, { enabled: isAuthenticated });
  const companies = companiesQ.data ?? [];
  const companyId = companies[0]?.id;

  const agentsQ = trpc.agents.list.useQuery(undefined, { enabled: isAuthenticated });
  const agents = agentsQ.data ?? [];

  const tasksQ = trpc.tasks.list.useQuery(undefined, { enabled: isAuthenticated });
  const tasks = tasksQ.data ?? [];

  const recsQ = trpc.subAgents.list.useQuery(
    { companyId: companyId! },
    { enabled: isAuthenticated && !!companyId }
  );
  const recommendations = recsQ.data ?? [];

  const generateRecsMutation = trpc.subAgents.generate.useMutation({
    onSuccess: () => {
      recsQ.refetch();
      toast.success("Sub-agent recommendations generated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deployRecMutation = trpc.subAgents.deploy.useMutation({
    onSuccess: () => {
      recsQ.refetch();
      agentsQ.refetch();
      toast.success("Sub-agent deployed successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const dismissRecMutation = trpc.subAgents.updateStatus.useMutation({
    onSuccess: () => {
      recsQ.refetch();
      toast.success("Recommendation dismissed");
    },
  });

  const ralfExecuteMutation = trpc.ralf.execute.useMutation({
    onSuccess: (data) => {
      toast.success(`RALF completed: ${data.phases.length} phases`);
      tasksQ.refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Computed stats
  const activeAgents = agents.filter(a => a.status === "active");
  const pendingTasks = tasks.filter(t => t.status === "pending");
  const inProgressTasks = tasks.filter(t => t.status === "in_progress");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const awaitingTasks = tasks.filter(t => t.status === "awaiting_human");

  // Group tasks by agent
  const tasksByAgent = useMemo(() => {
    const map = new Map<number, typeof tasks>();
    for (const t of tasks) {
      if (t.agentId) {
        const existing = map.get(t.agentId) ?? [];
        existing.push(t);
        map.set(t.agentId, existing);
      }
    }
    return map;
  }, [tasks]);

  // Executive agents for recommendation generation
  const executiveAgents = agents.filter(a =>
    ["ceo", "cto", "cmo", "cfo"].includes(a.type)
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/mission-control")}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">OpenCommand</p>
            <h1 className="text-2xl font-light text-foreground tracking-tight">Execution Dashboard</h1>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <div className="rounded-xl border border-border bg-white/[0.02] p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Active Agents</div>
            <div className="text-xl font-bold text-emerald-400">{activeAgents.length}</div>
            <div className="text-[10px] text-muted-foreground">{agents.length} total</div>
          </div>
          <div className="rounded-xl border border-border bg-white/[0.02] p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Pending Tasks</div>
            <div className="text-xl font-bold text-amber-400">{pendingTasks.length}</div>
            <div className="text-[10px] text-muted-foreground">{inProgressTasks.length} in progress</div>
          </div>
          <div className="rounded-xl border border-border bg-white/[0.02] p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Completed</div>
            <div className="text-xl font-bold text-foreground">{completedTasks.length}</div>
            <div className="text-[10px] text-muted-foreground">all time</div>
          </div>
          <div className="rounded-xl border border-border bg-white/[0.02] p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Awaiting Human</div>
            <div className="text-xl font-bold text-red-400">{awaitingTasks.length}</div>
            <div className="text-[10px] text-muted-foreground">need approval</div>
          </div>
          <div className="rounded-xl border border-border bg-white/[0.02] p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Recommendations</div>
            <div className="text-xl font-bold text-blue-400">{recommendations.filter(r => r.status === "suggested").length}</div>
            <div className="text-[10px] text-muted-foreground">pending review</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border pb-3">
          {DASH_TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-white/[0.08] text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Activity Tab ─────────────────────────────────────────────── */}
        {activeTab === "activity" && (
          <div className="space-y-3">
            {agents.length === 0 ? (
              <div className="rounded-xl border border-border bg-white/[0.02] p-12 text-center">
                <Bot size={28} className="text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">No agents deployed yet.</p>
              </div>
            ) : (
              agents.map(agent => {
                const agentTasks = tasksByAgent.get(agent.id) ?? [];
                const isExpanded = expandedAgent === agent.id;
                const activeTasks = agentTasks.filter(t => t.status === "in_progress" || t.status === "pending");
                const recentCompleted = agentTasks.filter(t => t.status === "completed").slice(0, 3);

                return (
                  <div key={agent.id} className="rounded-xl border border-border bg-white/[0.02] overflow-hidden">
                    <button
                      onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
                    >
                      {/* Status dot */}
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        agent.status === "active" ? "bg-emerald-400 animate-pulse" :
                        agent.status === "error" ? "bg-red-400" :
                        agent.status === "paused" ? "bg-amber-400" :
                        "bg-zinc-600"
                      }`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{agent.name}</span>
                          <Badge variant="outline" className="text-[9px] uppercase tracking-wider">
                            {agent.roleTitle ?? agent.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                          <span>{activeTasks.length} active task{activeTasks.length !== 1 ? "s" : ""}</span>
                          <span>·</span>
                          <span>{agent.tasksCompleted} completed</span>
                          <span>·</span>
                          <span className="text-emerald-400">${Number(agent.totalValueCreated).toLocaleString()} value</span>
                        </div>
                      </div>

                      <span className={`text-xs font-medium ${statusColors[agent.status] ?? "text-zinc-400"}`}>
                        {agent.status}
                      </span>

                      {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-4 border-t border-border/50 pt-3">
                        {activeTasks.length > 0 ? (
                          <div className="space-y-2 mb-3">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Active Tasks</p>
                            {activeTasks.map(task => (
                              <div key={task.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-white/[0.01] px-3 py-2">
                                <Play size={11} className="text-emerald-400 shrink-0" />
                                <span className="flex-1 text-xs text-foreground truncate">{task.title}</span>
                                <Badge variant="outline" className="text-[9px]">{task.priority}</Badge>
                                <Badge variant="outline" className="text-[9px]">{task.status}</Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] gap-1"
                                  disabled={ralfExecuteMutation.isPending}
                                  onClick={() => ralfExecuteMutation.mutate({
                                    taskId: task.id,
                                    agentId: agent.id,
                                    companyId: companyId,
                                  })}
                                >
                                  <Zap size={9} /> RALF
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground mb-3">No active tasks.</p>
                        )}

                        {recentCompleted.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Recently Completed</p>
                            {recentCompleted.map(task => (
                              <div key={task.id} className="flex items-center gap-3 px-3 py-1.5 text-xs text-muted-foreground">
                                <CheckCircle2 size={11} className="text-emerald-400/50" />
                                <span className="truncate">{task.title}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] gap-1 h-7"
                            onClick={() => navigate(`/agents/${agent.id}`)}
                          >
                            <Shield size={10} /> Autonomy Settings
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── RALF Tab ─────────────────────────────────────────────────── */}
        {activeTab === "ralf" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-white/[0.02] p-5 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <Zap size={16} className="text-blue-400" />
                <h3 className="text-sm font-medium text-foreground">RALF Loop Engine</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Reason → Act → Learn → Feedback. Each task goes through a 4-phase execution cycle.
                Select a pending task from the Activity tab to run RALF, or trigger it from the task list below.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {["reason", "act", "learn", "feedback"].map(phase => (
                  <div key={phase} className={`rounded-lg border px-3 py-2 text-center ${phaseColors[phase]}`}>
                    <div className="text-[10px] uppercase tracking-wider font-medium">{phase}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending tasks that can be RALF'd */}
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Tasks Ready for RALF Execution</p>
            {pendingTasks.length === 0 && inProgressTasks.length === 0 ? (
              <div className="rounded-xl border border-border bg-white/[0.02] p-8 text-center">
                <CheckCircle2 size={24} className="text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">No pending tasks to execute.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...pendingTasks, ...inProgressTasks].slice(0, 20).map(task => {
                  const assignedAgent = agents.find(a => a.id === task.agentId);
                  return (
                    <div key={task.id} className="flex items-center gap-3 rounded-xl border border-border bg-white/[0.02] px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate">{task.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {assignedAgent ? `Assigned to ${assignedAgent.name}` : "Unassigned"} · {task.priority} priority
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px]">{task.status}</Badge>
                      {task.agentId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] gap-1"
                          disabled={ralfExecuteMutation.isPending}
                          onClick={() => ralfExecuteMutation.mutate({
                            taskId: task.id,
                            agentId: task.agentId!,
                            companyId: companyId,
                          })}
                        >
                          {ralfExecuteMutation.isPending ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <Play size={10} />
                          )}
                          Run RALF
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Recommendations Tab ──────────────────────────────────────── */}
        {activeTab === "recommendations" && (
          <div className="space-y-4">
            {/* Generate button */}
            {executiveAgents.length > 0 && companyId && (
              <div className="flex items-center gap-3 mb-4">
                <p className="text-xs text-muted-foreground flex-1">
                  Generate AI-powered sub-agent recommendations based on your connected tools and existing team.
                </p>
                <div className="flex gap-2 shrink-0">
                  {executiveAgents.map(exec => (
                    <Button
                      key={exec.id}
                      size="sm"
                      variant="outline"
                      className="text-[10px] gap-1 h-7"
                      disabled={generateRecsMutation.isPending}
                      onClick={() => generateRecsMutation.mutate({ companyId, executiveAgentId: exec.id })}
                    >
                      {generateRecsMutation.isPending ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <Sparkles size={10} />
                      )}
                      {exec.type.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {recommendations.length === 0 ? (
              <div className="rounded-xl border border-border bg-white/[0.02] p-12 text-center">
                <Users size={28} className="text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground mb-1">No sub-agent recommendations yet</p>
                <p className="text-xs text-muted-foreground">
                  Click an agent button above to generate recommendations.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recommendations.map((rec: any) => {
                  const exec = agents.find(a => a.id === rec.executiveAgentId);
                  const isDeployed = rec.status === "deployed";
                  const isDismissed = rec.status === "dismissed";

                  return (
                    <div
                      key={rec.id}
                      className={`rounded-xl border p-4 transition-all ${
                        isDeployed
                          ? "border-emerald-400/20 bg-emerald-400/5"
                          : isDismissed
                          ? "border-border/50 bg-white/[0.01] opacity-50"
                          : "border-border bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground">{rec.recommendedName}</span>
                            {isDeployed && <CheckCircle2 size={12} className="text-emerald-400" />}
                          </div>
                          <Badge variant="outline" className="text-[9px] uppercase tracking-wider">
                            {rec.roleTitle ?? rec.recommendedType}
                          </Badge>
                        </div>
                        {exec && (
                          <span className="text-[10px] text-muted-foreground">
                            via {exec.name}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{rec.justification}</p>

                      {rec.requiredTools && (rec.requiredTools as string[]).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(rec.requiredTools as string[]).map((tool: string, i: number) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                              {tool}
                            </span>
                          ))}
                        </div>
                      )}

                      {rec.estimatedImpact && (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-400 mb-3">
                          <TrendingUp size={10} />
                          {rec.estimatedImpact}
                        </div>
                      )}

                      {!isDeployed && !isDismissed && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-[10px] gap-1 text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/10"
                            disabled={deployRecMutation.isPending}
                            onClick={() => companyId && deployRecMutation.mutate({ id: rec.id, companyId })}
                          >
                            <Rocket size={10} /> Deploy
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] gap-1 text-muted-foreground"
                            onClick={() => dismissRecMutation.mutate({ id: rec.id, status: "dismissed" })}
                          >
                            <XCircle size={10} /> Dismiss
                          </Button>
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
    </div>
  );
}
