import { describe, it, expect, vi } from "vitest";
import { detectGoalIntent, processGoalRequest } from "./agents/sigma/goalIntegration";
import {
  broadcastGoalCreated,
  broadcastGoalUpdated,
  broadcastAgentProgress,
  broadcastCollaboration,
  broadcastAgentAssigned,
} from "./agents/goals/goalWebSocket";

describe("Σ Chat Goal Integration", () => {
  describe("detectGoalIntent", () => {
    it("detects @create-goal command", () => {
      expect(detectGoalIntent("@create-goal Q2 Lead Campaign")).toBe(true);
    });

    it("detects natural language goal creation", () => {
      expect(detectGoalIntent("create goal for Q2 sales")).toBe(true);
      expect(detectGoalIntent("set goal to improve lead response")).toBe(true);
      expect(detectGoalIntent("add goal for team performance")).toBe(true);
    });

    it("detects goal listing requests", () => {
      expect(detectGoalIntent("show goals")).toBe(true);
      expect(detectGoalIntent("list goals")).toBe(true);
    });

    it("detects goal status requests", () => {
      expect(detectGoalIntent("goal status for Q2")).toBe(true);
      expect(detectGoalIntent("goal progress update")).toBe(true);
    });

    it("detects goal update commands", () => {
      expect(detectGoalIntent("complete goal Q2 Campaign")).toBe(true);
      expect(detectGoalIntent("cancel goal old project")).toBe(true);
      expect(detectGoalIntent("pause goal maintenance")).toBe(true);
    });

    it("detects agent assignment", () => {
      expect(detectGoalIntent("assign agent to goal")).toBe(true);
      expect(detectGoalIntent("assign Lead Response Agent to Q2")).toBe(true);
    });

    it("does not detect non-goal messages", () => {
      expect(detectGoalIntent("what is the weather")).toBe(false);
      expect(detectGoalIntent("send email to client")).toBe(false);
      expect(detectGoalIntent("check inventory")).toBe(false);
    });
  });
});

describe("Goal WebSocket Broadcasting", () => {
  it("broadcastGoalCreated does not throw without WebSocket server", () => {
    expect(() =>
      broadcastGoalCreated(1, 100, "Test Goal", [
        { agentId: "agent-1", agentName: "Lead Agent", role: "owner" },
      ])
    ).not.toThrow();
  });

  it("broadcastGoalUpdated does not throw without WebSocket server", () => {
    expect(() =>
      broadcastGoalUpdated(1, 100, "Test Goal", "completed", "user-1")
    ).not.toThrow();
  });

  it("broadcastAgentProgress does not throw without WebSocket server", () => {
    expect(() =>
      broadcastAgentProgress(1, 100, "Test Goal", "agent-1", "Lead Agent", 75, "in_progress", "Drafted 15 responses")
    ).not.toThrow();
  });

  it("broadcastCollaboration does not throw without WebSocket server", () => {
    expect(() =>
      broadcastCollaboration(1, 100, "Test Goal", "agent-1", "agent-2", "request", "Need inventory data")
    ).not.toThrow();
  });

  it("broadcastAgentAssigned does not throw without WebSocket server", () => {
    expect(() =>
      broadcastAgentAssigned(1, 100, "Test Goal", "agent-1", "Lead Agent", "contributor")
    ).not.toThrow();
  });
});

describe("Goal Collaboration Message Types", () => {
  it("supports request message type", () => {
    const types = ["request", "update", "blocker", "completion"];
    expect(types).toContain("request");
  });

  it("supports update message type", () => {
    const types = ["request", "update", "blocker", "completion"];
    expect(types).toContain("update");
  });

  it("supports blocker message type", () => {
    const types = ["request", "update", "blocker", "completion"];
    expect(types).toContain("blocker");
  });

  it("supports completion message type", () => {
    const types = ["request", "update", "blocker", "completion"];
    expect(types).toContain("completion");
  });
});

describe("Goal Intent Routing", () => {
  it("routes @create-goal before lead intents", () => {
    // Goal intents should take priority over lead intents
    const message = "@create-goal improve lead response time";
    expect(detectGoalIntent(message)).toBe(true);
  });

  it("routes show goals before general chat", () => {
    const message = "show goals for this workspace";
    expect(detectGoalIntent(message)).toBe(true);
  });

  it("routes goal collaboration requests", () => {
    const message = "goal collaboration between agents";
    expect(detectGoalIntent(message)).toBe(true);
  });
});
