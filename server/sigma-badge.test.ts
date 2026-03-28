import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import { agents } from "../drizzle/schema";

describe("SigmaBadge Integration", () => {
  let testAgentId: string;

  beforeAll(async () => {
    // Create a test agent with builtWithSigma=true
    const result = await db
      .insert(agents)
      .values({
        name: "Test Sigma Agent",
        type: "specialist",
        description: "Agent imported from Sigma",
        status: "active",
        builtWithSigma: true,
        sigmaSpec: {
          name: "Test Sigma Agent",
          role: "specialist",
          capabilities: ["test"],
        },
      })
      .returning();

    testAgentId = result[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(agents).where({ id: testAgentId });
  });

  it("should create an agent with builtWithSigma flag", async () => {
    const agent = await db.query.agents.findFirst({
      where: { id: testAgentId },
    });

    expect(agent).toBeDefined();
    expect(agent?.builtWithSigma).toBe(true);
  });

  it("should store the original Sigma spec", async () => {
    const agent = await db.query.agents.findFirst({
      where: { id: testAgentId },
    });

    expect(agent?.sigmaSpec).toBeDefined();
    expect(agent?.sigmaSpec?.name).toBe("Test Sigma Agent");
    expect(agent?.sigmaSpec?.capabilities).toContain("test");
  });

  it("should differentiate Sigma agents from regular agents", async () => {
    const sigmaAgent = await db.query.agents.findFirst({
      where: { id: testAgentId },
    });

    const regularAgent = await db
      .insert(agents)
      .values({
        name: "Regular Agent",
        type: "specialist",
        description: "Regular OpenCommand agent",
        status: "active",
        builtWithSigma: false,
      })
      .returning();

    expect(sigmaAgent?.builtWithSigma).toBe(true);
    expect(regularAgent[0].builtWithSigma).toBe(false);

    // Clean up
    await db.delete(agents).where({ id: regularAgent[0].id });
  });

  it("should default builtWithSigma to false for new agents", async () => {
    const newAgent = await db
      .insert(agents)
      .values({
        name: "Default Agent",
        type: "specialist",
        description: "Agent without explicit builtWithSigma",
        status: "active",
      })
      .returning();

    expect(newAgent[0].builtWithSigma).toBe(false);

    // Clean up
    await db.delete(agents).where({ id: newAgent[0].id });
  });

  it("should allow filtering agents by builtWithSigma", async () => {
    const sigmaAgents = await db.query.agents.findMany({
      where: { builtWithSigma: true },
    });

    const hasSigmaAgent = sigmaAgents.some((a) => a.id === testAgentId);
    expect(hasSigmaAgent).toBe(true);
  });
});
