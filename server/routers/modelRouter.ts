import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import {
  modelExecutionLogs,
  agentModelConfigs,
} from "../../drizzle/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import {
  MODEL_REGISTRY,
  ROLE_DEFAULTS,
  TASK_CATEGORY_DEFAULTS,
  estimateCost,
  getModelById,
  type WorkflowRole,
  type TaskCategory,
} from "../../shared/modelRegistry";

async function getDbOrThrow() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

// ─── Model-Aware LLM Invocation ─────────────────────────────────────────────

interface ModelInvokeParams {
  modelId: string;
  messages: { role: string; content: string }[];
  userId: number;
  companyId?: number;
  agentId?: number;
  blueprintId?: number;
  workflowRole?: WorkflowRole;
  taskCategory?: string;
  taskDescription?: string;
  maxTokens?: number;
  responseFormat?: { type: string; json_schema?: unknown };
}

/**
 * Invoke LLM with a specific model and automatically log execution metrics.
 * This is the core function that replaces direct invokeLLM calls when you want
 * model routing and cost tracking.
 */
export async function invokeWithModel(params: ModelInvokeParams) {
  const {
    modelId,
    messages,
    userId,
    companyId,
    agentId,
    blueprintId,
    workflowRole,
    taskCategory,
    taskDescription,
    maxTokens,
    responseFormat,
  } = params;

  const startedAt = new Date();
  const startMs = Date.now();

  try {
    // Call the Forge API with the specific model
    const apiUrl = ENV.forgeApiUrl
      ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
      : "https://forge.manus.ai/v1/chat/completions";

    const payload: Record<string, unknown> = {
      model: modelId,
      messages,
      max_tokens: maxTokens || 4096,
    };

    if (responseFormat) {
      payload.response_format = responseFormat;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const latencyMs = Date.now() - startMs;

      // Log the failure
      const db = await getDbOrThrow();
      await db.insert(modelExecutionLogs).values({
        userId,
        companyId: companyId || null,
        agentId: agentId || null,
        blueprintId: blueprintId || null,
        modelId,
        workflowRole: workflowRole || null,
        taskCategory: taskCategory || null,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        costUsd: "0",
        success: false,
        errorMessage: `${response.status}: ${errorText.substring(0, 500)}`,
        taskDescription: taskDescription || null,
        startedAt,
        completedAt: new Date(),
      });

      throw new Error(`Model ${modelId} failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const latencyMs = Date.now() - startMs;

    // Extract usage
    const inputTokens = result.usage?.prompt_tokens || 0;
    const outputTokens = result.usage?.completion_tokens || 0;
    const costUsd = estimateCost(modelId, inputTokens, outputTokens);

    // Log success
    const db = await getDbOrThrow();
    await db.insert(modelExecutionLogs).values({
      userId,
      companyId: companyId || null,
      agentId: agentId || null,
      blueprintId: blueprintId || null,
      modelId,
      workflowRole: workflowRole || null,
      taskCategory: taskCategory || null,
      inputTokens,
      outputTokens,
      latencyMs,
      costUsd: costUsd.toFixed(6),
      success: true,
      taskDescription: taskDescription || null,
      startedAt,
      completedAt: new Date(),
    });

    return {
      result,
      metrics: {
        modelId,
        inputTokens,
        outputTokens,
        latencyMs,
        costUsd,
      },
    };
  } catch (error: any) {
    // If we haven't already logged (non-HTTP errors)
    if (!error.message?.startsWith("Model ")) {
      const latencyMs = Date.now() - startMs;
      try {
        const db = await getDbOrThrow();
        await db.insert(modelExecutionLogs).values({
          userId,
          companyId: companyId || null,
          agentId: agentId || null,
          blueprintId: blueprintId || null,
          modelId,
          workflowRole: workflowRole || null,
          taskCategory: taskCategory || null,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs,
          costUsd: "0",
          success: false,
          errorMessage: error.message?.substring(0, 500) || "Unknown error",
          taskDescription: taskDescription || null,
          startedAt,
          completedAt: new Date(),
        });
      } catch (_) {
        // Don't fail the main operation if logging fails
      }
    }
    throw error;
  }
}

// ─── tRPC Router ─────────────────────────────────────────────────────────────

export const modelRouter = router({
  // Get all available models with metadata
  listModels: protectedProcedure.query(() => {
    return MODEL_REGISTRY;
  }),

  // Get role-based defaults
  getRoleDefaults: protectedProcedure.query(() => {
    return ROLE_DEFAULTS;
  }),

  // Get task category defaults
  getTaskDefaults: protectedProcedure.query(() => {
    return TASK_CATEGORY_DEFAULTS;
  }),

  // Get model config for a specific agent/node
  getAgentModelConfig: protectedProcedure
    .input(z.object({
      agentId: z.number().optional(),
      blueprintId: z.number().optional(),
      nodeId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDbOrThrow();
      const conditions = [eq(agentModelConfigs.userId, ctx.user.id)];
      if (input.agentId) conditions.push(eq(agentModelConfigs.agentId, input.agentId));
      if (input.blueprintId) conditions.push(eq(agentModelConfigs.blueprintId, input.blueprintId));
      if (input.nodeId) conditions.push(eq(agentModelConfigs.nodeId, input.nodeId));

      const configs = await db
        .select()
        .from(agentModelConfigs)
        .where(and(...conditions));

      return configs;
    }),

  // Save model config for an agent/node
  saveAgentModelConfig: protectedProcedure
    .input(z.object({
      agentId: z.number().optional(),
      blueprintId: z.number().optional(),
      nodeId: z.string().optional(),
      modelId: z.string(),
      workflowRole: z.enum(["coordinator", "implementer", "verifier", "fixer", "web_research", "vision", "computer_use", "bulk_worker"]).optional(),
      maxTokens: z.number().optional(),
      temperature: z.number().min(0).max(2).optional(),
      fallbackModelId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDbOrThrow();

      // Check if config already exists for this agent/node
      const conditions = [eq(agentModelConfigs.userId, ctx.user.id)];
      if (input.agentId) conditions.push(eq(agentModelConfigs.agentId, input.agentId));
      if (input.blueprintId) conditions.push(eq(agentModelConfigs.blueprintId, input.blueprintId));
      if (input.nodeId) conditions.push(eq(agentModelConfigs.nodeId, input.nodeId));

      const existing = await db
        .select()
        .from(agentModelConfigs)
        .where(and(...conditions))
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await db
          .update(agentModelConfigs)
          .set({
            modelId: input.modelId,
            workflowRole: input.workflowRole || null,
            maxTokens: input.maxTokens || 4096,
            temperature: input.temperature?.toFixed(2) || "0.70",
            fallbackModelId: input.fallbackModelId || null,
          })
          .where(eq(agentModelConfigs.id, existing[0].id));
        return { id: existing[0].id, updated: true };
      } else {
        // Insert new
        const [inserted] = await db.insert(agentModelConfigs).values({
          userId: ctx.user.id,
          companyId: null,
          agentId: input.agentId || null,
          blueprintId: input.blueprintId || null,
          nodeId: input.nodeId || null,
          modelId: input.modelId,
          workflowRole: input.workflowRole || null,
          maxTokens: input.maxTokens || 4096,
          temperature: input.temperature?.toFixed(2) || "0.70",
          fallbackModelId: input.fallbackModelId || null,
        }).$returningId();
        return { id: inserted.id, updated: false };
      }
    }),

  // Bulk save model configs for all nodes in a blueprint
  saveBlueprintModelConfigs: protectedProcedure
    .input(z.object({
      blueprintId: z.number(),
      configs: z.array(z.object({
        nodeId: z.string(),
        modelId: z.string(),
        workflowRole: z.enum(["coordinator", "implementer", "verifier", "fixer", "web_research", "vision", "computer_use", "bulk_worker"]).optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDbOrThrow();

      // Delete existing configs for this blueprint
      await db
        .delete(agentModelConfigs)
        .where(and(
          eq(agentModelConfigs.userId, ctx.user.id),
          eq(agentModelConfigs.blueprintId, input.blueprintId),
        ));

      // Insert all new configs
      if (input.configs.length > 0) {
        await db.insert(agentModelConfigs).values(
          input.configs.map((c) => ({
            userId: ctx.user.id,
            companyId: null,
            agentId: null,
            blueprintId: input.blueprintId,
            nodeId: c.nodeId,
            modelId: c.modelId,
            workflowRole: c.workflowRole || null,
            maxTokens: 4096,
            temperature: "0.70",
            fallbackModelId: null,
          }))
        );
      }

      return { saved: input.configs.length };
    }),

  // Get execution metrics (performance dashboard data)
  getExecutionMetrics: protectedProcedure
    .input(z.object({
      timeRange: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
      modelId: z.string().optional(),
      agentId: z.number().optional(),
      blueprintId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDbOrThrow();

      // Calculate time boundary
      const now = new Date();
      const msMap = { "24h": 86400000, "7d": 604800000, "30d": 2592000000, "90d": 7776000000 };
      const since = new Date(now.getTime() - msMap[input.timeRange]);

      const conditions = [
        eq(modelExecutionLogs.userId, ctx.user.id),
        gte(modelExecutionLogs.startedAt, since),
      ];
      if (input.modelId) conditions.push(eq(modelExecutionLogs.modelId, input.modelId));
      if (input.agentId) conditions.push(eq(modelExecutionLogs.agentId, input.agentId));
      if (input.blueprintId) conditions.push(eq(modelExecutionLogs.blueprintId, input.blueprintId));

      // Aggregate by model
      const rows = await db
        .select({
          modelId: modelExecutionLogs.modelId,
          totalCalls: sql<number>`COUNT(*)`,
          successCount: sql<number>`SUM(CASE WHEN ${modelExecutionLogs.success} = true THEN 1 ELSE 0 END)`,
          totalInputTokens: sql<number>`SUM(${modelExecutionLogs.inputTokens})`,
          totalOutputTokens: sql<number>`SUM(${modelExecutionLogs.outputTokens})`,
          totalCostUsd: sql<string>`SUM(${modelExecutionLogs.costUsd})`,
          avgLatencyMs: sql<number>`AVG(${modelExecutionLogs.latencyMs})`,
          maxLatencyMs: sql<number>`MAX(${modelExecutionLogs.latencyMs})`,
          minLatencyMs: sql<number>`MIN(${modelExecutionLogs.latencyMs})`,
        })
        .from(modelExecutionLogs)
        .where(and(...conditions))
        .groupBy(modelExecutionLogs.modelId);

      // Also get recent logs for the timeline
      const recentLogs = await db
        .select()
        .from(modelExecutionLogs)
        .where(and(...conditions))
        .orderBy(desc(modelExecutionLogs.startedAt))
        .limit(100);

      return {
        summary: rows.map((r) => ({
          ...r,
          successRate: r.totalCalls > 0 ? (r.successCount / r.totalCalls) * 100 : 0,
          modelInfo: getModelById(r.modelId),
        })),
        recentLogs,
        timeRange: input.timeRange,
      };
    }),

  // Get cost breakdown by role
  getCostByRole: protectedProcedure
    .input(z.object({
      timeRange: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDbOrThrow();
      const now = new Date();
      const msMap = { "24h": 86400000, "7d": 604800000, "30d": 2592000000, "90d": 7776000000 };
      const since = new Date(now.getTime() - msMap[input.timeRange]);

      const rows = await db
        .select({
          workflowRole: modelExecutionLogs.workflowRole,
          totalCalls: sql<number>`COUNT(*)`,
          totalCostUsd: sql<string>`SUM(${modelExecutionLogs.costUsd})`,
          avgLatencyMs: sql<number>`AVG(${modelExecutionLogs.latencyMs})`,
        })
        .from(modelExecutionLogs)
        .where(and(
          eq(modelExecutionLogs.userId, ctx.user.id),
          gte(modelExecutionLogs.startedAt, since),
        ))
        .groupBy(modelExecutionLogs.workflowRole);

      return rows;
    }),
});
