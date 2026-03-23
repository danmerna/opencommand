export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  // OAuth provider credentials for Integration Hub
  hubspotClientId: process.env.HUBSPOT_CLIENT_ID ?? "",
  hubspotClientSecret: process.env.HUBSPOT_CLIENT_SECRET ?? "",
  mailchimpClientId: process.env.MAILCHIMP_CLIENT_ID ?? "",
  mailchimpClientSecret: process.env.MAILCHIMP_CLIENT_SECRET ?? "",
  slackClientId: process.env.SLACK_CLIENT_ID ?? "",
  slackClientSecret: process.env.SLACK_CLIENT_SECRET ?? "",
  stripeOAuthClientId: process.env.STRIPE_OAUTH_CLIENT_ID ?? "",
  salesforceClientId: process.env.SALESFORCE_CLIENT_ID ?? "",
  salesforceClientSecret: process.env.SALESFORCE_CLIENT_SECRET ?? "",
  // Meta (Facebook/Instagram) Ads
  metaAppId: process.env.META_APP_ID ?? "",
  metaAppSecret: process.env.META_APP_SECRET ?? "",
  // Google Ads
  googleAdsClientId: process.env.GOOGLE_ADS_CLIENT_ID ?? "",
  googleAdsClientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET ?? "",
  googleAdsDeveloperToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "",
  // TikTok Ads
  tiktokAppId: process.env.TIKTOK_APP_ID ?? "",
  tiktokAppSecret: process.env.TIKTOK_APP_SECRET ?? "",
  appBaseUrl: process.env.APP_BASE_URL ?? "",
};
