import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Play, Square, CheckCircle2, XCircle, Clock, Loader2,
  ChevronRight, Zap, Brain, ShieldCheck, Flag, Target,
  AlertTriangle, Check, X, RefreshCw, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type RunStatus = "queued" | "running" | "paused" | "completed" | "failed" | "cancelled";
type EventType =
  | "node_started" | "node_completed" | "node_failed"
  | "agent_thinking" | "agent_output"
  | "verification_started" | "verification_passed" | "verification_failed"
  | "hitl_requested" | "hitl_approved" | "hitl_dismissed"
  | "goal_updated" | "run_completed" | "run_failed";

interface RunEvent {
  id: number;
  nodeId: string;
  nodeType: string;
  nodeLabel: string | null;
  eventType: EventType;
  message: string | null;
  durationMs: number | null;
  createdAt: Date;
}

interface Run {
  id: number;
  blueprintId: number;
  status: RunStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  currentNodeId: string | null;
  summary: string | null;
  error: string | null;
  createdAt: Date;
}

interface HitlNotif {
  id: number;
  runId: number;
  blueprintId: number;
  nodeLabel: string | null;
  agentName: string | null;
  blueprintTicker: string | null;
  mode: "ask_permission" | "notify_complete";
  urgency: "low" | "medium" | "high" | "critical";
  title: string;
  body: string | null;
  status: "pending" | "approved" | "dismissed" | "expired";
  createdAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EVENT_ICON: Record<string, React.ReactNode> = {
  node_started: <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />,
  node_completed: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />,
  node_failed: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  agent_thinking: <Brain className="w-3.5 h-3.5 text-blue-400 animate-pulse" />,
  agent_output: <Zap className="w-3.5 h-3.5 text-accent" />,
  verification_started: <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />,
  verification_passed: <ShieldCheck className="w-3.5 h-3.5 text-green-400" />,
  verification_failed: <ShieldCheck className="w-3.5 h-3.5 text-red-400" />,
  hitl_requested: <Flag className="w-3.5 h-3.5 text-orange-400 animate-pulse" />,
  hitl_approved: <Check className="w-3.5 h-3.5 text-green-400" />,
  hitl_dismissed: <X className="w-3.5 h-3.5 text-muted-foreground" />,
  goal_updated: <Target className="w-3.5 h-3.5 text-amber-400" />,
  run_completed: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />,
  run_failed: <XCircle className="w-3.5 h-3.5 text-red-400" />,
};

const STATUS_COLOR: Record<RunStatus, string> = {
  queued: "bg-muted text-muted-foreground",
  running: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  paused: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  cancelled: "bg-muted text-muted-foreground",
};

function fmt(d: Date | null | string) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function elapsed(start: Date | null | string, end: Date | null | string) {
  if (!start) return null;
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const ms = e - s;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

// ─── Run Log ─────────────────────────────────────────────────────────────────

function RunLog({ runId, blueprintId }: { runId: number; blueprintId: number }) {
  const logRef = useRef<HTMLDivElement>(null);
  const isActiveRef = useRef(true);

  const { data, refetch } = trpc.execution.getRunStatus.useQuery(
    { runId },
    { refetchInterval: (queryData) => {
        const status = (queryData as { run?: { status?: string } } | undefined)?.run?.status;
        if (status === "completed" || status === "failed" || status === "cancelled") return false;
        return 1500;
      }
    }
  );

  // Auto-scroll to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [data?.events?.length]);

  const run = data?.run as Run | undefined;
  const events = (data?.events ?? []) as RunEvent[];
  const isLive = run?.status === "running" || run?.status === "queued";

  return (
    <div className="flex flex-col h-full">
      {/* Run header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Run #{runId}</span>
            {run && (
              <Badge variant="outline" className={cn("text-xs border", STATUS_COLOR[run.status])}>
                {isLive && <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />}
                {run.status}
              </Badge>
            )}
          </div>
          {run && (
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span>Started {fmt(run.startedAt)}</span>
              {run.completedAt && <span>· Finished {fmt(run.completedAt)}</span>}
              {run.startedAt && <span>· {elapsed(run.startedAt, run.completedAt)}</span>}
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Events log */}
      <div
        ref={logRef}
        className="flex-1 overflow-y-auto p-4 space-y-1.5 font-mono text-xs"
      >
        {events.length === 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Initializing run...</span>
          </div>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className={cn(
              "flex items-start gap-2 py-0.5",
              ev.eventType === "agent_output" && "bg-accent/5 rounded px-2 -mx-2 py-1.5",
              ev.eventType === "hitl_requested" && "bg-orange-500/5 rounded px-2 -mx-2 py-1.5",
              ev.eventType === "run_completed" && "bg-green-500/5 rounded px-2 -mx-2 py-1.5",
            )}>
              <span className="mt-0.5 shrink-0">{EVENT_ICON[ev.eventType] ?? <ChevronRight className="w-3.5 h-3.5" />}</span>
              <div className="flex-1 min-w-0">
                <span className={cn(
                  "text-foreground/80",
                  ev.eventType === "agent_output" && "text-foreground font-medium",
                  ev.eventType === "run_completed" && "text-green-400 font-medium",
                  ev.eventType === "run_failed" && "text-red-400 font-medium",
                  ev.eventType === "hitl_requested" && "text-orange-400 font-medium",
                )}>
                  {ev.message}
                </span>
                {ev.durationMs && (
                  <span className="ml-2 text-muted-foreground/60">{ev.durationMs}ms</span>
                )}
              </div>
              <span className="shrink-0 text-muted-foreground/40 tabular-nums">
                {fmt(ev.createdAt)}
              </span>
            </div>
          ))
        )}
        {isLive && (
          <div className="flex items-center gap-2 text-muted-foreground animate-pulse pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            <span>Live</span>
          </div>
        )}
        {run?.summary && (
          <div className="mt-3 pt-3 border-t border-border/50 text-muted-foreground">
            {run.summary}
          </div>
        )}
        {run?.error && (
          <div className="mt-3 pt-3 border-t border-red-500/20 text-red-400">
            Error: {run.error}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HITL Card ────────────────────────────────────────────────────────────────

function HitlCard({ notif, onResolved }: { notif: HitlNotif; onResolved: () => void }) {
  const resolve = trpc.execution.resolveHitl.useMutation({
    onSuccess: () => onResolved(),
    onError: (e) => toast.error(e.message),
  });

  const URGENCY_COLOR = {
    low: "border-muted",
    medium: "border-yellow-500/40",
    high: "border-orange-500/50",
    critical: "border-red-500/60",
  };

  return (
    <div className={cn(
      "rounded-lg border bg-card p-4 space-y-3",
      URGENCY_COLOR[notif.urgency],
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Flag className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-sm font-medium text-foreground">{notif.title}</span>
            <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-400">
              {notif.urgency}
            </Badge>
          </div>
          {notif.blueprintTicker && (
            <p className="text-xs text-muted-foreground mt-0.5">{notif.blueprintTicker} · Run #{notif.runId}</p>
          )}
        </div>
      </div>
      {notif.body && (
        <p className="text-sm text-muted-foreground leading-relaxed">{notif.body}</p>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
          disabled={resolve.isPending}
          onClick={() => resolve.mutate({ notificationId: notif.id, action: "approved" })}
        >
          {resolve.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={resolve.isPending}
          onClick={() => resolve.mutate({ notificationId: notif.id, action: "dismissed" })}
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Dismiss
        </Button>
      </div>
    </div>
  );
}

// ─── Blueprint Run Card ───────────────────────────────────────────────────────

function BlueprintRunCard({
  blueprintId,
  title,
  ticker,
  onRunStarted,
}: {
  blueprintId: number;
  title: string;
  ticker: string;
  onRunStarted: (runId: number) => void;
}) {
  const [, navigate] = useLocation();
  const deploy = trpc.execution.deploy.useMutation({
    onSuccess: (data) => {
      toast.success(`Run #${data.runId} started`);
      onRunStarted(data.runId);
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: runs } = trpc.execution.getRuns.useQuery({ blueprintId });
  const latestRun = runs?.[0] as Run | undefined;

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{title}</span>
            <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
              {ticker}
            </Badge>
          </div>
          {latestRun ? (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={cn("text-xs border", STATUS_COLOR[latestRun.status])}>
                {latestRun.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Last run {fmt(latestRun.createdAt)}
                {latestRun.startedAt && ` · ${elapsed(latestRun.startedAt, latestRun.completedAt)}`}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">No runs yet</p>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 h-7 w-7 p-0"
          onClick={() => navigate(`/blueprints/${blueprintId}/builder`)}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </div>
      <Button
        size="sm"
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
        disabled={deploy.isPending}
        onClick={() => deploy.mutate({ blueprintId })}
      >
        {deploy.isPending ? (
          <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Deploying...</>
        ) : (
          <><Play className="w-3.5 h-3.5 mr-1.5" />Deploy</>
        )}
      </Button>
    </div>
  );
}

// ─── Main Execution Page ──────────────────────────────────────────────────────

export default function Execution() {
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [activeBlueprintId, setActiveBlueprintId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: allRuns } = trpc.execution.getAllRuns.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const { data: pendingHitl, refetch: refetchHitl } = trpc.execution.getPendingHitl.useQuery(undefined, {
    refetchInterval: 3000,
  });

  const { data: blueprints } = trpc.blueprints.myBlueprints.useQuery();

  const handleRunStarted = (runId: number, blueprintId: number) => {
    setActiveRunId(runId);
    setActiveBlueprintId(blueprintId);
  };

  const handleHitlResolved = () => {
    refetchHitl();
    utils.execution.getRunStatus.invalidate();
    utils.execution.getAllRuns.invalidate();
  };

  const hitlList = (pendingHitl ?? []) as HitlNotif[];
  const runList = (allRuns ?? []) as Run[];
  const bpList = (blueprints ?? []) as unknown as { id: number; title: string; ticker: string }[];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 shrink-0">
        <h1 className="text-lg font-semibold text-foreground">Execution</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Deploy blueprints and monitor agent runs in real time.</p>
      </div>

      <div className="flex-1 overflow-hidden flex gap-0">
        {/* Left panel — blueprints + HITL */}
        <div className="w-80 shrink-0 border-r border-border/50 flex flex-col overflow-hidden">
          {/* HITL section */}
          {hitlList.length > 0 && (
            <div className="p-4 border-b border-border/50 space-y-3">
              <div className="flex items-center gap-2">
                <Flag className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs font-medium text-foreground uppercase tracking-wider">
                  Awaiting Approval
                </span>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                  {hitlList.length}
                </Badge>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {hitlList.map((n) => (
                  <HitlCard key={n.id} notif={n} onResolved={handleHitlResolved} />
                ))}
              </div>
            </div>
          )}

          {/* Blueprints */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-foreground uppercase tracking-wider">
                My Blueprints
              </span>
            </div>
            {bpList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No blueprints yet. Create one with Σ.</p>
            ) : (
              bpList.map((bp) => (
                <BlueprintRunCard
                  key={bp.id}
                  blueprintId={bp.id}
                  title={bp.title}
                  ticker={bp.ticker}
                  onRunStarted={(runId) => handleRunStarted(runId, bp.id)}
                />
              ))
            )}
          </div>

          {/* Recent runs */}
          {runList.length > 0 && (
            <div className="border-t border-border/50 p-4 space-y-2">
              <span className="text-xs font-medium text-foreground uppercase tracking-wider">
                Recent Runs
              </span>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {runList.slice(0, 10).map((run) => (
                  <button
                    key={run.id}
                    onClick={() => {
                      setActiveRunId(run.id);
                      setActiveBlueprintId(run.blueprintId);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-accent/10 transition-colors",
                      activeRunId === run.id && "bg-accent/10",
                    )}
                  >
                    <Badge variant="outline" className={cn("text-xs border shrink-0", STATUS_COLOR[run.status])}>
                      {run.status === "running" && <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />}
                      {run.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate">
                      Run #{run.id} · {fmt(run.createdAt)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel — live run log */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeRunId ? (
            <RunLog runId={activeRunId} blueprintId={activeBlueprintId!} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3 max-w-sm">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                  <Play className="w-5 h-5 text-accent" />
                </div>
                <p className="text-sm font-medium text-foreground">No active run</p>
                <p className="text-sm text-muted-foreground">
                  Select a blueprint and click Deploy to start a run. The live execution log will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
