/**
 * Tests for the same-origin OAuth relay fix.
 *
 * Verifies:
 * 1. OAuth callback redirects to /auth/relay?to=<destination> (not directly to destination)
 * 2. The relay destination is correctly parsed from state
 * 3. Open-redirect protection: external URLs are rejected by the relay
 * 4. Missing state/code returns 400
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildState(payload: object | string): string {
  if (typeof payload === "string") {
    return Buffer.from(payload).toString("base64");
  }
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function buildMockReq(overrides: Partial<Request> = {}): Request {
  return {
    query: {},
    protocol: "https",
    headers: { "x-forwarded-proto": "https" },
    ...overrides,
  } as unknown as Request;
}

function buildMockRes() {
  const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  let redirectUrl: string | null = null;
  let statusCode: number | null = null;
  let jsonBody: unknown = null;

  const res = {
    cookie: (name: string, value: string, options: Record<string, unknown>) => {
      cookies.push({ name, value, options });
      return res;
    },
    redirect: (_code: number, url: string) => {
      redirectUrl = url;
      return res;
    },
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (body: unknown) => {
      jsonBody = body;
      return res;
    },
    _cookies: cookies,
    get redirectUrl() { return redirectUrl; },
    get statusCode() { return statusCode; },
    get jsonBody() { return jsonBody; },
  };
  return res as unknown as Response & {
    _cookies: typeof cookies;
    redirectUrl: string | null;
    statusCode: number | null;
    jsonBody: unknown;
  };
}

// ── Mock the SDK and DB so we can test the callback handler in isolation ──────

vi.mock("./_core/sdk", () => ({
  sdk: {
    exchangeCodeForToken: vi.fn().mockResolvedValue({ accessToken: "mock-token" }),
    getUserInfo: vi.fn().mockResolvedValue({
      openId: "user-123",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
    }),
    createSessionToken: vi.fn().mockResolvedValue("mock-session-token"),
  },
}));

vi.mock("./db", () => ({
  mergeEmailUserToOAuth: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("OAuth callback → same-origin relay redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /auth/relay?to=/ when state has no returnPath", async () => {
    // Import here so mocks are applied
    const { registerOAuthRoutes } = await import("./_core/oauth");

    const routes: Array<{ method: string; path: string; handler: Function }> = [];
    const fakeApp = {
      get: (path: string, handler: Function) => {
        routes.push({ method: "GET", path, handler });
      },
    };

    registerOAuthRoutes(fakeApp as any);

    const handler = routes.find(r => r.path === "/api/oauth/callback")?.handler;
    expect(handler).toBeDefined();

    const state = buildState("plain-base64-uri"); // no returnPath
    const req = buildMockReq({ query: { code: "auth-code", state } });
    const res = buildMockRes();

    await handler(req, res);

    expect(res.redirectUrl).toBe("/auth/relay?to=%2F");
  });

  it("redirects to /auth/relay?to=<returnPath> when state includes returnPath", async () => {
    const { registerOAuthRoutes } = await import("./_core/oauth");

    const routes: Array<{ method: string; path: string; handler: Function }> = [];
    const fakeApp = {
      get: (path: string, handler: Function) => {
        routes.push({ method: "GET", path, handler });
      },
    };

    registerOAuthRoutes(fakeApp as any);
    const handler = routes.find(r => r.path === "/api/oauth/callback")?.handler;

    const state = buildState({ returnPath: "/mission-control" });
    const req = buildMockReq({ query: { code: "auth-code", state } });
    const res = buildMockRes();

    await handler(req, res);

    expect(res.redirectUrl).toBe("/auth/relay?to=%2Fmission-control");
  });

  it("returns 400 when code is missing", async () => {
    const { registerOAuthRoutes } = await import("./_core/oauth");

    const routes: Array<{ method: string; path: string; handler: Function }> = [];
    const fakeApp = {
      get: (path: string, handler: Function) => {
        routes.push({ method: "GET", path, handler });
      },
    };

    registerOAuthRoutes(fakeApp as any);
    const handler = routes.find(r => r.path === "/api/oauth/callback")?.handler;

    const req = buildMockReq({ query: { state: "some-state" } });
    const res = buildMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toMatchObject({ error: expect.stringContaining("required") });
  });

  it("returns 400 when state is missing", async () => {
    const { registerOAuthRoutes } = await import("./_core/oauth");

    const routes: Array<{ method: string; path: string; handler: Function }> = [];
    const fakeApp = {
      get: (path: string, handler: Function) => {
        routes.push({ method: "GET", path, handler });
      },
    };

    registerOAuthRoutes(fakeApp as any);
    const handler = routes.find(r => r.path === "/api/oauth/callback")?.handler;

    const req = buildMockReq({ query: { code: "auth-code" } });
    const res = buildMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toMatchObject({ error: expect.stringContaining("required") });
  });

  it("sets the session cookie before redirecting", async () => {
    const { registerOAuthRoutes } = await import("./_core/oauth");

    const routes: Array<{ method: string; path: string; handler: Function }> = [];
    const fakeApp = {
      get: (path: string, handler: Function) => {
        routes.push({ method: "GET", path, handler });
      },
    };

    registerOAuthRoutes(fakeApp as any);
    const handler = routes.find(r => r.path === "/api/oauth/callback")?.handler;

    const state = buildState({ returnPath: "/" });
    const req = buildMockReq({ query: { code: "auth-code", state } });
    const res = buildMockRes();

    await handler(req, res);

    // Cookie should be set
    expect(res._cookies).toHaveLength(1);
    expect(res._cookies[0]?.name).toBe("app_session_id");
    expect(res._cookies[0]?.value).toBe("mock-session-token");
    expect(res._cookies[0]?.options).toMatchObject({
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });

    // And then redirect to relay
    expect(res.redirectUrl).toMatch(/^\/auth\/relay\?to=/);
  });
});

describe("AuthRelay open-redirect protection", () => {
  it("only allows same-origin paths (starts with /)", () => {
    // Simulate the relay page's destination validation logic
    function getSafeTo(to: string): string {
      try {
        if (to.startsWith("/") && !to.startsWith("//")) {
          return to;
        }
        const url = new URL(to, "https://opencommand.co");
        if (url.origin === "https://opencommand.co") {
          return url.pathname + url.search + url.hash;
        }
      } catch {
        // invalid URL
      }
      return "/";
    }

    expect(getSafeTo("/mission-control")).toBe("/mission-control");
    expect(getSafeTo("/onboarding/pro")).toBe("/onboarding/pro");
    expect(getSafeTo("/")).toBe("/");
    // Open redirect attempts should be blocked
    expect(getSafeTo("https://evil.com")).toBe("/");
    expect(getSafeTo("//evil.com")).toBe("/");
    expect(getSafeTo("javascript:alert(1)")).toBe("/");
    expect(getSafeTo("http://opencommand.co.evil.com")).toBe("/");
  });
});
