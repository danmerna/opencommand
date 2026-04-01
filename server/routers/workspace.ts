import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { listAgents, getAgent, getWorkspaceStatus, getAgentCapabilities } from "../agents/registry";
import { parseMentions, parseTaskDescription, buildDelegationMessage, validateMentions } from "../agents/mentionParser";

export const workspaceRouter = router({
  // Get all agents in workspace
  listAgents: protectedProcedure
    .input(z.object({ workspaceId: z.string().optional() }))
    .query(async ({ ctx, input }: any) => {
      const workspaceId = input.workspaceId || ctx.user?.id || "default";
      const agents = await listAgents(workspaceId);

      return {
        agents,
        count: agents.length,
      };
    }),

  // Get single agent details
  getAgent: protectedProcedure
    .input(z.object({ agentId: z.string(), workspaceId: z.string().optional() }))
    .query(async ({ ctx, input }: any) => {
      const workspaceId = input.workspaceId || ctx.user?.id || "default";
      const agent = await getAgent(workspaceId, input.agentId);

      if (!agent) {
        throw new Error(`Agent ${input.agentId} not found`);
      }

      return agent;
    }),

  // Get agent capabilities
  getAgentCapabilities: protectedProcedure
    .input(z.object({ agentId: z.string(), workspaceId: z.string().optional() }))
    .query(async ({ ctx, input }: any) => {
      const workspaceId = input.workspaceId || ctx.user?.id || "default";
      const capabilities = await getAgentCapabilities(workspaceId, input.agentId);

      return {
        agentId: input.agentId,
        capabilities,
      };
    }),

  // Get workspace status (all agents, online/offline counts)
  getWorkspaceStatus: protectedProcedure
    .input(z.object({ workspaceId: z.string().optional() }))
    .query(async ({ ctx, input }: any) => {
      const workspaceId = input.workspaceId || ctx.user?.id || "default";
      const status = await getWorkspaceStatus(workspaceId);

      return status;
    }),

  // Parse @mentions from a message
  parseMentions: protectedProcedure
    .input(z.object({ message: z.string() }))
    .query(async ({ ctx, input }: any) => {
      const mentions = parseMentions(input.message);
      const { valid, ambiguous, invalid } = validateMentions(mentions);

      return {
        mentions,
        valid,
        ambiguous,
        invalid,
        hasValidMentions: valid.length > 0,
      };
    }),

  // Delegate task to agent via @mention
  delegateTask: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        taskDescription: z.string(),
        originalMessage: z.string(),
        workspaceId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const workspaceId = input.workspaceId || ctx.user?.id || "default";

      // Get agent
      const agent = await getAgent(workspaceId, input.agentId);
      if (!agent) {
        throw new Error(`Agent ${input.agentId} not found`);
      }

      // Parse task description to extract command and arguments
      const { command, args } = parseTaskDescription(input.agentId, input.taskDescription);

      // Build delegation message
      const delegationMessage = buildDelegationMessage(
        {
          agentId: input.agentId,
          agentName: agent.name,
          taskDescription: input.taskDescription,
          confidence: 1.0,
        },
        input.originalMessage
      );

      // In production, would route to actual agent via WebSocket/API
      return {
        success: true,
        delegation: {
          agentId: input.agentId,
          agentName: agent.name,
          command,
          args,
          message: delegationMessage,
          timestamp: new Date(),
          status: "pending",
        },
      };
    }),

  // Batch delegate tasks to multiple agents
  delegateToMultiple: protectedProcedure
    .input(
      z.object({
        mentions: z.array(
          z.object({
            agentId: z.string(),
            taskDescription: z.string(),
          })
        ),
        originalMessage: z.string(),
        workspaceId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const workspaceId = input.workspaceId || ctx.user?.id || "default";

      const delegations = await Promise.all(
        input.mentions.map(async (mention: any) => {
          const agent = await getAgent(workspaceId, mention.agentId);
          if (!agent) return null;

          const { command, args } = parseTaskDescription(mention.agentId, mention.taskDescription);

          return {
            agentId: mention.agentId,
            agentName: agent.name,
            command,
            args,
            status: "pending",
          };
        })
      );

      return {
        success: true,
        delegations: delegations.filter((d) => d !== null),
        count: delegations.filter((d) => d !== null).length,
      };
    }),

  // Get agent collaboration history (past delegations)
  getCollaborationHistory: protectedProcedure
    .input(
      z.object({
        agentId: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
        workspaceId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }: any) => {
      // In production, would query collaboration_history table
      const mockHistory = [
        {
          id: 1,
          delegatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          fromAgent: "sigma-1",
          toAgent: input.agentId || "lead-response-1",
          task: "Draft response to john@example.com",
          status: "completed",
          result: "Response drafted and queued for approval",
        },
        {
          id: 2,
          delegatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          fromAgent: "sigma-1",
          toAgent: input.agentId || "executive-board-1",
          task: "What do you think about this lead?",
          status: "completed",
          result: "Board cascade completed with 5 perspectives",
        },
      ];

      return {
        history: mockHistory.slice(input.offset, input.offset + input.limit),
        total: mockHistory.length,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  // Get agent-to-agent communication log
  getAgentCommunications: protectedProcedure
    .input(
      z.object({
        fromAgentId: z.string().optional(),
        toAgentId: z.string().optional(),
        limit: z.number().default(50),
        workspaceId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }: any) => {
      // In production, would query agent_communications table
      const mockComms = [
        {
          id: 1,
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
          from: "sigma-1",
          to: "lead-response-1",
          type: "task_delegation",
          payload: { task: "draft response", leadId: 123 },
          status: "delivered",
        },
        {
          id: 2,
          timestamp: new Date(Date.now() - 8 * 60 * 1000),
          from: "lead-response-1",
          to: "sigma-1",
          type: "task_result",
          payload: { status: "success", responseId: 456 },
          status: "delivered",
        },
      ];

      return {
        communications: mockComms.slice(0, input.limit),
        total: mockComms.length,
      };
    }),

  // Create workspace (for multi-workspace support)
  createWorkspace: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        dealerId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      // In production, would create workspace in DB
      const workspaceId = `ws_${Date.now()}`;

      return {
        success: true,
        workspace: {
          id: workspaceId,
          name: input.name,
          dealerId: input.dealerId,
          createdAt: new Date(),
          createdBy: ctx.user?.id,
        },
      };
    }),

  // List all workspaces for user
  listWorkspaces: protectedProcedure.query(async ({ ctx }: any) => {
    // In production, would query workspaces table
    return {
      workspaces: [
        {
          id: ctx.user?.id || "default",
          name: "Default Workspace",
          createdAt: new Date(),
          agentCount: 3,
        },
      ],
    };
  }),
});
