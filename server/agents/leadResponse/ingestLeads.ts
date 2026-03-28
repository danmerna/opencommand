import { invokeLLM } from "../../_core/llm";
import { createLead, searchInventory } from "../../db";
import { LEAD_PARSE_SYSTEM_PROMPT, type ParsedLead, type InventoryMatch } from "./types";

export async function ingestLead(
  rawText: string,
  userId: number,
  companyId: number,
  source: "tractorhouse" | "website" | "phone" | "walkin" | "email" | "manual" = "tractorhouse",
  agentId?: number,
): Promise<{ leadId: number; inventoryMatch: InventoryMatch | null }> {
  // Step 1: Parse the raw lead text via LLM
  const parsed = await parseLead(rawText);

  // Step 2: Match against inventory if we have an equipment interest
  let inventoryMatch: InventoryMatch | null = null;
  if (parsed.equipmentInterest) {
    inventoryMatch = await matchInventory(companyId, parsed.equipmentInterest);
  }

  // Step 3: Create the lead record
  const result = await createLead({
    userId,
    companyId,
    agentId,
    source,
    sourceRaw: rawText,
    contactName: parsed.contactName,
    contactEmail: parsed.contactEmail,
    contactPhone: parsed.contactPhone,
    contactLocation: parsed.contactLocation,
    equipmentInterest: parsed.equipmentInterest,
    inventoryMatchId: inventoryMatch?.inventoryId,
    confidenceScore: String(parsed.confidenceScore),
    status: "new",
    receivedAt: new Date(),
  });

  // Extract the inserted ID
  const leadId = (result as any)[0]?.insertId ?? (result as any).insertId ?? 0;

  return { leadId, inventoryMatch };
}

async function parseLead(rawText: string): Promise<ParsedLead> {
  const result = await invokeLLM({
    messages: [
      { role: "system", content: LEAD_PARSE_SYSTEM_PROMPT },
      { role: "user", content: rawText },
    ],
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "parsed_lead",
        schema: {
          type: "object",
          properties: {
            contactName: { type: ["string", "null"] },
            contactEmail: { type: ["string", "null"] },
            contactPhone: { type: ["string", "null"] },
            contactLocation: { type: ["string", "null"] },
            equipmentInterest: { type: ["string", "null"] },
            confidenceScore: { type: "number" },
          },
          required: ["contactName", "contactEmail", "contactPhone", "contactLocation", "equipmentInterest", "confidenceScore"],
        },
      },
    },
  });

  const content = result.choices[0]?.message?.content;
  const text = typeof content === "string" ? content : Array.isArray(content) ? content.map(c => "text" in c ? c.text : "").join("") : "";

  try {
    const data = JSON.parse(text);
    return {
      contactName: data.contactName ?? null,
      contactEmail: data.contactEmail ?? null,
      contactPhone: data.contactPhone ?? null,
      contactLocation: data.contactLocation ?? null,
      equipmentInterest: data.equipmentInterest ?? null,
      source: "tractorhouse",
      rawText,
      confidenceScore: typeof data.confidenceScore === "number" ? data.confidenceScore : 0.5,
    };
  } catch {
    return {
      contactName: null,
      contactEmail: null,
      contactPhone: null,
      contactLocation: null,
      equipmentInterest: null,
      source: "tractorhouse",
      rawText,
      confidenceScore: 0,
    };
  }
}

async function matchInventory(companyId: number, equipmentInterest: string): Promise<InventoryMatch | null> {
  const results = await searchInventory(companyId, equipmentInterest);
  if (results.length === 0) return null;

  // Return the first match (best match from the LIKE query)
  const item = results[0];
  return {
    inventoryId: item.id,
    stockNumber: item.stockNumber,
    make: item.make,
    model: item.model,
    year: item.year,
    price: item.price,
    location: item.location,
    dealBuilderUrl: item.dealBuilderUrl,
    matchScore: 80, // Simple heuristic — first LIKE result
  };
}
