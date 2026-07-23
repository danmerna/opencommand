import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { CheckCircle2, CircleDashed, CircleX, Pause, Play, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AuditEventType, WorkflowInstance, WorkflowTask } from "../domain/types";
import { describeRef, refPath, selectReceipt } from "../domain/selectors";
import { AGENT_BY_ID } from "../fixtures/agents";
import { PERSONA_BY_ID } from "../fixtures/personas";
import { useAnnounce } from "../hooks/useAnnouncer";
import { useDemoStore } from "../hooks/useDemoStore";
import { EmptyState, MonoValue, PanelCard, SectionLabel, SourceChip, StatusBadge } from "./bits";

function useObjectParam(): string | null {
  const search = useSearch();
  return useMemo(() => new URLSearchParams(search).get("object"), [search]);
}

/* -------------------------------- Blueprints -------------------------------- */

export function BlueprintsView() {
  const { state } = useDemoStore();
  const bp = state.blueprint;
  const linkedWorkflows = state.workflows.filter(w => w.blueprintId === bp.id);
  const [, navigate] = useLocation();

  return (
    <section aria-labelledby="bp-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="bp-heading" className="text-lg font-semibold tracking-tight">
          Blueprints
        </h2>
        <p className="text-xs text-muted-foreground">
          Reusable operating definitions — design, not execution. Running a blueprint creates a
          Workflow.
        </p>
      </div>

      <PanelCard className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium">{bp.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{bp.goal}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge tone="accent">v{bp.version}</StatusBadge>
            <StatusBadge>{bp.updateState}</StatusBadge>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <SectionLabel>Workflow steps</SectionLabel>
            <ol className="flex flex-col gap-1">
              {bp.steps.map((s, i) => (
                <li key={s.title} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                  <span>
                    <span className="text-secondary-foreground">{s.title}</span>{" "}
                    <span className="text-muted-foreground">— {s.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <SectionLabel className="mb-1">Recommended agent team</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {bp.agentTeamIds.map(id => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => navigate(`/demo/workspace/agents?object=${id}`)}
                    className="rounded border border-border px-2 py-1 text-xs text-secondary-foreground hover:border-accent/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {AGENT_BY_ID[id]?.name ?? id}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <SectionLabel className="mb-1">Data sources</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {bp.dataSources.map(s => (
                  <SourceChip key={s} source={s} />
                ))}
              </div>
            </div>
            <div>
              <SectionLabel className="mb-1">Guardrails</SectionLabel>
              <ul className="list-inside list-disc text-xs text-secondary-foreground">
                {bp.guardrails.map(g => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="grid gap-x-6 gap-y-1.5 border-t border-border pt-3 text-[11px] sm:grid-cols-3">
          <MetaCell label="Creator / publisher" value={`${bp.creator} · ${bp.publisher}`} />
          <MetaCell label="Provenance" value={bp.provenance} />
          <MetaCell label="Approvals" value={bp.approvals.join("; ")} />
          <MetaCell label="Expected outcome" value={bp.expectedOutcome} />
          <MetaCell label="Compatibility" value={bp.compatibility} />
          <MetaCell
            label="Marketplace readiness"
            value={`origin ${bp.origin} · license ${bp.license} · pricing ${bp.priceModel} · entitlement ${bp.entitlement} — no marketplace activity in this demo`}
          />
        </div>

        {linkedWorkflows.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs">
            <SectionLabel className="mr-1">Instantiated as</SectionLabel>
            {linkedWorkflows.map(w => (
              <Button key={w.id} size="sm" variant="outline" onClick={() => navigate(`/demo/workspace/workflows?object=${w.id}`)}>
                {w.name} · {w.status}
              </Button>
            ))}
          </div>
        )}
      </PanelCard>
    </section>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-secondary-foreground">{value}</dd>
    </div>
  );
}

/* --------------------------------- Workflows --------------------------------- */

const WF_TONES: Record<WorkflowInstance["status"], "neutral" | "accent" | "success" | "warning" | "danger"> = {
  idle: "neutral",
  queued: "accent",
  running: "accent",
  checkpoint: "warning",
  paused: "warning",
  completed: "success",
  failed: "danger",
};

function TaskRow({ task }: { task: WorkflowTask }) {
  const agent = task.agentId ? AGENT_BY_ID[task.agentId] : null;
  const icon =
    task.status === "done" ? (
      <CheckCircle2 size={14} className="text-emerald-300" aria-hidden />
    ) : task.status === "failed" ? (
      <CircleX size={14} className="text-red-300" aria-hidden />
    ) : task.status === "running" ? (
      <Play size={14} className="text-accent" aria-hidden />
    ) : task.status === "checkpoint" ? (
      <Pause size={14} className="text-amber-300" aria-hidden />
    ) : (
      <CircleDashed size={14} className="text-muted-foreground" aria-hidden />
    );

  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex min-w-0 flex-col gap-0.5 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-xs", task.status === "pending" ? "text-muted-foreground" : "text-foreground")}>
            {task.title}
          </span>
          <StatusBadge tone={task.status === "done" ? "success" : task.status === "failed" ? "danger" : task.status === "checkpoint" ? "warning" : "neutral"}>
            {task.status}
          </StatusBadge>
          {agent && <span className="font-mono text-[10px] text-muted-foreground">{agent.name}</span>}
        </div>
        {task.result && <p className="text-[11px] text-secondary-foreground">{task.result}</p>}
        {task.completedAt && (
          <MonoValue className="text-[10px] text-muted-foreground">
            {new Date(task.completedAt).toLocaleTimeString()}
          </MonoValue>
        )}
      </div>
    </li>
  );
}

export function WorkflowsView() {
  const { state, dispatch } = useDemoStore();
  const [, navigate] = useLocation();
  const announce = useAnnounce();
  const objectParam = useObjectParam();
  const workflows = [...state.workflows].reverse();
  const selected =
    workflows.find(w => w.id === objectParam) ??
    workflows.find(w => ["running", "checkpoint", "paused", "queued"].includes(w.status)) ??
    workflows[0];

  return (
    <section aria-labelledby="wf-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="wf-heading" className="text-lg font-semibold tracking-tight">
          Workflows
        </h2>
        <p className="text-xs text-muted-foreground">
          Instantiated executions with human checkpoints — every run ends in a Proof of Outcome or a
          surfaced exception.
        </p>
      </div>

      {!selected ? (
        <EmptyState title="No workflows yet" hint="Approve a plan in Σ → Do to create the first run." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <ul className="flex flex-col gap-2" aria-label="Workflow instances">
            {workflows.map(w => (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/demo/workspace/workflows?object=${w.id}`)}
                  aria-current={w.id === selected.id}
                  className={cn(
                    "flex w-full flex-col gap-1 rounded-lg border p-3 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    w.id === selected.id ? "border-accent/50 bg-card" : "border-border hover:border-accent/30",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">{w.name}</span>
                    <StatusBadge tone={WF_TONES[w.status]}>{w.status}</StatusBadge>
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {w.tasks.filter(t => t.status === "done").length}/{w.tasks.length} tasks
                    {w.startedAt ? ` · started ${new Date(w.startedAt).toLocaleTimeString()}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <PanelCard className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium">{selected.name}</h3>
              <div className="flex items-center gap-1.5">
                <StatusBadge tone={WF_TONES[selected.status]}>{selected.status}</StatusBadge>
                {(selected.status === "running" || selected.status === "paused") && (
                  <Button size="sm" variant="outline" onClick={() => dispatch({ type: "workflow/toggle-pause", id: selected.id })}>
                    {selected.status === "running" ? <Pause aria-hidden /> : <Play aria-hidden />}
                    {selected.status === "running" ? "Pause" : "Resume"}
                  </Button>
                )}
              </div>
            </div>

            {selected.status === "checkpoint" && (
              <div className="flex flex-col gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 p-3">
                <p className="text-xs text-amber-200">
                  Human checkpoint: Taylor reviews the featured listing set before it publishes.
                </p>
                <div>
                  <Button
                    size="sm"
                    onClick={() => {
                      dispatch({ type: "workflow/approve-checkpoint", id: selected.id });
                      announce("Checkpoint approved. Run resumed.");
                    }}
                  >
                    Approve checkpoint
                  </Button>
                </div>
              </div>
            )}

            <ol className="mt-1 flex flex-col border-l border-border pl-3" aria-label="Execution trace">
              {selected.tasks.map(t => (
                <TaskRow key={t.id} task={t} />
              ))}
            </ol>

            <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3 text-xs">
              <SectionLabel className="mr-1">Lineage</SectionLabel>
              <Button size="sm" variant="ghost" onClick={() => navigate("/demo/sigma/do")}>
                Do plan
              </Button>
              <Button size="sm" variant="ghost" onClick={() => navigate(`/demo/command-center/approvals?object=${selected.approvalId}`)}>
                Approval
              </Button>
              {selected.blueprintId && (
                <Button size="sm" variant="ghost" onClick={() => navigate("/demo/workspace/blueprints")}>
                  Blueprint
                </Button>
              )}
              {selected.agentIds.map(id => (
                <Button key={id} size="sm" variant="ghost" onClick={() => navigate(`/demo/workspace/agents?object=${id}`)}>
                  {AGENT_BY_ID[id]?.name}
                </Button>
              ))}
              {selected.receiptId && (
                <Button size="sm" onClick={() => navigate(`/demo/workspace/audit-log?object=${selected.receiptId}`)}>
                  <ReceiptText aria-hidden />
                  Proof of Outcome
                </Button>
              )}
            </div>
          </PanelCard>
        </div>
      )}
    </section>
  );
}

/* ---------------------------------- Agents ---------------------------------- */

export function AgentsView() {
  const { state } = useDemoStore();
  const [, navigate] = useLocation();
  const objectParam = useObjectParam();

  return (
    <section aria-labelledby="agents-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="agents-heading" className="text-lg font-semibold tracking-tight">
          Agents
        </h2>
        <p className="text-xs text-muted-foreground">
          Bounded executors — declared capabilities, tools, data scope, and command boundaries. Not
          chat characters.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {state.agents.map(agent => (
          <PanelCard
            key={agent.id}
            className={cn("flex flex-col gap-3 p-4", objectParam === agent.id && "border-accent/50")}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">{agent.name}</h3>
              <StatusBadge tone={agent.status === "running" ? "accent" : agent.status === "assigned" ? "warning" : "neutral"}>
                {agent.status}
              </StatusBadge>
            </div>
            <p className="text-xs text-muted-foreground">{agent.role}</p>

            <dl className="flex flex-col gap-1.5 text-[11px]">
              <MetaCell label="Throughput" value={agent.throughput} />
              <MetaCell label="Cost" value={agent.costNote} />
              <MetaCell label="Approval" value={agent.approvalNote} />
              <MetaCell label="Capabilities" value={agent.capabilities.join(", ")} />
              <MetaCell label="Tools" value={agent.tools.join("; ")} />
            </dl>

            <div>
              <SectionLabel className="mb-1">Data scope</SectionLabel>
              <div className="flex flex-wrap gap-1">
                {agent.dataScope.map(s => (
                  <SourceChip key={s} source={s} />
                ))}
              </div>
            </div>

            <div>
              <SectionLabel className="mb-1">Command boundary</SectionLabel>
              <ul className="list-inside list-disc text-[11px] text-secondary-foreground">
                {agent.commandBoundary.map(b => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>

            <div>
              <SectionLabel className="mb-1">Safeguards</SectionLabel>
              <ul className="list-inside list-disc text-[11px] text-secondary-foreground">
                {agent.safeguards.map(s => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>

            {agent.assignedWorkflowIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <SectionLabel className="mr-1">Assigned to</SectionLabel>
                {agent.assignedWorkflowIds.map(id => (
                  <Button key={id} size="sm" variant="outline" onClick={() => navigate(`/demo/workspace/workflows?object=${id}`)}>
                    {state.workflows.find(w => w.id === id)?.name ?? id}
                  </Button>
                ))}
              </div>
            )}

            <div className="border-t border-border pt-2">
              <SectionLabel className="mb-1">Recent activity</SectionLabel>
              <ul className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                {agent.activity.map(a => (
                  <li key={a.entry}>
                    <MonoValue className="mr-1.5 text-[10px]">{new Date(a.at).toLocaleDateString()}</MonoValue>
                    {a.entry}
                  </li>
                ))}
              </ul>
            </div>
          </PanelCard>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------- Audit Log --------------------------------- */

const EVENT_FILTERS: { key: string; label: string; types: AuditEventType[] }[] = [
  { key: "all", label: "All", types: [] },
  { key: "updates", label: "Updates", types: ["update-created", "update-triaged"] },
  { key: "analysis", label: "Analysis", types: ["think-analysis", "persona-selected", "advisor-synthesis"] },
  { key: "decisions", label: "Decisions", types: ["recommendation-created", "recommendation-modified", "approval-decision", "do-preflight"] },
  { key: "execution", label: "Execution", types: ["workflow-transition", "workflow-exception"] },
  { key: "outcomes", label: "Outcomes", types: ["proof-of-outcome"] },
];

export function AuditLogView() {
  const { state, dispatch } = useDemoStore();
  const [, navigate] = useLocation();
  const objectParam = useObjectParam();
  const [filter, setFilter] = useState("all");

  const receipt = selectReceipt(state, objectParam) ?? state.receipts.at(-1) ?? null;

  /* Opening the log with a receipt in focus marks it viewed. */
  useEffect(() => {
    if (receipt && objectParam === receipt.id && receipt.status === "generated") {
      dispatch({ type: "receipt/view", id: receipt.id });
    }
  }, [receipt, objectParam, dispatch]);

  const activeFilter = EVENT_FILTERS.find(f => f.key === filter)!;
  const entries = [...state.audit]
    .reverse()
    .filter(e => activeFilter.types.length === 0 || activeFilter.types.includes(e.type));

  return (
    <section aria-labelledby="audit-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="audit-heading" className="text-lg font-semibold tracking-tight">
          Audit Log
        </h2>
        <p className="text-xs text-muted-foreground">
          The immutable accountability record — every decision, approval, execution, and outcome
          with its lineage.
        </p>
      </div>

      {receipt && (
        <PanelCard className="flex flex-col gap-3 border-emerald-400/30 p-4" role="region" aria-label="Proof of Outcome">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionLabel>Proof of Outcome — {receipt.id}</SectionLabel>
            <div className="flex items-center gap-2">
              <StatusBadge tone="success">{receipt.status}</StatusBadge>
              <MonoValue className="text-[10px] text-muted-foreground">
                {new Date(receipt.generatedAt).toLocaleString()}
              </MonoValue>
            </div>
          </div>

          <dl className="grid gap-x-6 gap-y-1.5 text-[11px] sm:grid-cols-2">
            <MetaCell label="Original signal" value={describeRef(state, { kind: "update", id: receipt.originalUpdateId })} />
            <MetaCell label="Approved by" value={receipt.approver} />
            <MetaCell label="Operator modification" value={receipt.operatorModification} />
            <MetaCell label="Preflight scope" value={receipt.preflightScope} />
            <MetaCell label="Expected result" value={receipt.expectedResult} />
            <MetaCell label="Simulated actual result" value={receipt.simulatedActualResult} />
            <MetaCell
              label="Advisor lenses"
              value={
                receipt.personaIds.length
                  ? receipt.personaIds.map(id => PERSONA_BY_ID[id]?.name ?? id).join(", ")
                  : "Neutral Σ"
              }
            />
            <MetaCell label="Remaining exception" value={receipt.remainingException} />
          </dl>

          <div>
            <SectionLabel className="mb-1">Simulated tasks</SectionLabel>
            <ul className="flex flex-col gap-1 text-[11px]">
              {receipt.simulatedTasks.map(t => (
                <li key={t.title} className="text-muted-foreground">
                  <span className="text-secondary-foreground">{t.title}</span> — {t.result}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2 text-xs">
            <SectionLabel className="mr-1">Trace</SectionLabel>
            <Button size="sm" variant="ghost" onClick={() => navigate(refPath({ kind: "update", id: receipt.originalUpdateId }))}>
              Original update
            </Button>
            {receipt.recommendationId && (
              <Button size="sm" variant="ghost" onClick={() => navigate("/demo/command-center/recommendations")}>
                Recommendation
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => navigate(`/demo/workspace/workflows?object=${receipt.workflowId}`)}>
              Workflow
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate(`/demo/command-center/approvals`)}>
              Approval
            </Button>
          </div>
        </PanelCard>
      )}

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter audit entries">
        {EVENT_FILTERS.map(f => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded border px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              filter === f.key ? "border-accent/50 text-accent" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ol className="flex flex-col gap-2" aria-label="Audit entries, newest first">
        {entries.map(e => (
          <li key={e.id}>
            <PanelCard className="flex flex-col gap-1 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge tone={e.type === "proof-of-outcome" ? "success" : e.type === "workflow-exception" ? "danger" : "neutral"}>
                    {e.type}
                  </StatusBadge>
                  <MonoValue className="text-[10px] text-muted-foreground">
                    {new Date(e.at).toLocaleString()}
                  </MonoValue>
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate(refPath(e.objectRef))}>
                  {describeRef(state, e.objectRef)}
                </Button>
              </div>
              <p className="text-xs text-secondary-foreground">{e.summary}</p>
              {e.causedBy && (
                <p className="font-mono text-[10px] text-muted-foreground">caused by {e.causedBy}</p>
              )}
            </PanelCard>
          </li>
        ))}
      </ol>
    </section>
  );
}
