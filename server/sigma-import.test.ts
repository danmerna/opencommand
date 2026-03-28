import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createAgent, getAgentById, getAgentsByUserId } from "./db";

describe("Sigma Agent Import", () => {
  const testUserId = 999999;
  const testCompanyId = 888888;
  let createdAgentId: number;

  beforeAll(async () => {
    // Create a test agent to use as baseline
  });

  afterAll(async () => {
    // Cleanup test data
  });

  it("should import a Sigma agent spec with all fields", async () => {
    const sigmaSpec = {
      name: "Test Sales Agent",
      role: "VP of Sales",
      capabilities: ["lead-scoring", "outreach", "crm-sync"],
      dataSources: ["hubspot", "gmail", "calendly"],
      systemInstructions: "You are a sales agent focused on pipeline management.",
      trustLevel: "L2",
    };

    const result = await createAgent({
      userId: testUserId,
      name: sigmaSpec.name,
      type: "specialist",
      roleTitle: sigmaSpec.role,
      description: sigmaSpec.systemInstructions,
      capabilities: sigmaSpec.capabilities,
      tools: sigmaSpec.dataSources,
      companyId: testCompanyId,
      status: "idle",
      builtWithSigma: true,
      sigmaSpec: sigmaSpec,
    } as any);

    expect(result).toBeDefined();
  });

  it("should store builtWithSigma flag correctly", async () => {
    const sigmaSpec = {
      name: "Test Marketing Agent",
      role: "CMO",
      capabilities: ["content-creation", "seo"],
      dataSources: ["analytics"],
    };

    await createAgent({
      userId: testUserId,
      name: sigmaSpec.name,
      type: "specialist",
      roleTitle: sigmaSpec.role,
      capabilities: sigmaSpec.capabilities,
      tools: sigmaSpec.dataSources,
      companyId: testCompanyId,
      status: "idle",
      builtWithSigma: true,
      sigmaSpec: sigmaSpec,
    } as any);

    const agents = await getAgentsByUserId(testUserId);
    const sigmaAgent = agents.find((a) => a.builtWithSigma === true);

    expect(sigmaAgent).toBeDefined();
    expect(sigmaAgent?.builtWithSigma).toBe(true);
    expect(sigmaAgent?.sigmaSpec).toBeDefined();
  });

  it("should preserve original Sigma spec in database", async () => {
    const sigmaSpec = {
      name: "Test Finance Agent",
      role: "CFO",
      capabilities: ["financial-modeling", "budget-tracking"],
      dataSources: ["stripe", "quickbooks"],
      customField: "This should be preserved",
    };

    await createAgent({
      userId: testUserId,
      name: sigmaSpec.name,
      type: "specialist",
      roleTitle: sigmaSpec.role,
      capabilities: sigmaSpec.capabilities,
      tools: sigmaSpec.dataSources,
      companyId: testCompanyId,
      status: "idle",
      builtWithSigma: true,
      sigmaSpec: sigmaSpec,
    } as any);

    const agents = await getAgentsByUserId(testUserId);
    const financeAgent = agents.find((a) => a.name === "Test Finance Agent");

    expect(financeAgent?.sigmaSpec).toEqual(sigmaSpec);
    expect(financeAgent?.sigmaSpec?.customField).toBe("This should be preserved");
  });

  it("should handle missing optional Sigma fields gracefully", async () => {
    const minimalSigmaSpec = {
      name: "Minimal Agent",
      role: "Specialist",
    };

    const result = await createAgent({
      userId: testUserId,
      name: minimalSigmaSpec.name,
      type: "specialist",
      roleTitle: minimalSigmaSpec.role,
      capabilities: [],
      tools: [],
      companyId: testCompanyId,
      status: "idle",
      builtWithSigma: true,
      sigmaSpec: minimalSigmaSpec,
    } as any);

    expect(result).toBeDefined();

    const agents = await getAgentsByUserId(testUserId);
    const minimalAgent = agents.find((a) => a.name === "Minimal Agent");

    expect(minimalAgent?.builtWithSigma).toBe(true);
    expect(minimalAgent?.sigmaSpec).toEqual(minimalSigmaSpec);
  });

  it("should differentiate Sigma agents from regular agents", async () => {
    // Create a regular agent
    await createAgent({
      userId: testUserId,
      name: "Regular Agent",
      type: "specialist",
      roleTitle: "Specialist",
      capabilities: [],
      tools: [],
      companyId: testCompanyId,
      status: "idle",
      builtWithSigma: false,
    } as any);

    // Create a Sigma agent
    await createAgent({
      userId: testUserId,
      name: "Sigma Agent",
      type: "specialist",
      roleTitle: "Specialist",
      capabilities: [],
      tools: [],
      companyId: testCompanyId,
      status: "idle",
      builtWithSigma: true,
      sigmaSpec: { name: "Sigma Agent" },
    } as any);

    const agents = await getAgentsByUserId(testUserId);
    const regularAgent = agents.find((a) => a.name === "Regular Agent");
    const sigmaAgent = agents.find((a) => a.name === "Sigma Agent");

    expect(regularAgent?.builtWithSigma).toBe(false);
    expect(sigmaAgent?.builtWithSigma).toBe(true);
  });
});
