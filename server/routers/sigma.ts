import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { processSigmaLeadRequest } from "../agents/sigma/leadResponseIntegration";
import { detectGoalIntent, processGoalRequest } from "../agents/sigma/goalIntegration";
import { invokeLLM } from "../_core/llm";

/**
 * Σ Chat Router
 * Handles conversational AI interactions with lead management, board escalation, and intent engine
 */

export const sigmaRouter = router({
  /**
   * Process natural language message through Σ Chat
   * Routes to appropriate agent based on intent
   */
  chat: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        conversationHistory: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        ).optional(),
        companyId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log(`[Sigma Chat] Processing message from user ${ctx.user.id}: ${input.message}`);

        // Check if this is a goal-related request
        const goalIntent = detectGoalIntent(input.message);
        if (goalIntent) {
          const goalResponse = await processGoalRequest(input.message, {
            userId: ctx.user.id,
            companyId: input.companyId,
            workspaceId: `workspace_${input.companyId}`,
          });

          return {
            success: true,
            response: goalResponse.response,
            action: goalResponse.action,
            data: goalResponse.data,
            source: "goal_management",
          };
        }

        // Check if this is a lead response request
        const leadIntent = detectLeadIntent(input.message);
        if (leadIntent) {
          const leadResponse = await processSigmaLeadRequest(input.message, {
            userId: ctx.user.id,
            companyId: input.companyId,
            dealerSlug: "johnson-tractor", // TODO: Get from user context
            dealerName: "Johnson Tractor",
          });

          return {
            success: true,
            response: leadResponse.response,
            action: leadResponse.action,
            data: leadResponse.data,
            source: "lead_response",
          };
        }

        // Otherwise, use general LLM for conversation
        const conversationMessages = [
          ...(input.conversationHistory || []),
          { role: "user" as const, content: input.message },
        ];

        const llmResponse = await invokeLLM({
          messages: conversationMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        });

        const assistantMessage =
          llmResponse.choices[0]?.message?.content || "I'm not sure how to respond to that.";

        return {
          success: true,
          response: assistantMessage,
          source: "general_chat",
        };
      } catch (error) {
        console.error("[Sigma Chat] Error:", error);
        throw new Error("Failed to process chat message");
      }
    }),

  /**
   * Standalone Σ chat with cached board context
   * Uses last cascade run context for instant highest-leverage recommendations
   * without running the full 5-4-3-2-1-Σ cascade
   */
  standaloneChat: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        conversationHistory: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        ).optional(),
        companyId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log(`[Sigma Standalone] Processing message from user ${ctx.user.id}`);

        // Gather cached board context from completed onboardings
        const { getOnboardingsByCompanyId, getCompanyById, getAgentsByCompanyId, getContextManifestsByUserId } = await import("../db");
        const onboardings = await getOnboardingsByCompanyId(input.companyId);
        const completedOnboardings = onboardings.filter(o => o.status === "completed");
        const company = await getCompanyById(input.companyId);

        // Build executive context from completed interviews
        let boardContext = "";
        if (completedOnboardings.length > 0) {
          const agents = await getAgentsByCompanyId(input.companyId);
          const agentMap = new Map(agents.map(a => [a.id, a]));
          boardContext = completedOnboardings.map(ob => {
            const agent = agentMap.get(ob.agentId);
            return `${agent?.name ?? ob.agentType} (${agent?.roleTitle ?? ob.agentType}): ${ob.summary ?? "Context available"}`;
          }).join("\n");
        }

        // Also check for live context manifests
        const manifests = await getContextManifestsByUserId(ctx.user.id);
        let liveContext = "";
        if (manifests.length > 0) {
          liveContext = manifests
            .filter(m => m.contextSummary)
            .map(m => m.contextSummary)
            .join("\n");
        }

        const systemPrompt = `You are Σ (Sigma) — the synthesis executive of OpenCommand's 5-4-3-2-1-Σ Temporal Cascade.

You are in STANDALONE MODE. The user is talking directly to you without running the full cascade. Your job is to provide instant highest-leverage recommendations using cached board context.

Company: ${company?.name ?? "Unknown"}
Industry: ${company?.industry ?? "N/A"}
Mission: ${company?.mission ?? "N/A"}

${boardContext ? `EXECUTIVE BOARD CONTEXT (from onboarding interviews):\n${boardContext}` : "No executive context cached yet. Provide general strategic guidance."}

${liveContext ? `LIVE BUSINESS CONTEXT:\n${liveContext}` : ""}

Rules:
1. Always think across ALL time horizons (5yr vision, 4mo financials, 3wk marketing, 2d execution)
2. Collapse your thinking into ONE specific, actionable recommendation
3. Be concise and direct — you are the executive who cuts through noise
4. Reference the executive context when relevant to show synthesis
5. If the user asks a question outside business strategy, still answer helpfully but frame it through the lens of highest-leverage impact`;

        const conversationMessages = [
          { role: "system" as const, content: systemPrompt },
          ...(input.conversationHistory || []).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user" as const, content: input.message },
        ];

        const llmResponse = await invokeLLM({
          messages: conversationMessages,
        });

        const response = (llmResponse.choices[0]?.message?.content ?? "I'm unable to respond right now.") as string;

        return {
          success: true,
          response,
          source: "sigma_standalone",
          hasBoardContext: completedOnboardings.length > 0,
          hasLiveContext: liveContext.length > 0,
        };
      } catch (error) {
        console.error("[Sigma Standalone] Error:", error);
        throw new Error("Failed to process standalone Sigma chat");
      }
    }),

  /**
   * Get conversation history for a user
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        companyId: z.number(),
        limit: z.number().optional().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // TODO: Fetch from database
        return {
          success: true,
          messages: [],
          count: 0,
        };
      } catch (error) {
        console.error("[Sigma Chat] Get history failed:", error);
        throw new Error("Failed to fetch conversation history");
      }
    }),

  /**
   * Clear conversation history
   */
  clearHistory: protectedProcedure
    .input(
      z.object({
        companyId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // TODO: Clear from database
        return {
          success: true,
          message: "Conversation history cleared",
        };
      } catch (error) {
        console.error("[Sigma Chat] Clear history failed:", error);
        throw new Error("Failed to clear conversation history");
      }
    }),
});

/**
 * Detect if message is a lead response intent
 */
function detectLeadIntent(message: string): boolean {
  const lower = message.toLowerCase();
  const leadKeywords = [
    "lead",
    "pending",
    "draft",
    "send",
    "response",
    "email",
    "buyer",
    "inquiry",
    "prospect",
    "execution",
    "history",
  ];

  return leadKeywords.some((keyword) => lower.includes(keyword));
}
