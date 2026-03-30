import { describe, it, expect } from "vitest";
import { processResendWebhook, calculateEmailMetrics, formatTrackingForDisplay } from "./webhooks/resend";
import { getActionItemsForBoard, formatActionForBoard } from "./agents/intentEngine/askBoardIntegration";

describe("Email Tracking Webhook", () => {
  it("should process email.sent event", () => {
    const trackingData = {
      sent: true,
      sentAt: new Date(),
      delivered: false,
      opened: false,
      openCount: 0,
      clicked: false,
      clickCount: 0,
      bounced: false,
      complained: false,
      lastEvent: "sent",
      lastEventAt: new Date(),
    };

    const metrics = calculateEmailMetrics(trackingData);
    expect(metrics.status).toBe("sent");
    expect(metrics.isEngaged).toBe(false);
  });

  it("should process email.opened event", () => {
    const trackingData = {
      sent: true,
      sentAt: new Date(),
      delivered: true,
      deliveredAt: new Date(),
      opened: true,
      openedAt: new Date(),
      openCount: 1,
      clicked: false,
      clickCount: 0,
      bounced: false,
      complained: false,
      lastEvent: "opened",
      lastEventAt: new Date(),
    };

    const metrics = calculateEmailMetrics(trackingData);
    expect(metrics.status).toBe("opened");
    expect(metrics.openRate).toBe(100);
    expect(metrics.isEngaged).toBe(true);
  });

  it("should process email.clicked event", () => {
    const trackingData = {
      sent: true,
      sentAt: new Date(),
      delivered: true,
      deliveredAt: new Date(),
      opened: true,
      openedAt: new Date(),
      openCount: 2,
      clicked: true,
      clickedAt: new Date(),
      clickCount: 1,
      bounced: false,
      complained: false,
      lastEvent: "clicked",
      lastEventAt: new Date(),
    };

    const metrics = calculateEmailMetrics(trackingData);
    expect(metrics.status).toBe("clicked");
    expect(metrics.clickRate).toBe(100);
    expect(metrics.isEngaged).toBe(true);
  });

  it("should process email.bounced event", () => {
    const trackingData = {
      sent: true,
      sentAt: new Date(),
      delivered: false,
      opened: false,
      openCount: 0,
      clicked: false,
      clickCount: 0,
      bounced: true,
      bouncedAt: new Date(),
      complained: false,
      lastEvent: "bounced",
      lastEventAt: new Date(),
    };

    const metrics = calculateEmailMetrics(trackingData);
    expect(metrics.status).toBe("bounced");
    expect(metrics.isEngaged).toBe(false);
  });

  it("should process email.complained event", () => {
    const trackingData = {
      sent: true,
      sentAt: new Date(),
      delivered: true,
      deliveredAt: new Date(),
      opened: true,
      openedAt: new Date(),
      openCount: 1,
      clicked: false,
      clickCount: 0,
      bounced: false,
      complained: true,
      complaintAt: new Date(),
      lastEvent: "complained",
      lastEventAt: new Date(),
    };

    const metrics = calculateEmailMetrics(trackingData);
    expect(metrics.status).toBe("complained");
    expect(metrics.isEngaged).toBe(false);
  });

  it("should format tracking data for display", () => {
    const trackingData = {
      sent: true,
      sentAt: new Date("2026-03-30T10:00:00Z"),
      delivered: true,
      deliveredAt: new Date("2026-03-30T10:05:00Z"),
      opened: true,
      openedAt: new Date("2026-03-30T10:30:00Z"),
      openCount: 2,
      clicked: true,
      clickedAt: new Date("2026-03-30T11:00:00Z"),
      clickCount: 1,
      bounced: false,
      complained: false,
      lastEvent: "clicked",
      lastEventAt: new Date("2026-03-30T11:00:00Z"),
    };

    const display = formatTrackingForDisplay(trackingData);
    expect(display.timeline.length).toBe(4); // sent, delivered, opened, clicked
    expect(display.engagement).toBe("high");
    expect(display.summary).toContain("clicked");
  });

  it("should track multiple opens and clicks", () => {
    const trackingData = {
      sent: true,
      sentAt: new Date(),
      delivered: true,
      deliveredAt: new Date(),
      opened: true,
      openedAt: new Date(),
      openCount: 3,
      clicked: true,
      clickedAt: new Date(),
      clickCount: 2,
      bounced: false,
      complained: false,
      lastEvent: "clicked",
      lastEventAt: new Date(),
    };

    const display = formatTrackingForDisplay(trackingData);
    expect(display.summary).toContain("clicked 2x");
  });
});

