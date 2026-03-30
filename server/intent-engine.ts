import { getDb } from "./db";
import { actionItems } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { eq, and } from "drizzle-orm";

export interface ActionOption {
  title: string;
  description: string;
  dataPoints: string[];
  riskLevel: "low" | "medium" | "high";
  canRegenerate: boolean;
  currentVariant?: number;
  variants?: Array<{
    title: string;
    description: string;
    dataPoints: string[];
  }>;
}

export interface ActionItemData {
  title: string;
  description: string;
  boardQuestion: string;
  options: {
    recommended: ActionOption;
    conservative: ActionOption;
    aggressive: ActionOption;
  };
}

/**
 * Generate action items for an agent based on context and intent
 */
export async function generateActionItems(
  agentId: string,
  userId: string,
  context: Record<string, any>,
  intent: string
): Promise<ActionItemData[]> {
  const systemPrompt = `You are an AI system that generates ranked action items for business operations.
Your job is to understand the user's intent and surface 4 high-impact moves they should consider.

For each action item, provide three options:
1. Recommended: A balanced, data-backed approach
2. Conservative: Lower risk, lower upside, easier to approve
3. Aggressive: Higher upside, more exposure, needs conviction

Format your response as a JSON array with this structure:
[
  {
    "title": "Action title",
    "description": "One-line summary",
    "boardQuestion": "Strategic question to escalate to board",
    "options": {
      "recommended": {
        "title": "Recommended",
        "description": "Balanced approach",
        "dataPoints": ["point1", "point2"],
        "riskLevel": "medium"
      },
      "conservative": {
        "title": "Conservative Alternative",
        "description": "Lower risk approach",
        "dataPoints": ["point1", "point2"],
        "riskLevel": "low"
      },
      "aggressive": {
        "title": "Aggressive Alternative",
        "description": "Higher upside approach",
        "dataPoints": ["point1", "point2"],
        "riskLevel": "high"
      }
    }
  }
]

Generate exactly 4 action items. Each option should have 2-3 data points that justify the recommendation.`;

  const userPrompt = `User's Intent: ${intent}

Business Context:
${JSON.stringify(context, null, 2)}

Generate 4 ranked action items with three options each (Recommended, Conservative, Aggressive).
Focus on moves that directly support the stated intent.
Include specific data points from the context to justify each recommendation.`;

  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "action_items",
          strict: true,
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                boardQuestion: { type: "string" },
                options: {
                  type: "object",
                  properties: {
                    recommended: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        dataPoints: { type: "array", items: { type: "string" } },
                        riskLevel: { type: "string", enum: ["low", "medium", "high"] },
                      },
                      required: ["title", "description", "dataPoints", "riskLevel"],
                    },
                    conservative: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        dataPoints: { type: "array", items: { type: "string" } },
                        riskLevel: { type: "string", enum: ["low", "medium", "high"] },
                      },
                      required: ["title", "description", "dataPoints", "riskLevel"],
                    },
                    aggressive: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        dataPoints: { type: "array", items: { type: "string" } },
                        riskLevel: { type: "string", enum: ["low", "medium", "high"] },
                      },
                      required: ["title", "description", "dataPoints", "riskLevel"],
                    },
                  },
                  required: ["recommended", "conservative", "aggressive"],
                },
              },
              required: ["title", "description", "boardQuestion", "options"],
            },
          },
        },
      },
    });

    const contentStr = response.choices[0]?.message?.content;
    if (!contentStr || typeof contentStr !== "string") {
      throw new Error("Invalid LLM response format");
    }

    const items: ActionItemData[] = JSON.parse(contentStr);

    // Store in database
    for (const item of items) {
      await db.insert(actionItems).values({
        userId: Number(userId),
        agentId: Number(agentId),
        actionText: item.title,
        context: JSON.stringify(context),
        options: item.options as any,
        status: "pending",
      });
    }

    return items;
  } catch (error) {
    console.error("[Intent Engine] Error generating actions:", error);
    throw error;
  }
}

/**
 * Approve an action item with a specific option
 */
export async function approveAction(
  actionItemId: string,
  option: "recommended" | "conservative" | "aggressive"
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db
    .update(actionItems)
    .set({
      selectedOption: option,
      status: "approved",
      updatedAt: new Date(),
    })
    .where(eq(actionItems.id, Number(actionItemId)));
}

/**
 * Dismiss an action item
 */
export async function dismissAction(actionItemId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db
    .update(actionItems)
    .set({
      status: "dismissed",
      updatedAt: new Date(),
    })
    .where(eq(actionItems.id, Number(actionItemId)));
}

/**
 * Regenerate variant for Conservative or Aggressive option
 */
export async function regenerateVariant(
  actionItemId: string,
  optionType: "conservative" | "aggressive"
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const existing = await db
    .select()
    .from(actionItems)
    .where(eq(actionItems.id, Number(actionItemId)))
    .limit(1);

  const action = existing[0];
  if (!action) throw new Error("Action item not found");

  const options = action.options as any;
  const option = options[optionType];

  if (!option) {
    throw new Error(`Option ${optionType} not found`);
  }

  // Cycle to next variant
  const currentVariant = option.currentVariant || 1;
  const nextVariant = currentVariant === 1 ? 2 : 1;

  options[optionType].currentVariant = nextVariant;

  await db
    .update(actionItems)
    .set({
      options,
      updatedAt: new Date(),
    })
    .where(eq(actionItems.id, Number(actionItemId)));
}

/**
 * Get pending action items for a user
 */
export async function getPendingActions(userId: string): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select()
    .from(actionItems)
    .where(
      and(
        eq(actionItems.userId, Number(userId)),
        eq(actionItems.status, "pending")
      )
    );
}

/**
 * Get completed action items for a user
 */
export async function getCompletedActions(userId: string): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select()
    .from(actionItems)
    .where(
      and(
        eq(actionItems.userId, Number(userId)),
        eq(actionItems.status, "approved")
      )
    );
}

/**
 * Get all action items for a user
 */
export async function getAllActions(userId: string): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select()
    .from(actionItems)
    .where(eq(actionItems.userId, Number(userId)));
}
