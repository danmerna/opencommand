import type { InventoryItem, Lead } from "../../../drizzle/schema";
import { createGuardrailViolation } from "../../db";
import { GUARDRAIL_RULES, type GuardrailResult, type GuardrailViolationDetail } from "./types";

// Match specific price commitments but NOT "pricing details for you" (recommended language)
const PRICE_PATTERNS = /\$[\d,]+|\bpric(?:e|ed|ing)\s+(?:at|is|of)\s+\$?\d|\bquote\s+(?:of|at|is)\s+\$?\d|\boffer(?:ing)?\s+\$|\bwe(?:'ll| will)\s+(?:do|sell|let\s+it\s+go)\s+(?:for|at)\s+\$?\d/i;
const PERSON_SIGN_PATTERNS = /(?:^|\n)\s*(?:best|regards|sincerely|thanks|cheers),?\s*\n\s*[A-Z][a-z]+ [A-Z][a-z]+/m;

export function checkGuardrails(
  body: string,
  lead: Lead,
  inventoryItem: InventoryItem | undefined,
): GuardrailResult {
  const violations: GuardrailViolationDetail[] = [];
  const warnings: GuardrailViolationDetail[] = [];

  // NO_PRICE_COMMIT: check for dollar amounts or price commitment language
  if (PRICE_PATTERNS.test(body)) {
    violations.push({
      ruleCode: "NO_PRICE_COMMIT",
      ruleDescription: GUARDRAIL_RULES.NO_PRICE_COMMIT,
      severity: "block",
      detail: "Draft contains price commitment language or specific dollar amounts",
    });
  }

  // NO_IMPERSONATION: must not sign with a personal name
  if (PERSON_SIGN_PATTERNS.test(body)) {
    violations.push({
      ruleCode: "NO_IMPERSONATION",
      ruleDescription: GUARDRAIL_RULES.NO_IMPERSONATION,
      severity: "block",
      detail: "Draft appears to be signed with a personal name instead of 'Johnson Tractor Team'",
    });
  }

  // SIGN_AS_TEAM: must include team signature
  if (!body.toLowerCase().includes("johnson tractor team")) {
    warnings.push({
      ruleCode: "SIGN_AS_TEAM",
      ruleDescription: GUARDRAIL_RULES.SIGN_AS_TEAM,
      severity: "warning",
      detail: "Draft does not contain 'Johnson Tractor Team' signature",
    });
  }

  // MAX_WORD_COUNT: under 150 words
  const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount > 150) {
    warnings.push({
      ruleCode: "MAX_WORD_COUNT",
      ruleDescription: GUARDRAIL_RULES.MAX_WORD_COUNT,
      severity: "warning",
      detail: `Draft is ${wordCount} words (limit: 150)`,
    });
  }

  // MUST_INCLUDE_DEALBUILDER: if inventory has a DealBuilder URL, it should be in the body
  if (inventoryItem?.dealBuilderUrl && !body.includes(inventoryItem.dealBuilderUrl)) {
    warnings.push({
      ruleCode: "MUST_INCLUDE_DEALBUILDER",
      ruleDescription: GUARDRAIL_RULES.MUST_INCLUDE_DEALBUILDER,
      severity: "warning",
      detail: "Draft does not include the Magnetic AI DealBuilder link from the matched inventory item",
    });
  }

  // MAX_FOLLOW_UPS: check if lead already at max
  if (lead.followUpCount >= lead.maxFollowUps) {
    violations.push({
      ruleCode: "MAX_FOLLOW_UPS",
      ruleDescription: GUARDRAIL_RULES.MAX_FOLLOW_UPS,
      severity: "block",
      detail: `Lead has reached maximum follow-ups (${lead.followUpCount}/${lead.maxFollowUps})`,
    });
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
  };
}

export async function logViolations(
  violations: GuardrailViolationDetail[],
  context: { userId: number; companyId?: number; agentId?: number; leadId?: number; draftId?: number },
) {
  for (const v of violations) {
    await createGuardrailViolation({
      userId: context.userId,
      companyId: context.companyId,
      agentId: context.agentId,
      leadId: context.leadId,
      draftId: context.draftId,
      ruleCode: v.ruleCode,
      ruleDescription: v.ruleDescription,
      severity: v.severity,
      violationDetail: v.detail,
    });
  }
}
