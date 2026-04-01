import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  createEmailTemplate,
  getCompanyTemplates,
  getTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  getTemplateSuggestions,
  TEMPLATE_VARIABLES,
} from "../agents/templates/templateBuilder";
import { calculateLeadScore, scoreCompanyLeads, getTopLeads, getLeadsByTier, getScoreDistribution } from "../agents/scoring/leadScoring";
import { calculateROIMetrics, getROIByPeriod, getROIByTemplate, getROIByBuyerSegment } from "../agents/roi/roiAttribution";

// Template rendering function
function renderTemplateContent(template: any, variables: Record<string, string>): { subject: string; body: string } {
  let subject = template.subject;
  let body = template.body;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    subject = subject.replace(new RegExp(placeholder, "g"), value as string);
    body = body.replace(new RegExp(placeholder, "g"), value as string);
  }

  return { subject, body };
}

export const templatesRouter = router({
  // Template Management
  createTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        category: z.enum(["john_deere", "kubota", "financing", "parts", "service", "custom"]),
        subject: z.string(),
        body: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { name, description, category, subject, body } = input;
      return await createEmailTemplate(ctx.user.id, {
        name,
        description: description || "",
        category: category as any,
        subject,
        body,
        companyId: ctx.user.id,
      } as any);
    }),

  getTemplates: protectedProcedure.query(async ({ ctx }) => {
    return await getCompanyTemplates(ctx.user.id);
  }),

  getTemplate: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return await getTemplate(input.id);
  }),

  updateTemplate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        subject: z.string().optional(),
        body: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await updateEmailTemplate(input.id, input);
    }),

  deleteTemplate: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    return await deleteEmailTemplate(input.id);
  }),

  renderTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        variables: z.record(z.string(), z.any()),
      })
    )
    .query(async ({ input }) => {
      const template = await getTemplate(input.templateId);
      if (!template) throw new Error("Template not found");
      return renderTemplateContent(template, input.variables as Record<string, string>);
    }),

  getTemplateSuggestions: protectedProcedure
    .input(z.object({ equipmentCategory: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        return await getTemplateSuggestions(ctx.user.id, input.equipmentCategory) as any[];
      } catch {
        return [];
      }
    }),

  getAvailableVariables: protectedProcedure.query(() => {
    return TEMPLATE_VARIABLES || {};
  }),

  // Lead Scoring
  scoreLeads: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await scoreCompanyLeads(ctx.user.id);
    } catch {
      return [];
    }
  }),

  getTopLeads: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      try {
        return await getTopLeads(ctx.user.id, input.limit);
      } catch {
        return [];
      }
    }),

  getLeadsByTier: protectedProcedure
    .input(z.object({ tier: z.enum(["high", "medium", "low"]) }))
    .query(async ({ ctx, input }) => {
      try {
        return await getLeadsByTier(ctx.user.id, input.tier);
      } catch {
        return [];
      }
    }),

  getScoreDistribution: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getScoreDistribution(ctx.user.id);
    } catch {
      return { high: 0, medium: 0, low: 0, average: 0 };
    }
  }),

  // ROI Attribution
  getROIMetrics: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await calculateROIMetrics(ctx.user.id);
    } catch {
      return {
        totalResponsesSent: 0,
        totalOpens: 0,
        totalClicks: 0,
        totalReplies: 0,
        totalSalesGenerated: 0,
        totalRevenueGenerated: 0,
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
        conversionRate: 0,
        revenuePerResponse: 0,
        roiPercentage: 0,
      };
    }
  }),

  getROIByPeriod: protectedProcedure
    .input(z.object({ period: z.enum(["daily", "weekly", "monthly"]) }))
    .query(async ({ ctx, input }) => {
      try {
        return await getROIByPeriod(ctx.user.id, input.period);
      } catch {
        return {};
      }
    }),

  getROIByTemplate: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getROIByTemplate(ctx.user.id);
    } catch {
      return {};
    }
  }),

  getROIByBuyerSegment: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getROIByBuyerSegment(ctx.user.id);
    } catch {
      return {};
    }
  }),
});
