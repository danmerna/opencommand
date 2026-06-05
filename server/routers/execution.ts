/**
 * Execution router — deploy blueprints, track runs, manage HITL notifications.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";

async function getDbOrThrow() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}
import {
  blueprintRuns,
  blueprintRunEvents,
  hitlNotifications,
  blueprintTemplates,
} from "../../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function addEvent(
  db: Awaited<ReturnType<typeof getDbOrThrow>>,
  runId: number,
  blueprintId: number,
  nodeId: string,
  nodeType: string,
  nodeLabel: string | undefined,
  eventType: typeof blueprintRunEvents.$inferInsert["eventType"],
  message: string,
  output?: Record<string, unknown>,
  durationMs?: number,
) {
  await db.insert(blueprintRunEvents).values({
    runId,
    blueprintId,
    nodeId,
    nodeType,
    nodeLabel: nodeLabel ?? null,
    eventType,
    message,
    output: output ?? null,
    durationMs: durationMs ?? null,
  });
}

async function createHitlNotification(
  db: Awaited<ReturnType<typeof getDbOrThrow>>,
  params: {
    runId: number;
    blueprintId: number;
    userId: number;
    nodeId: string;
    nodeLabel?: string;
    agentName?: string;
    blueprintTicker?: string;
    mode: "ask_permission" | "notify_complete";
    urgency: "low" | "medium" | "high" | "critical";
    title: string;
    body?: string;
    context?: Record<string, unknown>;
  },
) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  const [result] = await db.insert(hitlNotifications).values({
    ...params,
    nodeLabel: params.nodeLabel ?? null,
    agentName: params.agentName ?? null,
    blueprintTicker: params.blueprintTicker ?? null,
    body: params.body ?? null,
    context: params.context ?? null,
    expiresAt,
  }).$returningId();
  return result.id;
}

/**
 * Simulate execution of a blueprint by walking its node graph.
 * Runs asynchronously after the deploy mutation returns.
 */
