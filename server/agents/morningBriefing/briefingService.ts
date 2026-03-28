/**
 * Morning Briefing Service
 *
 * Generates a daily briefing by:
 * 1. Detecting overnight changes across leads, inventory, and agent performance
 * 2. Categorizing changes by severity (RED/YELLOW/BLUE/GREEN)
 * 3. Generating a "Today's Strategy" summary via LLM
 */

import { invokeLLM } from "../../_core/llm";
import {
  getLeadsByCompanyId, getLeadResponseStats,
  getInventoryByCompanyId, getCompetitivePricingByCompanyId,
  getAgentsByCompanyId, getAuditLogByCompanyId,
} from "../../db";

export type SeverityLevel = "RED" | "YELLOW" | "BLUE" | "GREEN";

export interface BriefingItem {
  severity: SeverityLevel;
  category: string;
  title: string;
  detail: string;
  metric?: string;
}

export interface MorningBriefing {
  date: string;
  items: BriefingItem[];
  todayStrategy: string;
  stats: {
    totalLeads: number;
    newLeadsOvernight: number;
    pendingDrafts: number;
    approvalRate: number;
    avgResponseTimeMins: number;
    inventoryCount: number;
    competitorListings: number;
    activeAgents: number;
  };
}

const BRIEFING_STRATEGY_PROMPT = `You are Arch, the AI CEO for a heavy equipment dealership (Johnson Tractor, 11 stores).
Given the overnight activity summary below, write a concise "Today's Strategy" briefing (3-5 bullet points).

Focus on:
- Immediate actions needed (stale leads, pending drafts, inventory gaps)
- Competitive intelligence highlights
- Resource allocation priorities
- Revenue opportunities

Be specific to the data provided. Use dealer terminology. Keep it actionable — each bullet should be something the team can act on today.`;

/**
 * Generate a morning briefing for a company.
 */
