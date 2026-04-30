import { describe, it, expect } from "vitest";

describe("Admin Leads Dashboard", () => {
  describe("Backend: admin.leads procedure", () => {
    it("should be registered as an admin-only procedure", async () => {
      const { appRouter } = await import("./routers");
      const procedures = Object.keys((appRouter as any)._def.procedures);
      expect(procedures).toContain("admin.leads");
    });

    it("should have leadIntentHistory procedure for fetching decision log", async () => {
      const { appRouter } = await import("./routers");
      const procedures = Object.keys((appRouter as any)._def.procedures);
      expect(procedures).toContain("admin.leadIntentHistory");
    });
  });

  describe("Database: adminGetAllQuickStartLeads helper", () => {
    it("should be exported from db.ts", async () => {
      const db = await import("./db");
      expect(typeof db.adminGetAllQuickStartLeads).toBe("function");
    });

    it("should return an array", async () => {
      const db = await import("./db");
      const result = await db.adminGetAllQuickStartLeads();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Schema: quick_start_results table", () => {
    it("should have all required columns", async () => {
      const schema = await import("../drizzle/schema");
      const table = schema.quickStartResults;
      const columns = Object.keys(table);
      expect(columns).toContain("id");
      expect(columns).toContain("shareId");
      expect(columns).toContain("email");
      expect(columns).toContain("companyName");
      expect(columns).toContain("website");
      expect(columns).toContain("industry");
      expect(columns).toContain("recommendation");
      expect(columns).toContain("auditSummary");
      expect(columns).toContain("seoScore");
      expect(columns).toContain("techStack");
      expect(columns).toContain("socialPresence");
      expect(columns).toContain("createdAt");
    });
  });

  describe("Frontend: AdminLeads page", () => {
    it("should export a default component", async () => {
      const mod = await import("../client/src/pages/AdminLeads");
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe("function");
    });
  });

  describe("Navigation: DashboardLayout admin menu", () => {
    it("should include Leads in admin menu items", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/components/DashboardLayout.tsx", "utf-8");
      expect(content).toContain("Leads");
      expect(content).toContain("/admin/leads");
    });
  });

  describe("Routing: App.tsx", () => {
    it("should have /admin/leads route registered", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("client/src/App.tsx", "utf-8");
      expect(content).toContain("/admin/leads");
      expect(content).toContain("AdminLeads");
    });
  });
});
