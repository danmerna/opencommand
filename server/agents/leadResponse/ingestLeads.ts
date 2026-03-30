import { getDb } from "../../db";
import { tasks, actionItems } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Lead ingestion from TractorHouse email notifications
 * Parses incoming lead emails and creates action items for the Lead Response Agent
 */

export interface TractorHouseLead {
  messageId: string;
  from: string;
  subject: string;
  body: string;
  htmlBody?: string;
  timestamp: Date;
  dealerSlug: string;
  companyId: number;
  userId: number;
}

export interface ParsedLead {
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  equipmentType?: string;
  equipmentModel?: string;
  desiredPrice?: string;
  location?: string;
  urgency?: "high" | "medium" | "low";
  source: "tractorhouse" | "machinery_trader";
  rawText: string;
}

/**
 * Parse TractorHouse email to extract lead information
 */
export function parseTractorHouseEmail(email: {
  from: string;
  subject: string;
  body: string;
}): ParsedLead {
  const { subject, body } = email;

  // Extract buyer info from subject and body
  const nameMatch = body.match(/(?:Name|Buyer|Contact):\s*([^\n]+)/i);
  const emailMatch = body.match(/(?:Email|Contact Email):\s*([^\n]+@[^\n]+)/i);
  const phoneMatch = body.match(/(?:Phone|Contact Phone):\s*(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/i);

  // Extract equipment info
  const equipmentMatch = body.match(/(?:Equipment|Item|Looking for):\s*([^\n]+)/i);
  const modelMatch = body.match(/(?:Model|Year):\s*([^\n]+)/i);
  const priceMatch = body.match(/(?:Price|Budget):\s*\$?([\d,]+)/i);

  // Extract location
  const locationMatch = body.match(/(?:Location|Area|State):\s*([^\n]+)/i);

  // Determine urgency from keywords
  let urgency: "high" | "medium" | "low" = "medium";
  if (/urgent|asap|immediately|today|this week/i.test(body)) {
    urgency = "high";
  } else if (/flexible|no rush|whenever/i.test(body)) {
    urgency = "low";
  }

  return {
    buyerName: nameMatch?.[1]?.trim(),
    buyerEmail: emailMatch?.[1]?.trim(),
    buyerPhone: phoneMatch?.[1]?.trim(),
    equipmentType: equipmentMatch?.[1]?.trim(),
    equipmentModel: modelMatch?.[1]?.trim(),
    desiredPrice: priceMatch?.[1]?.trim(),
    location: locationMatch?.[1]?.trim(),
    urgency,
    source: subject.toLowerCase().includes("machinery") ? "machinery_trader" : "tractorhouse",
    rawText: body,
  };
}

/**
 * Ingest a lead from TractorHouse email
 * Creates an action item for the Lead Response Agent to draft a response
 */
export async function ingestLead(lead: TractorHouseLead): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // Parse the email
  const parsed = parseTractorHouseEmail({
    from: lead.from,
    subject: lead.subject,
    body: lead.body,
  });

  // Create action item for Lead Response Agent
  const result = await db.insert(actionItems).values([
    {
      userId: lead.userId,
    companyId: lead.companyId,
    agentId: 0, // Will be set to Lead Response Agent ID
      actionText: `Respond to lead: ${parsed.buyerName || "Unknown"} - ${parsed.equipmentType || "Equipment inquiry"}`,
      context: JSON.stringify({
      leadSource: parsed.source,
      messageId: lead.messageId,
      buyer: {
        name: parsed.buyerName,
        email: parsed.buyerEmail,
        phone: parsed.buyerPhone,
      },
      equipment: {
        type: parsed.equipmentType,
        model: parsed.equipmentModel,
        desiredPrice: parsed.desiredPrice,
      },
      location: parsed.location,
      urgency: parsed.urgency,
      receivedAt: lead.timestamp.toISOString(),
      dealerSlug: lead.dealerSlug,
    }),
      riskLevel: parsed.urgency === "high" ? "high" : "medium",
      options: {
        recommended: {
          text: "Personalized response with inventory match and interactive quote",
          reasoning: "Highest conversion rate with trackable quote link",
        },
        conservative: {
          text: "Brief acknowledgment with general inventory list",
          reasoning: "Lower effort, still maintains lead engagement",
        },
        aggressive: {
          text: "Immediate phone call + email with premium quote",
          reasoning: "Highest urgency response, best for high-priority leads",
        },
      },
      status: "pending",
    },
  ] as any);

  const actionId = (result as any).insertId || (result as any)[0]?.id;
  if (!actionId) throw new Error("Failed to create action item");

  console.log(`[Lead Response] Ingested lead from ${parsed.source}: ${actionId}`);
  return actionId;
}

/**
 * Batch ingest multiple leads
 */
export async function ingestLeadsBatch(leads: TractorHouseLead[]): Promise<number[]> {
  const ids: number[] = [];
  for (const lead of leads) {
    try {
      const id = await ingestLead(lead);
      ids.push(id);
    } catch (error) {
      console.error(`[Lead Response] Failed to ingest lead:`, error);
    }
  }
  return ids;
}

/**
 * Get pending leads for a dealer
 */
export async function getPendingLeads(userId: number, companyId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  return db
    .select()
    .from(actionItems)
    .where(
      eq(actionItems.userId, userId) &&
        eq(actionItems.companyId, companyId) &&
        eq(actionItems.status, "pending")
    );
}
