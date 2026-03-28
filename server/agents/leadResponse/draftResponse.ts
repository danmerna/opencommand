import { invokeLLM } from "../../_core/llm";
import { getLeadById, getInventoryById, createDraftResponse, updateLead, createInboxItem } from "../../db";
import { emitToUser } from "../../socketEmit";
import { checkGuardrails, logViolations } from "./guardrails";
import { LEAD_RESPONSE_SYSTEM_PROMPT, type DraftContent } from "./types";

export async function generateDraft(
  leadId: number,
  userId: number,
  companyId: number,
  agentId?: number,
): Promise<{ draftId: number; draft: DraftContent; guardrailsPassed: boolean; guardrailNotes: string }> {
  const lead = await getLeadById(leadId);
  if (!lead) throw new Error(`Lead ${leadId} not found`);

  // Fetch matched inventory if available
  const inventoryItem = lead.inventoryMatchId ? await getInventoryById(lead.inventoryMatchId) : undefined;

  // Build the user prompt with real data
  const userPrompt = buildPrompt(lead, inventoryItem);

  // Generate the draft via LLM
  let llmResult: Awaited<ReturnType<typeof invokeLLM>> | null = null;
  let parsed: { subject: string; body: string; dealBuilderLink: string | null };

  try {
    llmResult = await invokeLLM({
      messages: [
        { role: "system", content: LEAD_RESPONSE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "lead_response_draft",
          schema: {
            type: "object",
            properties: {
              subject: { type: "string" },
              body: { type: "string" },
              dealBuilderLink: { type: ["string", "null"] },
            },
            required: ["subject", "body", "dealBuilderLink"],
          },
        },
      },
    });

    const content = llmResult.choices[0]?.message?.content;
    const text = typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content.map(c => "text" in c ? c.text : "").join("")
        : "";

    parsed = JSON.parse(text);
  } catch (err) {
    console.error("[LeadResponse] LLM draft generation failed:", err);
    parsed = {
      subject: `Re: ${lead.equipmentInterest ?? "Your Equipment Inquiry"}`,
      body: "Thank you for your inquiry. A member of the Johnson Tractor Team will follow up with you shortly.",
      dealBuilderLink: inventoryItem?.dealBuilderUrl ?? null,
    };
  }

  const wordCount = parsed.body.split(/\s+/).filter(w => w.length > 0).length;
  const draft: DraftContent = {
    subject: parsed.subject,
    body: parsed.body,
    dealBuilderLink: parsed.dealBuilderLink ?? inventoryItem?.dealBuilderUrl ?? null,
    wordCount,
    confidenceScore: 0.85,
  };

  // Run guardrails
  const guardrailResult = checkGuardrails(draft.body, lead, inventoryItem);
  const allIssues = [...guardrailResult.violations, ...guardrailResult.warnings];
  const guardrailNotes = allIssues.length > 0
    ? allIssues.map(v => `[${v.severity}] ${v.ruleCode}: ${v.detail}`).join("\n")
    : "All guardrails passed";

  // Log any violations
  if (allIssues.length > 0) {
    await logViolations(allIssues, { userId, companyId, agentId, leadId });
  }

  // Save the draft
  const insertResult = await createDraftResponse({
    userId,
    companyId,
    leadId,
    agentId,
    channel: lead.contactEmail ? "email" : "sms",
    subject: draft.subject,
    body: draft.body,
    dealBuilderLink: draft.dealBuilderLink,
    wordCount: draft.wordCount,
    confidenceScore: String(draft.confidenceScore),
    guardrailsPassed: guardrailResult.passed,
    guardrailNotes,
    status: "pending_review",
    llmModel: llmResult?.model ?? "gemini-2.5-flash",
    llmCost: llmResult?.usage ? String(llmResult.usage.total_tokens * 0.00001) : "0",
    executionLog: [
      `${new Date().toISOString()} — Draft generated for lead #${leadId}`,
      `${new Date().toISOString()} — Guardrails: ${guardrailResult.passed ? "PASSED" : "BLOCKED"} (${guardrailResult.violations.length} violations, ${guardrailResult.warnings.length} warnings)`,
    ],
  });

  const draftId = Number((insertResult as any)[0]?.insertId ?? 0);

  // Update lead status
  await updateLead(leadId, { status: "draft_ready" });

  // Create inbox notification
  await createInboxItem({
    userId,
    companyId,
    agentId,
    type: "lead_response",
    title: `New lead response draft: ${lead.contactName ?? "Unknown"}`,
    body: `Draft response ready for ${lead.contactName ?? "a lead"} regarding ${lead.equipmentInterest ?? "equipment inquiry"}. ${guardrailResult.passed ? "All guardrails passed." : `${guardrailResult.violations.length} guardrail violation(s) detected.`}`,
    priority: guardrailResult.passed ? "medium" : "high",
  });

  // Emit real-time notification
  emitToUser(userId, "lead_response", "Draft Ready for Review", `Response drafted for ${lead.contactName ?? "new lead"} — ${lead.equipmentInterest ?? "equipment inquiry"}`, {
    leadId,
    draftId,
    guardrailsPassed: guardrailResult.passed,
  });

  // For L2+ agents: auto-approve if guardrails pass
  if (agentId && guardrailResult.passed) {
    try {
      const { autoApproveAndQueue } = await import("./executionWorker");
      const autoResult = await autoApproveAndQueue(draftId, agentId);
      if (autoResult.autoExecuted) {
        console.log(`[LeadResponse] Auto-approved draft #${draftId} for L2+ agent #${agentId}`);
      }
    } catch (err) {
      console.error("[LeadResponse] Auto-approve check failed:", err);
    }
  }

  return { draftId, draft, guardrailsPassed: guardrailResult.passed, guardrailNotes };
}

