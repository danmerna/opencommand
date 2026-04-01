import { describe, it, expect } from "vitest";
import { parseMentions, parseTaskDescription, validateMentions, buildDelegationMessage } from "./agents/mentionParser";
import { listAgents, getAgent, getWorkspaceStatus, getAgentCapabilities } from "./agents/registry";

describe("OpenAgents Integration - Phase 1", () => {
  describe("@mention Parser", () => {
    it("should parse single @mention from message", () => {
      const message = "@Lead Response draft a response to john@example.com";
      const mentions = parseMentions(message);

      expect(mentions).toHaveLength(1);
      expect(mentions[0].agentId).toBe("lead-response-1");
      expect(mentions[0].agentName).toBe("Lead Response Agent");
      expect(mentions[0].confidence).toBeGreaterThan(0);
    });

    it("should parse multiple @mentions from message", () => {
      const message = "@Lead Response draft this @Executive Board what do you think?";
      const mentions = parseMentions(message);

      expect(mentions.length).toBeGreaterThanOrEqual(1);
      expect(mentions.some((m) => m.agentId === "lead-response-1")).toBe(true);
    });

    it("should handle fuzzy agent name matching", () => {
      const message = "@board what's your perspective?";
      const mentions = parseMentions(message);

      expect(mentions).toHaveLength(1);
      expect(mentions[0].agentId).toBe("executive-board-1");
      expect(mentions[0].confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("should extract task description after @mention", () => {
      const message = "@Intent Engine generate action items from this context";
      const mentions = parseMentions(message);

      expect(mentions).toHaveLength(1);
      expect(mentions[0].agentId).toBe("intent-engine-1");
    });

    it("should validate mention confidence", () => {
      const mentions = [
        { agentId: "lead-response-1", agentName: "Lead Response", taskDescription: "test", confidence: 1.0 },
        { agentId: "executive-board-1", agentName: "Board", taskDescription: "test", confidence: 0.8 },
        { agentId: "unknown", agentName: "Unknown", taskDescription: "test", confidence: 0.3 },
      ];

      const { valid, ambiguous, invalid } = validateMentions(mentions);

      expect(valid).toHaveLength(1);
      expect(ambiguous).toHaveLength(1);
      expect(invalid).toHaveLength(1);
    });
  });

  describe("Task Description Parser", () => {
    it("should parse draft command for Lead Response Agent", () => {
      const { command, args } = parseTaskDescription("lead-response-1", "draft a response to john@example.com");

      expect(command).toBe("draftResponse");
      expect(args).toBeDefined();
    });

    it("should parse send command for Lead Response Agent", () => {
      const { command } = parseTaskDescription("lead-response-1", "send this response now");

      expect(command).toBe("executeResponse");
    });

    it("should parse queue command for Lead Response Agent", () => {
      const { command } = parseTaskDescription("lead-response-1", "show me the pending queue");

      expect(command).toBe("getApprovalQueue");
    });

    it("should parse board cascade for Executive Board", () => {
      const { command } = parseTaskDescription("executive-board-1", "what do you think about this?");

      expect(command).toBe("boardCascade");
    });

    it("should parse CEO perspective for Executive Board", () => {
      const { command } = parseTaskDescription("executive-board-1", "CEO perspective on this decision");

      expect(["ceoThinking", "boardCascade"]).toContain(command);
    });

    it("should parse action items for Intent Engine", () => {
      const { command } = parseTaskDescription("intent-engine-1", "generate action items from this");

      expect(command).toBe("generateActionItems");
    });
  });

  describe("Delegation Message Builder", () => {
    it("should build delegation message", () => {
      const mention = {
        agentId: "lead-response-1",
        agentName: "Lead Response Agent",
        taskDescription: "draft a response",
        confidence: 1.0,
      };

      const message = buildDelegationMessage(mention, "original context");

      expect(message).toContain("delegated");
      expect(message).toContain("draft a response");
      expect(message).toContain("original context");
    });
  });

  describe("Agent Registry", () => {
    it("should list all agents in workspace", async () => {
      const agents = await listAgents("default");

      expect(agents).toHaveLength(3);
      expect(agents.map((a) => a.type)).toContain("lead-response");
      expect(agents.map((a) => a.type)).toContain("executive-board");
      expect(agents.map((a) => a.type)).toContain("intent-engine");
    });

    it("should get single agent by ID", async () => {
      const agent = await getAgent("default", "lead-response-1");

      expect(agent).toBeDefined();
      expect(agent?.name).toBe("Lead Response Agent");
      expect(agent?.status).toBe("online");
    });

    it("should return null for non-existent agent", async () => {
      const agent = await getAgent("default", "non-existent");

      expect(agent).toBeNull();
    });

    it("should get agent capabilities", async () => {
      const capabilities = await getAgentCapabilities("default", "lead-response-1");

      expect(capabilities.length).toBeGreaterThan(0);
      expect(capabilities.some((c) => c.name === "Ingest Leads")).toBe(true);
    });

    it("should get workspace status", async () => {
      const status = await getWorkspaceStatus("default");

      expect(status.totalAgents).toBe(3);
      expect(status.onlineCount).toBeGreaterThan(0);
      expect(status.agents).toHaveLength(3);
    });

    it("should track agent heartbeats", async () => {
      const agent1 = await getAgent("default", "lead-response-1");
      const agent2 = await getAgent("default", "executive-board-1");

      expect(agent1?.lastHeartbeat).toBeDefined();
      expect(agent2?.lastHeartbeat).toBeDefined();
      expect(agent1?.lastHeartbeat instanceof Date).toBe(true);
    });

    it("should have agent capabilities defined", async () => {
      const agent = await getAgent("default", "executive-board-1");

      expect(agent?.capabilities).toContain("ceoThinking");
      expect(agent?.capabilities).toContain("cfoThinking");
      expect(agent?.capabilities).toContain("cmoThinking");
      expect(agent?.capabilities).toContain("ctoThinking");
    });
  });

  describe("Multi-Agent Collaboration", () => {
    it("should support @mention delegation between agents", () => {
      const message = "@Lead Response draft response @Executive Board review this";
      const mentions = parseMentions(message);

      expect(mentions.length).toBeGreaterThanOrEqual(1);
      mentions.forEach((m) => {
        expect(m.agentId).toBeDefined();
        expect(m.taskDescription).toBeDefined();
      });
    });

    it("should handle cascading mentions", () => {
      const message = "@Intent Engine generate items @Executive Board cascade thinking @Lead Response draft response";
      const mentions = parseMentions(message);

      expect(mentions.length).toBeGreaterThanOrEqual(1);
    });

    it("should preserve task context through delegation chain", () => {
      const originalMessage = "Customer inquiry about John Deere equipment";
      const mentions = parseMentions(`@Lead Response ${originalMessage}`);

      expect(mentions).toHaveLength(1);
      expect(mentions[0].agentId).toBe("lead-response-1");
    });
  });

  describe("Agent Status Monitoring", () => {
    it("should track agent online status", async () => {
      const agents = await listAgents("default");

      agents.forEach((agent) => {
        expect(["online", "offline", "error"]).toContain(agent.status);
      });
    });

    it("should show agent version", async () => {
      const agent = await getAgent("default", "lead-response-1");

      expect(agent?.version).toBeDefined();
      expect(agent?.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("should track agent configuration", async () => {
      const agent = await getAgent("default", "lead-response-1");

      expect(agent?.config).toBeDefined();
      expect(typeof agent?.config).toBe("object");
    });
  });
});
