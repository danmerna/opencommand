import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  getBoardCascade,
  getCEOPerspective,
  getCFOPerspective,
  getCMOPerspective,
  getCTOPerspective,
  getBriefingPerspective,
  getSigmaPerspective,
  BOARD_MEMBERS,
} from "../agents/executiveBoard/boardThinking";

const questionInput = z.object({
  question: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
  companyData: z.record(z.string(), z.unknown()).optional(),
});

export const executiveBoardRouter = router({
  /**
   * Get full board cascade (5-4-3-2-1-Σ)
   * ARCH → LEDGER → SIGNAL → FORGE → YOU → Σ
   * Each inherits context from prior. Σ synthesizes into one highest-leverage action.
   */
  cascade: protectedProcedure
    .input(questionInput)
    .mutation(async ({ input }) => {
      try {
        const thoughts = await getBoardCascade({
          question: input.question,
          context: input.context || {},
          companyData: input.companyData || {},
        });

        const sigmaThought = thoughts.find((t) => t.codename === "SIGMA");

        return {
          success: true,
          question: input.question,
          thoughts,
          sigma: sigmaThought || null,
          summary: {
            totalThoughts: thoughts.length,
            averageConfidence:
              thoughts.reduce((sum, t) => sum + t.confidence, 0) / thoughts.length,
            highestConfidence: Math.max(...thoughts.map((t) => t.confidence)),
            cascadeOrder: thoughts.map((t) => t.codename),
          },
        };
      } catch (error) {
        console.error("[Executive Board] 5-4-3-2-1-Σ cascade failed:", error);
        throw new Error("Failed to run board cascade");
      }
    }),

  /**
   * Get ARCH (CEO) perspective only — 5-year strategic
   */
  ceo: protectedProcedure
    .input(questionInput)
    .mutation(async ({ input }) => {
      try {
        const thought = await getCEOPerspective({
          question: input.question,
          context: input.context || {},
          companyData: input.companyData || {},
        });
        return { success: true, thought };
      } catch (error) {
        console.error("[Executive Board] ARCH failed:", error);
        throw new Error("Failed to get ARCH (CEO) perspective");
      }
    }),

  /**
   * Get LEDGER (CFO) perspective only — 4-month financial
   */
  cfo: protectedProcedure
    .input(questionInput)
    .mutation(async ({ input }) => {
      try {
        const thought = await getCFOPerspective({
          question: input.question,
          context: input.context || {},
          companyData: input.companyData || {},
        });
        return { success: true, thought };
      } catch (error) {
        console.error("[Executive Board] LEDGER failed:", error);
        throw new Error("Failed to get LEDGER (CFO) perspective");
      }
    }),

  /**
   * Get SIGNAL (CMO) perspective only — 3-week marketing
   */
  cmo: protectedProcedure
    .input(questionInput)
    .mutation(async ({ input }) => {
      try {
        const thought = await getCMOPerspective({
          question: input.question,
          context: input.context || {},
          companyData: input.companyData || {},
        });
        return { success: true, thought };
      } catch (error) {
        console.error("[Executive Board] SIGNAL failed:", error);
        throw new Error("Failed to get SIGNAL (CMO) perspective");
      }
    }),

  /**
   * Get FORGE (CTO) perspective only — 2-day technical
   */
  cto: protectedProcedure
    .input(questionInput)
    .mutation(async ({ input }) => {
      try {
        const thought = await getCTOPerspective({
          question: input.question,
          context: input.context || {},
          companyData: input.companyData || {},
        });
        return { success: true, thought };
      } catch (error) {
        console.error("[Executive Board] FORGE failed:", error);
        throw new Error("Failed to get FORGE (CTO) perspective");
      }
    }),

  /**
   * Get Morning Briefing perspective only — NOW operational
   */
  briefing: protectedProcedure
    .input(questionInput)
    .mutation(async ({ input }) => {
      try {
        const thought = await getBriefingPerspective({
          question: input.question,
          context: input.context || {},
          companyData: input.companyData || {},
        });
        return { success: true, thought };
      } catch (error) {
        console.error("[Executive Board] Briefing failed:", error);
        throw new Error("Failed to get briefing perspective");
      }
    }),

  /**
   * Get Σ (SIGMA) perspective only — highest-leverage synthesis
   * Requires prior thoughts from the cascade to synthesize.
   */
  sigma: protectedProcedure
    .input(
      z.object({
        question: z.string(),
        context: z.record(z.string(), z.unknown()).optional(),
        companyData: z.record(z.string(), z.unknown()).optional(),
        priorThoughts: z.array(
          z.object({
            role: z.string(),
            codename: z.string(),
            timeHorizon: z.string(),
            perspective: z.string(),
            recommendation: z.string(),
            confidence: z.number(),
            rationale: z.array(z.string()),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const thought = await getSigmaPerspective(
          {
            question: input.question,
            context: input.context || {},
            companyData: input.companyData || {},
          },
          input.priorThoughts
        );
        return { success: true, thought };
      } catch (error) {
        console.error("[Executive Board] Σ failed:", error);
        throw new Error("Failed to get Σ (SIGMA) perspective");
      }
    }),

  /**
   * Get board member metadata (names, codenames, colors, time horizons)
   */
  members: protectedProcedure.query(() => {
    return {
      members: BOARD_MEMBERS,
      cascadeOrder: ["ceo", "cfo", "cmo", "cto", "briefing", "sigma"],
    };
  }),
});
