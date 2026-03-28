/**
 * Execution Worker
 *
 * Periodically processes the execution queue, sending approved responses.
 * Supports L1 (manual approval) and L2 (auto-execute with logging) autonomy levels.
 *
 * L0 = Notify Only (no draft generation)
 * L1 = Drafts for Review (default — human approves before sending)
 * L2 = Auto-execute with Log (sends automatically, human reviews after)
 * L3 = Full Autonomy (sends + handles follow-ups without oversight)
 */

import { eq, and } from "drizzle-orm";
import { executionQueue } from "../../../drizzle/schema";
import { getDb, getQueuedExecutions, getAgentById } from "../../db";
import { executeResponse } from "./execute";

let workerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the execution worker that polls the queue every N seconds.
 */
export function startExecutionWorker(intervalMs: number = 30000): void {
  if (workerInterval) return; // Already running

  console.log(`[ExecutionWorker] Starting queue processor (interval: ${intervalMs}ms)`);

  workerInterval = setInterval(async () => {
    try {
      await processQueue();
    } catch (err) {
      console.error("[ExecutionWorker] Queue processing error:", err);
    }
  }, intervalMs);

  // Run once immediately
  processQueue().catch(err => console.error("[ExecutionWorker] Initial run error:", err));
}

/**
 * Stop the execution worker.
 */
export function stopExecutionWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log("[ExecutionWorker] Stopped");
  }
}

/**
 * Process all queued execution items.
 */
async function processQueue(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const queuedItems = await db.select().from(executionQueue)
    .where(eq(executionQueue.status, "queued"))
    .limit(10);

  if (queuedItems.length === 0) return;

  console.log(`[ExecutionWorker] Processing ${queuedItems.length} queued items`);

  for (const item of queuedItems) {
    try {
      const result = await executeResponse(item.id, item.userId);
      if (result.success) {
        console.log(`[ExecutionWorker] Executed queue item #${item.id} (${result.status})`);
      } else {
        console.warn(`[ExecutionWorker] Failed queue item #${item.id}: ${result.error}`);
      }
    } catch (err) {
      console.error(`[ExecutionWorker] Error processing queue item #${item.id}:`, err);
    }
  }
}

/**
 * Check if an agent should auto-execute (L2+) or require manual approval (L1).
 */
export async function shouldAutoExecute(agentId: number): Promise<boolean> {
  const agent = await getAgentById(agentId);
  if (!agent) return false;

  // L2 = Auto-execute with logging
  // L3 = Full autonomy
  return agent.autonomyLevel === "L2" || agent.autonomyLevel === "L3";
}

/**
 * Auto-approve and queue a draft for L2+ agents.
 * Called from the draft generation pipeline when the agent has auto-execute privileges.
 */
export async function autoApproveAndQueue(
  draftId: number,
  agentId: number,
): Promise<{ autoExecuted: boolean; error?: string }> {
  const canAutoExecute = await shouldAutoExecute(agentId);
  if (!canAutoExecute) return { autoExecuted: false };

  const { approveDraft } = await import("./approvalFlow");

  // Use agentId as the approver (system approval)
  const result = await approveDraft(draftId, 0); // userId=0 indicates system/auto approval
  if (!result.success) {
    return { autoExecuted: false, error: result.error };
  }

  return { autoExecuted: true };
}
