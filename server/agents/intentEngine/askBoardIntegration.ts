import { getDb } from "../../db";
import { actionItems } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { escalateToBoard, formatBoardCascadeForConversation } from "./boardIntegration";

/**
 * Ask Board Integration for Intent Engine
 * Connects action cards to executive board cascade with real data
 */

export interface ActionItemWithBoard {
  id: number;
  actionText: string;
  context: string | null;
  riskLevel: "low" | "medium" | "high";
  options: {
    recommended: { text: string; reasoning: string };
    conservative: { text: string; reasoning: string };
    aggressive: { text: string; reasoning: string };
  };
  boardFeedback?: {
    perspectives: Array<{
      role: string;
      recommendation: string;
      confidence: number;
    }>;
    averageConfidence: number;
    consensusRecommendation?: string;
  };
}

/**
 * Get action item with board feedback (if available)
 */
export async function getActionItemWithBoard(
  actionItemId: number,
  userId: number
): Promise<ActionItemWithBoard | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const items = await db
    .select()
    .from(actionItems)
    .where((t) => eq(t.id, actionItemId) && eq(t.userId, userId));

  if (!items || items.length === 0) {
    return null;
  }

  const item = items[0];
  const contextData = item.context ? JSON.parse(item.context as string) : {};

  return {
    id: item.id,
    actionText: item.actionText,
    context: item.context,
    riskLevel: item.riskLevel,
    options: item.options,
    boardFeedback: contextData.boardEscalation,
  };
}

/**
 * Ask board for a specific action item
 * Returns formatted cascade response for display
 */
export async function askBoardForAction(
  actionItemId: number,
  userId: number,
  companyId: number
): Promise<{
  actionItem: ActionItemWithBoard;
  boardResponse: string;
  perspectives: Array<{
    role: string;
    timeHorizon: string;
    perspective: string;
    recommendation: string;
    confidence: number;
  }>;
  averageConfidence: number;
  consensusRecommendation?: string;
}> {
  console.log(`[Ask Board] Processing action ${actionItemId} for user ${userId}`);

  // Get action item
  const actionItem = await getActionItemWithBoard(actionItemId, userId);
  if (!actionItem) {
    throw new Error(`Action item ${actionItemId} not found`);
  }

  // Check if already has board feedback
  if (actionItem.boardFeedback) {
    console.log(`[Ask Board] Using cached feedback for action ${actionItemId}`);
    return {
      actionItem,
      boardResponse: formatBoardCascadeForConversation({
        actionItemId,
        question: actionItem.actionText,
        perspectives: actionItem.boardFeedback.perspectives as any,
        averageConfidence: actionItem.boardFeedback.averageConfidence,
        consensusRecommendation: actionItem.boardFeedback.consensusRecommendation,
        timestamp: new Date(),
      }),
      perspectives: actionItem.boardFeedback.perspectives as any,
      averageConfidence: actionItem.boardFeedback.averageConfidence,
      consensusRecommendation: actionItem.boardFeedback.consensusRecommendation,
    };
  }

  // Get fresh board cascade
  const contextData = actionItem.context ? JSON.parse(actionItem.context as string) : {};
  const escalation = await escalateToBoard({
    id: actionItem.id,
    userId,
    companyId,
    actionText: actionItem.actionText,
    context: contextData,
    riskLevel: actionItem.riskLevel,
  });

  return {
    actionItem,
    boardResponse: formatBoardCascadeForConversation(escalation),
    perspectives: escalation.perspectives,
    averageConfidence: escalation.averageConfidence,
    consensusRecommendation: escalation.consensusRecommendation,
  };
}

/**
 * Get all action items for a user (for Ask Board context)
 */
export async function getActionItemsForBoard(userId: number, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const items = await db
    .select()
    .from(actionItems)
    .where((t) => eq(t.userId, userId) && eq(t.companyId, companyId));

  return items.map((item) => ({
    id: item.id,
    actionText: item.actionText,
    riskLevel: item.riskLevel,
    status: item.status,
    hasBoard: item.context ? JSON.parse(item.context as string).boardEscalation !== undefined : false,
  }));
}

/**
 * Format action item for Ask Board display
 */
export function formatActionForBoard(action: ActionItemWithBoard): string {
  return `
**Action:** ${action.actionText}
**Risk Level:** ${action.riskLevel.toUpperCase()}
**Options:**
- Recommended: ${action.options.recommended.text}
- Conservative: ${action.options.conservative.text}
- Aggressive: ${action.options.aggressive.text}

${action.boardFeedback ? `**Board Feedback:**\nAverage Confidence: ${action.boardFeedback.averageConfidence}%` : ""}
`;
}
