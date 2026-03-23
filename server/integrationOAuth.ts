import { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { userConnections, toolProviders, toolCategories } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

// ─── OAuth Provider Configs ───────────────────────────────────────────────────

type OAuthProviderConfig = {
  slug: string;
  name: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientId: () => string;
  clientSecret: () => string;
};

const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  hubspot: {
    slug: "hubspot",
    name: "HubSpot",
    authUrl: "https://app.hubspot.com/oauth/authorize",
    tokenUrl: "https://api.hubapi.com/oauth/v1/token",
    scopes: ["contacts", "crm.objects.contacts.read", "crm.objects.deals.read"],
    clientId: () => ENV.hubspotClientId,
    clientSecret: () => ENV.hubspotClientSecret,
  },
  mailchimp: {
    slug: "mailchimp",
    name: "Mailchimp",
    authUrl: "https://login.mailchimp.com/oauth2/authorize",
    tokenUrl: "https://login.mailchimp.com/oauth2/token",
    scopes: [],
    clientId: () => ENV.mailchimpClientId,
    clientSecret: () => ENV.mailchimpClientSecret,
  },
  slack: {
    slug: "slack",
    name: "Slack",
    authUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: ["channels:read", "chat:write", "users:read"],
    clientId: () => ENV.slackClientId,
    clientSecret: () => ENV.slackClientSecret,
  },
  stripe_connect: {
    slug: "stripe_connect",
    name: "Stripe",
    authUrl: "https://connect.stripe.com/oauth/authorize",
    tokenUrl: "https://connect.stripe.com/oauth/token",
    scopes: ["read_write"],
    clientId: () => ENV.stripeOAuthClientId,
    clientSecret: () => ENV.stripeSecretKey,
  },
  salesforce: {
    slug: "salesforce",
    name: "Salesforce",
    authUrl: "https://login.salesforce.com/services/oauth2/authorize",
    tokenUrl: "https://login.salesforce.com/services/oauth2/token",
    scopes: ["api", "refresh_token", "offline_access"],
    clientId: () => ENV.salesforceClientId,
    clientSecret: () => ENV.salesforceClientSecret,
  },
};

// ─── State Store (in-memory, short-lived) ─────────────────────────────────────

const pendingStates = new Map<string, { userId: number; providerSlug: string; origin: string }>();

// ─── Route Registration ───────────────────────────────────────────────────────

