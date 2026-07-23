/**
 * Canonical Johnson Tractor scenario values. Every number shown anywhere in
 * the demo comes from here or from a calculation over these values —
 * never from a JSX literal. All data is illustrative.
 */

export const SCENARIO = {
  dealer: "Johnson Tractor",
  operator: "Taylor",
  dealerPhone: "(555) 123-4567",
  slackChannel: "#sales-listings",

  /** Combine inventory ahead of the harvest window. */
  combines: {
    total: 16,
    s780Count: 9,
    s770Count: 7,
    s780AvgList: 429_500,
    s770AvgList: 389_500,
    /** 9 × 429,500 + 7 × 389,500 */
    totalInventoryValue: 6_592_000,
    avgDaysOnLot: 87,
  },

  /** Competitive + market signals. */
  market: {
    competitor: "Birkey's",
    competitorCutPct: -6.8,
    /** Iron Comps: S780 auction values quarter-over-quarter. */
    auctionTrendPct: -4.2,
    harvestWindowWeeks: 6,
    /** SIGNAL: demand capture lost per week of delay. */
    demandDecayPerWeekPct: 1.4,
  },

  /** Finance signals (QuickBooks). */
  finance: {
    floorPlanInterestPerMonth: 18_400,
    /** Below this list adjustment, unit margin goes negative after
     * floor-plan and prep costs. LEDGER's hard floor. */
    marginFloorPct: -7.5,
    /** Prep + recondition cost per combine unit. */
    prepCostPerUnit: 3_850,
    /** Dealer margin over unit cost at full list price. A −7.5% cut plus
     * prep and accrued floor-plan turns unit margin negative — the floor. */
    marginOverCostPct: 9.0,
  },

  /** The reconciled Board Synthesis proposal. */
  proposal: {
    /** Units repriced (premium low-hour units held at list). */
    unitsRepriced: 12,
    unitsHeldAtList: 4,
    recommendedAdjustmentPct: -5.5,
    ledgerPreferredPct: -4.0,
    signalPreferredPct: -6.8,
    sequence: ["reprice", "feature", "automate", "close"] as const,
    featuredUnits: 6,
  },

  /** Deterministic movement model breakpoints (units moved in window). */
  movement: {
    unitsAtListPrice: 5,
    unitsAtRecommended: 12,
    maxUnitsInWindow: 14,
  },

  serviceTicketsClosed: 3,
  unitsFrontLineReady: 2,

  photo: {
    dailyCapacity: 240,
    costPerPhoto: 0.14,
    photosEnhancedInRun: 38,
    conditionFlagsInRun: 1,
  },

  leadResponse: {
    slaMinutes: 5,
    avgResponseInRun: "4m 12s",
    estimatedConversionPct: 34,
  },
} as const;

/** Fixed illustrative "demo morning" — keeps every timestamp deterministic. */
export const DEMO_NOW = "2026-07-23T06:30:00-05:00";

export function demoTime(hoursOffset: number): string {
  const base = new Date(DEMO_NOW).getTime();
  return new Date(base + hoursOffset * 3_600_000).toISOString();
}

export const fmtUSD = (n: number): string =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const fmtPct = (n: number): string =>
  `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