export async function generateMorningBriefing(
  companyId: number,
  userId: number,
): Promise<MorningBriefing> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Gather data in parallel
  const [leads, stats, inventory, competitorPricing, agents, auditLog] = await Promise.all([
    getLeadsByCompanyId(companyId),
    getLeadResponseStats(companyId),
    getInventoryByCompanyId(companyId),
    getCompetitivePricingByCompanyId(companyId),
    getAgentsByCompanyId(companyId),
    getAuditLogByCompanyId(companyId),
  ]);

  const recentAudit = auditLog.filter(a => new Date(a.createdAt) >= yesterday);

  // Detect overnight changes
  const items: BriefingItem[] = [];

  // ─── Lead Changes ──────────────────────────────
  const newLeads = leads.filter(l => new Date(l.createdAt) >= yesterday);
  const staleLeads = leads.filter(l => l.status === "stale");
  const pendingLeads = leads.filter(l => l.status === "new" || l.status === "draft_ready");
  const unrepliedLeads = leads.filter(l => {
    if (l.status !== "new" && l.status !== "draft_ready") return false;
    const age = now.getTime() - new Date(l.receivedAt ?? l.createdAt).getTime();
    return age > 4 * 60 * 60 * 1000; // More than 4 hours old
  });

  if (unrepliedLeads.length > 0) {
    items.push({
      severity: "RED",
      category: "Leads",
      title: `${unrepliedLeads.length} lead${unrepliedLeads.length > 1 ? "s" : ""} unreplied for 4+ hours`,
      detail: unrepliedLeads.map(l => `${l.contactName ?? "Unknown"} — ${l.equipmentInterest ?? "inquiry"}`).slice(0, 5).join(", "),
      metric: `${unrepliedLeads.length} unreplied`,
    });
  }

  if (staleLeads.length > 0) {
    items.push({
      severity: "YELLOW",
      category: "Leads",
      title: `${staleLeads.length} stale lead${staleLeads.length > 1 ? "s" : ""} need attention`,
      detail: "Leads marked stale — consider follow-up or closing",
      metric: `${staleLeads.length} stale`,
    });
  }

  if (newLeads.length > 0) {
    items.push({
      severity: "BLUE",
      category: "Leads",
      title: `${newLeads.length} new lead${newLeads.length > 1 ? "s" : ""} received overnight`,
      detail: newLeads.map(l => `${l.contactName ?? "Unknown"} (${l.source})`).slice(0, 5).join(", "),
      metric: `${newLeads.length} new`,
    });
  }

  // ─── Draft Response Changes ────────────────────
  if (stats.draftsPending > 0) {
    items.push({
      severity: stats.draftsPending > 5 ? "RED" : "YELLOW",
      category: "Drafts",
      title: `${stats.draftsPending} draft${stats.draftsPending > 1 ? "s" : ""} pending review`,
      detail: "Draft responses waiting for human approval",
      metric: `${stats.draftsPending} pending`,
    });
  }

  if (stats.approvalRate > 0 && stats.approvalRate < 80) {
    items.push({
      severity: "YELLOW",
      category: "Performance",
      title: `Approval rate at ${stats.approvalRate}% — below target`,
      detail: "Consider reviewing guardrail settings or draft quality",
      metric: `${stats.approvalRate}%`,
    });
  } else if (stats.approvalRate >= 95) {
    items.push({
      severity: "GREEN",
      category: "Performance",
      title: `Approval rate at ${stats.approvalRate}% — excellent`,
      detail: "Lead Response Agent performing well. May be eligible for L2 promotion.",
      metric: `${stats.approvalRate}%`,
    });
  }

  // ─── Inventory Changes ─────────────────────────
  const newInventory = inventory.filter(i => new Date(i.createdAt) >= yesterday);
  const agingInventory = inventory.filter(i => (i.daysOnLot ?? 0) > 90 && i.isAvailable);

  if (newInventory.length > 0) {
    items.push({
      severity: "BLUE",
      category: "Inventory",
      title: `${newInventory.length} new unit${newInventory.length > 1 ? "s" : ""} added`,
      detail: newInventory.map(i => `${i.year ?? ""} ${i.make ?? ""} ${i.model ?? ""}`).slice(0, 5).join(", "),
      metric: `${newInventory.length} new`,
    });
  }

  if (agingInventory.length > 0) {
    items.push({
      severity: "YELLOW",
      category: "Inventory",
      title: `${agingInventory.length} unit${agingInventory.length > 1 ? "s" : ""} aging (90+ days on lot)`,
      detail: agingInventory.map(i => `${i.stockNumber ?? "?"}: ${i.year ?? ""} ${i.make ?? ""} ${i.model ?? ""} (${i.daysOnLot}d)`).slice(0, 5).join(", "),
      metric: `${agingInventory.length} aging`,
    });
  }

  // ─── Competitive Intelligence ──────────────────
  const recentComps = competitorPricing.filter(c => c.scrapedAt && new Date(c.scrapedAt) >= yesterday);
  if (recentComps.length > 0) {
    items.push({
      severity: "BLUE",
      category: "Market Intel",
      title: `${recentComps.length} competitor listing${recentComps.length > 1 ? "s" : ""} tracked`,
      detail: recentComps.map(c => `${c.make ?? ""} ${c.model ?? ""} @ $${parseFloat(c.askingPrice ?? "0").toLocaleString()} (${c.dealerName ?? "unknown"})`).slice(0, 3).join(", "),
      metric: `${recentComps.length} tracked`,
    });
  }

  // ─── Agent Performance ─────────────────────────
  const activeAgents = agents.filter(a => a.status === "active");
  const errorAgents = agents.filter(a => a.status === "error");

  if (errorAgents.length > 0) {
    items.push({
      severity: "RED",
      category: "Fleet",
      title: `${errorAgents.length} agent${errorAgents.length > 1 ? "s" : ""} in error state`,
      detail: errorAgents.map(a => a.name).join(", "),
      metric: `${errorAgents.length} errors`,
    });
  }

  if (activeAgents.length > 0) {
    items.push({
      severity: "GREEN",
      category: "Fleet",
      title: `${activeAgents.length} agent${activeAgents.length > 1 ? "s" : ""} active`,
      detail: `Fleet operational. ${agents.length} total agents.`,
      metric: `${activeAgents.length}/${agents.length}`,
    });
  }

  // Sort by severity: RED > YELLOW > BLUE > GREEN
  const severityOrder: Record<SeverityLevel, number> = { RED: 0, YELLOW: 1, BLUE: 2, GREEN: 3 };
  items.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Generate Today's Strategy via LLM
  let todayStrategy = "";
  try {
    const summaryForLlm = items.map(i => `[${i.severity}] ${i.category}: ${i.title} — ${i.detail}`).join("\n");
    const response = await invokeLLM({
      messages: [
        { role: "system", content: BRIEFING_STRATEGY_PROMPT },
        { role: "user", content: `Date: ${now.toLocaleDateString()}\n\nOvernight Activity:\n${summaryForLlm}\n\nStats: ${JSON.stringify(stats)}\nInventory: ${inventory.length} units, ${agingInventory.length} aging 90+ days\nCompetitor listings tracked: ${competitorPricing.length}` },
      ],
    });
    todayStrategy = (response.choices[0]?.message?.content ?? "") as string;
  } catch (err) {
    console.error("[MorningBriefing] Strategy generation failed:", err);
    todayStrategy = "Strategy generation unavailable. Review the briefing items above and prioritize RED items first.";
  }

  return {
    date: now.toISOString().split("T")[0],
    items,
    todayStrategy,
    stats: {
      totalLeads: stats.totalLeads,
      newLeadsOvernight: newLeads.length,
      pendingDrafts: stats.draftsPending,
      approvalRate: stats.approvalRate,
      avgResponseTimeMins: stats.avgResponseTimeMins,
      inventoryCount: inventory.length,
      competitorListings: competitorPricing.length,
      activeAgents: activeAgents.length,
    },
  };
}
