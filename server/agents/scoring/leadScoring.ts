import { getDb } from "../../db";
import { emails, actionItems } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Lead Scoring Service
 * Scores leads by equipment type, buyer history, and engagement signals
 */

export interface LeadScore {
  leadId: number;
  score: number; // 0-100
  tier: "high" | "medium" | "low"; // High: 75+, Medium: 50-74, Low: <50
  factors: {
    equipmentType: number; // 0-30 points
    buyerHistory: number; // 0-25 points
    engagement: number; // 0-25 points
    urgency: number; // 0-20 points
  };
  reasoning: string[];
}

/**
 * Equipment type scoring map
 */
const EQUIPMENT_SCORES: Record<string, number> = {
  "john_deere": 30,
  "john deere": 30,
  "tractor": 28,
  "kubota": 25,
  "compact_tractor": 25,
  "financing": 20,
  "equipment_financing": 20,
  "parts": 15,
  "service": 10,
  "other": 5,
};

/**
 * Calculate lead score
 */
export function calculateLeadScore(
  lead: {
    id: number;
    buyerName: string;
    equipmentType: string;
    buyerHistory?: string;
    engagementLevel?: "high" | "medium" | "low";
    responseTime?: number; // minutes
  }
): LeadScore {
  const factors = {
    equipmentType: 0,
    buyerHistory: 0,
    engagement: 0,
    urgency: 0,
  };

  const reasoning: string[] = [];

  // Equipment Type Scoring (0-30 points)
  const equipmentKey = lead.equipmentType.toLowerCase();
  let equipmentScore = 0;

  for (const [key, score] of Object.entries(EQUIPMENT_SCORES)) {
    if (equipmentKey.includes(key)) {
      equipmentScore = score;
      break;
    }
  }

  factors.equipmentType = equipmentScore;
  if (equipmentScore >= 25) {
    reasoning.push(`High-value equipment type: ${lead.equipmentType}`);
  }

  // Buyer History Scoring (0-25 points)
  if (lead.buyerHistory) {
    if (lead.buyerHistory.includes("repeat")) {
      factors.buyerHistory = 25;
      reasoning.push("Repeat buyer - high conversion likelihood");
    } else if (lead.buyerHistory.includes("previous")) {
      factors.buyerHistory = 20;
      reasoning.push("Previous customer - familiar with brand");
    } else if (lead.buyerHistory.includes("referral")) {
      factors.buyerHistory = 15;
      reasoning.push("Referred lead - warm introduction");
    } else {
      factors.buyerHistory = 5;
      reasoning.push("New buyer - cold lead");
    }
  }

  // Engagement Scoring (0-25 points)
  if (lead.engagementLevel === "high") {
    factors.engagement = 25;
    reasoning.push("High engagement - immediate interest shown");
  } else if (lead.engagementLevel === "medium") {
    factors.engagement = 15;
    reasoning.push("Medium engagement - moderate interest");
  } else {
    factors.engagement = 5;
    reasoning.push("Low engagement - passive inquiry");
  }

  // Urgency Scoring (0-20 points)
  if (lead.responseTime !== undefined) {
    if (lead.responseTime < 5) {
      factors.urgency = 20;
      reasoning.push("Urgent: Response within 5 minutes");
    } else if (lead.responseTime < 30) {
      factors.urgency = 15;
      reasoning.push("Time-sensitive: Response within 30 minutes");
    } else if (lead.responseTime < 120) {
      factors.urgency = 10;
      reasoning.push("Standard: Response within 2 hours");
    } else {
      factors.urgency = 5;
      reasoning.push("Low urgency: Delayed response");
    }
  }

  const totalScore = Math.min(
    100,
    factors.equipmentType + factors.buyerHistory + factors.engagement + factors.urgency
  );

  const tier: "high" | "medium" | "low" = totalScore >= 75 ? "high" : totalScore >= 50 ? "medium" : "low";

  return {
    leadId: lead.id,
    score: totalScore,
    tier,
    factors,
    reasoning,
  };
}

/**
 * Score all pending leads for a company
 */
export async function scoreCompanyLeads(companyId: number): Promise<LeadScore[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // Get all pending leads
  const leads = await db.select().from(emails).execute();

  const scores: LeadScore[] = [];

  for (const email of leads as any[]) {
    const metadata = JSON.parse(email.metadataJson || "{}");
    // Filter by company ID from metadata
    if (metadata.companyId && metadata.companyId !== companyId) continue;
    const score = calculateLeadScore({
      id: email.id,
      buyerName: metadata.buyer_name || "Unknown",
      equipmentType: metadata.equipment_type || "other",
      buyerHistory: metadata.buyer_history,
      engagementLevel: metadata.engagement_level || "medium",
      responseTime: metadata.response_time_minutes,
    });

    scores.push(score);
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  return scores;
}

/**
 * Get top leads by score
 */
export async function getTopLeads(companyId: number, limit: number = 10): Promise<LeadScore[]> {
  const scores = await scoreCompanyLeads(companyId);
  return scores.slice(0, limit);
}

/**
 * Get leads by tier
 */
export async function getLeadsByTier(
  companyId: number,
  tier: "high" | "medium" | "low"
): Promise<LeadScore[]> {
  const scores = await scoreCompanyLeads(companyId);
  return scores.filter((s) => s.tier === tier);
}

/**
 * Score distribution for company
 */
export async function getScoreDistribution(companyId: number): Promise<{
  high: number;
  medium: number;
  low: number;
  average: number;
}> {
  const scores = await scoreCompanyLeads(companyId);

  const distribution = {
    high: scores.filter((s) => s.tier === "high").length,
    medium: scores.filter((s) => s.tier === "medium").length,
    low: scores.filter((s) => s.tier === "low").length,
    average: scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length) : 0,
  };

  return distribution;
}
