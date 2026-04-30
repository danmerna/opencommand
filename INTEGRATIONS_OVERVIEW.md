# OpenCommand — Integrations Overview

**Last updated:** April 30, 2026

---

## Executive Summary

OpenCommand's integration layer connects external business tools to the executive board's context engine. When a user connects a tool, the **Context Assembler** pulls live data and injects it into every executive agent's prompt — making ARCH, LEDGER, SIGNAL, FORGE, and Σ aware of real business state during conversations, briefings, and cascade runs.

The system uses a **Universal Abstraction Layer** — each tool category (CRM, Analytics, Paid Ads) defines abstract actions (e.g., `read_pipeline`, `get_campaigns`), and individual providers implement those actions. This means the executive agents don't know or care whether you use HubSpot or Salesforce; they just ask for "pipeline data."

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Executive Board                            │
│  ARCH · LEDGER · SIGNAL · FORGE · Σ                         │
└─────────────────────┬───────────────────────────────────────┘
                      │ Live context injection
┌─────────────────────▼───────────────────────────────────────┐
│              Context Assembler (orchestrator)                 │
│  Fetches data from all connected providers in parallel       │
│  Builds structured "data cards" for each category            │
│  Detects data gaps and suggests missing integrations         │
└────┬────────┬────────┬────────┬────────┬────────┬───────────┘
     │        │        │        │        │        │