async function simulateExecution(
  runId: number,
  blueprintId: number,
  userId: number,
  nodes: Array<{ id: string; type: string; data: Record<string, unknown> }>,
  edges: Array<{ source: string; target: string }>,
  ticker: string,
) {
  const db = await getDbOrThrow();

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Topological order: triggers → workflows → agents → verifications → hitl → goals
  const ORDER = ["trigger", "workflow", "agent", "verification", "hitl", "goal"];
  const sorted = [...nodes].sort(
    (a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type),
  );

  try {
    await db
      .update(blueprintRuns)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(blueprintRuns.id, runId));

    for (const node of sorted) {
      const label = (node.data.label as string) ?? node.type;

      // Mark node started
      await db
        .update(blueprintRuns)
        .set({ currentNodeId: node.id })
        .where(eq(blueprintRuns.id, runId));

      await addEvent(db, runId, blueprintId, node.id, node.type, label, "node_started", `Starting ${label}...`);
      await sleep(800 + Math.random() * 600);

      if (node.type === "trigger") {
        await addEvent(db, runId, blueprintId, node.id, node.type, label, "node_completed",
          `Trigger fired: ${(node.data.description as string) ?? "scheduled execution"}`, {}, 120);
      }

      if (node.type === "workflow") {
        await addEvent(db, runId, blueprintId, node.id, node.type, label, "node_completed",
          `Workflow initialized: ${(node.data.description as string) ?? ""}`, {}, 200);
      }

      if (node.type === "agent") {
        const agentName = (node.data.label as string) ?? "Agent";
        const mission = (node.data.mission as string) ?? "Execute assigned task";

        await addEvent(db, runId, blueprintId, node.id, node.type, label, "agent_thinking",
          `${agentName} is analyzing the task...`);
        await sleep(1200 + Math.random() * 800);

        // Generate a short simulated output using LLM
        let agentOutput = `Task completed by ${agentName}.`;
        try {
          const resp = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "You are simulating an AI agent completing a task. Respond with a single concise sentence (max 20 words) describing what you found or accomplished. Be specific and realistic.",
              },
              {
                role: "user",
                content: `Agent: ${agentName}\nMission: ${mission}\nSimulate a realistic one-sentence task completion output.`,
              },
            ],
          });
          agentOutput = (resp as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ?? agentOutput;
        } catch {
          // fallback
        }

        await addEvent(db, runId, blueprintId, node.id, node.type, label, "agent_output",
          agentOutput, { agentName, model: node.data.model }, 1800 + Math.floor(Math.random() * 1200));

        await addEvent(db, runId, blueprintId, node.id, node.type, label, "node_completed",
          `${agentName} completed task successfully.`);
      }

      if (node.type === "verification") {
        await addEvent(db, runId, blueprintId, node.id, node.type, label, "verification_started",
          `Verifying output: ${(node.data.criteria as string) ?? "quality check"}...`);
        await sleep(600 + Math.random() * 400);
        await addEvent(db, runId, blueprintId, node.id, node.type, label, "verification_passed",
          `Verification passed. Output meets quality criteria.`, {}, 700);
        await addEvent(db, runId, blueprintId, node.id, node.type, label, "node_completed",
          `Verification complete.`);
      }

      if (node.type === "hitl") {
        const mode = (node.data.mode as string) ?? "ask_permission";
        const urgency = (node.data.urgency as "low" | "medium" | "high" | "critical") ?? "medium";
        const description = (node.data.description as string) ?? "Human review required.";

        await addEvent(db, runId, blueprintId, node.id, node.type, label, "hitl_requested",
          `Awaiting human approval: ${label}`);

        // Pause the run
        await db
          .update(blueprintRuns)
          .set({ status: "paused", currentNodeId: node.id })
          .where(eq(blueprintRuns.id, runId));

        // Create HITL notification
        await createHitlNotification(db, {
          runId,
          blueprintId,
          userId,
          nodeId: node.id,
          nodeLabel: label,
          agentName: label,
          blueprintTicker: ticker,
          mode: mode as "ask_permission" | "notify_complete",
          urgency,
          title: label,
          body: description,
          context: { runId, blueprintId },
        });

        // For notify_complete mode, auto-approve after a short delay
        if (mode === "notify_complete") {
          await sleep(2000);
          await db
            .update(blueprintRuns)
            .set({ status: "running" })
            .where(eq(blueprintRuns.id, runId));
          await addEvent(db, runId, blueprintId, node.id, node.type, label, "hitl_approved",
            "Notification acknowledged. Continuing execution.");
          await addEvent(db, runId, blueprintId, node.id, node.type, label, "node_completed",
            `HITL checkpoint passed.`);
        } else {
          // ask_permission — stop here, wait for human
          return;
        }
      }

      if (node.type === "goal") {
        await addEvent(db, runId, blueprintId, node.id, node.type, label, "goal_updated",
          `Goal tracking updated: ${(node.data.targetMetric as string) ?? "metrics recorded"}`);
        await addEvent(db, runId, blueprintId, node.id, node.type, label, "node_completed",
          `Goal checkpoint recorded.`);
      }

      await sleep(300);
    }

    // Mark run complete
    await db
      .update(blueprintRuns)
      .set({ status: "completed", completedAt: new Date(), currentNodeId: null,
        summary: `Blueprint executed successfully. All ${sorted.length} nodes completed.` })
      .where(eq(blueprintRuns.id, runId));

    await addEvent(db, runId, blueprintId, "run", "system", "System", "run_completed",
      `Blueprint run completed successfully.`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await db
      .update(blueprintRuns)
      .set({ status: "failed", completedAt: new Date(), error: msg })
      .where(eq(blueprintRuns.id, runId));
    await addEvent(db, runId, blueprintId, "run", "system", "System", "run_failed",
      `Run failed: ${msg}`);
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const executionRouter = router({
  /**
   * Deploy a blueprint — creates a run and starts simulated execution.
   */
  deploy: protectedProcedure
    .input(z.object({ blueprintId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDbOrThrow();

      // Fetch blueprint
      const [bp] = await db
        .select()
        .from(blueprintTemplates)
        .where(
          and(
            eq(blueprintTemplates.id, input.blueprintId),
            eq(blueprintTemplates.userId, ctx.user.id),
          ),
        );

      if (!bp) throw new Error("Blueprint not found");

      // Create run record
      const [run] = await db
        .insert(blueprintRuns)
        .values({
          blueprintId: input.blueprintId,
          userId: ctx.user.id,
          status: "queued",
          triggeredBy: "manual",
        })
        .$returningId();

      // Start simulation in background (non-blocking)
      const nodes = (bp.nodes ?? []) as Array<{ id: string; type: string; data: Record<string, unknown> }>;
      const edges = (bp.edges ?? []) as Array<{ source: string; target: string }>;

      simulateExecution(run.id, input.blueprintId, ctx.user.id, nodes, edges, bp.ticker).catch(console.error);

      return { runId: run.id, status: "queued" };
    }),

  /**
   * Get all runs for a blueprint.
   */
  getRuns: protectedProcedure
    .input(z.object({ blueprintId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDbOrThrow();
      return db
        .select()
        .from(blueprintRuns)
        .where(
          and(
            eq(blueprintRuns.blueprintId, input.blueprintId),
            eq(blueprintRuns.userId, ctx.user.id),
          ),
        )
        .orderBy(desc(blueprintRuns.createdAt))
        .limit(20);
    }),

  /**
   * Get all runs for the current user (across all blueprints).
   */
  getAllRuns: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDbOrThrow();
    return db
      .select()
      .from(blueprintRuns)
      .where(eq(blueprintRuns.userId, ctx.user.id))
      .orderBy(desc(blueprintRuns.createdAt))
      .limit(50);
  }),

  /**
   * Get the live status and events for a specific run.
   */
  getRunStatus: protectedProcedure
    .input(z.object({ runId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDbOrThrow();
      const [run] = await db
        .select()
        .from(blueprintRuns)
        .where(
          and(
            eq(blueprintRuns.id, input.runId),
            eq(blueprintRuns.userId, ctx.user.id),
          ),
        );

      if (!run) throw new Error("Run not found");

      const events = await db
        .select()
        .from(blueprintRunEvents)
        .where(eq(blueprintRunEvents.runId, input.runId))
        .orderBy(blueprintRunEvents.createdAt);

      return { run, events };
    }),

  /**
   * Get pending HITL notifications for the current user.
   */
  getPendingHitl: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDbOrThrow();
    return db
      .select()
      .from(hitlNotifications)
      .where(
        and(
          eq(hitlNotifications.userId, ctx.user.id),
          eq(hitlNotifications.status, "pending"),
        ),
      )
      .orderBy(desc(hitlNotifications.createdAt));
  }),

  /**
   * Resolve a HITL notification (approve or dismiss).
   */
  resolveHitl: protectedProcedure
    .input(
      z.object({
        notificationId: z.number(),
        action: z.enum(["approved", "dismissed"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDbOrThrow();

      const [notif] = await db
        .select()
        .from(hitlNotifications)
        .where(
          and(
            eq(hitlNotifications.id, input.notificationId),
            eq(hitlNotifications.userId, ctx.user.id),
          ),
        );

      if (!notif) throw new Error("Notification not found");

      // Update notification status
      await db
        .update(hitlNotifications)
        .set({ status: input.action, resolvedAt: new Date() })
        .where(eq(hitlNotifications.id, input.notificationId));

      // Add event to run
      await addEvent(
        db,
        notif.runId,
        notif.blueprintId,
        notif.nodeId,
        "hitl",
        notif.nodeLabel ?? undefined,
        input.action === "approved" ? "hitl_approved" : "hitl_dismissed",
        input.action === "approved"
          ? "Human approved. Resuming execution."
          : "Human dismissed. Run paused.",
      );

      if (input.action === "approved") {
        // Resume the run
        await db
          .update(blueprintRuns)
          .set({ status: "running" })
          .where(eq(blueprintRuns.id, notif.runId));

        // Continue simulation from the next node
        const [run] = await db
          .select()
          .from(blueprintRuns)
          .where(eq(blueprintRuns.id, notif.runId));

        const [bp] = await db
          .select()
          .from(blueprintTemplates)
          .where(eq(blueprintTemplates.id, notif.blueprintId));

        if (bp && run) {
          const nodes = (bp.nodes ?? []) as Array<{ id: string; type: string; data: Record<string, unknown> }>;
          const edges = (bp.edges ?? []) as Array<{ source: string; target: string }>;

          // Find nodes after the HITL node
          const ORDER = ["trigger", "workflow", "agent", "verification", "hitl", "goal"];
          const sorted = [...nodes].sort(
            (a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type),
          );
          const hitlIdx = sorted.findIndex((n) => n.id === notif.nodeId);
          const remainingNodes = hitlIdx >= 0 ? sorted.slice(hitlIdx + 1) : [];

          if (remainingNodes.length > 0) {
            simulateExecution(
              notif.runId,
              notif.blueprintId,
              ctx.user.id,
              remainingNodes,
              edges,
              bp.ticker,
            ).catch(console.error);
          } else {
            await db
              .update(blueprintRuns)
              .set({ status: "completed", completedAt: new Date(), summary: "Blueprint completed after HITL approval." })
              .where(eq(blueprintRuns.id, notif.runId));
          }
        }
      }

      return { success: true };
    }),

  /**
   * Cancel a running blueprint.
   */
  cancelRun: protectedProcedure
    .input(z.object({ runId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDbOrThrow();
      await db
        .update(blueprintRuns)
        .set({ status: "cancelled", completedAt: new Date() })
        .where(
          and(
            eq(blueprintRuns.id, input.runId),
            eq(blueprintRuns.userId, ctx.user.id),
          ),
        );
      return { success: true };
    }),
});

export default executionRouter;