export function registerIntegrationOAuthRoutes(app: Express) {
  // Step 1: Generate authorization URL and redirect
  app.get("/api/integration/oauth/start", async (req: Request, res: Response) => {
    const { provider, userId, origin } = req.query as { provider: string; userId: string; origin: string };

    const config = OAUTH_PROVIDERS[provider];
    if (!config) {
      return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }

    const clientId = config.clientId();
    if (!clientId) {
      // Provider not configured — redirect back with error
      const redirectUrl = new URL(`${origin}/integration-hub`);
      redirectUrl.searchParams.set("error", `${config.name} OAuth is not configured. Please add credentials in Settings.`);
      return res.redirect(redirectUrl.toString());
    }

    const state = nanoid(32);
    pendingStates.set(state, { userId: parseInt(userId), providerSlug: provider, origin });

    // Auto-expire state after 10 minutes
    setTimeout(() => pendingStates.delete(state), 10 * 60 * 1000);

    const callbackUrl = `${origin}/api/integration/oauth/callback`;
    const authUrl = new URL(config.authUrl);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", callbackUrl);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("response_type", "code");
    if (config.scopes.length > 0) {
      authUrl.searchParams.set("scope", config.scopes.join(" "));
    }

    return res.redirect(authUrl.toString());
  });

  // Step 2: Handle OAuth callback and exchange code for token
  app.get("/api/integration/oauth/callback", async (req: Request, res: Response) => {
    const { code, state, error } = req.query as { code?: string; state?: string; error?: string };

    const stateData = state ? pendingStates.get(state) : null;
    if (!stateData) {
      return res.status(400).send("Invalid or expired OAuth state. Please try connecting again.");
    }

    pendingStates.delete(state!);
    const { userId, providerSlug, origin } = stateData;
    const redirectBase = `${origin}/integration-hub`;

    if (error) {
      const url = new URL(redirectBase);
      url.searchParams.set("error", `OAuth denied: ${error}`);
      return res.redirect(url.toString());
    }

    if (!code) {
      const url = new URL(redirectBase);
      url.searchParams.set("error", "No authorization code received.");
      return res.redirect(url.toString());
    }

    const config = OAUTH_PROVIDERS[providerSlug];
    if (!config) {
      return res.status(400).send("Unknown provider.");
    }

    try {
      // Exchange code for tokens
      const callbackUrl = `${origin}/api/integration/oauth/callback`;
      const tokenRes = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: config.clientId(),
          client_secret: config.clientSecret(),
          redirect_uri: callbackUrl,
          code,
        }).toString(),
      });

      const tokenData = await tokenRes.json() as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        token_type?: string;
        error?: string;
        error_description?: string;
      };

      if (!tokenRes.ok || tokenData.error) {
        throw new Error(tokenData.error_description ?? tokenData.error ?? "Token exchange failed");
      }

      const accessToken = tokenData.access_token ?? "";
      const refreshToken = tokenData.refresh_token ?? null;
      const expiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null;

      // Look up provider in DB
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const providers = await db.select().from(toolProviders).where(eq(toolProviders.slug, providerSlug)).limit(1);
      const provider = providers[0];
      if (!provider) throw new Error(`Provider ${providerSlug} not found in database`);

      // Fetch account name from provider API
      let accountName = config.name;
      try {
        accountName = await fetchAccountName(providerSlug, accessToken);
      } catch {
        // Non-fatal: use provider name as fallback
      }

      // Upsert connection (update if exists, insert if not)
      const existing = await db.select().from(userConnections)
        .where(and(eq(userConnections.userId, userId), eq(userConnections.providerId, provider.id)))
        .limit(1);

      if (existing.length > 0) {
        await db.update(userConnections).set({
          status: "connected",
          accessToken,
          refreshToken: refreshToken ?? undefined,
          tokenExpiresAt: expiresAt ?? undefined,
          accountName,
          updatedAt: new Date(),
        }).where(eq(userConnections.id, existing[0].id));
      } else {
        await db.insert(userConnections).values({
          userId,
          providerId: provider.id,
          categoryId: provider.categoryId,
          status: "connected",
          accessToken,
          refreshToken: refreshToken ?? undefined,
          tokenExpiresAt: expiresAt ?? undefined,
          accountName,
        });
      }

      // Redirect back to Integration Hub with success
      const url = new URL(redirectBase);
      url.searchParams.set("connected", providerSlug);
      url.searchParams.set("account", accountName);
      return res.redirect(url.toString());

    } catch (err: any) {
      console.error(`[IntegrationOAuth] Token exchange error for ${providerSlug}:`, err.message);
      const url = new URL(redirectBase);
      url.searchParams.set("error", `Failed to connect ${config.name}: ${err.message}`);
      return res.redirect(url.toString());
    }
  });

  // Step 3: Disconnect a provider (revoke token)
  app.post("/api/integration/oauth/disconnect", express.json(), async (req: Request, res: Response) => {
    const { connectionId, userId } = req.body as { connectionId: number; userId: number };
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    await db.update(userConnections).set({
      status: "disconnected",
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      updatedAt: new Date(),
    }).where(and(eq(userConnections.id, connectionId), eq(userConnections.userId, userId)));

    return res.json({ success: true });
  });

  // Step 4: Get live data preview for a connected provider
  app.get("/api/integration/oauth/preview", async (req: Request, res: Response) => {
    const { connectionId, userId } = req.query as { connectionId: string; userId: string };
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const conns = await db.select({
      connection: userConnections,
      provider: toolProviders,
    })
      .from(userConnections)
      .leftJoin(toolProviders, eq(userConnections.providerId, toolProviders.id))
      .where(and(eq(userConnections.id, parseInt(connectionId)), eq(userConnections.userId, parseInt(userId))))
      .limit(1);

    if (!conns.length || !conns[0].connection.accessToken) {
      return res.status(404).json({ error: "Connection not found or no access token" });
    }

    const { connection, provider } = conns[0];
    const providerSlug = provider?.slug ?? "";

    try {
      const preview = await fetchLivePreview(providerSlug, connection.accessToken!);
      return res.json({ success: true, preview });
    } catch (err: any) {
      return res.status(200).json({ success: false, preview: { error: err.message } });
    }
  });
}