┌────▼──┐ ┌──▼───┐ ┌──▼───┐ ┌──▼───┐ ┌──▼───┐ ┌──▼───┐
│HubSpot│ │SF    │ │Meta  │ │Google│ │TikTok│ │GA4   │
│  CRM  │ │CRM   │ │Ads   │ │Ads   │ │Ads   │ │      │
└───────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
```

---

## Provider Status Matrix

| Provider | Category | OAuth Code | Data Fetcher | Context Assembler | Credentials | Status |
|----------|----------|:----------:|:------------:|:-----------------:|:-----------:|--------|
| **HubSpot** | CRM | Yes | Yes | Yes | **Configured** | **LIVE** |
| Salesforce | CRM | Yes (+ Nango) | Yes | Yes | Not configured | Coming Soon |
| Meta Ads | Paid Ads | Yes | Yes | Yes | Not configured | Coming Soon |
| Google Ads | Paid Ads | Yes | Yes | Yes | Partial (Client ID/Secret set) | Coming Soon |
| TikTok Ads | Paid Ads | Yes | Yes | Yes | Not configured | Coming Soon |
| GA4 | Analytics | Yes | Yes | Yes | Not configured | Coming Soon |
| Mailchimp | Email Marketing | Yes | No | No | Not configured | Planned |
| Slack | Communication | Yes | No | No | Not configured | Planned |
| Stripe Connect | Payments | Yes | No | No | Not configured | Planned |
| Notion | Project Mgmt | — | No | No | — | Planned |
| Asana | Project Mgmt | — | No | No | — | Planned |
| Linear | Project Mgmt | — | No | No | — | Planned |
| Square | Payments | — | No | No | — | Planned |
| Discord | Communication | — | No | No | — | Planned |
| Gmail | Personal Email | — | No | No | — | Planned |
| Outlook | Personal Email | — | No | No | — | Planned |
| Shopify | E-commerce | — | No | No | — | Planned |
| WooCommerce | E-commerce | — | No | No | — | Planned |
| Mixpanel | Analytics | — | No | No | — | Planned |
| Amplitude | Analytics | — | No | No | — | Planned |

---

## What Each Integration Fetches

### HubSpot (LIVE)
- **Contacts summary:** total contacts, recent contacts (last 30 days), top lifecycle stages
- **Deal pipeline:** total deals, total value, deals by stage, average deal size, win rate
- **Token refresh:** automatic OAuth2 refresh when token expires

### Salesforce (Coming Soon)
- **Contacts summary:** total contacts, recent contacts, top account types
- **Opportunity pipeline:** total opportunities, total value, by stage, average deal size, win rate
- **Authentication:** Nango-managed OAuth2 flow with automatic token refresh

### Meta Ads (Coming Soon)
- **Ad account summary:** account name, status, currency, spend (last 30 days)
- **Campaign performance:** campaign name, status, spend, impressions, clicks, CTR, CPC, conversions, ROAS

### Google Ads (Coming Soon)
- **Account summary:** account name, currency, total spend, impressions, clicks, conversions
- **Campaign performance:** campaign name, type, status, spend, impressions, clicks, CTR, CPC, conversions, cost per conversion

### TikTok Ads (Coming Soon)
- **Advertiser info:** advertiser name, status, balance, currency
- **Campaign performance:** campaign name, status, budget, spend, impressions, clicks, CTR, conversions, CPA

### GA4 — Google Analytics 4 (Coming Soon)
- **Traffic overview:** total users, sessions, pageviews, bounce rate, avg session duration, new vs returning
- **Top traffic sources:** source/medium, users, sessions, bounce rate (top 10)

---

## Integration Categories & Abstract Actions

Each category defines a set of **abstract actions** that any provider in that category can fulfill:

| Category | Abstract Actions |
|----------|-----------------|
| CRM | `read_pipeline`, `get_deals`, `create_contact`, `update_deal_stage`, `search_contacts`, `get_deal_value` |
| Email Marketing | `get_campaign_stats`, `create_campaign`, `add_subscriber`, `get_open_rates`, `get_click_rates`, `list_segments` |
| Analytics | `get_traffic`, `get_top_pages`, `get_conversions`, `get_referral_sources`, `get_bounce_rate`, `get_user_segments` |
| Paid Advertising | `get_campaigns`, `get_spend`, `get_conversions`, `get_audience`, `get_roas`, `get_top_ads` |
| Project Management | `create_task`, `get_active_projects`, `update_status`, `get_team_workload`, `list_sprints`, `get_overdue_tasks` |
| Payments | `get_revenue`, `get_subscriptions`, `get_churn_rate`, `get_mrr`, `get_recent_transactions`, `get_failed_payments` |
| Communication | `send_message`, `get_channel_history`, `create_channel`, `list_channels`, `search_messages`, `get_unread_count` |
| Personal Email | `send_email`, `search_inbox`, `get_recent_threads`, `get_unread`, `create_draft`, `add_label` |
| E-commerce | `get_orders`, `get_inventory`, `get_top_products`, `update_listing`, `get_revenue_by_product`, `get_abandoned_carts` |

---

## Authentication Methods

| Method | Providers | How It Works |
|--------|-----------|--------------|
| **Direct OAuth2** | HubSpot, Mailchimp, Slack, Stripe, Meta Ads, Google Ads, TikTok Ads | OpenCommand hosts the OAuth flow directly via `/api/integration/oauth/callback` |
| **Nango (OAuth proxy)** | Salesforce | Nango manages token storage and refresh; OpenCommand creates a Connect session and receives webhooks |
| **API Key** | Stripe, Mixpanel, Amplitude, WooCommerce | User pastes API key in Integration Hub settings |
| **None/Planned** | Notion, Asana, Linear, Discord, Gmail, Outlook, Shopify, Square | Seeded in DB but no implementation yet |

---

## How Context Flows to Agents

1. **User connects a tool** via Integration Hub (Settings → Integrations)
2. **Context Assembler** (`server/integrations/contextAssembler.ts`) is called before each agent interaction
3. It queries all connected providers in parallel, with 10s timeout per provider
4. Results are formatted into **data cards** (structured summaries per category)
5. Data cards are injected into the agent's system prompt as `[LIVE BUSINESS CONTEXT]`
6. **Data gap detection** runs after each onboarding interview — if an agent needs data that isn't connected, it suggests specific integrations

---

## Website Audit Engine (No Integration Required)

The **Website Audit Engine** (`server/agents/websiteAudit.ts`) runs automatically when a user enters their company website during onboarding. It requires no OAuth or API keys — it scrapes the public website directly.

**What it produces:**
- **Metadata extraction:** title, description, Open Graph tags, canonical URL, language
- **Technical SEO audit:** robots.txt presence, sitemap.xml, HTTPS, security headers (HSTS, X-Frame-Options, CSP), response time (TTFB), compression
- **Social presence detection:** links to Twitter/X, LinkedIn, Facebook, Instagram, YouTube, GitHub, TikTok
- **Tech stack identification:** frameworks (React, Next.js, WordPress, Shopify), analytics (GA, Segment, Hotjar), ad pixels (Meta Pixel, Google Ads tag), CRM embeds (HubSpot, Intercom, Drift)
- **LLM content analysis:** value proposition, target audience, competitive positioning, tone of voice, key product categories

**SEO Score:** A composite 0-100 score based on: meta tags (20%), security headers (15%), performance (15%), mobile readiness (15%), content quality (20%), social presence (15%)

---

## What's Needed to Go Live with Each "Coming Soon" Provider

| Provider | What's Missing | Effort |
|----------|---------------|--------|
| Salesforce | Nango `NANGO_SECRET_KEY` + `NANGO_PUBLIC_KEY` configured | 1 hour (config only) |
| Meta Ads | `META_APP_ID` + `META_APP_SECRET` from Facebook Developer Console | 1 hour + app review |
| Google Ads | `GOOGLE_ADS_DEVELOPER_TOKEN` (requires Google Ads API access approval) | 1-2 weeks (Google review) |
| TikTok Ads | `TIKTOK_APP_ID` + `TIKTOK_APP_SECRET` from TikTok Business Center | 1-3 days (app review) |
| GA4 | Google OAuth credentials with Analytics scope (can reuse Google Ads client) | 1 hour (config only) |

---

## Roadmap: Next Integrations to Build

**High Priority (drives executive agent value):**
1. **Stripe (revenue data)** — Direct integration for MRR, churn, subscription metrics → feeds LEDGER (CFO)
2. **Google Analytics 4** — Traffic and conversion data → feeds SIGNAL (CMO)
3. **Slack** — Team communication signals → feeds ARCH (CEO) for organizational health

**Medium Priority (expands use cases):**
4. **Notion/Linear** — Project status → feeds FORGE (CTO) for execution tracking
5. **Gmail/Outlook** — Email patterns → feeds Σ for communication intelligence
6. **Shopify** — E-commerce metrics → feeds LEDGER for revenue diversification

**Lower Priority (niche verticals):**
7. Mixpanel/Amplitude — Product analytics for product-led companies
8. Discord — Community health for community-driven businesses
9. Square/WooCommerce — Alternative commerce platforms

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `server/integrations/contextAssembler.ts` | Orchestrates all data fetching and builds context for agents |
| `server/integrations/hubspot.ts` | HubSpot CRM data fetcher (contacts, deals, pipeline) |
| `server/integrations/salesforce.ts` | Salesforce CRM data fetcher (contacts, opportunities) |
| `server/integrations/metaAds.ts` | Meta Ads campaign performance fetcher |
| `server/integrations/googleAds.ts` | Google Ads campaign performance fetcher |
| `server/integrations/tiktokAds.ts` | TikTok Ads campaign performance fetcher |
| `server/integrations/ga4.ts` | Google Analytics 4 traffic and source data |
| `server/agents/websiteAudit.ts` | Website scraping, SEO audit, tech stack detection, LLM analysis |
| `server/integrationOAuth.ts` | Direct OAuth2 flow for all providers |
| `server/nangoIntegration.ts` | Nango-managed OAuth for Salesforce |
| `client/src/pages/IntegrationHub.tsx` | Frontend Integration Hub UI (connect/disconnect/status) |
| `drizzle/schema.ts` | `tool_categories`, `tool_providers`, `user_connections` tables |

---

## Summary Statistics

- **Total project LOC:** ~60,000 lines
- **Integration layer LOC:** ~2,500 lines (server/integrations/ + OAuth + Nango)
- **Tool categories:** 9
- **Seeded providers:** 20
- **Providers with full data fetchers:** 6 (HubSpot, Salesforce, Meta Ads, Google Ads, TikTok Ads, GA4)
- **Providers with OAuth configured:** 8 (+ Mailchimp, Slack, Stripe Connect)
- **Live and working:** 1 (HubSpot)
- **Credentials partially configured:** 1 (Google Ads — client ID/secret set, developer token missing)
