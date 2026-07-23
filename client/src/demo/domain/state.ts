import type {
  AdvisorSession,
  AgentRecord,
  Approval,
  AuditEntry,
  Blueprint,
  DoPlan,
  ProofOfOutcome,
  Recommendation,
  ThinkResult,
  Update,
  UpdateId,
  WorkflowInstance,
} from "./types";
import { UPDATES } from "../fixtures/updates";
import { AGENTS } from "../fixtures/agents";
import { BLUEPRINT } from "../fixtures/blueprint";
import { SCENARIO, demoTime } from "../fixtures/scenario";
import { buildPlanSteps, stepsToTasks, taskResult } from "../fixtures/workflowTemplate";

/** A one-slot, time-limited undo. Reversible actions register here. */
export type PendingUndo =
  | { kind: "update-triage"; label: string; updateId: UpdateId; prevStatus: Update["status"] }
  | { kind: "recommendation-defer"; label: string; recommendationId: string; prevStatus: Recommendation["status"] }
  | { kind: "execution-confirm"; label: string };

export interface DemoState {
  updates: Update[];
  thinkResults: ThinkResult[];
  activeThinkId: string | null;
  advisorSessions: AdvisorSession[];
  activeAdvisorId: string | null;
  recommendations: Recommendation[];
  plans: DoPlan[];
  activePlanId: string | null;
  approvals: Approval[];
  blueprint: Blueprint;
  workflows: WorkflowInstance[];
  agents: AgentRecord[];
  receipts: ProofOfOutcome[];
  audit: AuditEntry[];
  /** Active business object carried across tabs. */
  activeUpdateId: UpdateId | null;
  /** Where "Back" returns to after a cross-tab handoff. */
  returnTo: { label: string; path: string } | null;
  pendingUndo: PendingUndo | null;
  /** Monotonic counter for generated ids — deterministic per session. */
  seq: number;
}

/**
 * A prior, already-finished run kept as history so Workflows can show the
 * `failed` state honestly (labeled simulated) with intact references.
 */
function historicalObjects(): {
  plan: DoPlan;
  approval: Approval;
  workflow: WorkflowInstance;
} {
  const steps = buildPlanSteps(-2.0).slice(0, 2);
  const plan: DoPlan = {
    id: "plan-history-sprayer",
    status: "confirmed",
    goal: "Refresh sprayer listing photos before the pre-season push.",
    selectedOption: "Photo refresh only",
    adjustmentPct: 0,
    agentTeamIds: ["agt-photo"],
    steps,
    requiredData: ["inventory", "tractorhouse"],
    tools: ["Image pipeline (simulated)"],
    guardrails: ["Photo enhancement must preserve visible equipment condition"],
    approvals: ["Execution preflight approved by Taylor"],
    expectedOutcome: "Sprayer photo set refreshed and republished.",
    exceptionBehavior: "Pause and surface an exception Update on tool failure.",
    receiptDefinition: "Photo counts, condition flags, and publish confirmation.",
    reversibilityNote: "Fully reversible — original photos retained.",
    sourceRecommendationId: null,
    sourceThinkResultId: null,
    sourceAdvisorSessionId: null,
    blueprintId: null,
    undoWindowOpen: false,
  };
  const approval: Approval = {
    id: "apr-history-sprayer",
    title: "Sprayer photo refresh",
    decision: "Run the sprayer photo refresh batch",
    whyRequired: "Publishes listing media to TractorHouse (simulated).",
    scope: "14 sprayer listings, photos only — no price changes",
    affectedSystems: ["tractorhouse", "inventory"],
    economicEffect: "No pricing effect; media cost only.",
    commandBoundary: "Photo Enhancer may edit media only; publish gated on approval.",
    reversibility: "Fully reversible — original photos retained.",
    approver: SCENARIO.operator,
    deadline: null,
    status: "approved",
    planId: "plan-history-sprayer",
    workflowId: "wfl-history-sprayer",
    contextTrail: [],
  };
  const workflow: WorkflowInstance = {
    id: "wfl-history-sprayer",
    name: "Sprayer photo refresh",
    status: "failed",
    planId: "plan-history-sprayer",
    blueprintId: null,
    approvalId: "apr-history-sprayer",
    agentIds: ["agt-photo"],
    tasks: stepsToTasks(steps).map((t, i) =>
      i === 0
        ? { ...t, status: "done" as const, result: taskResult(t.id, 0), completedAt: demoTime(-170) }
        : { ...t, status: "failed" as const, result: "Media API timeout (simulated) — batch halted, no partial publish.", completedAt: demoTime(-169) },
    ),
    startedAt: demoTime(-171),
    completedAt: demoTime(-169),
    receiptId: null,
  };
  return { plan, approval, workflow };
}

export function initialDemoState(): DemoState {
  const history = historicalObjects();
  const audit: AuditEntry[] = UPDATES.map(u => ({
    id: `aud-created-${u.id}`,
    at: u.timestamp,
    type: "update-created",
    summary: `Update surfaced from ${u.source}: ${u.title}`,
    objectRef: { kind: "update", id: u.id },
    causedBy: null,
  }));
  audit.push({
    id: "aud-history-exception",
    at: demoTime(-169),
    type: "workflow-exception",
    summary: "Sprayer photo refresh halted: media API timeout (simulated).",
    objectRef: { kind: "workflow", id: history.workflow.id },
    causedBy: null,
  });
  return {
    updates: UPDATES.map(u => ({ ...u })),
    thinkResults: [],
    activeThinkId: null,
    advisorSessions: [],
    activeAdvisorId: null,
    recommendations: [],
    plans: [history.plan],
    activePlanId: null,
    approvals: [history.approval],
    blueprint: { ...BLUEPRINT },
    workflows: [history.workflow],
    agents: AGENTS.map(a => ({ ...a })),
    receipts: [],
    audit,
    activeUpdateId: null,
    returnTo: null,
    pendingUndo: null,
    seq: 100,
  };
}
