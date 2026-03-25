import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Merge email-first waitlist user if they signed up with email before OAuth
      if (userInfo.email) {
        await db.mergeEmailUserToOAuth(userInfo.email, userInfo.openId);
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Parse returnPath from state if present (JSON-encoded payload)
      let finalDestination = "/";
      try {
        const decoded = Buffer.from(state, "base64").toString("utf-8");
        const parsed = JSON.parse(decoded);
        if (parsed.returnPath && typeof parsed.returnPath === "string") {
          finalDestination = parsed.returnPath;
        }
      } catch {
        // state was plain base64 URI string — no returnPath, stay at "/"
      }

      // Redirect to the same-origin relay page instead of directly to the
      // final destination. This fixes iOS Safari / ITP cookie-dropping:
      // the OAuth portal (api.manus.im) is a different domain, so the browser
      // sees the callback as a cross-site redirect and may drop SameSite:None
      // cookies on the very next same-origin request. By bouncing through
      // /auth/relay (same origin), we give the browser a chance to fully
      // commit the cookie before any API calls fire.
      const relayUrl = `/auth/relay?to=${encodeURIComponent(finalDestination)}`;
      res.redirect(302, relayUrl);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
