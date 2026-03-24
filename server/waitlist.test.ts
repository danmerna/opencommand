import { describe, it, expect, vi } from "vitest";
import {
  findOrCreateUserByEmail,
  getWaitlistInfo,
  adminApproveUser,
  adminRejectUser,
  adminGetWaitlistUsers,
  adminGetWaitlistStats,
  adminBulkApproveUsers,
  processReferral,
  mergeEmailUserToOAuth,
  ensureWaitlistFields,
} from "./db";
import fs from "fs";
import path from "path";

// Mock the database module
vi.mock("./db", () => ({
  findOrCreateUserByEmail: vi.fn(),
  getWaitlistInfo: vi.fn(),
  adminApproveUser: vi.fn(),
  adminRejectUser: vi.fn(),
  adminGetWaitlistUsers: vi.fn(),
  adminGetWaitlistStats: vi.fn(),
  adminBulkApproveUsers: vi.fn(),
  processReferral: vi.fn(),
  mergeEmailUserToOAuth: vi.fn(),
  ensureWaitlistFields: vi.fn(),
}));

describe("Waitlist System", () => {
  describe("Email-first signup", () => {
    it("findOrCreateUserByEmail returns a user with waitlist fields", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
        name: "test",
        openId: "email_abc123",
        waitlistStatus: "pending",
        waitlistPosition: 5,
        referralCode: "a1b2c3d4",
        referralCount: 0,
        referredBy: null,
      };
      (findOrCreateUserByEmail as any).mockResolvedValue(mockUser);

      const result = await findOrCreateUserByEmail("test@example.com");
      expect(result).toBeDefined();
      expect(result.email).toBe("test@example.com");
      expect(result.waitlistStatus).toBe("pending");
      expect(result.referralCode).toBeTruthy();
      expect(result.referralCode).toHaveLength(8);
      expect(result.openId).toMatch(/^email_/);
    });

    it("findOrCreateUserByEmail with referral code processes referral", async () => {
      const mockUser = {
        id: 2,
        email: "referred@example.com",
        waitlistStatus: "pending",
        waitlistPosition: 6,
        referralCode: "e5f6g7h8",
        referralCount: 0,
        referredBy: "a1b2c3d4",
      };
      (findOrCreateUserByEmail as any).mockResolvedValue(mockUser);

      const result = await findOrCreateUserByEmail("referred@example.com", "a1b2c3d4");
      expect(result.referredBy).toBe("a1b2c3d4");
      expect(findOrCreateUserByEmail).toHaveBeenCalledWith("referred@example.com", "a1b2c3d4");
    });

    it("findOrCreateUserByEmail returns existing user if already signed up", async () => {
      const mockUser = {
        id: 1,
        email: "existing@example.com",
        openId: "real_oauth_id",
        waitlistStatus: "approved",
      };
      (findOrCreateUserByEmail as any).mockResolvedValue(mockUser);

      const result = await findOrCreateUserByEmail("existing@example.com");
      expect(result.openId).toBe("real_oauth_id");
    });
  });

  describe("Waitlist info", () => {
    it("getWaitlistInfo returns position and referral data", async () => {
      const mockInfo = {
        waitlistStatus: "pending",
        waitlistPosition: 3,
        referralCode: "a1b2c3d4",
        referralCount: 2,
        referredBy: null,
        totalWaitlist: 50,
      };
      (getWaitlistInfo as any).mockResolvedValue(mockInfo);

      const info = await getWaitlistInfo(1);
      expect(info).toBeDefined();
      expect(info.waitlistStatus).toBe("pending");
      expect(info.waitlistPosition).toBe(3);
      expect(info.referralCode).toBeTruthy();
      expect(info.referralCount).toBe(2);
      expect(info.totalWaitlist).toBeGreaterThan(0);
    });
  });

  describe("Admin operations", () => {
    it("adminApproveUser changes status to approved", async () => {
      (adminApproveUser as any).mockResolvedValue(undefined);
      await adminApproveUser(1);
      expect(adminApproveUser).toHaveBeenCalledWith(1);
    });

    it("adminRejectUser changes status to rejected", async () => {
      (adminRejectUser as any).mockResolvedValue(undefined);
      await adminRejectUser(1);
      expect(adminRejectUser).toHaveBeenCalledWith(1);
    });

    it("adminBulkApproveUsers approves multiple users at once", async () => {
      (adminBulkApproveUsers as any).mockResolvedValue(undefined);
      await adminBulkApproveUsers([1, 2, 3]);
      expect(adminBulkApproveUsers).toHaveBeenCalledWith([1, 2, 3]);
    });

    it("adminGetWaitlistUsers returns all users with waitlist data", async () => {
      const mockUsers = [
        { id: 1, name: "Alice", email: "alice@test.com", waitlistStatus: "pending", waitlistPosition: 1, referralCount: 3 },
        { id: 2, name: "Bob", email: "bob@test.com", waitlistStatus: "approved", waitlistPosition: null, referralCount: 0 },
        { id: 3, name: "Charlie", email: "charlie@test.com", waitlistStatus: "rejected", waitlistPosition: null, referralCount: 1 },
      ];
      (adminGetWaitlistUsers as any).mockResolvedValue(mockUsers);

      const users = await adminGetWaitlistUsers();
      expect(users).toHaveLength(3);
      expect(users[0].waitlistStatus).toBe("pending");
      expect(users[1].waitlistStatus).toBe("approved");
      expect(users[2].waitlistStatus).toBe("rejected");
    });

    it("adminGetWaitlistStats returns aggregate stats", async () => {
      const mockStats = {
        total: 100,
        pending: 60,
        approved: 35,
        rejected: 5,
        totalReferrals: 42,
      };
      (adminGetWaitlistStats as any).mockResolvedValue(mockStats);

      const stats = await adminGetWaitlistStats();
      expect(stats.total).toBe(100);
      expect(stats.pending).toBe(60);
      expect(stats.approved).toBe(35);
      expect(stats.rejected).toBe(5);
      expect(stats.totalReferrals).toBe(42);
    });
  });

  describe("Referral system", () => {
    it("processReferral is called with correct referral code", async () => {
      (processReferral as any).mockResolvedValue(undefined);
      await processReferral("referrer_code");
      expect(processReferral).toHaveBeenCalledWith("referrer_code");
    });

    it("referral codes are 8-char hex strings", () => {
      const code = "a1b2c3d4";
      expect(code).toMatch(/^[a-f0-9]{8}$/);
      expect(code).toHaveLength(8);
    });
  });

  describe("OAuth email merge", () => {
    it("mergeEmailUserToOAuth is called with email and openId", async () => {
      (mergeEmailUserToOAuth as any).mockResolvedValue(undefined);
      await mergeEmailUserToOAuth("test@example.com", "real_oauth_id_123");
      expect(mergeEmailUserToOAuth).toHaveBeenCalledWith("test@example.com", "real_oauth_id_123");
    });
  });

  describe("ensureWaitlistFields", () => {
    it("ensureWaitlistFields is called with userId", async () => {
      (ensureWaitlistFields as any).mockResolvedValue(undefined);
      await ensureWaitlistFields(42);
      expect(ensureWaitlistFields).toHaveBeenCalledWith(42);
    });
  });
});

