import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { generateActionItems, approveAction, dismissAction, regenerateVariant, getPendingActions, getCompletedActions } from "../intent-engine";

export const intentEngineRouter = router({
  /**
   * Generate action items for an agent based on context and intent
   */
  generateActions: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        context: z.record(z.string(), z.unknown()),
        intent: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const actionItems = await generateActionItems(
          input.agentId,
          String(ctx.user.id),
          input.context,
          input.intent
        );

        return {
          success: true,
          actions: actionItems,
        };
      } catch (error) {
        console.error("[Intent Engine] Generate actions failed:", error);
        throw new Error("Failed to generate action items");
      }
    }),

  /**
   * Get pending action items for the current user
   */
  getPendingActions: protectedProcedure.query(async ({ ctx }) => {
    try {
      const actions = await getPendingActions(String(ctx.user.id));
      return actions;
    } catch (error) {
      console.error("[Intent Engine] Get pending actions failed:", error);
      return [];
    }
  }),

  /**
   * Get completed action items for the current user
   */
  getCompletedActions: protectedProcedure.query(async ({ ctx }) => {
    try {
      const actions = await getCompletedActions(String(ctx.user.id));
      return actions;
    } catch (error) {
      console.error("[Intent Engine] Get completed actions failed:", error);
      return [];
    }
  }),

  /**
   * Approve an action item with selected option
   */
  approveAction: protectedProcedure
    .input(
      z.object({
        actionItemId: z.string(),
        selectedOption: z.enum(["recommended", "conservative", "aggressive"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await approveAction(input.actionItemId, input.selectedOption);
        return { success: true };
      } catch (error) {
        console.error("[Intent Engine] Approve action failed:", error);
        throw new Error("Failed to approve action");
      }
    }),

  /**
   * Dismiss an action item
   */
  dismissAction: protectedProcedure
    .input(z.object({ actionItemId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await dismissAction(input.actionItemId);
        return { success: true };
      } catch (error) {
        console.error("[Intent Engine] Dismiss action failed:", error);
        throw new Error("Failed to dismiss action");
      }
    }),

  /**
   * Regenerate variant for Conservative or Aggressive option
   */
  regenerateVariant: protectedProcedure
    .input(
      z.object({
        actionItemId: z.string(),
        optionType: z.enum(["conservative", "aggressive"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await regenerateVariant(input.actionItemId, input.optionType);
        return { success: true };
      } catch (error) {
        console.error("[Intent Engine] Regenerate variant failed:", error);
        throw new Error("Failed to regenerate variant");
      }
    }),
});

export default intentEngineRouter;
