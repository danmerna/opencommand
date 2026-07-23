/**
 * Deterministic scenario calculations for the combine pricing decision.
 * Pure functions over SCENARIO values — unit tested, no randomness.
 */

import { SCENARIO } from "../fixtures/scenario";

const { combines, finance, movement, proposal, market } = SCENARIO;

/** Weighted average list price across the 16-combine inventory. */
export function avgListPrice(): number {
  return combines.totalInventoryValue / combines.total;
}

/**
 * Units projected to move inside the harvest window at a given list
 * adjustment. Piecewise linear between the model breakpoints:
 * 0% → 5 units, −5.5% → 12 units, capped at 14.
 */
export function unitsMoved(adjustmentPct: number): number {
  const cut = Math.max(0, -adjustmentPct);
  const perPct =
    (movement.unitsAtRecommended - movement.unitsAtListPrice) /
    Math.abs(proposal.recommendedAdjustmentPct);
  const raw = movement.unitsAtListPrice + cut * perPct;
  return Math.min(movement.maxUnitsInWindow, Math.round(raw));
}

/** Gross revenue over the window from units moved at the adjusted price. */
export function projectedRevenue(adjustmentPct: number): number {
  const price = avgListPrice() * (1 + adjustmentPct / 100);
  return Math.round(unitsMoved(adjustmentPct) * price);
}

/** Margin given up vs. list on the units that move. */
export function marginImpact(adjustmentPct: number): number {
  const perUnitGiveUp = avgListPrice() * (-adjustmentPct / 100);
  return Math.round(-(unitsMoved(adjustmentPct) * perUnitGiveUp));
}

/**
 * Floor-plan interest avoided over the window by moving units early.
 * Interest is carried per unit per month; a moved unit stops accruing
 * for roughly half the window on average.
 */
export function carryingSavings(adjustmentPct: number): number {
  const perUnitMonthly = finance.floorPlanInterestPerMonth / combines.total;
  const windowMonths = market.harvestWindowWeeks / 4.33;
  const extraUnits = unitsMoved(adjustmentPct) - movement.unitsAtListPrice;
  return Math.round(extraUnits * perUnitMonthly * windowMonths * 0.5);
}

/**
 * Estimated loss if unsold units ride the Iron Comps auction trend after
 * the window instead of selling retail now.
 */
export function holdRisk(adjustmentPct: number): number {
  const unsold = combines.total - unitsMoved(adjustmentPct);
  const perUnitAuctionLoss = avgListPrice() * (-market.auctionTrendPct / 100);
  return Math.round(unsold * perUnitAuctionLoss);
}

/**
 * Net position vs. holding at list. The alternative to a repriced sale is
 * not a list-price sale — it is an unsold unit. So the model:
 *   + earns the remaining margin (margin-over-cost + adjustment) on each
 *     incremental unit the cut moves,
 *   − gives up the discount on the units that would have sold anyway,
 *   + keeps the carrying-cost savings and avoided auction-trend exposure.
 * Under these fixtures the reconciled −5.5% is the modeled optimum.
 */
export function netPosition(adjustmentPct: number): number {
  const price = avgListPrice();
  const perUnitDiscount = price * (-adjustmentPct / 100);
  const perUnitRemainingMargin = price * ((finance.marginOverCostPct + adjustmentPct) / 100);
  const baseUnits = movement.unitsAtListPrice;
  const incrementalUnits = unitsMoved(adjustmentPct) - baseUnits;
  const incrementalProfit = incrementalUnits * perUnitRemainingMargin;
  const baseGiveUp = baseUnits * perUnitDiscount;
  const avoidedAuctionRisk = holdRisk(0) - holdRisk(adjustmentPct);
  return Math.round(incrementalProfit - baseGiveUp + carryingSavings(adjustmentPct) + avoidedAuctionRisk);
}

/** LEDGER's guardrail: does this adjustment breach the margin floor? */
export function breachesMarginFloor(adjustmentPct: number): boolean {
  return adjustmentPct < finance.marginFloorPct;
}

/** Clamp a scrubbed adjustment into the modeled range [−8, 0]. */
export function clampAdjustment(adjustmentPct: number): number {
  return Math.min(0, Math.max(-8, Math.round(adjustmentPct * 10) / 10));
}

export interface ScenarioReadout {
  adjustmentPct: number;
  unitsMoved: number;
  projectedRevenue: number;
  marginImpact: number;
  carryingSavings: number;
  holdRisk: number;
  netPosition: number;
  breachesFloor: boolean;
}

export function scenarioReadout(adjustmentPct: number): ScenarioReadout {
  const adj = clampAdjustment(adjustmentPct);
  return {
    adjustmentPct: adj,
    unitsMoved: unitsMoved(adj),
    projectedRevenue: projectedRevenue(adj),
    marginImpact: marginImpact(adj),
    carryingSavings: carryingSavings(adj),
    holdRisk: holdRisk(adj),
    netPosition: netPosition(adj),
    breachesFloor: breachesMarginFloor(adj),
  };
}
