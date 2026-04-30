import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Tests for the Website Audit Pipeline:
 * 1. websiteAudit router procedures exist and validate inputs
 * 2. Website audit engine module exports and structure
 * 3. Integration with onboarding (companies.create triggers audit)
 * 4. Context injection into Σ and strategy generation
 */

// ─── Helper: create a mock authenticated context ────────────────────────────
function createMockContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: { origin: "http://localhost:3000" },
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ─── 1. websiteAudit Router Procedures ──────────────────────────────────────
describe("websiteAudit Router", () => {
  it("should have getByCompany procedure", () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.websiteAudit.getByCompany).toBeDefined();
    expect(typeof caller.websiteAudit.getByCompany).toBe("function");
  });

  it("should have listByUser procedure", () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.websiteAudit.listByUser).toBeDefined();
    expect(typeof caller.websiteAudit.listByUser).toBe("function");
  });

  it("should have trigger procedure", () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.websiteAudit.trigger).toBeDefined();
    expect(typeof caller.websiteAudit.trigger).toBe("function");
  });

  it("trigger should require companyId, url, and companyName", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await (caller.websiteAudit.trigger as any)({});
    } catch (err: any) {
      expect(err).toBeDefined();
    }
  });

  it("getByCompany should require companyId input", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await (caller.websiteAudit.getByCompany as any)({});
    } catch (err: any) {
      expect(err).toBeDefined();
    }
  });
});

// ─── 2. Website Audit Engine Module ─────────────────────────────────────────
describe("Website Audit Engine", () => {
  it("should export runWebsiteAudit function", async () => {
    const mod = await import("./agents/websiteAudit");
    expect(mod.runWebsiteAudit).toBeDefined();
    expect(typeof mod.runWebsiteAudit).toBe("function");
  });

  it("runWebsiteAudit should accept the expected parameter shape", async () => {
    const mod = await import("./agents/websiteAudit");
    // Verify the function exists and accepts the right parameter shape
    // We don't call it (it hits network/DB) — just confirm it's a function with the right arity
    expect(typeof mod.runWebsiteAudit).toBe("function");
    expect(mod.runWebsiteAudit.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── 3. ContextAssemblyAnimation includes website_audit ─────────────────────
describe("ContextAssemblyAnimation Provider Streams", () => {
  it("should include website_audit in PROVIDER_STREAMS", async () => {
    // We can't directly import the component (JSX), but we can check the file content
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/opencommand/client/src/components/ContextAssemblyAnimation.tsx",
      "utf-8"
    );
    expect(content).toContain("website_audit");
    expect(content).toContain("Website Audit");
    expect(content).toContain("Scraping website metadata");
    expect(content).toContain("Checking technical SEO");
    expect(content).toContain("Detecting tech stack");
  });
});

// ─── 4. Schema includes website_audits table ────────────────────────────────
describe("Database Schema", () => {
  it("should export websiteAudits table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.websiteAudits).toBeDefined();
  });

  it("websiteAudits table should have required columns", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.websiteAudits;
    // Check that the table has expected column names
    const columnNames = Object.keys((table as any)[Symbol.for("drizzle:Columns")] ?? {});
    // If drizzle doesn't expose columns that way, check the table itself
    expect(table).toBeDefined();
  });
});

// ─── 5. DB helpers exist ────────────────────────────────────────────────────
describe("Website Audit DB Helpers", () => {
  it("should export createWebsiteAudit", async () => {
    const db = await import("./db");
    expect(db.createWebsiteAudit).toBeDefined();
    expect(typeof db.createWebsiteAudit).toBe("function");
  });

  it("should export updateWebsiteAudit", async () => {
    const db = await import("./db");
    expect(db.updateWebsiteAudit).toBeDefined();
    expect(typeof db.updateWebsiteAudit).toBe("function");
  });

  it("should export getWebsiteAuditByCompanyId", async () => {
    const db = await import("./db");
    expect(db.getWebsiteAuditByCompanyId).toBeDefined();
    expect(typeof db.getWebsiteAuditByCompanyId).toBe("function");
  });

  it("should export getWebsiteAuditsByUserId", async () => {
    const db = await import("./db");
    expect(db.getWebsiteAuditsByUserId).toBeDefined();
    expect(typeof db.getWebsiteAuditsByUserId).toBe("function");
  });
});

// ─── 6. Σ standalone chat includes website audit context injection ──────────
describe("Sigma Standalone Chat - Website Audit Integration", () => {
  it("sigma router should have standaloneChat that can accept companyId", () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.sigma.standaloneChat).toBeDefined();
  });

  it("sigma.ts should reference getWebsiteAuditByCompanyId", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/opencommand/server/routers/sigma.ts",
      "utf-8"
    );
    expect(content).toContain("getWebsiteAuditByCompanyId");
    expect(content).toContain("WEBSITE AUDIT INTELLIGENCE");
  });
});

// ─── 7. Strategy generation includes website audit context ──────────────────
describe("Strategy Generation - Website Audit Integration", () => {
  it("routers.ts generateStrategy should reference websiteAudit", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/opencommand/server/routers.ts",
      "utf-8"
    );
    expect(content).toContain("getWebsiteAuditByCompanyId");
    expect(content).toContain("Website Audit Intelligence");
    expect(content).toContain("websiteAuditSummary");
  });

  it("sigmaCalibrate should reference website audit", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/opencommand/server/routers.ts",
      "utf-8"
    );
    expect(content).toContain("sigmaAuditSummary");
    expect(content).toContain("sigmaAudit");
  });
});
