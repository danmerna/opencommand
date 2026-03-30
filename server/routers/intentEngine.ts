import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  escalateToBoard,
  getBoardFeedback,
  getEscalatedActions,
  formatBoardCascadeForConversation,
  shouldAutoEscalate,
} from "../agents/intentEngine/boardIntegration";

export const intentEngineRouter = router({
  /**
   * Escalate an action item to the executive board
   */
  escalateToBoard: protectedProcedure
    .input(
      z.object({
        actionItemId: z.number(),
        actionText: z.string(),
        context: z.record(z.string(), z.unknown()),
        riskLevel: z.enum(["low", "medium", "high"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const escalation = await escalateToBoard({
          id: input.actionItemId,
          userId: ctx.user.id,
          companyId: 30001, // Default to Johnson Tractor for now
          actionText: input.actionText,
          context: input.context,
          riskLevel: input.riskLevel,
        });

        return {
          success: true,
          escalation,
          formatted: formatBoardCascadeForConversation(escalation),
        };
      } catch (error) {
        console.error("[Intent Engine] Escalation failed:", error);
        throw new Error("Failed to escalate to board");
      }
    }),

  /**
   * Get board feedback for an action item
   */
  getBoardFeedback: protectedProcedure
    .input(
      z.object({
        actionItemId: z.number(),
      })
    )
    .query(async ({ input }) => {
      try {
        const feedback = await getBoardFeedback(input.actionItemId);
        return {
          success: true,
          feedback,
        };
      } catch (error) {
        console.error("[Intent Engine] Get feedback failed:", error);
        throw new Error("Failed to fetch board feedback");
      }
    }),

  /**
   * Get all escalated actions for a user
   */
  getEscalatedActions: protectedProcedure
    .input(
      z.object({
        companyId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const actions = await getEscalatedActions(ctx.user.id, input.companyId);
        return {
          success: true,
          actions,
          count: actions.length,
        };
      } catch (error) {
        console.error("[Intent Engine] Get escalated actions failed:", error);
        throw new Error("Failed to fetch escalated actions");
      }
    }),

  /**
   * Check if an action should be auto-escalated
   */
  shouldAutoEscalate: protectedProcedure
    .input(
      z.object({
        actionText: z.string(),
        riskLevel: z.enum(["low", "medium", "high"]),
      })
    )
    .query(async ({ input }) => {
      try {
        const shouldEscalate = shouldAutoEscalate(input.riskLevel, input.actionText);
        return {
          success: true,
          shouldEscalate,
          reason: shouldEscalate
            ? input.riskLevel === "high"
              ? "High-risk action requires board review"
              : "Action type triggers automatic escalation"
            : "Action does not require escalation",
        };
      } catch (error) {
        console.error("[Intent Engine] Auto-escalate check failed:", error);
        throw new Error("Failed to check auto-escalation");
      }
    }),
});
