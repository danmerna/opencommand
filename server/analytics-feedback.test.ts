import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ─── Source file content tests ──────────────────────────────────────────────

const routersSource = fs.readFileSync(path.join(__dirname, "routers.ts"), "utf-8");
const dbSource = fs.readFileSync(path.join(__dirname, "db.ts"), "utf-8");
const schemaSource = fs.readFileSync(path.join(__dirname, "../drizzle/schema.ts"), "utf-8");
const analyticsPageSource = fs.readFileSync(path.join(__dirname, "../client/src/pages/Analytics.tsx"), "utf-8");
const feedbackWidgetSource = fs.readFileSync(path.join(__dirname, "../client/src/components/FeedbackWidget.tsx"), "utf-8");
const appLayoutSource = fs.readFileSync(path.join(__dirname, "../client/src/components/AppLayout.tsx"), "utf-8");
const homeSource = fs.readFileSync(path.join(__dirname, "../client/src/pages/Home.tsx"), "utf-8");
const dashboardLayoutSource = fs.readFileSync(path.join(__dirname, "../client/src/components/DashboardLayout.tsx"), "utf-8");

describe("Schema - feature_events and user_feedback tables", () => {
  it("defines the feature_events table", () => {
    expect(schemaSource).toContain('mysqlTable("feature_events"');
  });

  it("feature_events has required columns", () => {
    expect(schemaSource).toContain('userId: int("userId")');
    expect(schemaSource).toContain('feature: varchar("feature"');
    expect(schemaSource).toContain('action: varchar("action"');
    expect(schemaSource).toContain("metadata: json");
  });

  it("defines the user_feedback table", () => {
    expect(schemaSource).toContain('mysqlTable("user_feedback"');
  });

  it("user_feedback has required columns", () => {
    expect(schemaSource).toContain('type: mysqlEnum("type", ["bug", "feature", "general", "praise"])');
    expect(schemaSource).toContain('content: text("content")');
    expect(schemaSource).toContain('page: varchar("page"');
    expect(schemaSource).toContain('status: mysqlEnum("status", ["new", "reviewed", "resolved"])');
  });

  it("exports types for both tables", () => {
    expect(schemaSource).toContain("export type FeatureEvent");
    expect(schemaSource).toContain("export type InsertFeatureEvent");
    expect(schemaSource).toContain("export type UserFeedback");
    expect(schemaSource).toContain("export type InsertUserFeedback");
  });
});

describe("DB Helpers - analytics and feedback", () => {
  it("exports createFeatureEvent", () => {
    expect(dbSource).toContain("export async function createFeatureEvent");
  });

  it("exports getFeatureEventsAll", () => {
    expect(dbSource).toContain("export async function getFeatureEventsAll");
  });

  it("exports getFeatureEventsSummary with aggregation", () => {
    expect(dbSource).toContain("export async function getFeatureEventsSummary");
    expect(dbSource).toContain("COUNT(*)");
    expect(dbSource).toContain("COUNT(DISTINCT");
  });

  it("exports createUserFeedback", () => {
    expect(dbSource).toContain("export async function createUserFeedback");
  });

  it("exports getUserFeedbackAll", () => {
    expect(dbSource).toContain("export async function getUserFeedbackAll");
  });

  it("exports updateFeedbackStatus", () => {
    expect(dbSource).toContain("export async function updateFeedbackStatus");
  });
});

describe("Routers - analyticsRouter", () => {
  it("defines the analyticsRouter", () => {
    expect(routersSource).toContain("const analyticsRouter = router(");
  });

  it("has a track mutation", () => {
    expect(routersSource).toContain("track: protectedProcedure");
    expect(routersSource).toContain("createFeatureEvent");
  });

  it("has a summary query", () => {
    expect(routersSource).toContain("summary: protectedProcedure.query");
    expect(routersSource).toContain("getFeatureEventsSummary");
  });

  it("has an events query", () => {
    expect(routersSource).toContain("events: protectedProcedure.query");
    expect(routersSource).toContain("getFeatureEventsAll");
  });

  it("is registered in appRouter", () => {
    expect(routersSource).toContain("analytics: analyticsRouter");
  });
});

