import { getBoardCascade } from "../executiveBoard/boardThinking";
import { getDb } from "../../db";
import { actionItems } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Intent Engine + Executive Board Integration
 * Allows action items to be escalated to the executive board for multi-perspective review
 */

export interface ActionItemContext {
  id: number;
  userId: number;
  companyId: number;
  actionText: string;
  context: Record<string, any>;
  riskLevel: "low" | "medium" | "high";
}

export interface BoardEscalation {
  actionItemId: number;
  question: string;
  perspectives: Array<{
    role: string;
    timeHorizon: string;
    perspective: string;
    recommendation: string;
    confidence: number;
    rationale: string[];
  }>;
  averageConfidence: number;
  consensusRecommendation?: string;
  timestamp: Date;
}

/**
 * Escalate an action item to the executive board
 * Returns board cascade with all 5 perspectives
 */
export async function escalateToBoard(actionItem: ActionItemContext): Promise<BoardEscalation> {
  console.log(`[Intent Engine] Escalating action ${actionItem.id} to board`);

  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // Construct the question from action item
  const question = `${actionItem.actionText}

Risk Level: ${actionItem.riskLevel}

Context: ${JSON.stringify(actionItem.context, null, 2)}`;

  // Get board cascade
  const perspectives = await getBoardCascade({
    question,
    context: actionItem.context,
    companyData: {
      userId: actionItem.userId,
      companyId: actionItem.companyId,
    },
  });

  // Calculate consensus
  const averageConfidence = perspectives.reduce((sum, p) => sum + p.confidence, 0) / perspectives.length;

  // Determine consensus recommendation
  const highConfidenceRecommendations = perspectives
    .filter((p) => p.confidence >= 75)
    .map((p) => p.recommendation);

  const consensusRecommendation =
    highConfidenceRecommendations.length > 2
      ? "Proceed with caution - multiple perspectives recommend moving forward"
      : highConfidenceRecommendations.length === 0
        ? "Hold for further review - low confidence across board"
        : undefined;

  // Update action item with board escalation metadata stored in context
  const contextData = typeof actionItem.context === 'string' 
    ? JSON.parse(actionItem.context) 
    : actionItem.context;
  
  const updatedContext = {
    ...contextData,
    boardEscalation: {
      escalatedToBoard: true,
      perspectives: perspectives.map((p) => ({
        role: p.role,
        recommendation: p.recommendation,
        confidence: p.confidence,
      })),
      averageConfidence,
      consensusRecommendation,
    },
  };

  await db
    .update(actionItems)
    .set({
      context: JSON.stringify(updatedContext),
      updatedAt: new Date(),
    })
    .where(eq(actionItems.id, actionItem.id));

  const escalation: BoardEscalation = {
    actionItemId: actionItem.id,
    question,
    perspectives,
    averageConfidence,
    consensusRecommendation,
    timestamp: new Date(),
  };

  console.log(`[Intent Engine] Board escalation complete for action ${actionItem.id}`);
  return escalation;
}

/**
 * Get board feedback for an action item
 */
export async function getBoardFeedback(actionItemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const item = await db.select().from(actionItems).where(eq(actionItems.id, actionItemId));

  if (!item || item.length === 0) {
    throw new Error(`Action item ${actionItemId} not found`);
  }

  const context = item[0].context ? JSON.parse(item[0].context as string) : null;
  if (!context?.boardEscalation) {
    throw new Error(`No board feedback for action ${actionItemId}`);
  }

  return context.boardEscalation;
}

/**
 * Get all escalated action items for a user
 */
export async function getEscalatedActions(userId: number, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // Get all action items for user/company (board escalation status stored in context)
  const items = await db
    .select()
    .from(actionItems)
    .where((t) => eq(t.userId, userId) && eq(t.companyId, companyId));

  // Filter items that have board escalation data
  return items.filter((item) => {
    if (!item.context) return false;
    const context = JSON.parse(item.context as string);
    return context.boardEscalation !== undefined;
  });
}

/**
 * Format board cascade for Σ conversation display
 */
export function formatBoardCascadeForConversation(escalation: BoardEscalation): string {
  let output = `## Executive Board Review\n\n`;
  output += `**Question:** ${escalation.question}\n\n`;
  output += `**Average Confidence:** ${escalation.averageConfidence.toFixed(1)}%\n\n`;

  output += `### Board Perspectives\n\n`;

  for (const perspective of escalation.perspectives) {
    output += `#### ${perspective.role} (${perspective.timeHorizon})\n`;
    output += `**Perspective:** ${perspective.perspective}\n\n`;
    output += `**Recommendation:** ${perspective.recommendation}\n`;
    output += `**Confidence:** ${perspective.confidence}%\n\n`;
    output += `**Rationale:**\n`;
    for (const reason of perspective.rationale) {
      output += `- ${reason}\n`;
    }
    output += `\n`;
  }

  if (escalation.consensusRecommendation) {
    output += `### Consensus\n`;
    output += `${escalation.consensusRecommendation}\n`;
  }

  return output;
}

/**
 * Determine if an action should be auto-escalated based on risk level
 */
export function shouldAutoEscalate(riskLevel: string, actionText: string): boolean {
  // High-risk actions should always be escalated
  if (riskLevel === "high") return true;

  // Certain keywords in action text should trigger escalation
  const escalationKeywords = ["budget", "hire", "vendor", "strategic", "partnership", "acquisition"];
  const lowerText = actionText.toLowerCase();
  if (escalationKeywords.some((keyword) => lowerText.includes(keyword))) return true;

  return false;
}
