import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    joinWaitlist: vi.fn().mockResolvedValue({ insertId: 1 }),
    getWaitlistCount: vi.fn().mockResolvedValue(42),
    isEmailOnWaitlist: vi.fn().mockResolvedValue(false),
  };
});

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createPublicContext(): TrpcContext {
  return { user: null, req: {} as any, res: {} as any };
}

describe("Waitlist Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("waitlist.count", () => {
    it("returns the waitlist count", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const count = await caller.waitlist.count();
      expect(count).toBe(42);
    });
  });

  describe("waitlist.join", () => {
    it("successfully joins with a valid email", async () => {
      const { isEmailOnWaitlist } = await import("./db");
      vi.mocked(isEmailOnWaitlist).mockResolvedValueOnce(false);

      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.waitlist.join({ email: "test@example.com", source: "creators" });
      expect(result.success).toBe(true);
      expect(result.alreadyJoined).toBe(false);
    });

    it("returns alreadyJoined=true for a duplicate email", async () => {
      const { isEmailOnWaitlist } = await import("./db");
      vi.mocked(isEmailOnWaitlist).mockResolvedValueOnce(true);

      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.waitlist.join({ email: "existing@example.com", source: "creators" });
      expect(result.success).toBe(true);
      expect(result.alreadyJoined).toBe(true);
    });

    it("rejects an invalid email format", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      await expect(
        caller.waitlist.join({ email: "not-an-email", source: "creators" })
      ).rejects.toThrow();
    });

    it("does not call joinWaitlist when email already exists", async () => {
      const { isEmailOnWaitlist, joinWaitlist } = await import("./db");
      vi.mocked(isEmailOnWaitlist).mockResolvedValueOnce(true);

      const caller = appRouter.createCaller(createPublicContext());
      await caller.waitlist.join({ email: "existing@example.com" });
      expect(vi.mocked(joinWaitlist)).not.toHaveBeenCalled();
    });

    it("calls notifyOwner on new signup", async () => {
      const { isEmailOnWaitlist } = await import("./db");
      const { notifyOwner } = await import("./_core/notification");
      vi.mocked(isEmailOnWaitlist).mockResolvedValueOnce(false);

      const caller = appRouter.createCaller(createPublicContext());
      await caller.waitlist.join({ email: "new@example.com", source: "creators" });
      expect(vi.mocked(notifyOwner)).toHaveBeenCalledWith(
        expect.objectContaining({ title: "New Waitlist Signup" })
      );
    });
  });
});
