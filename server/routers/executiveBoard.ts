import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  getBoardCascade,
  getCEOPerspective,
  getCFOPerspective,
  getCMOPerspective,
  getCTOPerspective,
  getBriefingPerspective,
} from "../agents/executiveBoard/boardThinking";

export const executiveBoardRouter = router({
  /**
   * Get full board cascade (all 5 perspectives)
   * Runs CEO → CFO → CMO → CTO → Morning Briefing in sequence
   */
  cascade: protectedProcedure
    .input(
      z.object({
        question: z.string(),
        context: z.record(z.string(), z.unknown()).optional(),
        companyData: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const thoughts = await getBoardCascade({
          question: input.question,
          context: input.context || {},
          companyData: input.companyData || {},
        });

        return {
          success: true,
          question: input.question,
          thoughts,
          summary: {
            totalThoughts: thoughts.length,
            averageConfidence:
              thoughts.reduce((sum, t) => sum + t.confidence, 0) / thoughts.length,
            highestConfidence: Math.max(...thoughts.map((t) => t.confidence)),
          },
        };
      } catch (error) {
        console.error("[Executive Board] Cascade failed:", error);
        throw new Error("Failed to run board cascade");
      }
    }),

  /**
   * Get CEO perspective only (5-year strategic)
   */
  ceo: protectedProcedure
    .input(
      z.object({
        question: z.string(),
        context: z.record(z.string(), z.unknown()).optional(),
        companyData: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const thought = await getCEOPerspective({
          question: input.question,
          context: input.context || {},
          companyData: input.companyData || {},
        });

        return {
          success: true,
          thought,
        };
      } catch (error) {
        console.error("[Executive Board] CEO failed:", error);
        throw new Error("Failed to get CEO perspective");
      }
    }),

  /**
   * Get CFO perspective only (4-month financial)
   */
  cfo: protectedProcedure
    .input(
      z.object({
        question: z.string(),
        context: z.record(z.string(), z.unknown()).optional(),
        companyData: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const thought = await getCFOPerspective({
          question: input.question,
          context: input.context || {},
          companyData: input.companyData || {},
        });

        return {
          success: true,
          thought,
        };
      } catch (error) {
        console.error("[Executive Board] CFO failed:", error);
        throw new Error("Failed to get CFO perspective");
      }
    }),

  /**
   * Get CMO perspective only (3-week marketing)
   */
  cmo: protectedProcedure
    .input(
      z.object({
        question: z.string(),
        context: z.record(z.string(), z.unknown()).optional(),
        companyData: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const thought = await getCMOPerspective({
          question: input.question,
          context: input.context || {},
          companyData: input.companyData || {},
        });

        return {
          success: true,
          thought,
        };
      } catch (error) {
        console.error("[Executive Board] CMO failed:", error);
        throw new Error("Failed to get CMO perspective");
      }
    }),

  /**
   * Get CTO perspective only (2-day technical)
   */
  cto: protectedProcedure
    .input(
      z.object({
        question: z.string(),
        context: z.record(z.string(), z.unknown()).optional(),
        companyData: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const thought = await getCTOPerspective({
          question: input.question,
          context: input.context || {},
          companyData: input.companyData || {},
        });

        return {
          success: true,
          thought,
        };
      } catch (error) {
        console.error("[Executive Board] CTO failed:", error);
        throw new Error("Failed to get CTO perspective");
      }
    }),

  /**
   * Get Morning Briefing perspective only (1-day operational)
   */
  briefing: protectedProcedure
    .input(
      z.object({
        question: z.string(),
        context: z.record(z.string(), z.unknown()).optional(),
        companyData: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const thought = await getBriefingPerspective({
          question: input.question,
          context: input.context || {},
          companyData: input.companyData || {},
        });

        return {
          success: true,
          thought,
        };
      } catch (error) {
        console.error("[Executive Board] Briefing failed:", error);
        throw new Error("Failed to get briefing perspective");
      }
    }),
});
