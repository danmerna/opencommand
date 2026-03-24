import { Express, Request, Response } from "express";
import { Nango } from "@nangohq/node";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { userConnections, toolProviders } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ─── Nango Client ─────────────────────────────────────────────────────────────

let _nango: Nango | null = null;

function getNango(): Nango {
  if (!_nango) {
    if (!ENV.nangoSecretKey) {
      throw new Error("NANGO_SECRET_KEY is not configured");
    }
    _nango = new Nango({ secretKey: ENV.nangoSecretKey });
  }
  return _nango;
}

// ─── Nango-managed provider slugs ────────────────────────────────────────────

/** These providers are handled via Nango instead of direct OAuth */
export const NANGO_PROVIDERS = new Set(["salesforce"]);

/** Map our internal slug → Nango integration ID */
const NANGO_INTEGRATION_IDS: Record<string, string> = {
  salesforce: "salesforce",
};

// ─── Route Registration ───────────────────────────────────────────────────────

export function registerNangoRoutes(app: Express) {
  /**
   * POST /api/nango/session
   * Creates a Nango Connect session for the given provider + user.
   * Returns { sessionToken, connectUrl } for the frontend to open.
   */
  app.post("/api/nango/session", async (req: Request, res: Response) => {
    const { provider, userId, origin } = req.body as {
      provider: string;
      userId: number;
      origin: string;
    };

    if (!NANGO_PROVIDERS.has(provider)) {
      return res.status(400).json({ error: `Provider '${provider}' is not managed by Nango` });
    }

    const integrationId = NANGO_INTEGRATION_IDS[provider];
    if (!integrationId) {
      return res.status(400).json({ error: `No Nango integration ID for provider '${provider}'` });
    }

    try {
      const nango = getNango();
      const connectionId = `user-${userId}-${provider}`;

      // Create a Nango Connect session
      const session = await nango.createConnectSession({
        end_user: {
          id: String(userId),
        },
        allowed_integrations: [integrationId],
      });

      return res.json({
        sessionToken: session.data.token,
        connectUrl: `https://connect.nango.dev?token=${session.data.token}`,
        connectionId,
      });
    } catch (err: any) {
      console.error("[Nango] Session creation error:", err.message);
      return res.status(500).json({ error: `Failed to create Nango session: ${err.message}` });
    }
  });

  /**
   * POST /api/nango/webhook
   * Receives Nango webhook events (connection created/deleted).
   * Saves the Nango connectionId to our DB so we can proxy API calls later.
   */
  app.post("/api/nango/webhook", async (req: Request, res: Response) => {
    const event = req.body as {
      type: string;
      connectionId?: string;
      providerConfigKey?: string;
      endUser?: { id: string };
    };

    console.log("[Nango Webhook]", event.type, event.providerConfigKey, event.connectionId);

    if (event.type === "auth" && event.connectionId && event.providerConfigKey && event.endUser) {
      const providerSlug = Object.entries(NANGO_INTEGRATION_IDS).find(
        ([, id]) => id === event.providerConfigKey
      )?.[0];

      if (providerSlug) {
        try {
          const db = await getDb();
          if (!db) throw new Error("Database unavailable");

          const userId = parseInt(event.endUser.id);

          // Fetch account name from Nango connection metadata
          const nango = getNango();
          let accountName = providerSlug;
          try {
            const conn = await nango.getConnection(event.providerConfigKey, event.connectionId);
            const rawCreds = conn.credentials as Record<string, unknown>;
            accountName = (rawCreds?.["instance_url"] as string) ?? `Salesforce (${event.connectionId})`;
          } catch {
            // non-fatal
          }

          // Look up provider in DB
          const providers = await db
            .select()
            .from(toolProviders)
            .where(eq(toolProviders.slug, providerSlug))
            .limit(1);
          const provider = providers[0];
          if (!provider) throw new Error(`Provider ${providerSlug} not in DB`);

          // Upsert connection — store Nango connectionId in accessToken field
          const existing = await db
            .select()
            .from(userConnections)
            .where(
              and(
                eq(userConnections.userId, userId),
                eq(userConnections.providerId, provider.id)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            await db
              .update(userConnections)
              .set({
                status: "connected",
                accessToken: event.connectionId, // store Nango connectionId
                refreshToken: null,
                accountName,
                updatedAt: new Date(),
              })
              .where(eq(userConnections.id, existing[0].id));
          } else {
            await db.insert(userConnections).values({
              userId,
              providerId: provider.id,
              categoryId: provider.categoryId,
              status: "connected",
              accessToken: event.connectionId, // store Nango connectionId
              accountName,
            });
          }

          console.log(`[Nango Webhook] Saved connection for user ${userId} → ${providerSlug}`);
        } catch (err: any) {
          console.error("[Nango Webhook] Error saving connection:", err.message);
        }
      }
    }

    return res.json({ received: true });
  });

  /**
   * GET /api/nango/proxy
   * Proxies an API call to a Nango-managed provider on behalf of a user.
   * Query params: userId, provider, endpoint (relative path), method
   */
  app.get("/api/nango/proxy", async (req: Request, res: Response) => {
    const { userId, provider, endpoint } = req.query as {
      userId: string;
      provider: string;
      endpoint: string;
    };

    if (!NANGO_PROVIDERS.has(provider)) {
      return res.status(400).json({ error: `Provider '${provider}' is not managed by Nango` });
    }

    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database unavailable" });

      // Get the Nango connectionId from our DB
      const providers = await db
        .select()
        .from(toolProviders)
        .where(eq(toolProviders.slug, provider))
        .limit(1);
      const prov = providers[0];
      if (!prov) return res.status(404).json({ error: "Provider not found" });

      const conns = await db
        .select()
        .from(userConnections)
        .where(
          and(
            eq(userConnections.userId, parseInt(userId)),
            eq(userConnections.providerId, prov.id),
            eq(userConnections.status, "connected")
          )
        )
        .limit(1);

      if (!conns.length || !conns[0].accessToken) {
        return res.status(404).json({ error: "No active Nango connection found" });
      }

      const nangoConnectionId = conns[0].accessToken;
      const integrationId = NANGO_INTEGRATION_IDS[provider];

      const nango = getNango();
      const response = await nango.proxy({
        providerConfigKey: integrationId,
        connectionId: nangoConnectionId,
        method: "GET",
        endpoint,
      });

      return res.json(response.data);
    } catch (err: any) {
      console.error("[Nango Proxy] Error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  });
}

/**
 * Helper: get a fresh access token for a Nango-managed connection.
 * Use this in tRPC procedures that need to call Salesforce directly.
 */
export async function getNangoAccessToken(
  providerSlug: string,
  nangoConnectionId: string
): Promise<string> {
  const integrationId = NANGO_INTEGRATION_IDS[providerSlug];
  if (!integrationId) throw new Error(`No Nango integration for ${providerSlug}`);

  const nango = getNango();
  const conn = await nango.getConnection(integrationId, nangoConnectionId);
  const creds = conn.credentials as { access_token?: string };
  if (!creds.access_token) throw new Error("No access token in Nango connection");
  return creds.access_token;
}
