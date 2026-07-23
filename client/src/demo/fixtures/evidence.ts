import type { EvidenceItem } from "../domain/types";
import { SCENARIO, demoTime, fmtUSD, fmtPct } from "./scenario";

const { combines, market, finance, serviceTicketsClosed, unitsFrontLineReady } = SCENARIO;

export const EVIDENCE: EvidenceItem[] = [
  {
    id: "evd-th-birkeys",
    source: "tractorhouse",
    label: "TractorHouse comp listings",
    fact: `${market.competitor} repriced comparable S780 listings ${fmtPct(market.competitorCutPct)} overnight.`,
    value: fmtPct(market.competitorCutPct),
    observedAt: demoTime(-4),
  },
  {
    id: "evd-inv-combines",
    source: "inventory",
    label: "Combine inventory",
    fact: `${combines.total} combines on the lot (${combines.s780Count} × S780, ${combines.s770Count} × S770), ${fmtUSD(combines.totalInventoryValue)} total, averaging ${combines.avgDaysOnLot} days on lot.`,
    value: `${combines.total} units`,
    observedAt: demoTime(-9),
  },
  {
    id: "evd-ic-auction",
    source: "iron-comps",
    label: "Iron Comps auction trend",
    fact: `S780-class auction values are down ${fmtPct(market.auctionTrendPct)} quarter-over-quarter; the retail-to-auction spread is narrowing.`,
    value: fmtPct(market.auctionTrendPct),
    observedAt: demoTime(-16),
  },
  {
    id: "evd-qb-floorplan",
    source: "quickbooks",
    label: "QuickBooks floor-plan interest",
    fact: `Floor-plan interest on combine inventory reached ${fmtUSD(finance.floorPlanInterestPerMonth)} this month and accrues while units sit.`,
    value: `${fmtUSD(finance.floorPlanInterestPerMonth)} / mo`,
    observedAt: demoTime(-7),
  },
  {
    id: "evd-gm-lead",
    source: "gmail",
    label: "Gmail lead inquiry",
    fact: "John Smith (john@farm.com) asked about a John Deere 7530 and financing before harvest.",
    value: "1 high-intent lead",
    observedAt: demoTime(-3),
  },
  {
    id: "evd-ap-service",
    source: "anvil-pro",
    label: "Anvil Pro service queue",
    fact: `${serviceTicketsClosed} combine service tickets closed overnight; ${unitsFrontLineReady} units are now front-line ready.`,
    value: `${unitsFrontLineReady} units ready`,
    observedAt: demoTime(-5),
  },
  {
    id: "evd-th-leads",
    source: "tractorhouse",
    label: "TractorHouse lead volume",
    fact: `Combine listing views are up for the week, but inquiries lag listings priced above the ${market.competitor} adjustment.`,
    value: "views ↑, inquiries flat",
    observedAt: demoTime(-4),
  },
  {
    id: "evd-qb-margin",
    source: "quickbooks",
    label: "QuickBooks unit economics",
    fact: `Below a ${fmtPct(finance.marginFloorPct)} list adjustment, unit margin goes negative after floor-plan and ${fmtUSD(finance.prepCostPerUnit)} per-unit prep costs.`,
    value: `floor ${fmtPct(finance.marginFloorPct)}`,
    observedAt: demoTime(-7),
  },
];

export const EVIDENCE_BY_ID = Object.fromEntries(EVIDENCE.map(e => [e.id, e]));

export const SOURCE_LABELS: Record<string, string> = {
  gmail: "Gmail",
  tractorhouse: "TractorHouse",
  "anvil-pro": "Anvil Pro",
  "iron-comps": "Iron Comps",
  quickbooks: "QuickBooks",
  inventory: "Inventory",
  slack: "Slack",
  opencommand: "OpenCommand",
};