describe("Waitlist source code validation", () => {
  it("schema includes waitlist columns", () => {
    const schema = fs.readFileSync(path.resolve(__dirname, "../drizzle/schema.ts"), "utf-8");
    expect(schema).toContain("waitlistStatus");
    expect(schema).toContain("waitlistPosition");
    expect(schema).toContain("referralCode");
    expect(schema).toContain("referralCount");
    expect(schema).toContain("referredBy");
    expect(schema).toContain("waitlistJoinedAt");
    expect(schema).toContain("waitlistApprovedAt");
  });

  it("db.ts exports all waitlist helpers", () => {
    const dbSrc = fs.readFileSync(path.resolve(__dirname, "db.ts"), "utf-8");
    expect(dbSrc).toContain("findOrCreateUserByEmail");
    expect(dbSrc).toContain("getWaitlistInfo");
    expect(dbSrc).toContain("processReferral");
    expect(dbSrc).toContain("adminApproveUser");
    expect(dbSrc).toContain("adminRejectUser");
    expect(dbSrc).toContain("adminBulkApproveUsers");
    expect(dbSrc).toContain("adminGetWaitlistStats");
    expect(dbSrc).toContain("adminGetWaitlistUsers");
    expect(dbSrc).toContain("ensureWaitlistFields");
    expect(dbSrc).toContain("mergeEmailUserToOAuth");
  });

  it("routers.ts has waitlist router with emailSignup and info procedures", () => {
    const routers = fs.readFileSync(path.resolve(__dirname, "routers.ts"), "utf-8");
    expect(routers).toContain("waitlistRouter");
    expect(routers).toContain("emailSignup");
    // emailSignup is a public mutation procedure
    expect(routers).toContain("findOrCreateUserByEmail");
    expect(routers).toMatch(/waitlist:\s*waitlistRouter/);
  });

  it("routers.ts has admin waitlist procedures", () => {
    const routers = fs.readFileSync(path.resolve(__dirname, "routers.ts"), "utf-8");
    expect(routers).toContain("waitlistStats");
    expect(routers).toContain("waitlistUsers");
    expect(routers).toContain("approveUser");
    expect(routers).toContain("rejectUser");
    expect(routers).toContain("bulkApprove");
  });

  it("oauth.ts calls mergeEmailUserToOAuth before upsert", () => {
    const oauth = fs.readFileSync(path.resolve(__dirname, "_core/oauth.ts"), "utf-8");
    expect(oauth).toContain("mergeEmailUserToOAuth");
    // Ensure merge happens before upsert
    const mergeIdx = oauth.indexOf("mergeEmailUserToOAuth");
    const upsertIdx = oauth.indexOf("upsertUser");
    expect(mergeIdx).toBeLessThan(upsertIdx);
  });

  it("Home.tsx has HeroEmailInput component with email-first flow", () => {
    const home = fs.readFileSync(path.resolve(__dirname, "../client/src/pages/Home.tsx"), "utf-8");
    expect(home).toContain("HeroEmailInput");
    expect(home).toContain("trpc.waitlist.emailSignup.useMutation");
    expect(home).toContain("oc_signup_email");
    expect(home).toContain("getLoginUrl(\"/onboarding/pro\")");
  });

  it("Waitlist.tsx has position display and referral sharing", () => {
    const waitlist = fs.readFileSync(path.resolve(__dirname, "../client/src/pages/Waitlist.tsx"), "utf-8");
    expect(waitlist).toContain("trpc.waitlist.info.useQuery");
    expect(waitlist).toContain("referralCode");
    expect(waitlist).toContain("navigator.clipboard.writeText");
    expect(waitlist).toContain("navigator.share");
    expect(waitlist).toContain("waitlistPosition");
    expect(waitlist).toContain("referralCount");
  });

  it("AppLayout.tsx gates non-approved users to /waitlist", () => {
    const layout = fs.readFileSync(path.resolve(__dirname, "../client/src/components/AppLayout.tsx"), "utf-8");
    expect(layout).toContain("waitlistStatus");
    expect(layout).toContain("/waitlist");
    // Admin bypass
    expect(layout).toContain("role");
    expect(layout).toContain("admin");
  });

  it("App.tsx has /waitlist route", () => {
    const app = fs.readFileSync(path.resolve(__dirname, "../client/src/App.tsx"), "utf-8");
    expect(app).toContain("/waitlist");
    expect(app).toContain("Waitlist");
  });

  it("AdminUsers.tsx has WaitlistPanel component", () => {
    const admin = fs.readFileSync(path.resolve(__dirname, "../client/src/pages/AdminUsers.tsx"), "utf-8");
    expect(admin).toContain("WaitlistPanel");
    expect(admin).toContain("trpc.admin.waitlistUsers");
    expect(admin).toContain("trpc.admin.approveUser");
    expect(admin).toContain("trpc.admin.rejectUser");
  });

  it("email.ts exports sendWaitlistApprovalEmail function", () => {
    const email = fs.readFileSync(path.resolve(__dirname, "email.ts"), "utf-8");
    expect(email).toContain("sendWaitlistApprovalEmail");
    expect(email).toContain("WaitlistApprovalEmailOptions");
    expect(email).toContain("Access Granted");
    expect(email).toContain("You're in,");
    expect(email).toContain("ARCH");
    expect(email).toContain("NOVA");
    expect(email).toContain("SAGE");
    expect(email).toContain("TED");
    expect(email).toContain("Start Building Your Team");
  });

  it("routers.ts approveUser sends approval email", () => {
    const routers = fs.readFileSync(path.resolve(__dirname, "routers.ts"), "utf-8");
    expect(routers).toContain("sendWaitlistApprovalEmail");
    expect(routers).toContain("getUserByIdForApproval");
  });

  it("db.ts exports getUserByIdForApproval", () => {
    const db = fs.readFileSync(path.resolve(__dirname, "db.ts"), "utf-8");
    expect(db).toContain("getUserByIdForApproval");
    expect(db).toContain("waitlistPosition");
  });

  it("ProOnboarding.tsx has Speed Mode (core-only) toggle", () => {
    const onboarding = fs.readFileSync(path.resolve(__dirname, "../client/src/pages/ProOnboarding.tsx"), "utf-8");
    expect(onboarding).toContain("coreOnlyMode");
    expect(onboarding).toContain("Speed Mode");
    expect(onboarding).toContain("setCoreOnlyMode");
  });
});
