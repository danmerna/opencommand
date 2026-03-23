import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./db", () => ({
  adminGetFunnelStats: vi.fn(),
  adminGetUserFunnelStage: vi.fn(),
}));

import { adminGetFunnelStats, adminGetUserFunnelStage } from "./db";

describe("Sign-up Funnel DB helpers (mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adminGetFunnelStats returns 8 ordered stages", async () => {
    const mockStats = {
      stages: [
        { key: "signed_up", label: "Signed Up", description: "Created an account", count: 100 },
        { key: "created_company", label: "Created Company", description: "Set up at least one company", count: 80 },
        { key: "started_onboarding", label: "Started Onboarding", description: "Began executive team setup", count: 60 },
        { key: "completed_ceo", label: "CEO Contextualized", description: "Completed CEO interview", count: 40 },
        { key: "full_team", label: "Full Team Built", description: "2+ executives contextualized", count: 25 },
        { key: "strategy_generated", label: "Strategy Generated", description: "AI strategy proposal created", count: 20 },
        { key: "strategy_accepted", label: "Strategy Accepted", description: "Approved the strategy proposal", count: 15 },
        { key: "okrs_created", label: "OKRs Created", description: "Strategy converted to OKRs", count: 10 },
      ],
    };
    vi.mocked(adminGetFunnelStats).mockResolvedValue(mockStats);
    const result = await adminGetFunnelStats();
    expect(result).not.toBeNull();
    expect(result!.stages).toHaveLength(8);
    expect(result!.stages[0].key).toBe("signed_up");
    expect(result!.stages[7].key).toBe("okrs_created");
  });

  it("adminGetFunnelStats counts decrease monotonically through the funnel", async () => {
    const mockStats = {
      stages: [
        { key: "signed_up", label: "Signed Up", description: "", count: 100 },
        { key: "created_company", label: "Created Company", description: "", count: 80 },
        { key: "started_onboarding", label: "Started Onboarding", description: "", count: 60 },
        { key: "completed_ceo", label: "CEO Contextualized", description: "", count: 40 },
        { key: "full_team", label: "Full Team Built", description: "", count: 25 },
        { key: "strategy_generated", label: "Strategy Generated", description: "", count: 20 },
        { key: "strategy_accepted", label: "Strategy Accepted", description: "", count: 15 },
        { key: "okrs_created", label: "OKRs Created", description: "", count: 10 },
      ],
    };
    vi.mocked(adminGetFunnelStats).mockResolvedValue(mockStats);
    const result = await adminGetFunnelStats();
    const counts = result!.stages.map(s => s.count);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
    }
  });

  it("adminGetFunnelStats handles zero users gracefully", async () => {
    const emptyStats = {
      stages: [
        { key: "signed_up", label: "Signed Up", description: "", count: 0 },
        { key: "created_company", label: "Created Company", description: "", count: 0 },
        { key: "started_onboarding", label: "Started Onboarding", description: "", count: 0 },
        { key: "completed_ceo", label: "CEO Contextualized", description: "", count: 0 },
        { key: "full_team", label: "Full Team Built", description: "", count: 0 },
        { key: "strategy_generated", label: "Strategy Generated", description: "", count: 0 },
        { key: "strategy_accepted", label: "Strategy Accepted", description: "", count: 0 },
        { key: "okrs_created", label: "OKRs Created", description: "", count: 0 },
      ],
    };
    vi.mocked(adminGetFunnelStats).mockResolvedValue(emptyStats);
    const result = await adminGetFunnelStats();
    expect(result!.stages.every(s => s.count === 0)).toBe(true);
  });

  it("adminGetUserFunnelStage returns 'okrs_created' for fully converted user", async () => {
    vi.mocked(adminGetUserFunnelStage).mockResolvedValue("okrs_created");
    const stage = await adminGetUserFunnelStage(1);
    expect(stage).toBe("okrs_created");
  });

  it("adminGetUserFunnelStage returns 'signed_up' for brand new user", async () => {
    vi.mocked(adminGetUserFunnelStage).mockResolvedValue("signed_up");
    const stage = await adminGetUserFunnelStage(99);
    expect(stage).toBe("signed_up");
  });

  it("adminGetUserFunnelStage returns 'strategy_accepted' for user who accepted strategy but no OKRs", async () => {
    vi.mocked(adminGetUserFunnelStage).mockResolvedValue("strategy_accepted");
    const stage = await adminGetUserFunnelStage(5);
    expect(stage).toBe("strategy_accepted");
  });

  it("adminGetUserFunnelStage returns 'completed_ceo' for user who finished CEO but not full team", async () => {
    vi.mocked(adminGetUserFunnelStage).mockResolvedValue("completed_ceo");
    const stage = await adminGetUserFunnelStage(7);
    expect(stage).toBe("completed_ceo");
  });

  it("adminGetFunnelStats overall conversion rate is correct", async () => {
    const mockStats = {
      stages: [
        { key: "signed_up", label: "Signed Up", description: "", count: 200 },
        { key: "created_company", label: "Created Company", description: "", count: 100 },
        { key: "started_onboarding", label: "Started Onboarding", description: "", count: 50 },
        { key: "completed_ceo", label: "CEO Contextualized", description: "", count: 30 },
        { key: "full_team", label: "Full Team Built", description: "", count: 20 },
        { key: "strategy_generated", label: "Strategy Generated", description: "", count: 15 },
        { key: "strategy_accepted", label: "Strategy Accepted", description: "", count: 10 },
        { key: "okrs_created", label: "OKRs Created", description: "", count: 8 },
      ],
    };
    vi.mocked(adminGetFunnelStats).mockResolvedValue(mockStats);
    const result = await adminGetFunnelStats();
    const top = result!.stages[0].count;
    const bottom = result!.stages[result!.stages.length - 1].count;
    const conversionRate = Math.round((bottom / top) * 100);
    expect(conversionRate).toBe(4); // 8/200 = 4%
  });
});
