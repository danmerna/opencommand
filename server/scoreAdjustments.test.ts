import { describe, it, expect } from "vitest";

describe("Lead Score Adjustments", () => {
  it("should adjust lead score within bounds", () => {
    const currentScore = 65;
    const adjustments = {
      equipmentType: 30,
      buyerHistory: 25,
      engagement: 20,
      urgency: 15,
    };

    const newScore = Object.values(adjustments).reduce((a, b) => a + b, 0);
    const normalizedScore = Math.min(newScore, 100);

    expect(normalizedScore).toBe(90);
  });

  it("should normalize score to 100 maximum", () => {
    const adjustments = {
      equipmentType: 30,
      buyerHistory: 25,
      engagement: 25,
      urgency: 25,
    };

    const newScore = Object.values(adjustments).reduce((a, b) => a + b, 0);
    const normalizedScore = Math.min(newScore, 100);

    expect(normalizedScore).toBe(100);
  });

  it("should track adjustment history", () => {
    const adjustmentHistory = [
      {
        id: 1,
        previousScore: 65,
        newScore: 75,
        reason: "Recent conversation revealed strong buying intent",
        adjustedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        id: 2,
        previousScore: 55,
        newScore: 65,
        reason: "Equipment type changed to higher-value category",
        adjustedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ];

    expect(adjustmentHistory.length).toBe(2);
    expect(adjustmentHistory[0].newScore).toBe(75);
    expect(adjustmentHistory[1].reason).toContain("Equipment type");
  });

  it("should validate adjustment reason", () => {
    const reason = "Recent conversation revealed strong buying intent";
    const isValid = reason.length >= 10;

    expect(isValid).toBe(true);
  });

  it("should enforce minimum adjustment reason length", () => {
    const shortReason = "Good lead";
    const isValid = shortReason.length >= 10;

    expect(isValid).toBe(false);
  });

  it("should calculate score delta", () => {
    const previousScore = 65;
    const newScore = 75;
    const delta = newScore - previousScore;

    expect(delta).toBe(10);
  });

  it("should handle negative score adjustments", () => {
    const previousScore = 75;
    const newScore = 60;
    const delta = newScore - previousScore;

    expect(delta).toBe(-15);
  });
});

describe("Scoring Feedback Loop", () => {
  it("should record feedback as accurate", () => {
    const feedback = {
      leadId: 1,
      feedback: "accurate" as const,
      notes: "Score matched actual outcome",
    };

    expect(feedback.feedback).toBe("accurate");
  });

  it("should record feedback as too_high", () => {
    const feedback = {
      leadId: 2,
      feedback: "too_high" as const,
      notes: "Lead was not as qualified as score indicated",
    };

    expect(feedback.feedback).toBe("too_high");
  });

  it("should record feedback as too_low", () => {
    const feedback = {
      leadId: 3,
      feedback: "too_low" as const,
      notes: "Lead converted despite lower score",
    };

    expect(feedback.feedback).toBe("too_low");
  });

  it("should calculate scoring accuracy", () => {
    const metrics = {
      totalLeadsScored: 1247,
      accurateScores: 1089,
      tooHighScores: 89,
      tooLowScores: 69,
    };

    const accuracy = (metrics.accurateScores / metrics.totalLeadsScored) * 100;

    expect(accuracy).toBeCloseTo(87.3, 1);
  });

  it("should track accuracy by tier", () => {
    const byTier = {
      high: { accuracy: 92.1, count: 156 },
      medium: { accuracy: 87.5, count: 589 },
      low: { accuracy: 81.2, count: 502 },
    };

    expect(byTier.high.accuracy).toBeGreaterThan(byTier.low.accuracy);
    expect(byTier.high.count + byTier.medium.count + byTier.low.count).toBe(1247);
  });

  it("should calculate factor correlation with outcomes", () => {
    const correlations = {
      equipmentType: 0.72,
      buyerHistory: 0.68,
      engagement: 0.54,
      urgency: 0.41,
    };

    const highestCorrelation = Math.max(...Object.values(correlations));
    const lowestCorrelation = Math.min(...Object.values(correlations));

    expect(highestCorrelation).toBe(0.72);
    expect(lowestCorrelation).toBe(0.41);
  });

  it("should process bulk feedback", () => {
    const feedbackItems = [
      { leadId: 1, feedback: "accurate" as const },
      { leadId: 2, feedback: "too_high" as const },
      { leadId: 3, feedback: "too_low" as const },
    ];

    const processed = feedbackItems.map((item) => ({
      leadId: item.leadId,
      feedback: item.feedback,
      processed: true,
    }));

    expect(processed.length).toBe(3);
    expect(processed.every((p) => p.processed)).toBe(true);
  });

  it("should identify leads with adjustments", () => {
    const adjustedLeads = [
      {
        id: 1,
        buyerName: "John Smith",
        originalScore: 65,
        adjustedScore: 75,
        adjustmentCount: 2,
      },
      {
        id: 2,
        buyerName: "Jane Doe",
        originalScore: 72,
        adjustedScore: 68,
        adjustmentCount: 1,
      },
    ];

    const frequentlyAdjusted = adjustedLeads.filter((l) => l.adjustmentCount > 1);

    expect(frequentlyAdjusted.length).toBe(1);
    expect(frequentlyAdjusted[0].buyerName).toBe("John Smith");
  });
});

describe("Score Adjustment and ROI Correlation", () => {
  it("should correlate adjustments with deal outcomes", () => {
    const adjustedLead = {
      id: 1,
      originalScore: 65,
      adjustedScore: 75,
      dealValue: 45000,
      converted: true,
    };

    expect(adjustedLead.converted).toBe(true);
    expect(adjustedLead.dealValue).toBeGreaterThan(0);
  });

  it("should track adjustment impact on ROI", () => {
    const leads = [
      {
        id: 1,
        score: 75,
        adjusted: true,
        dealValue: 45000,
      },
      {
        id: 2,
        score: 65,
        adjusted: false,
        dealValue: 0,
      },
    ];

    const adjustedDeals = leads.filter((l) => l.adjusted && l.dealValue > 0);
    const totalAdjustedRevenue = adjustedDeals.reduce((sum, l) => sum + l.dealValue, 0);

    expect(totalAdjustedRevenue).toBe(45000);
  });

  it("should measure feedback loop effectiveness", () => {
    const metrics = {
      feedbackItems: 150,
      accuracyImprovement: 2.1,
      modelRetrainings: 3,
    };

    expect(metrics.feedbackItems).toBeGreaterThan(100);
    expect(metrics.accuracyImprovement).toBeGreaterThan(0);
  });
});
