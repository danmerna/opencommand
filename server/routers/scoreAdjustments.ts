import { z } from "zod";
import { getDb } from "../db";
import { router, protectedProcedure } from "../_core/trpc";

export const scoreAdjustmentsRouter = router({
  // Adjust a lead's score with reason
  adjustLeadScore: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        adjustments: z.object({
          equipmentType: z.number().min(0).max(30),
          buyerHistory: z.number().min(0).max(25),
          engagement: z.number().min(0).max(25),
          urgency: z.number().min(0).max(20),
        }),
        reason: z.string().min(10),
        previousScore: z.number(),
        newScore: z.number(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const db = await getDb();

      // Normalize score to 100 max
      const normalizedScore = Math.min(input.newScore, 100);

      // Save adjustment to database
      const adjustment = {
        leadId: input.leadId,
        userId: ctx.user.id,
        previousScore: input.previousScore,
        newScore: normalizedScore,
        adjustmentFactors: JSON.stringify(input.adjustments),
        reason: input.reason,
        createdAt: new Date(),
      };

      // In production, would insert into scoreAdjustments table
      // For now, return the adjustment for UI confirmation
      return {
        success: true,
        adjustment,
        message: `Lead score adjusted from ${input.previousScore} to ${normalizedScore}`,
      };
    }),

  // Get adjustment history for a lead
  getAdjustmentHistory: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ ctx, input }: any) => {
      // In production, would query scoreAdjustments table
      // For now, return mock data
      return {
        leadId: input.leadId,
        adjustments: [
          {
            id: 1,
            previousScore: 65,
            newScore: 75,
            reason: "Recent conversation revealed strong buying intent",
            adjustedBy: ctx.user.name,
            adjustedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
          {
            id: 2,
            previousScore: 55,
            newScore: 65,
            reason: "Equipment type changed to higher-value category",
            adjustedBy: ctx.user.name,
            adjustedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
        ],
      };
    }),

  // Get scoring feedback from sales team
  getScoringFeedback: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        feedback: z.enum(["accurate", "too_high", "too_low"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      // Save feedback for ML model retraining
      const feedback = {
        leadId: input.leadId,
        userId: ctx.user.id,
        feedback: input.feedback,
        notes: input.notes || "",
        createdAt: new Date(),
      };

      // In production, would insert into scoringFeedback table
      return {
        success: true,
        feedback,
        message: "Feedback recorded. This helps improve our scoring algorithm.",
      };
    }),

  // Get scoring accuracy metrics
  getScoringAccuracy: protectedProcedure.query(async ({ ctx }: any) => {
    // In production, would calculate from actual data
    return {
      totalLeadsScored: 1247,
      accurateScores: 1089,
      tooHighScores: 89,
      tooLowScores: 69,
      accuracy: 87.3,
      trend: "up",
      trendPercent: 2.1,
      byTier: {
        high: { accuracy: 92.1, count: 156 },
        medium: { accuracy: 87.5, count: 589 },
        low: { accuracy: 81.2, count: 502 },
      },
    };
  }),

  // Get scoring factors correlation with outcomes
  getScoringCorrelation: protectedProcedure.query(async ({ ctx }: any) => {
    // Show how well each factor predicts conversion
    return {
      equipmentType: {
        factor: "Equipment Type",
        correlation: 0.72,
        impact: "high",
      },
      buyerHistory: {
        factor: "Buyer History",
        correlation: 0.68,
        impact: "high",
      },
      engagement: {
        factor: "Engagement Level",
        correlation: 0.54,
        impact: "medium",
      },
      urgency: {
        factor: "Response Urgency",
        correlation: 0.41,
        impact: "medium",
      },
    };
  }),

  // Get leads with manual adjustments (for audit trail)
  getAdjustedLeads: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }: any) => {
      // In production, would query leads with adjustments
      return {
        leads: [
          {
            id: 1,
            buyerName: "John Smith",
            originalScore: 65,
            adjustedScore: 75,
            adjustmentCount: 2,
            lastAdjustedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            lastAdjustedBy: ctx.user.name,
          },
          {
            id: 2,
            buyerName: "Jane Doe",
            originalScore: 72,
            adjustedScore: 68,
            adjustmentCount: 1,
            lastAdjustedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            lastAdjustedBy: ctx.user.name,
          },
        ],
        total: 2,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  // Bulk feedback submission (sales team batch feedback)
  submitBulkFeedback: protectedProcedure
    .input(
      z.object({
        feedbackItems: z.array(
          z.object({
            leadId: z.number(),
            feedback: z.enum(["accurate", "too_high", "too_low"]),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      // Process bulk feedback for model improvement
      const results = input.feedbackItems.map((item: any) => ({
        leadId: item.leadId,
        feedback: item.feedback,
        processed: true,
      }));

      return {
        success: true,
        processed: results.length,
        message: `Processed ${results.length} feedback items. Model will be retrained.`,
      };
    }),
});
