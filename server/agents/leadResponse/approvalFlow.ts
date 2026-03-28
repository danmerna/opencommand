import {
  getDraftById, updateDraftResponse, updateLead, getLeadById,
  createExecutionQueueItem, createAuditLogEntry,
  getDraftsByLeadId,
} from "../../db";
import { checkGuardrails, logViolations } from "./guardrails";
import { getInventoryById } from "../../db";

export async function approveDraft(
  draftId: number,
  userId: number,
): Promise<{ success: boolean; executionQueueId?: number; error?: string }> {
  const draft = await getDraftById(draftId);
  if (!draft) return { success: false, error: "Draft not found" };
  if (draft.status !== "pending_review") return { success: false, error: `Draft is ${draft.status}, not pending_review` };

  const lead = await getLeadById(draft.leadId);
  if (!lead) return { success: false, error: "Associated lead not found" };

  // Update draft status
  await updateDraftResponse(draftId, {
    status: "approved",
    approvedAt: new Date(),
    approvedBy: userId,
    executionLog: [
      ...(draft.executionLog ?? []),
      `${new Date().toISOString()} — Approved by user #${userId}`,
    ],
  });

  // Update lead status
  await updateLead(draft.leadId, { status: "approved" });

  // Queue for execution
  const recipientAddress = lead.contactEmail ?? lead.contactPhone ?? "";
  const channel = lead.contactEmail ? "email" as const : "sms" as const;

  const queueResult = await createExecutionQueueItem({
    userId: draft.userId,
    companyId: draft.companyId,
    draftId,
    leadId: draft.leadId,
    channel,
    recipientAddress,
    status: "queued",
  });

  const executionQueueId = (queueResult as any)[0]?.insertId ?? (queueResult as any).insertId ?? 0;

  // Audit log
  await createAuditLogEntry({
    companyId: draft.companyId,
    userId,
    agentId: draft.agentId,
    action: "LEAD_RESPONSE_APPROVED",
    entityType: "draft_response",
    entityId: draftId,
    details: `Approved draft for lead #${draft.leadId} (${lead.contactName ?? "unknown"})`,
  });

  return { success: true, executionQueueId };
}

export async function modifyDraft(
  draftId: number,
  userId: number,
  newBody: string,
): Promise<{ success: boolean; guardrailsPassed: boolean; error?: string }> {
  const draft = await getDraftById(draftId);
  if (!draft) return { success: false, guardrailsPassed: false, error: "Draft not found" };

  const lead = await getLeadById(draft.leadId);
  if (!lead) return { success: false, guardrailsPassed: false, error: "Associated lead not found" };

  const inventoryItem = lead.inventoryMatchId ? await getInventoryById(lead.inventoryMatchId) : undefined;

  // Re-run guardrails on modified text
  const guardrailResult = checkGuardrails(newBody, lead, inventoryItem);
  const allIssues = [...guardrailResult.violations, ...guardrailResult.warnings];

  if (allIssues.length > 0) {
    await logViolations(allIssues, { userId, companyId: draft.companyId ?? undefined, agentId: draft.agentId ?? undefined, leadId: draft.leadId, draftId });
  }

  const guardrailNotes = allIssues.length > 0
    ? allIssues.map(v => `[${v.severity}] ${v.ruleCode}: ${v.detail}`).join("\n")
    : "All guardrails passed";

  // Update draft with modification
  await updateDraftResponse(draftId, {
    modifiedBody: newBody,
    guardrailsPassed: guardrailResult.passed,
    guardrailNotes,
    wordCount: newBody.split(/\s+/).filter(w => w.length > 0).length,
    status: "modified",
    approvedAt: new Date(),
    approvedBy: userId,
    executionLog: [
      ...(draft.executionLog ?? []),
      `${new Date().toISOString()} — Modified and approved by user #${userId}`,
      `${new Date().toISOString()} — Guardrails re-check: ${guardrailResult.passed ? "PASSED" : "BLOCKED"}`,
    ],
  });

  // If guardrails pass, also queue for execution
  if (guardrailResult.passed) {
    await updateLead(draft.leadId, { status: "approved" });
    const recipientAddress = lead.contactEmail ?? lead.contactPhone ?? "";
    const channel = lead.contactEmail ? "email" as const : "sms" as const;
    await createExecutionQueueItem({
      userId: draft.userId,
      companyId: draft.companyId,
      draftId,
      leadId: draft.leadId,
      channel,
      recipientAddress,
      status: "queued",
    });
  }

  await createAuditLogEntry({
    companyId: draft.companyId,
    userId,
    agentId: draft.agentId,
    action: "LEAD_RESPONSE_MODIFIED",
    entityType: "draft_response",
    entityId: draftId,
    details: `Modified draft for lead #${draft.leadId}`,
  });

  return { success: true, guardrailsPassed: guardrailResult.passed };
}

export async function dismissDraft(
  draftId: number,
  userId: number,
): Promise<{ success: boolean; error?: string }> {
  const draft = await getDraftById(draftId);
  if (!draft) return { success: false, error: "Draft not found" };

  await updateDraftResponse(draftId, {
    status: "dismissed",
    executionLog: [
      ...(draft.executionLog ?? []),
      `${new Date().toISOString()} — Dismissed by user #${userId}`,
    ],
  });

  await createAuditLogEntry({
    companyId: draft.companyId,
    userId,
    agentId: draft.agentId,
    action: "LEAD_RESPONSE_DISMISSED",
    entityType: "draft_response",
    entityId: draftId,
    details: `Dismissed draft for lead #${draft.leadId}`,
  });

  return { success: true };
}

export async function checkPromotionEligibility(
  agentId: number,
  companyId: number,
): Promise<{ eligible: boolean; approvalRate: number; totalDrafts: number; message: string }> {
  // We need to query drafts for this agent — use getDraftsByLeadId through leads
  // Instead, query all drafts for this company and filter by agentId
  const { getDb } = await import("../../db");
  const { draftResponses } = await import("../../../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");

  const db = await getDb();
  if (!db) return { eligible: false, approvalRate: 0, totalDrafts: 0, message: "Database unavailable" };

  const allDrafts = await db.select().from(draftResponses)
    .where(and(eq(draftResponses.companyId, companyId), eq(draftResponses.agentId, agentId)));

  const decided = allDrafts.filter(d =>
    d.status === "approved" || d.status === "sent" || d.status === "modified" || d.status === "dismissed"
  );

  const totalDrafts = decided.length;
  const approved = decided.filter(d => d.status !== "dismissed").length;
  const approvalRate = totalDrafts > 0 ? Math.round((approved / totalDrafts) * 100) : 0;

  if (totalDrafts < 30) {
    return {
      eligible: false,
      approvalRate,
      totalDrafts,
      message: `Need ${30 - totalDrafts} more reviewed drafts before promotion eligibility (${totalDrafts}/30)`,
    };
  }

  if (approvalRate < 95) {
    return {
      eligible: false,
      approvalRate,
      totalDrafts,
      message: `Approval rate ${approvalRate}% is below the 95% threshold for L2 promotion`,
    };
  }

  return {
    eligible: true,
    approvalRate,
    totalDrafts,
    message: `Agent is eligible for promotion to L2 (Auto-execute with log). ${approvalRate}% approval rate over ${totalDrafts} drafts.`,
  };
}
