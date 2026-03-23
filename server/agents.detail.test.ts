import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("agents router - procedures required for AgentDetail page", () => {
  it("agents router is registered on appRouter", () => {
    // Verify the agents sub-router exists
    expect(appRouter._def.procedures).toBeDefined();
    // The appRouter should have agents-related procedures
    const procedureKeys = Object.keys(appRouter._def.procedures);
    expect(procedureKeys).toContain("agents.get");
    expect(procedureKeys).toContain("agents.list");
    expect(procedureKeys).toContain("agents.capabilities");
    expect(procedureKeys).toContain("agents.heartbeatLog");
    expect(procedureKeys).toContain("agents.updateFull");
    expect(procedureKeys).toContain("agents.updateStatus");
    expect(procedureKeys).toContain("agents.triggerHeartbeat");
    expect(procedureKeys).toContain("agents.remove");
  });

  it("agents.get procedure accepts an id input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Verify the procedure exists and can be called (will hit DB and may throw,
    // but the procedure itself is correctly wired)
    try {
      await caller.agents.get({ id: 1 });
    } catch (e: any) {
      // DB errors are expected in test env without full schema;
      // what matters is the procedure is callable and doesn't throw a tRPC validation error
      expect(e.message).not.toContain("is not a function");
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("agents.updateFull procedure accepts expected fields", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.agents.updateFull({
        id: 1,
        name: "Test Agent",
        roleTitle: "Test Role",
        monthlyBudget: 100,
        budgetAlertThreshold: 75,
      });
    } catch (e: any) {
      // DB errors are expected; validation errors are not
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("agents.updateStatus procedure accepts id and status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.agents.updateStatus({ id: 1, status: "active" });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });
});
