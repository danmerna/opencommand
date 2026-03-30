import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { ingestLead, getPendingLeads } from "../agents/leadResponse/ingestLeads";
import { draftLeadResponse, generateResponseVariants } from "../agents/leadResponse/draftResponse";
import { executeLeadResponse, getExecutionHistory } from "../agents/leadResponse/executeResponse";

export const leadResponseRouter = router({
  /**
   * Ingest a new lead from TractorHouse email
   */
  ingestLead: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        from: z.string(),
        subject: z.string(),
        body: z.string(),
        htmlBody: z.string().optional(),
        dealerSlug: z.string(),
        companyId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const actionId = await ingestLead({
          messageId: input.messageId,
          from: input.from,
          subject: input.subject,
          body: input.body,
          htmlBody: input.htmlBody,
          timestamp: new Date(),
          dealerSlug: input.dealerSlug,
          companyId: input.companyId,
          userId: ctx.user.id,
        });

        return {
          success: true,
          actionId,
        };
      } catch (error) {
        console.error("[Lead Response] Ingest failed:", error);
        throw new Error("Failed to ingest lead");
      }
    }),

  /**
   * Get pending leads for a dealer
   */
  getPendingLeads: protectedProcedure
    .input(
      z.object({
        companyId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        return await getPendingLeads(ctx.user.id, input.companyId);
      } catch (error) {
        console.error("[Lead Response] Get pending failed:", error);
        throw new Error("Failed to fetch pending leads");
      }
    }),

  /**
   * Draft a response for a lead
   */
  draftResponse: protectedProcedure
    .input(
      z.object({
        actionItemId: z.number(),
        inventory: z.array(
          z.object({
            id: z.string(),
            type: z.string(),
            model: z.string(),
            year: z.number().optional(),
            price: z.number(),
            condition: z.enum(["excellent", "good", "fair"]),
            location: z.string(),
            imageUrl: z.string().optional(),
          })
        ),
        dealerName: z.string(),
        dealerPhone: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await draftLeadResponse(
          input.actionItemId,
          input.inventory,
          input.dealerName,
          input.dealerPhone
        );

        return {
          success: true,
          response,
        };
      } catch (error) {
        console.error("[Lead Response] Draft failed:", error);
        throw new Error("Failed to draft response");
      }
    }),

  /**
   * Generate multiple response variants
   */
  generateVariants: protectedProcedure
    .input(
      z.object({
        actionItemId: z.number(),
        inventory: z.array(
          z.object({
            id: z.string(),
            type: z.string(),
            model: z.string(),
            year: z.number().optional(),
            price: z.number(),
            condition: z.enum(["excellent", "good", "fair"]),
            location: z.string(),
            imageUrl: z.string().optional(),
          })
        ),
        dealerName: z.string(),
        dealerPhone: z.string().optional(),
        count: z.number().default(2),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const variants = await generateResponseVariants(
          input.actionItemId,
          input.inventory,
          input.dealerName,
          input.dealerPhone,
          input.count
        );

        return {
          success: true,
          variants,
        };
      } catch (error) {
        console.error("[Lead Response] Generate variants failed:", error);
        throw new Error("Failed to generate response variants");
      }
    }),

  /**
   * Execute (send) an approved response
   */
  executeResponse: protectedProcedure
    .input(
      z.object({
        actionItemId: z.number(),
        dealerSlug: z.string(),
        recipientEmail: z.string().email(),
        recipientName: z.string().optional(),
        subject: z.string(),
        body: z.string(),
        htmlBody: z.string(),
        quoteLink: z.string().optional(),
        replyTo: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await executeLeadResponse({
          actionItemId: input.actionItemId,
          dealerSlug: input.dealerSlug,
          recipientEmail: input.recipientEmail,
          recipientName: input.recipientName,
          subject: input.subject,
          body: input.body,
          htmlBody: input.htmlBody,
          quoteLink: input.quoteLink,
          replyTo: input.replyTo,
        });

        return result;
      } catch (error) {
        console.error("[Lead Response] Execute failed:", error);
        throw new Error("Failed to execute response");
      }
    }),

  /**
   * Get execution history
   */
  getExecutionHistory: protectedProcedure
    .input(
      z.object({
        companyId: z.number(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        return await getExecutionHistory(ctx.user.id, input.companyId, input.limit);
      } catch (error) {
        console.error("[Lead Response] Get history failed:", error);
        throw new Error("Failed to fetch execution history");
      }
    }),
});
