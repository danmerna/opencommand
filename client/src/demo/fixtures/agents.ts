import type { AgentRecord } from "../domain/types";
import { SCENARIO, demoTime } from "./scenario";

const { photo, leadResponse, slackChannel, proposal } = SCENARIO;

/** Bounded executors. Agents perform work; personas only advise. */
export const AGENTS: AgentRecord[] = [
  {
    id: "agt-photo",
    name: "Photo Enhancer",
    role: "Listing photo enhancement",
    capabilities: ["photo-enhancement", "batch-processing", "condition-preservation-check"],
    tools: ["Image pipeline (simulated)", "TractorHouse media API (simulated)"],
    dataScope: ["inventory", "tractorhouse"],
    commandBoundary: [
      "May enhance lighting, framing, and clarity only",
      "Must not alter visible equipment condition — dents, wear, and hours stay visible",
      "Publishes only after batch approval",
    ],
    throughput: `${photo.dailyCapacity} photos / day`,
    costNote: `$${photo.costPerPhoto.toFixed(2)} per photo`,
    approvalNote: "Batch review by Taylor before publish",
    safeguards: ["Condition-preservation check on every frame", "Flagged frames routed to re-shoot"],
    activity: [
      { at: demoTime(-30), entry: "Enhanced 52 loader photos; 0 condition flags" },
      { at: demoTime(-54), entry: `Handed off sprayer batch to Slack ${slackChannel}` },
    ],
    assignedWorkflowIds: [],
    status: "available",
  },
  {
    id: "agt-lead",
    name: "Lead Response",
    role: "Inbound lead drafting",
    capabilities: ["lead-drafting", "inventory-matching", "quote-preparation"],
    tools: ["Gmail (simulated)", "TractorHouse inbox (simulated)", "Quote builder (simulated)"],
    dataScope: ["gmail", "tractorhouse", "inventory"],
    commandBoundary: [
      `Drafts within a ${leadResponse.slaMinutes}-minute SLA`,
      "Never sends without human approval",
      "May quote only approved list prices",
    ],
    throughput: `${leadResponse.slaMinutes}-min draft SLA`,
    costNote: "Included in platform",
    approvalNote: "Every outbound reply requires approval",
    safeguards: ["Send-blocked until approved", "Quotes locked to approved pricing"],
    activity: [
      { at: demoTime(-26), entry: "Drafted reply to Mary Johnson (financing options) — approved and sent" },
      { at: demoTime(-49), entry: `Estimated conversion on drafted replies: ${leadResponse.estimatedConversionPct}%` },
    ],
    assignedWorkflowIds: [],
    status: "available",
  },
  {
    id: "agt-listing",
    name: "Listing Optimizer",
    role: "Listing price and placement sync",
    capabilities: ["price-sync", "featured-placement", "listing-copy-refresh"],
    tools: ["TractorHouse listings API (simulated)"],
    dataScope: ["tractorhouse", "inventory"],
    commandBoundary: [
      "May change prices only within an approved plan's adjustment",
      `May feature at most ${proposal.featuredUnits} units per run`,
      "Cannot publish outside an approved workflow",
    ],
    throughput: "Full inventory sync in one run",
    costNote: "Included in platform",
    approvalNote: "Runs only inside approved workflows",
    safeguards: ["Adjustment clamped to the approved value", "Dry-run diff before publish"],
    activity: [
      { at: demoTime(-78), entry: "Synced 41 listings; 0 price changes (no approved plan)" },
    ],
    assignedWorkflowIds: [],
    status: "available",
  },
];

export const AGENT_BY_ID = Object.fromEntries(AGENTS.map(a => [a.id, a]));