function buildPrompt(
  lead: NonNullable<Awaited<ReturnType<typeof getLeadById>>>,
  inventoryItem: Awaited<ReturnType<typeof getInventoryById>>,
): string {
  const parts: string[] = [];

  parts.push("Draft a response to this inbound equipment inquiry:\n");

  if (lead.contactName) parts.push(`Buyer Name: ${lead.contactName}`);
  if (lead.contactEmail) parts.push(`Buyer Email: ${lead.contactEmail}`);
  if (lead.contactLocation) parts.push(`Buyer Location: ${lead.contactLocation}`);
  if (lead.equipmentInterest) parts.push(`Equipment of Interest: ${lead.equipmentInterest}`);
  if (lead.sourceRaw) parts.push(`\nOriginal inquiry text:\n${lead.sourceRaw}`);

  if (inventoryItem) {
    parts.push("\n--- Matched Inventory Unit ---");
    if (inventoryItem.stockNumber) parts.push(`Stock #: ${inventoryItem.stockNumber}`);
    if (inventoryItem.year && inventoryItem.make && inventoryItem.model) {
      parts.push(`Unit: ${inventoryItem.year} ${inventoryItem.make} ${inventoryItem.model}`);
    }
    if (inventoryItem.location) parts.push(`Location: ${inventoryItem.location}`);
    if (inventoryItem.hours) parts.push(`Hours: ${inventoryItem.hours}`);
    if (inventoryItem.condition) parts.push(`Condition: ${inventoryItem.condition}`);
    if (inventoryItem.description) parts.push(`Description: ${inventoryItem.description}`);
    if (inventoryItem.dealBuilderUrl) {
      parts.push(`Magnetic AI DealBuilder Link: ${inventoryItem.dealBuilderUrl}`);
    }
  } else {
    parts.push("\nNo exact inventory match found. Acknowledge interest and offer to help find the right unit.");
  }

  parts.push("\nRespond as JSON with fields: subject, body, dealBuilderLink");

  return parts.join("\n");
}
