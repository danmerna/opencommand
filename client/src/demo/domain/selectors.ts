import type { DemoState } from "./state";
import type {
  AdvisorSession,
  Approval,
  DoPlan,
  ObjectRef,
  ProofOfOutcome,
  Recommendation,
  ThinkResult,
  Update,
  WorkflowInstance,
} from "./types";

export const selectActiveUpdate = (s: DemoState): Update | null =>
  s.updates.find(u => u.id === s.activeUpdateId) ?? null;

export const selectActiveThink = (s: DemoState): ThinkResult | null =>
  s.thinkResults.find(t => t.id === s.activeThinkId) ?? null;

export const selectActiveAdvisor = (s: DemoState): AdvisorSession | null =>
  s.advisorSessions.find(a => a.id === s.activeAdvisorId) ?? null;

export const selectActivePlan = (s: DemoState): DoPlan | null =>
  s.plans.find(p => p.id === s.activePlanId) ?? null;

/** Triage-ordered Updates: attention first, resolved/dismissed last. */
export function selectOrderedUpdates(s: DemoState): Update[] {
  const rank: Record<Update["status"], number> = {
    new: 0,
    expanded: 0,
    triaged: 1,
    deferred: 2,
    resolved: 3,
    dismissed: 4,
  };
  const urgency: Record<Update["urgency"], number> = { high: 0, medium: 1, low: 2 };
  return [...s.updates].sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      urgency[a.urgency] - urgency[b.urgency] ||
      b.timestamp.localeCompare(a.timestamp),
  );
}

export function selectPendingApprovals(s: DemoState): Approval[] {
  return s.approvals.filter(a => a.status === "pending");
}

/** The workflow checkpoint awaiting a human, surfaced into Approvals. */
export function selectCheckpointWorkflow(s: DemoState): WorkflowInstance | null {
  return s.workflows.find(w => w.status === "checkpoint") ?? null;
}

export function selectOrderedRecommendations(s: DemoState): Recommendation[] {
  return [...s.recommendations].sort((a, b) => a.priority - b.priority);
}

export function selectActiveWorkflow(s: DemoState): WorkflowInstance | null {
  return (
    s.workflows.find(w => ["queued", "running", "checkpoint", "paused"].includes(w.status)) ??
    null
  );
}

export const selectReceipt = (s: DemoState, id: string | null): ProofOfOutcome | null =>
  s.receipts.find(r => r.id === id) ?? null;

/** Count for the Command Center attention badge. */
export function selectAttentionCount(s: DemoState): number {
  const newUpdates = s.updates.filter(u => u.status === "new" || u.status === "expanded").length;
  const pending = selectPendingApprovals(s).length + (selectCheckpointWorkflow(s) ? 1 : 0);
  return newUpdates + pending;
}

/** Human-readable label for any object reference, for lineage displays. */
export function describeRef(s: DemoState, ref: ObjectRef): string {
  switch (ref.kind) {
    case "update":
      return s.updates.find(u => u.id === ref.id)?.title ?? "Update";
    case "recommendation":
      return s.recommendations.find(r => r.id === ref.id)?.title ?? "Recommendation";
    case "think-result":
      return "Think analysis";
    case "advisor-session":
      return "Advisor session";
    case "do-plan":
      return "Do plan";
    case "approval":
      return s.approvals.find(a => a.id === ref.id)?.title ?? "Approval";
    case "workflow":
      return s.workflows.find(w => w.id === ref.id)?.name ?? "Workflow";
    case "agent":
      return s.agents.find(a => a.id === ref.id)?.name ?? "Agent";
    case "receipt":
      return "Proof of Outcome";
    case "blueprint":
      return s.blueprint.name;
    case "persona":
      return ref.id.replace("per-", "").toUpperCase();
    case "evidence":
      return "Evidence";
  }
}

/** Route an object reference to its home surface. */
export function refPath(ref: ObjectRef): string {
  switch (ref.kind) {
    case "update":
      return `/demo/command-center/updates?object=${ref.id}`;
    case "recommendation":
      return `/demo/command-center/recommendations?object=${ref.id}`;
    case "approval":
      return `/demo/command-center/approvals?object=${ref.id}`;
    case "think-result":
      return "/demo/sigma/think";
    case "advisor-session":
      return "/demo/sigma/advisor";
    case "do-plan":
      return "/demo/sigma/do";
    case "workflow":
      return `/demo/workspace/workflows?object=${ref.id}`;
    case "agent":
      return `/demo/workspace/agents?object=${ref.id}`;
    case "receipt":
      return `/demo/workspace/audit-log?object=${ref.id}`;
    case "blueprint":
      return "/demo/workspace/blueprints";
    case "persona":
      return "/demo/sigma/advisor";
    case "evidence":
      return "/demo/sigma/think";
  }
}