describe("Ask Board Integration", () => {
  it("should format action for board display", () => {
    const action = {
      id: 1,
      actionText: "Approve Q2 budget increase",
      context: JSON.stringify({}),
      riskLevel: "high" as const,
      options: {
        recommended: { text: "Approve with conditions", reasoning: "Market conditions support growth" },
        conservative: { text: "Defer to Q3", reasoning: "Maintain cash reserves" },
        aggressive: { text: "Approve full amount plus 20%", reasoning: "Capitalize on momentum" },
      },
    };

    const formatted = formatActionForBoard(action);
    expect(formatted).toContain("Approve Q2 budget increase");
    expect(formatted).toContain("HIGH");
    expect(formatted).toContain("Approve with conditions");
  });

  it("should identify high-risk actions", () => {
    const action = {
      id: 1,
      actionText: "Approve Q2 budget increase",
      context: JSON.stringify({}),
      riskLevel: "high" as const,
      options: {
        recommended: { text: "Approve", reasoning: "Good" },
        conservative: { text: "Defer", reasoning: "Safe" },
        aggressive: { text: "Expand", reasoning: "Bold" },
      },
    };

    const formatted = formatActionForBoard(action);
    expect(formatted).toContain("HIGH");
  });
});

describe("Email Tracking Visualization", () => {
  it("should display high engagement state", () => {
    const tracking = {
      messageId: "msg_001",
      to: "user@example.com",
      subject: "Test",
      sent: true,
      sentAt: new Date(),
      delivered: true,
      deliveredAt: new Date(),
      opened: true,
      openedAt: new Date(),
      openCount: 1,
      clicked: true,
      clickedAt: new Date(),
      clickCount: 1,
      bounced: false,
      complained: false,
      engagement: "high" as const,
    };

    expect(tracking.engagement).toBe("high");
    expect(tracking.clicked).toBe(true);
  });

  it("should display medium engagement state", () => {
    const tracking = {
      messageId: "msg_002",
      to: "user@example.com",
      subject: "Test",
      sent: true,
      sentAt: new Date(),
      delivered: true,
      deliveredAt: new Date(),
      opened: true,
      openedAt: new Date(),
      openCount: 1,
      clicked: false,
      clickCount: 0,
      bounced: false,
      complained: false,
      engagement: "medium" as const,
    };

    expect(tracking.engagement).toBe("medium");
    expect(tracking.opened).toBe(true);
    expect(tracking.clicked).toBe(false);
  });

  it("should display low engagement state", () => {
    const tracking = {
      messageId: "msg_003",
      to: "user@example.com",
      subject: "Test",
      sent: true,
      sentAt: new Date(),
      delivered: true,
      deliveredAt: new Date(),
      opened: false,
      openCount: 0,
      clicked: false,
      clickCount: 0,
      bounced: false,
      complained: false,
      engagement: "low" as const,
    };

    expect(tracking.engagement).toBe("low");
    expect(tracking.delivered).toBe(true);
    expect(tracking.opened).toBe(false);
  });

  it("should display no engagement state (bounced)", () => {
    const tracking = {
      messageId: "msg_004",
      to: "invalid@example.com",
      subject: "Test",
      sent: true,
      sentAt: new Date(),
      delivered: false,
      opened: false,
      openCount: 0,
      clicked: false,
      clickCount: 0,
      bounced: true,
      bouncedAt: new Date(),
      complained: false,
      engagement: "none" as const,
    };

    expect(tracking.engagement).toBe("none");
    expect(tracking.bounced).toBe(true);
  });
});
