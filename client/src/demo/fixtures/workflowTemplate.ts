import type { PlanStep, WorkflowTask } from "../domain/types";
import { SCENARIO, fmtPct } from "./scenario";

const { proposal, leadResponse, photo, slackChannel } = SCENARIO;

/**
 * Deterministic plan steps for the combine play. The Do plan editor shows
 * these; a launched Workflow instantiates them as tasks with the same IDs.
 */
export function buildPlanSteps(adjustmentPct: number): PlanStep[] {
  return [
    {
      id: "step-reprice",
      title: `Reprice ${proposal.unitsRepriced} combine listings`,
      agentId: "agt-listing",
      detail: `Apply ${fmtPct(adjustmentPct)} to the approved unit set on TractorHouse; ${proposal.unitsHeldAtList} premium units stay at list.`,
      systems: ["tractorhouse", "inventory"],
      isCheckpoint: false,
    },
    {
      id: "step-photos",
      title: `Enhance photos for the top ${proposal.featuredUnits} featured units`,
      agentId: "agt-photo",
      detail: "Run the enhancement batch with condition-preservation checks on every frame.",
      systems: ["inventory", "tractorhouse"],
      isCheckpoint: false,
    },
    {
      id: "step-checkpoint",
      title: "Checkpoint: Taylor reviews the featured listing set",
      agentId: null,
      detail: "Human checkpoint — the run pauses until the featured set is approved.",
      systems: ["opencommand"],
      isCheckpoint: true,
    },
    {
      id: "step-leads",
      title: "Activate lead-response drafting",
      agentId: "agt-lead",
      detail: `Draft replies to combine inquiries within the ${leadResponse.slaMinutes}-minute SLA; sending still requires approval.`,
      systems: ["gmail", "tractorhouse"],
      isCheckpoint: false,
    },
    {
      id: "step-notify",
      title: "Notify the sales team",
      agentId: null,
      detail: `Post the repriced and featured set to Slack ${slackChannel} (simulated).`,
      systems: ["slack"],
      isCheckpoint: false,
    },
  ];
}

/** Deterministic simulated results, keyed by step id. */
export function taskResult(stepId: string, adjustmentPct: number): string {
  switch (stepId) {
    case "step-reprice":
      return `${proposal.unitsRepriced} listings repriced ${fmtPct(adjustmentPct)}; ${proposal.unitsHeldAtList} premium units unchanged.`;
    case "step-photos":
      return `${photo.photosEnhancedInRun} photos enhanced; ${photo.conditionFlagsInRun} frame flagged by the condition check and routed to re-shoot.`;
    case "step-checkpoint":
      return "Featured set approved by Taylor.";
    case "step-leads":
      return `Lead drafting active; first replies drafted in ${leadResponse.avgResponseInRun} average.`;
    case "step-notify":
      return `Summary posted to ${slackChannel} (simulated).`;
    default:
      return "Completed.";
  }
}

export function stepsToTasks(steps: PlanStep[]): WorkflowTask[] {
  return steps.map(s => ({
    id: s.id,
    title: s.title,
    agentId: s.agentId,
    detail: s.detail,
    systems: s.systems,
    isCheckpoint: s.isCheckpoint,
    status: "pending" as const,
    result: null,
    completedAt: null,
  }));
}
