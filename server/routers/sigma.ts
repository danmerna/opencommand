import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { processSigmaLeadRequest } from "../agents/sigma/leadResponseIntegration";
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
