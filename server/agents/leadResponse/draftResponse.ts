import { getDb } from "../../db";
import { actionItems } from "../../../drizzle/schema";
import { invokeLLM } from "../../_core/llm";
import { eq } from "drizzle-orm";

/**
 * Lead response drafting using LLM
 * Generates personalized responses based on lead info and inventory
 */

export interface InventoryItem {
  id: string;
  type: string;
  model: string;
  year?: number;
  price: number;
  condition: "excellent" | "good" | "fair";
  location: string;
  imageUrl?: string;
}

export interface DraftedResponse {
  subject: string;
  body: string;
  htmlBody: string;
  quoteLink?: string;
  estimatedConversionRate?: number;
}

/**
 * Draft a personalized response to a lead
 * Matches inventory and generates compelling copy
 */
export async function draftLeadResponse(
  actionItemId: number,
  inventory: InventoryItem[],
  dealerName: string,
  dealerPhone?: string
): Promise<DraftedResponse> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // Get the action item with lead context
  const existing = await db
    .select()
    .from(actionItems)
    .where(eq(actionItems.id, actionItemId))
    .limit(1);

  const action = existing[0];
  if (!action) throw new Error("Action item not found");

  const context = typeof action.context === "string" ? JSON.parse(action.context) : action.context;

  // Find best matching inventory
  const matchedInventory = inventory
    .filter((item) => {
      if (context.equipment?.type && !item.type.toLowerCase().includes(context.equipment.type.toLowerCase())) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Prioritize by condition and price match
      const conditionScore = { excellent: 3, good: 2, fair: 1 };
      return (conditionScore[b.condition] || 0) - (conditionScore[a.condition] || 0);
    })
    .slice(0, 3);

  // Generate response using LLM
  const systemPrompt = `You are a professional sales representative for ${dealerName}, a dealer of heavy equipment and machinery.
Your job is to respond to customer inquiries with personalized, compelling responses that highlight matching inventory and build trust.

Generate professional, friendly email responses that:
1. Address the buyer by name
2. Thank them for their inquiry
3. Highlight 1-3 matching inventory items with specific details
4. Include a clear call-to-action (CTA)
5. Keep tone professional but approachable
6. Mention urgency if the lead is high-priority

Format your response as JSON with fields: subject, body, estimatedConversionRate (0-100)`;

  const userPrompt = `Customer Inquiry:
Name: ${context.buyer?.name || "Valued Customer"}
Email: ${context.buyer?.email}
Phone: ${context.buyer?.phone}
Looking for: ${context.equipment?.type || "Equipment"}
Model/Year: ${context.equipment?.model || "Not specified"}
Budget: ${context.equipment?.desiredPrice || "Not specified"}
Location: ${context.location || "Not specified"}
Urgency: ${context.urgency}
Lead Source: ${context.leadSource}

Available Matching Inventory:
${matchedInventory
  .map(
    (item) => `
- ${item.year ? item.year + " " : ""}${item.model}
  Type: ${item.type}
  Price: $${item.price.toLocaleString()}
  Condition: ${item.condition}
  Location: ${item.location}
`
  )
  .join("")}

Dealer Contact: ${dealerName}
${dealerPhone ? `Phone: ${dealerPhone}` : ""}

Generate a professional sales email response that addresses the customer's needs and highlights the matching inventory.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lead_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              subject: {
                type: "string",
                description: "Email subject line",
              },
              body: {
                type: "string",
                description: "Plain text email body",
              },
              estimatedConversionRate: {
                type: "number",
                description: "Estimated conversion rate 0-100",
              },
            },
            required: ["subject", "body", "estimatedConversionRate"],
          },
        },
      },
    });

    const contentStr = response.choices[0]?.message?.content;
    if (!contentStr || typeof contentStr !== "string") {
      throw new Error("Invalid LLM response format");
    }

    const draftData = JSON.parse(contentStr);

    // Convert plain text to HTML
    const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${draftData.subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    ${draftData.body
      .split("\n\n")
      .map((para: string) => `<p style="margin: 0 0 16px 0;">${para.replace(/\n/g, "<br>")}</p>`)
      .join("")}
  </div>
</body>
</html>`;

    return {
      subject: draftData.subject,
      body: draftData.body,
      htmlBody,
      estimatedConversionRate: draftData.estimatedConversionRate,
    };
  } catch (error) {
    console.error("[Lead Response] Draft failed:", error);
    throw error;
  }
}

/**
 * Generate multiple variants of a response (for regeneration)
 */
export async function generateResponseVariants(
  actionItemId: number,
  inventory: InventoryItem[],
  dealerName: string,
  dealerPhone?: string,
  count: number = 2
): Promise<DraftedResponse[]> {
  const variants: DraftedResponse[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const variant = await draftLeadResponse(actionItemId, inventory, dealerName, dealerPhone);
      variants.push(variant);
    } catch (error) {
      console.error(`[Lead Response] Failed to generate variant ${i + 1}:`, error);
    }
  }

  return variants;
}
