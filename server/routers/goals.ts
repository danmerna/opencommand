import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as goalsService from "../agents/goals/goalsService";

export const goalsRouter = router({
  // Create a new goal
  create: protectedProcedure
    .input(
      z.object({
        companyId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        targetDate: z.number().optional(),
        successMetrics: z
          .array(
            z.object({
              name: z.string(),
              target: z.number(),
              unit: z.string(),
            })
          )
          .optional(),
        agents: z
          .array(
            z.object({
              agentId: z.string(),
              agentName: z.string(),
              role: z.enum(["owner", "contributor", "reviewer", "executor"]).default("contributor"),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return goalsService.createGoal({
        companyId: input.companyId,
        createdBy: ctx.user.id,
        title: input.title,
        description: input.description,
        priority: input.priority,
        targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
        successMetrics: input.successMetrics,
        agents: input.agents,
      });
    }),

  // Get a single goal
  get: protectedProcedure
    .input(z.object({ goalId: z.number() }))
    .query(async ({ input }) => {
      return goalsService.getGoal(input.goalId);
    }),

  // List goals for a company
  list: protectedProcedure
    .input(
      z.object({
        companyId: z.number(),
        status: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return goalsService.listGoals(input.companyId, input.status);
    }),

  // Update a goal
  update: protectedProcedure
    .input(
      z.object({
        goalId: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["planning", "active", "paused", "completed", "cancelled"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        targetDate: z.number().optional(),
        successMetrics: z
          .array(
            z.object({
              name: z.string(),
              target: z.number(),
              unit: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      return goalsService.updateGoal({
        goalId: input.goalId,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
        successMetrics: input.successMetrics,
      });
    }),

  // Delete a goal
  delete: protectedProcedure
    .input(z.object({ goalId: z.number() }))
    .mutation(async ({ input }) => {
      return goalsService.deleteGoal(input.goalId);
    }),

  // Assign an agent to a goal
  assignAgent: protectedProcedure
    .input(
      z.object({
        goalId: z.number(),
        agentId: z.string(),
        agentName: z.string(),
        role: z.enum(["owner", "contributor", "reviewer", "executor"]),
      })
    )
    .mutation(async ({ input }) => {
      return goalsService.assignAgentToGoal(input.goalId, input.agentId, input.agentName, input.role);
    }),

  // Update agent progress
  updateProgress: protectedProcedure
    .input(
      z.object({
        goalId: z.number(),
        agentId: z.string(),
        progressPercentage: z.number(),
        status: z.enum(["on-track", "at-risk", "blocked", "completed"]),
        update: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return goalsService.updateAgentProgress(
        input.goalId,
        input.agentId,
        input.progressPercentage,
        input.status,
        input.update
      );
    }),

  // Record agent collaboration
  recordCollaboration: protectedProcedure
    .input(
      z.object({
        goalId: z.number(),
        fromAgentId: z.string(),
        toAgentId: z.string(),
        messageType: z.enum(["request", "update", "blocker", "completion"]),
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return goalsService.recordAgentCollaboration(
        input.goalId,
        input.fromAgentId,
        input.toAgentId,
        input.messageType,
        input.message
      );
    }),

  // Get goal collaborations
  getCollaborations: protectedProcedure
    .input(z.object({ goalId: z.number() }))
    .query(async ({ input }) => {
      return goalsService.getGoalCollaborations(input.goalId);
    }),
});
