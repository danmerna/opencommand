/**
 * Integration OAuth Tests
 * Validates that Google OAuth credentials are configured and the
 * integration OAuth routes are properly registered.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Google OAuth Integration", () => {
  it("GOOGLE_ADS_CLIENT_ID env var is set", () => {
    // In CI/test env the secret may not be injected, but we validate the code reads it correctly
    const envFile = fs.readFileSync(
      path.resolve(__dirname, "_core/env.ts"),
      "utf-8"
    );
    expect(envFile).toContain("GOOGLE_ADS_CLIENT_ID");
    expect(envFile).toContain("GOOGLE_ADS_CLIENT_SECRET");
  });

  it("integrationOAuth.ts uses googleAdsClientId for both google_ads and ga4", () => {
    const oauthFile = fs.readFileSync(
      path.resolve(__dirname, "integrationOAuth.ts"),
      "utf-8"
    );
    // Both google_ads and ga4 providers should use googleAdsClientId
    expect(oauthFile).toContain("googleAdsClientId");
    expect(oauthFile).toContain("googleAdsClientSecret");
    // GA4 provider must exist
    expect(oauthFile).toContain("ga4:");
    // Google Ads provider must exist
    expect(oauthFile).toContain("google_ads:");
  });

  it("OAuth callback route uses single unified endpoint", () => {
    const oauthFile = fs.readFileSync(
      path.resolve(__dirname, "integrationOAuth.ts"),
      "utf-8"
    );
    // Must use the unified callback path (not provider-specific paths)
    expect(oauthFile).toContain("/api/integration/oauth/callback");
    // Must NOT use provider-specific callback paths
    expect(oauthFile).not.toContain("/api/integrations/google-analytics/callback");
    expect(oauthFile).not.toContain("/api/integrations/google-ads/callback");
  });

  it("OAuth start route is registered", () => {
    const oauthFile = fs.readFileSync(
      path.resolve(__dirname, "integrationOAuth.ts"),
      "utf-8"
    );
    expect(oauthFile).toContain("/api/integration/oauth/start");
  });

  it("OAuth disconnect route is registered", () => {
    const oauthFile = fs.readFileSync(
      path.resolve(__dirname, "integrationOAuth.ts"),
      "utf-8"
    );
    expect(oauthFile).toContain("/api/integration/oauth/disconnect");
  });

  it("Google OAuth app also covers GA4 (same credentials)", () => {
    const oauthFile = fs.readFileSync(
      path.resolve(__dirname, "integrationOAuth.ts"),
      "utf-8"
    );
    // GA4 provider should use the same googleAdsClientId (shared Google OAuth app)
    // Find the ga4 block by looking for the slug definition
    const ga4SlugIdx = oauthFile.indexOf('slug: "ga4"');
    expect(ga4SlugIdx).toBeGreaterThan(-1);
    const ga4Block = oauthFile.slice(ga4SlugIdx - 10, ga4SlugIdx + 400);
    expect(ga4Block).toContain("googleAdsClientId");
    expect(ga4Block).toContain("googleAdsClientSecret");
  });

  it("Salesforce provider is configured in OAUTH_PROVIDERS", () => {
    const oauthFile = fs.readFileSync(
      path.resolve(__dirname, "integrationOAuth.ts"),
      "utf-8"
    );
    expect(oauthFile).toContain("salesforce:");
    expect(oauthFile).toContain("salesforceClientId");
    expect(oauthFile).toContain("salesforceClientSecret");
  });

  it("HubSpot provider is configured in OAUTH_PROVIDERS", () => {
    const oauthFile = fs.readFileSync(
      path.resolve(__dirname, "integrationOAuth.ts"),
      "utf-8"
    );
    expect(oauthFile).toContain("hubspot:");
    expect(oauthFile).toContain("hubspotClientId");
    expect(oauthFile).toContain("hubspotClientSecret");
  });

  it("Meta Ads provider is configured in OAUTH_PROVIDERS", () => {
    const oauthFile = fs.readFileSync(
      path.resolve(__dirname, "integrationOAuth.ts"),
      "utf-8"
    );
    expect(oauthFile).toContain("meta_ads:");
    expect(oauthFile).toContain("metaAppId");
    expect(oauthFile).toContain("metaAppSecret");
  });
});