// ─── Provider-Specific API Calls ──────────────────────────────────────────────

async function fetchAccountName(providerSlug: string, accessToken: string): Promise<string> {
  switch (providerSlug) {
    case "hubspot": {
      const r = await fetch(`https://api.hubapi.com/oauth/v1/access-tokens/${accessToken}`);
      const d = await r.json() as { hub_domain?: string; hub_id?: number };
      return d.hub_domain ?? `HubSpot Portal ${d.hub_id ?? ""}`;
    }
    case "slack": {
      const r = await fetch("https://slack.com/api/auth.test", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await r.json() as { team?: string; ok?: boolean };
      return d.team ?? "Slack Workspace";
    }
    case "mailchimp": {
      const r = await fetch("https://login.mailchimp.com/oauth2/metadata", {
        headers: { Authorization: `OAuth ${accessToken}` },
      });
      const d = await r.json() as { accountname?: string };
      return d.accountname ?? "Mailchimp Account";
    }
    case "stripe_connect": {
      return "Stripe Account";
    }
    case "salesforce": {
      const r = await fetch("https://login.salesforce.com/services/oauth2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await r.json() as { organization_id?: string; name?: string };
      return d.name ?? `Salesforce Org ${d.organization_id ?? ""}`;
    }
    default:
      return providerSlug;
  }
}

async function fetchLivePreview(providerSlug: string, accessToken: string): Promise<Record<string, unknown>> {
  switch (providerSlug) {
    case "hubspot": {
      const r = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1&properties=firstname,lastname,email", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await r.json() as { total?: number; results?: unknown[] };
      return { totalContacts: d.total ?? 0, sampleContacts: (d.results ?? []).slice(0, 3) };
    }
    case "slack": {
      const r = await fetch("https://slack.com/api/conversations.list?limit=5", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await r.json() as { channels?: Array<{ name: string; num_members?: number }> };
      return { channels: (d.channels ?? []).map(c => ({ name: c.name, members: c.num_members ?? 0 })) };
    }
    case "mailchimp": {
      // Get server prefix first
      const metaR = await fetch("https://login.mailchimp.com/oauth2/metadata", {
        headers: { Authorization: `OAuth ${accessToken}` },
      });
      const meta = await metaR.json() as { dc?: string; total_subscribers?: number };
      const dc = meta.dc ?? "us1";
      const listsR = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists?count=3`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const lists = await listsR.json() as { lists?: Array<{ name: string; stats?: { member_count?: number } }> };
      return {
        lists: (lists.lists ?? []).map(l => ({ name: l.name, subscribers: l.stats?.member_count ?? 0 })),
        totalSubscribers: meta.total_subscribers ?? 0,
      };
    }
    case "stripe_connect": {
      return { message: "Stripe account connected. Payments are live." };
    }
    case "salesforce": {
      // Note: Salesforce preview needs instance_url from metadata, but for preview we use the standard endpoint
      const r = await fetch("https://login.salesforce.com/services/oauth2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await r.json() as { name?: string; email?: string; organization_id?: string };
      return { user: d.name ?? "Unknown", email: d.email ?? "", orgId: d.organization_id ?? "" };
    }
    default:
      return { status: "connected" };
  }
}

// Need express for the disconnect route
import express from "express";
