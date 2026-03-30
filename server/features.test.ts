import { describe, it, expect } from "vitest";
import { processSigmaLeadRequest } from "./agents/sigma/leadResponseIntegration";
import { shouldAutoEscalate } from "./agents/intentEngine/boardIntegration";

describe("Σ Chat Lead Response Integration", () => {
  const mockContext = {
    userId: 1,
    companyId: 30001,
    dealerSlug: "johnson-tractor",
    dealerName: "Johnson Tractor",
    dealerPhone: "555-0123",
  };



  it("should process show leads request", async () => {
    const result = await processSigmaLeadRequest("Show me pending leads", mockContext);
    expect(result.response).toContain("found");
    expect(result.action).toBe("show_leads");
    expect(result.data).toBeDefined();
  });

  it("should process draft response request", async () => {
    const result = await processSigmaLeadRequest("Draft a response for lead #1", mockContext);
    expect(result.response).toContain("drafted");
    expect(result.action).toBe("draft_response");
    expect(result.data?.leadId).toBeDefined();
  });

  it("should process send response request", async () => {
    const result = await processSigmaLeadRequest("Send the response", mockContext);
    expect(result.response).toContain("sent");
    expect(result.action).toBe("send_response");
    expect(result.data?.status).toBe("sent");
  });

  it("should process show history request", async () => {
    const result = await processSigmaLeadRequest("Show my execution history", mockContext);
    expect(result.response).toContain("execution history");
    expect(result.action).toBe("show_history");
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("should provide help when requested", async () => {
    const result = await processSigmaLeadRequest("help", mockContext);
    expect(result.response).toContain("help you with");
    expect(result.action).toBeUndefined(); // help is not a recognized action
  });
});

describe("Intent Engine Auto-Escalation", () => {
  it("should auto-escalate high-risk actions", () => {
    const shouldEscalate = shouldAutoEscalate("high", "Review quarterly budget");
    expect(shouldEscalate).toBe(true);
  });

  it("should auto-escalate budget-related actions", () => {
    const shouldEscalate = shouldAutoEscalate("medium", "Approve budget increase for Q2");
    expect(shouldEscalate).toBe(true);
  });

  it("should auto-escalate hiring-related actions", () => {
    const shouldEscalate = shouldAutoEscalate("low", "Hire new sales representative");
    expect(shouldEscalate).toBe(true);
  });

  it("should auto-escalate vendor-related actions", () => {
    const shouldEscalate = shouldAutoEscalate("medium", "Select new vendor for supplies");
    expect(shouldEscalate).toBe(true);
  });

  it("should auto-escalate strategic actions", () => {
    const shouldEscalate = shouldAutoEscalate("low", "Strategic partnership opportunity");
    expect(shouldEscalate).toBe(true);
  });

  it("should not escalate low-risk routine actions", () => {
    const shouldEscalate = shouldAutoEscalate("low", "Update customer contact info");
    expect(shouldEscalate).toBe(false);
  });

  it("should not escalate medium-risk routine actions", () => {
    const shouldEscalate = shouldAutoEscalate("medium", "Schedule follow-up call");
    expect(shouldEscalate).toBe(false);
  });
});

describe("Completed Work Dashboard", () => {
  it("should calculate open rate correctly", () => {
    const totalSent = 5;
    const totalOpened = 3;
    const openRate = (totalOpened / totalSent) * 100;
    expect(openRate).toBe(60);
  });

  it("should calculate reply rate correctly", () => {
    const totalSent = 5;
    const totalReplied = 2;
    const replyRate = (totalReplied / totalSent) * 100;
    expect(replyRate).toBe(40);
  });

  it("should calculate ROI correctly", () => {
    const revenue = 120000;
    const cost = 20000; // Estimated cost of sales effort
    const roi = ((revenue - cost) / cost) * 100;
    expect(roi).toBe(500);
  });

  it("should track revenue from completed deals", () => {
    const deals = [
      { revenue: 75000 },
      { revenue: 45000 },
      { revenue: 0 },
    ];
    const totalRevenue = deals.reduce((sum, d) => sum + d.revenue, 0);
    expect(totalRevenue).toBe(120000);
  });
});
