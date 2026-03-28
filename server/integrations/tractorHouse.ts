/**
 * TractorHouse Email Parser
 *
 * Parses inbound TractorHouse lead notification emails and extracts:
 * 1. Buyer contact information (name, email, phone, location)
 * 2. Equipment interest
 * 3. Competitive pricing data from TractorHouse listings
 *
 * Uses LLM for robust extraction from messy email bodies,
 * with regex fallbacks for common patterns.
 */

import { invokeLLM } from "../_core/llm";
import type { TractorHouseLeadEmail, TractorHouseCompetitorListing } from "./types";

const TRACTORHOUSE_LEAD_PARSE_PROMPT = `You are a data extraction engine for a heavy equipment dealership.
Parse the following TractorHouse lead notification email and extract buyer information.

Return JSON with these fields:
- contactName: buyer's full name (string or null)
- contactEmail: buyer's email address (string or null)
- contactPhone: buyer's phone number (string or null)
- contactLocation: buyer's city/state or zip code (string or null)
- equipmentInterest: what equipment they're asking about (string or null)

Be precise. Only extract information that is clearly present in the email.`;

const TRACTORHOUSE_COMPETITOR_PARSE_PROMPT = `You are a competitive intelligence extraction engine for a heavy equipment dealership.
Parse the following TractorHouse listing page content or email digest and extract competitor pricing data.

Return a JSON array where each element has:
- make: equipment manufacturer (string or null)
- model: equipment model (string or null)
- year: model year (number or null)
- condition: "new" or "used"
- askingPrice: listed price in dollars (number or null, no formatting)
- dealerName: competing dealer's name (string or null)
- dealerLocation: dealer's location (string or null)
- listingUrl: URL of the listing if present (string or null)
- hours: meter hours if listed (number or null)

Extract ALL listings found in the content. Be precise with prices — convert "$45,000" to 45000.`;

/**
 * Parse a TractorHouse lead notification email body.
 * Uses LLM with regex fallback.
 */
export async function parseTractorHouseLeadEmail(
  emailBody: string,
): Promise<TractorHouseLeadEmail> {
  // Try LLM extraction first
  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: TRACTORHOUSE_LEAD_PARSE_PROMPT },
        { role: "user", content: emailBody },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "tractorhouse_lead",
          schema: {
            type: "object",
            properties: {
              contactName: { type: ["string", "null"] },
              contactEmail: { type: ["string", "null"] },
              contactPhone: { type: ["string", "null"] },
              contactLocation: { type: ["string", "null"] },
              equipmentInterest: { type: ["string", "null"] },
            },
            required: ["contactName", "contactEmail", "contactPhone", "contactLocation", "equipmentInterest"],
          },
        },
      },
    });

    const content = result.choices[0]?.message?.content;
    const text = typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content.map(c => "text" in c ? c.text : "").join("")
        : "";

    const data = JSON.parse(text);
    return {
      contactName: data.contactName ?? null,
      contactEmail: data.contactEmail ?? null,
      contactPhone: data.contactPhone ?? null,
      contactLocation: data.contactLocation ?? null,
      equipmentInterest: data.equipmentInterest ?? null,
      rawBody: emailBody,
    };
  } catch (err) {
    console.error("[TractorHouse] LLM lead parse failed, using regex fallback:", err);
    return regexParseLead(emailBody);
  }
}

/**
 * Parse competitive pricing data from TractorHouse listing content.
 */
export async function parseTractorHouseCompetitorData(
  content: string,
): Promise<TractorHouseCompetitorListing[]> {
  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: TRACTORHOUSE_COMPETITOR_PARSE_PROMPT },
        { role: "user", content },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "competitor_listings",
          schema: {
            type: "object",
            properties: {
              listings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    make: { type: ["string", "null"] },
                    model: { type: ["string", "null"] },
                    year: { type: ["number", "null"] },
                    condition: { type: "string" },
                    askingPrice: { type: ["number", "null"] },
                    dealerName: { type: ["string", "null"] },
                    dealerLocation: { type: ["string", "null"] },
                    listingUrl: { type: ["string", "null"] },
                    hours: { type: ["number", "null"] },
                  },
                  required: ["make", "model", "year", "condition", "askingPrice", "dealerName", "dealerLocation", "listingUrl", "hours"],
                },
              },
            },
            required: ["listings"],
          },
        },
      },
    });

    const text = typeof result.choices[0]?.message?.content === "string"
      ? result.choices[0].message.content
      : Array.isArray(result.choices[0]?.message?.content)
        ? result.choices[0].message.content.map((c: any) => "text" in c ? c.text : "").join("")
        : "";

    const data = JSON.parse(text);
    return (data.listings ?? []).map((l: any) => ({
      make: l.make ?? null,
      model: l.model ?? null,
      year: l.year ?? null,
      condition: l.condition === "new" ? "new" as const : "used" as const,
      askingPrice: l.askingPrice ?? null,
      dealerName: l.dealerName ?? null,
      dealerLocation: l.dealerLocation ?? null,
      listingUrl: l.listingUrl ?? null,
      hours: l.hours ?? null,
    }));
  } catch (err) {
    console.error("[TractorHouse] LLM competitor parse failed:", err);
    return [];
  }
}

/**
 * Regex fallback for parsing TractorHouse lead emails.
 * Handles the most common TractorHouse email formats.
 */
function regexParseLead(emailBody: string): TractorHouseLeadEmail {
  const emailMatch = emailBody.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  const phoneMatch = emailBody.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

  // Common TractorHouse patterns: "Name: John Smith" or "From: John Smith"
  const namePatterns = [
    /(?:name|from|buyer|contact)\s*:\s*(.+)/i,
    /(?:^|\n)([A-Z][a-z]+ [A-Z][a-z]+)(?:\s+(?:is interested|wants|would like|inquired))/m,
  ];
  let contactName: string | null = null;
  for (const pat of namePatterns) {
    const m = emailBody.match(pat);
    if (m) { contactName = m[1].trim(); break; }
  }

  // Location patterns
  const locationPatterns = [
    /(?:location|city|from|area)\s*:\s*(.+)/i,
    /(\w+,\s*[A-Z]{2}\s*\d{5})/,
    /(\w+,\s*[A-Z]{2})\b/,
  ];
  let contactLocation: string | null = null;
  for (const pat of locationPatterns) {
    const m = emailBody.match(pat);
    if (m) { contactLocation = m[1].trim(); break; }
  }

  // Equipment interest patterns
  const equipmentPatterns = [
    /(?:interested in|looking for|inquir(?:y|ing) (?:about|on)|regarding|re:)\s*(.+)/i,
    /(?:equipment|unit|machine)\s*:\s*(.+)/i,
  ];
  let equipmentInterest: string | null = null;
  for (const pat of equipmentPatterns) {
    const m = emailBody.match(pat);
    if (m) { equipmentInterest = m[1].trim().substring(0, 200); break; }
  }

  return {
    contactName,
    contactEmail: emailMatch?.[0] ?? null,
    contactPhone: phoneMatch?.[0] ?? null,
    contactLocation,
    equipmentInterest,
    rawBody: emailBody,
  };
}
