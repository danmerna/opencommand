import type { Blueprint } from "../domain/types";
import { SCENARIO, fmtPct } from "./scenario";

const { proposal, market } = SCENARIO;

/** The one focused, reusable operating definition for the combine play. */
export const BLUEPRINT: Blueprint = {
  id: "bp-harvest-reprice",
  name: "Harvest Window Combine Reprice",
  goal: `Move aging combine inventory inside the ${market.harvestWindowWeeks}-week harvest window without breaching the margin floor.`,
  version: "1.0.0",
  creator: "Johnson Tractor Operations",
  publisher: "Johnson Tractor",
  origin: "built-in",
  compatibility: ">=1.0",
  agentTeamIds: ["agt-listing", "agt-photo", "agt-lead"],
  steps: [
    { title: "Reprice", detail: `Adjust listings on the approved unit set (default ${fmtPct(proposal.recommendedAdjustmentPct)}), premium units held at list.` },
    { title: "Feature", detail: `Feature the top ${proposal.featuredUnits} units with enhanced photos.` },
    { title: "Automate", detail: "Activate lead-response drafting for the window." },
    { title: "Close", detail: "Route qualified leads to the sales team with prepared quotes." },
  ],
  dataSources: ["tractorhouse", "inventory", "gmail", "quickbooks"],
  tools: ["TractorHouse listings API (simulated)", "Image pipeline (simulated)", "Quote builder (simulated)", "Slack (simulated)"],
  guardrails: [
    `Adjustment never below the ${fmtPct(SCENARIO.finance.marginFloorPct)} margin floor`,
    "Listing publishes require an approved plan",
    "Outbound lead replies require human approval",
    "Photo enhancement must preserve visible equipment condition",
  ],
  approvals: ["Execution preflight approved by Taylor", "Featured-listing checkpoint mid-run"],
  expectedOutcome: `${proposal.unitsRepriced} units repriced, ${proposal.featuredUnits} featured, lead automation active through the window.`,
  provenance: "Created from the combine pricing decision in this demo scenario.",
  license: "built-in",
  priceModel: "included",
  entitlement: "included",
  updateState: "current",
};