describe("Routers - feedbackRouter", () => {
  it("defines the feedbackRouter", () => {
    expect(routersSource).toContain("const feedbackRouter = router(");
  });

  it("has a submit mutation with type validation", () => {
    expect(routersSource).toContain("submit: protectedProcedure");
    expect(routersSource).toContain('z.enum(["bug", "feature", "general", "praise"])');
    expect(routersSource).toContain("createUserFeedback");
  });

  it("notifies owner on feedback submission", () => {
    expect(routersSource).toContain("notifyOwner");
  });

  it("has a list query for all feedback", () => {
    expect(routersSource).toContain("list: protectedProcedure.query");
    expect(routersSource).toContain("getUserFeedbackAll");
  });

  it("has a mine query for user's own feedback", () => {
    expect(routersSource).toContain("mine: protectedProcedure.query");
    expect(routersSource).toContain("getUserFeedbackByUserId");
  });

  it("has an updateStatus mutation", () => {
    expect(routersSource).toContain("updateStatus: protectedProcedure");
    expect(routersSource).toContain("updateFeedbackStatus");
  });

  it("is registered in appRouter", () => {
    expect(routersSource).toContain("feedback: feedbackRouter");
  });
});

describe("Analytics Page", () => {
  it("uses trpc.analytics.summary.useQuery", () => {
    expect(analyticsPageSource).toContain("trpc.analytics.summary.useQuery");
  });

  it("uses trpc.analytics.events.useQuery", () => {
    expect(analyticsPageSource).toContain("trpc.analytics.events.useQuery");
  });

  it("has time range filter (7d, 30d, all)", () => {
    expect(analyticsPageSource).toContain('"7d"');
    expect(analyticsPageSource).toContain('"30d"');
    expect(analyticsPageSource).toContain('"all"');
  });

  it("shows KPI cards for total events, features used, active users", () => {
    expect(analyticsPageSource).toContain("Total Events");
    expect(analyticsPageSource).toContain("Features Used");
    expect(analyticsPageSource).toContain("Active Users");
  });

  it("has a daily activity sparkline section", () => {
    expect(analyticsPageSource).toContain("Daily Activity");
  });

  it("has a feature breakdown section", () => {
    expect(analyticsPageSource).toContain("Feature Breakdown");
  });

  it("has an all-time summary table", () => {
    expect(analyticsPageSource).toContain("All-Time Summary");
  });

  it("handles unauthenticated state", () => {
    expect(analyticsPageSource).toContain("Sign in to view analytics");
  });
});

describe("Feedback Widget", () => {
  it("renders a floating trigger button", () => {
    expect(feedbackWidgetSource).toContain("Send feedback");
    expect(feedbackWidgetSource).toContain("MessageSquarePlus");
  });

  it("has four feedback types", () => {
    expect(feedbackWidgetSource).toContain('"bug"');
    expect(feedbackWidgetSource).toContain('"feature"');
    expect(feedbackWidgetSource).toContain('"general"');
    expect(feedbackWidgetSource).toContain('"praise"');
  });

  it("uses trpc.feedback.submit.useMutation", () => {
    expect(feedbackWidgetSource).toContain("trpc.feedback.submit.useMutation");
  });

  it("sends page path with feedback", () => {
    expect(feedbackWidgetSource).toContain("window.location.pathname");
  });

  it("shows success confirmation", () => {
    expect(feedbackWidgetSource).toContain("Thanks for your feedback");
  });

  it("has character limit of 2000", () => {
    expect(feedbackWidgetSource).toContain("maxLength={2000}");
    expect(feedbackWidgetSource).toContain("/2000");
  });

  it("only renders for authenticated users", () => {
    expect(feedbackWidgetSource).toContain("if (!isAuthenticated) return null");
  });
});

describe("FeedbackWidget integration in AppLayout", () => {
  it("imports FeedbackWidget", () => {
    expect(appLayoutSource).toContain('import FeedbackWidget from "./FeedbackWidget"');
  });

  it("renders FeedbackWidget component", () => {
    expect(appLayoutSource).toContain("<FeedbackWidget />");
  });
});

describe("Beta Badge", () => {
  it("shows Beta badge in homepage nav", () => {
    expect(homeSource).toContain("Beta");
    expect(homeSource).toContain("border-emerald-400/40");
    expect(homeSource).toContain("text-emerald-400");
  });

  it("shows Beta badge in DashboardLayout sidebar", () => {
    expect(dashboardLayoutSource).toContain("Beta");
    expect(dashboardLayoutSource).toContain("OpenCommand");
    expect(dashboardLayoutSource).toContain("border-emerald-400/40");
  });
});
