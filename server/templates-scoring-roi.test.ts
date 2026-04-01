import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { calculateLeadScore } from "./agents/scoring/leadScoring";

describe("Lead Scoring", () => {
  it("should calculate high score for repeat John Deere buyer", () => {
    const score = calculateLeadScore({
      id: 1,
      buyerName: "John Smith",
      equipmentType: "john_deere",
      buyerHistory: "repeat",
      engagementLevel: "high",
      responseTime: 2,
    });

    expect(score.score).toBeGreaterThan(75);
    expect(score.tier).toBe("high");
    expect(score.factors.equipmentType).toBe(30);
    expect(score.factors.buyerHistory).toBe(25);
    expect(score.factors.engagement).toBe(25);
    expect(score.factors.urgency).toBe(20);
  });

  it("should calculate medium score for new buyer with medium engagement", () => {
    const score = calculateLeadScore({
      id: 2,
      buyerName: "Jane Doe",
      equipmentType: "kubota",
      buyerHistory: undefined,
      engagementLevel: "medium",
      responseTime: 45,
    });

    expect(score.score).toBeGreaterThanOrEqual(50);
    expect(score.score).toBeLessThan(75);
    expect(score.tier).toBe("medium");
  });

  it("should calculate low score for cold lead with low engagement", () => {
    const score = calculateLeadScore({
      id: 3,
      buyerName: "Bob Wilson",
      equipmentType: "parts",
      buyerHistory: undefined,
      engagementLevel: "low",
      responseTime: 180,
    });

    expect(score.score).toBeLessThan(50);
    expect(score.tier).toBe("low");
  });

  it("should include reasoning for score factors", () => {
    const score = calculateLeadScore({
      id: 4,
      buyerName: "Alice Johnson",
      equipmentType: "john_deere",
      buyerHistory: "repeat",
      engagementLevel: "high",
      responseTime: 3,
    });

    expect(score.reasoning.length).toBeGreaterThan(0);
    expect(score.reasoning.some((r) => r.includes("High-value"))).toBe(true);
  });

  it("should handle missing equipment type gracefully", () => {
    const score = calculateLeadScore({
      id: 5,
      buyerName: "Unknown",
      equipmentType: "unknown_type",
      buyerHistory: undefined,
      engagementLevel: "medium",
      responseTime: 60,
    });

    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
  });

  it("should cap score at 100", () => {
    const score = calculateLeadScore({
      id: 6,
      buyerName: "Perfect Lead",
      equipmentType: "john_deere",
      buyerHistory: "repeat",
      engagementLevel: "high",
      responseTime: 1,
    });

    expect(score.score).toBeLessThanOrEqual(100);
  });
});

describe("Template Rendering", () => {
  it("should render template with variables", () => {
    const template = {
      subject: "Hi {{buyer_name}}, check out our {{equipment_type}}",
      body: "We have {{inventory_count}} units available at {{dealer_name}}",
    };

    const variables = {
      buyer_name: "John",
      equipment_type: "tractors",
      inventory_count: "5",
      dealer_name: "Johnson Tractor Sales",
    };

    let subject = template.subject;
    let body = template.body;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, "g"), value);
      body = body.replace(new RegExp(placeholder, "g"), value);
    }

    expect(subject).toBe("Hi John, check out our tractors");
    expect(body).toBe("We have 5 units available at Johnson Tractor Sales");
  });

  it("should extract variables from template", () => {
    const template = "Hi {{buyer_name}}, check out {{equipment_type}} at {{dealer_name}}";
    const variablePattern = /\{\{(\w+)\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = variablePattern.exec(template)) !== null) {
      variables.add(match[1]);
    }

    expect(variables.size).toBe(3);
    expect(variables.has("buyer_name")).toBe(true);
    expect(variables.has("equipment_type")).toBe(true);
    expect(variables.has("dealer_name")).toBe(true);
  });

  it("should handle missing variables gracefully", () => {
    const template = {
      subject: "Hi {{buyer_name}}, special offer on {{equipment_type}}",
      body: "Contact {{dealer_contact}} for details",
    };

    const variables = {
      buyer_name: "Jane",
      equipment_type: "combines",
      // dealer_contact is missing
    };

    let subject = template.subject;
    let body = template.body;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, "g"), value);
      body = body.replace(new RegExp(placeholder, "g"), value);
    }

    expect(subject).toBe("Hi Jane, special offer on combines");
    expect(body).toBe("Contact {{dealer_contact}} for details");
  });
});

describe("ROI Metrics", () => {
  it("should calculate open rate correctly", () => {
    const totalResponsesSent = 100;
    const totalOpens = 45;
    const openRate = (totalOpens / totalResponsesSent) * 100;

    expect(openRate).toBe(45);
  });

  it("should calculate click-through rate correctly", () => {
    const totalOpens = 45;
    const totalClicks = 18;
    const clickRate = (totalClicks / totalOpens) * 100;

    expect(clickRate).toBeCloseTo(40, 1);
  });

  it("should calculate conversion rate correctly", () => {
    const totalResponsesSent = 100;
    const totalSalesGenerated = 8;
    const conversionRate = (totalSalesGenerated / totalResponsesSent) * 100;

    expect(conversionRate).toBe(8);
  });

  it("should calculate ROI percentage correctly", () => {
    const totalRevenueGenerated = 50000;
    const totalResponsesSent = 100;
    const costPerResponse = 0.5;
    const totalCost = totalResponsesSent * costPerResponse;
    const roiPercentage = ((totalRevenueGenerated - totalCost) / totalCost) * 100;

    expect(roiPercentage).toBeGreaterThan(99000); // High ROI
  });

  it("should handle zero responses gracefully", () => {
    const totalResponsesSent = 0;
    const totalOpens = 0;
    const openRate = totalResponsesSent > 0 ? (totalOpens / totalResponsesSent) * 100 : 0;

    expect(openRate).toBe(0);
  });

  it("should calculate revenue per response correctly", () => {
    const totalRevenueGenerated = 50000;
    const totalResponsesSent = 100;
    const revenuePerResponse = totalRevenueGenerated / totalResponsesSent;

    expect(revenuePerResponse).toBe(500);
  });
});
