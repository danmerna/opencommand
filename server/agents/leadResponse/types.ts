export interface ParsedLead {
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactLocation: string | null;
  equipmentInterest: string | null;
  source: "tractorhouse" | "website" | "email" | "manual";
  rawText: string;
  confidenceScore: number;
}

export interface InventoryMatch {
  inventoryId: number;
  stockNumber: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  price: string | null;
  location: string | null;
  dealBuilderUrl: string | null;
  matchScore: number;
}

export interface DraftContent {
  subject: string;
  body: string;
  dealBuilderLink: string | null;
  wordCount: number;
  confidenceScore: number;
}

export interface GuardrailResult {
  passed: boolean;
  violations: GuardrailViolationDetail[];
  warnings: GuardrailViolationDetail[];
}

export interface GuardrailViolationDetail {
  ruleCode: string;
  ruleDescription: string;
  severity: "warning" | "block";
  detail: string;
}

export const GUARDRAIL_RULES = {
  NO_PRICE_COMMIT: "No price commitments without CFO approval",
  NO_IMPERSONATION: "Cannot impersonate human sales staff",
  NO_INVENTORY_FABRICATION: "Cannot reference inventory not in the system",
  SIGN_AS_TEAM: "Must sign as 'Johnson Tractor Team'",
  MAX_WORD_COUNT: "Response must be under 150 words",
  MAX_FOLLOW_UPS: "Maximum 3 follow-ups per lead",
  MUST_INCLUDE_DEALBUILDER: "Must include Magnetic AI DealBuilder link when inventory matched",
} as const;

export const LEAD_RESPONSE_SYSTEM_PROMPT = `You are a Lead Response Agent for Johnson Tractor, a Case IH dealership group.
You draft professional, warm, specific responses to inbound equipment inquiries.

Rules:
- Reference the specific unit they asked about with real specs
- Include the Magnetic AI DealBuilder link for an interactive quote
- Keep it under 150 words
- Be helpful, not salesy
- Never make price commitments — say "I can put together pricing details for you"
- Never impersonate a human sales rep — sign as "Johnson Tractor Team"
- If they asked a specific question (header situation, availability, financing), answer it directly
- Include the relevant location name and contact info`;

export const LEAD_PARSE_SYSTEM_PROMPT = `You are a lead parsing assistant. Extract structured contact and equipment information from inbound lead notification emails (typically from TractorHouse or MachineryTrader).

Extract these fields:
- contactName: the prospective buyer's full name
- contactEmail: their email address
- contactPhone: their phone number
- contactLocation: their city/state or region
- equipmentInterest: the specific equipment they are asking about (e.g. "2023 Case IH 8250 Combine")

If a field is not present in the text, return null for that field.
Also return a confidenceScore from 0 to 1 indicating how confident you are in the extraction.`;
