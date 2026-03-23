import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module so tests don't need a real database
vi.mock("./db", () => ({
  adminGetAllUsers: vi.fn(),
  adminGetUserKpis: vi.fn(),
  adminGetUserTimeline: vi.fn(),
  adminGetDailyActivity: vi.fn(),
  getPageViewsByUser: vi.fn(),
  getTopPagesByUser: vi.fn(),
  getSessionsByUser: vi.fn(),
  getUserFeedbackByUserId: vi.fn(),
  insertPageView: vi.fn(),
  upsertUserSession: vi.fn(),
}));

import {
  adminGetAllUsers,
  adminGetUserKpis,
  adminGetUserTimeline,
  adminGetDailyActivity,
  getPageViewsByUser,
  getTopPagesByUser,
  getSessionsByUser,
  insertPageView,
  upsertUserSession,
} from "./db";

describe("Admin Analytics DB helpers (mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adminGetAllUsers returns a list of users", async () => {
    const mockUsers = [
      { id: 1, name: "Alice", email: "alice@example.com", role: "admin", loginMethod: "oauth", createdAt: new Date(), lastSignedIn: new Date() },
      { id: 2, name: "Bob", email: "bob@example.com", role: "user", loginMethod: "oauth", createdAt: new Date(), lastSignedIn: new Date() },
    ];
    vi.mocked(adminGetAllUsers).mockResolvedValue(mockUsers as never);
    const result = await adminGetAllUsers();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Alice");
    expect(result[1].role).toBe("user");
  });

  it("adminGetUserKpis returns numeric KPIs for a user", async () => {
    const mockKpis = {
      agents: 3,
      companies: 1,
      pageViews: 42,
      sessions: 7,
      featureEvents: 15,
      feedback: 2,
      completedOnboardings: 1,
    };
    vi.mocked(adminGetUserKpis).mockResolvedValue(mockKpis);
    const result = await adminGetUserKpis(1);
    expect(result).not.toBeNull();
    expect(result!.pageViews).toBe(42);
    expect(result!.agents).toBe(3);
  });

  it("adminGetUserTimeline returns merged events sorted by date", async () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000);
    const mockTimeline = [
      { id: 1, type: "feature", label: "agents:create", metadata: null, createdAt: now },
      { id: 2, type: "pageview", label: "/mission-control", metadata: null, createdAt: earlier },
    ];
    vi.mocked(adminGetUserTimeline).mockResolvedValue(mockTimeline as never);
    const result = await adminGetUserTimeline(1);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("feature");
    expect(result[1].type).toBe("pageview");
  });

  it("adminGetDailyActivity returns date-bucketed counts", async () => {
    const mockActivity = [
      { date: "2026-03-20", count: 5 },
      { date: "2026-03-21", count: 12 },
      { date: "2026-03-22", count: 3 },
    ];
    vi.mocked(adminGetDailyActivity).mockResolvedValue(mockActivity as never);
    const result = await adminGetDailyActivity(1);
    expect(result).toHaveLength(3);
    expect(result[1].count).toBe(12);
  });

  it("getPageViewsByUser returns page views for a user", async () => {
    const mockViews = [
      { id: 1, userId: 1, sessionId: "abc", path: "/mission-control", referrer: null, userAgent: null, duration: null, createdAt: new Date() },
    ];
    vi.mocked(getPageViewsByUser).mockResolvedValue(mockViews as never);
    const result = await getPageViewsByUser(1);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("/mission-control");
  });

  it("getTopPagesByUser returns top pages sorted by count", async () => {
    const mockTopPages = [
      { path: "/mission-control", count: 20 },
      { path: "/analytics", count: 8 },
    ];
    vi.mocked(getTopPagesByUser).mockResolvedValue(mockTopPages as never);
    const result = await getTopPagesByUser(1);
    expect(result[0].path).toBe("/mission-control");
    expect(Number(result[0].count)).toBe(20);
  });

  it("insertPageView calls db with correct fields", async () => {
    vi.mocked(insertPageView).mockResolvedValue(undefined);
    await insertPageView({ userId: 1, sessionId: "sess123", path: "/home", referrer: null, userAgent: null, duration: null });
    expect(insertPageView).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, path: "/home", sessionId: "sess123" })
    );
  });

  it("upsertUserSession calls db with correct fields", async () => {
    vi.mocked(upsertUserSession).mockResolvedValue(undefined);
    const now = new Date();
    await upsertUserSession({ userId: 1, sessionId: "sess123", lastSeenAt: now, exitPath: "/home", userAgent: null, duration: 5000 });
    expect(upsertUserSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, sessionId: "sess123" })
    );
  });

  it("getSessionsByUser returns sessions for a user", async () => {
    const mockSessions = [
      { id: 1, userId: 1, sessionId: "sess1", startedAt: new Date(), lastSeenAt: new Date(), pageCount: 4, entryPath: "/", exitPath: "/mission-control", userAgent: null, duration: 120000 },
    ];
    vi.mocked(getSessionsByUser).mockResolvedValue(mockSessions as never);
    const result = await getSessionsByUser(1);
    expect(result).toHaveLength(1);
    expect(result[0].pageCount).toBe(4);
  });
});
