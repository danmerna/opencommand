import {
  getDraftById, getLeadById, updateDraftResponse, updateLead,
  updateExecutionQueueItem, createPooReceipt, createAuditLogEntry,
  updateAgent, getAgentById,
} from "../../db";
import { emitToUser } from "../../socketEmit";
import { nanoid } from "nanoid";

export async function executeResponse(
  executionQueueId: number,
  userId: number,
): Promise<{ success: boolean; status: string; error?: string }> {
  // Fetch queue item
  const { getDb } = await import("../../db");
  const { executionQueue } = await import("../../../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  const db = await getDb();
  if (!db) return { success: false, status: "failed", error: "Database unavailable" };

  const queueItems = await db.select().from(executionQueue).where(eq(executionQueue.id, executionQueueId)).limit(1);
  const queueItem = queueItems[0];
  if (!queueItem) return { success: false, status: "failed", error: "Queue item not found" };

  const draft = await getDraftById(queueItem.draftId);
  if (!draft) return { success: false, status: "failed", error: "Draft not found" };

  const lead = await getLeadById(queueItem.leadId);
  if (!lead) return { success: false, status: "failed", error: "Lead not found" };

  // Mark as sending
  await updateExecutionQueueItem(executionQueueId, {
    status: "sending",
    attempts: queueItem.attempts + 1,
    lastAttemptAt: new Date(),
  });

  // For pilot: stub the actual send (no Gmail/Twilio configured)
  // In production, this would call Gmail API or Twilio SDK
  const isSendConfigured = false; // TODO: check env vars for Gmail/Twilio credentials

  if (!isSendConfigured) {
    // Stubbed execution — log everything but don't actually send
    await updateExecutionQueueItem(executionQueueId, {
      status: "stubbed",
      sentAt: new Date(),
      metadata: {
        stubbedAt: new Date().toISOString(),
        channel: queueItem.channel,
        recipientAddress: queueItem.recipientAddress,
        note: "Email/SMS sending not configured. Draft logged as stubbed.",
      },
    });

    // Update draft as sent
    const finalBody = draft.modifiedBody ?? draft.body;
    await updateDraftResponse(draft.id, {
      status: "sent",
      sentAt: new Date(),
      executionLog: [
        ...(draft.executionLog ?? []),
        `${new Date().toISOString()} — Execution: STUBBED (no send channel configured)`,
        `${new Date().toISOString()} — Would have sent ${queueItem.channel} to ${queueItem.recipientAddress}`,
      ],
    });

    // Update lead as sent
    const respondedAt = new Date();
    await updateLead(lead.id, {
      status: "sent",
      respondedAt,
    });

    // Calculate response time
    const responseTimeMins = lead.receivedAt
      ? Math.round((respondedAt.getTime() - new Date(lead.receivedAt).getTime()) / 60000)
      : 0;

    // Generate PoO receipt
    const receiptNumber = `POO-LR-${nanoid(8).toUpperCase()}`;
    await createPooReceipt({
      taskId: 0, // No task associated — direct agent action
      userId,
      companyId: draft.companyId,
      agentId: draft.agentId,
      receiptNumber,
      taskTitle: `Lead Response: ${lead.contactName ?? "Unknown"} — ${lead.equipmentInterest ?? "Equipment Inquiry"}`,
      outcome: `Drafted and approved response for ${lead.contactName ?? "lead"}. Response time: ${responseTimeMins} minutes. Channel: ${queueItem.channel}. Status: stubbed (pending send configuration).`,
      laborHoursSaved: "0.50", // ~30 min manual response time saved
      dollarValueCreated: "75.00", // estimated value of speed-to-lead
      costIncurred: draft.llmCost ?? "0",
    });

    // Update agent stats if agent is associated
    if (draft.agentId) {
      const agent = await getAgentById(draft.agentId);
      if (agent) {
        await updateAgent(draft.agentId, {
          tasksCompleted: agent.tasksCompleted + 1,
          totalValueCreated: String(parseFloat(agent.totalValueCreated ?? "0") + 75),
          totalCostIncurred: String(parseFloat(agent.totalCostIncurred ?? "0") + parseFloat(draft.llmCost ?? "0")),
        });
      }
    }

    // Audit log
    await createAuditLogEntry({
      companyId: draft.companyId,
      userId,
      agentId: draft.agentId,
      action: "LEAD_RESPONSE_EXECUTED",
      entityType: "execution_queue",
      entityId: executionQueueId,
      details: `Lead response executed (stubbed) for ${lead.contactName ?? "lead"} — ${lead.equipmentInterest ?? "inquiry"}. Response time: ${responseTimeMins}min.`,
    });

    // Emit notification
    emitToUser(userId, "lead_response", "Response Sent", `Lead response for ${lead.contactName ?? "lead"} has been processed (${queueItem.channel} — stubbed).`, {
      leadId: lead.id,
      draftId: draft.id,
      responseTimeMins,
      receiptNumber,
    });

    return { success: true, status: "stubbed" };
  }

  // Future: actual Gmail/Twilio sending would go here
  return { success: false, status: "failed", error: "Send channel not implemented" };
}
