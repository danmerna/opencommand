# Executive Intelligence — Decoupling Architecture Plan

**Author:** Manus AI | **Date:** April 30, 2026 | **Status:** Draft for Review

---

## 1. Executive Summary

The Executive Intelligence system — encompassing the 5-4-3-2-1-Σ cascade, intent engine, website audit pipeline, context assembly, and self-contextualizing onboarding — represents the most defensible and differentiated subsystem within OpenCommand. This document provides a comprehensive plan for extracting it into a standalone product (**AI Chief of Staff**) while preserving the ability to operate as a module within the parent platform.

The extraction involves approximately **7,687 lines of server code**, **6,209 lines of client code**, and **14 required database tables** across 7 core module groups. The dependency surface is narrow: the modules rely on only 3 platform primitives (LLM invocation, database access, and tRPC context). This makes the extraction technically clean — estimated at **4–6 weeks** to a deployable MVP.

---

## 2. Module Inventory

### 2.1 Server Modules (7,687 lines)

| Module Group | Files | Lines | Purpose |
|---|---|---|---|
| **Executive Board Core** | `server/routers/executiveBoard.ts`, `server/agents/executiveBoard/boardThinking.ts` | 585 | 5-4-3-2-1-Σ cascade orchestration, individual executive perspectives (ARCH, LEDGER, SIGNAL, FORGE), board member definitions, Σ synthesis |
| **Σ Router + Agents** | `server/routers/sigma.ts`, `server/agents/sigma/chatPersistence.ts`, `server/agents/sigma/goalIntegration.ts`, `server/agents/sigma/leadResponseIntegration.ts` | 1,138 | Standalone Σ chat, lead response integration, goal integration, chat persistence, board escalation |
| **Intent Engine** | `server/routers/intentEngine.ts`, `server/routers/intent-engine.ts`, `server/agents/intentEngine/boardIntegration.ts`, `server/agents/intentEngine/askBoardIntegration.ts` | 606 | Intent classification, board escalation, action item management, feedback loops |
| **Website Audit** | `server/agents/websiteAudit.ts` | 629 | Background site scraper, technical SEO checker, tech stack detector, social presence detector, LLM content analyzer |
| **Context Assembly + Integrations** | `server/integrations/contextAssembler.ts`, `server/integrations/hubspot.ts`, `server/integrations/salesforce.ts`, `server/integrations/metaAds.ts`, `server/integrations/googleAds.ts`, `server/integrations/tiktokAds.ts`, `server/integrations/ga4.ts`, `server/integrations/demoMockData.ts` | 2,586 | Live data ingestion from 6 connectors, cross-source insight generation, Socratic question synthesis |
| **Goals + Workspace** | `server/routers/goals.ts`, `server/routers/workspace.ts`, `server/agents/goals/goalsService.ts`, `server/agents/goals/goalWebSocket.ts`, `server/agents/registry.ts`, `server/agents/mentionParser.ts` | 1,121 | Goal CRUD, workspace agent registry, mention parsing, goal-agent mapping |
| **Lead Response + Scoring** | `server/routers/leadResponse.ts`, `server/routers/scoreAdjustments.ts`, `server/agents/leadResponse/ingestLeads.ts`, `server/agents/leadResponse/draftResponse.ts`, `server/agents/leadResponse/executeResponse.ts` | 940 | Lead ingestion, AI-drafted responses, execution pipeline, score adjustments |
| **Onboarding Backend** | Procedures in `server/routers.ts` (onboarding router ~600 lines including `sigmaCalibrate`, `quickStart`, `generateStrategy`, `acceptStrategy`) | ~600 | Company setup, executive interviews, Σ calibration, strategy generation, quick-start mode |
| **Quick Start + Shareable Results** | Procedures in `server/routers.ts` (websiteAuditRouter, admin leads) | ~150 | Public results fetching, email capture, admin leads listing |

### 2.2 Client Modules (6,209 lines)

| Module Group | Files | Lines | Purpose |
|---|---|---|---|
| **Executive Board UI** | `ExecutiveBoard.tsx`, `CascadeDiagram.tsx`, `SigmaChatUI.tsx` | 1,640 | Board cascade view, individual executive chat, Σ standalone chat, visual cascade diagram |
| **Onboarding UI** | `ProOnboarding.tsx`, `ContextAssemblyAnimation.tsx` | 1,664 | Self-contextualizing interview flow (4 executives + Σ calibration), context assembly visualization |
| **Landing + Growth** | `ChiefOfStaff.tsx`, `QuickStart.tsx`, `SharedResults.tsx` | 1,150 | Product marketing page, quick-start mode (website-only → instant Σ), shareable public results page |
| **Intent Engine UI** | `IntentEngine.tsx` | 646 | Natural language intent interface with action cards |
| **Mission Control** | `MissionControl.tsx` | 1,109 | Strategy dashboard, briefing history, overnight changes |

### 2.3 Database Tables (14 Required + 6 Optional)

| Table | Transfer | Notes |
|---|---|---|
| `users` | **Required** | Core identity. Replace Manus OAuth with standard auth provider |
| `companies` | **Required** | Company context (name, mission, industry, website) for executive agents |
| `agents` | **Required** | Executive agent definitions and onboarding state |
| `agent_onboardings` | **Required** | Interview state, resume logic, conversation history |
| `strategy_proposals` | **Required** | Generated strategies from the cascade |
| `briefing_logs` | **Required** | Morning briefing history |
| `website_audits` | **Required** | Background audit results (SEO, tech stack, social, content analysis) |
| `quick_start_results` | **Required** | Quick-start email capture, shareId, recommendations |
| `context_objects` | **Required** | Assembled context snapshots from integrations |
| `executive_context_manifests` | **Required** | Live context manifests per executive persona |
| `action_items` | **Required** | Board-generated action items |
| `strategy_cards` | **Required** | Strategy card breakdowns |
| `user_connections` | **Required** | OAuth tokens for connected integrations |
| `tool_providers` + `tool_categories` | **Required** | Integration provider registry |
| `workspace_goals` + `goal_progress` + `goal_agents` + `goal_collaborations` | **Optional** | Goal tracking (include if targeting operators) |
| `decision_log` | **Optional** | Audit trail of board decisions |
| `overnight_changes` | **Optional** | Overnight change detection for briefings |

---

## 3. Dependency Map

### 3.1 Platform Primitives (Must Abstract)

The executive intelligence modules have a remarkably narrow dependency surface — only 3 hard dependencies on Manus platform infrastructure:

| Primitive | Current Implementation | Standalone Replacement | Effort |
|---|---|---|---|
| **LLM Invocation** | `server/_core/llm.ts` → Manus Forge API | OpenAI SDK direct, or LiteLLM proxy | 1 day |
| **Authentication** | `server/_core/oauth.ts` → Manus OAuth | Clerk, Auth0, or NextAuth.js | 3–5 days |
| **tRPC Context** | `server/_core/trpc.ts` + `context.ts` | Same tRPC setup, swap auth middleware | 1 day |
| **Database** | `server/db.ts` → Manus-managed TiDB | PlanetScale, Neon, or Supabase (MySQL) | 1–2 days |
| **Notifications** | `server/_core/notification.ts` → Manus notification API | Resend (already integrated) + in-app toast | 1 day |
| **File Storage** | `server/storage.ts` → Manus S3 | AWS S3 or Cloudflare R2 direct | 1 day |
| **Integration OAuth** | `server/nangoIntegration.ts` → Nango via Manus keys | Nango Cloud (hosted) or self-hosted | 2–3 days |

### 3.2 Internal Cross-Module Dependencies

All cross-module dependencies are **optional** and can be stubbed or removed without breaking the core cascade:

| Dependency | Used By | Required? | Extraction Strategy |
|---|---|---|---|
| Lead Response module | Σ lead response integration | **Optional** | Include if targeting sales-heavy users |
| Goals module | Σ goal integration | **Optional** | Include — lightweight (367 lines) and high-value |
| Agent Registry | Workspace router | **Optional** | Simplify to static executive agent list |
| Briefing Scheduler | Morning briefings | **Recommended** | Port — key retention driver |
| Score Adjustments | Lead scoring | **Optional** | Include only with Lead Response |

### 3.3 Coupling Verdict

> **Low coupling.** The executive intelligence modules depend on exactly 3 platform primitives (LLM, auth, DB) and 0 mandatory feature modules. All cross-module integrations (leads, goals, ROI) are injected via Σ's integration layer and can be toggled on/off without breaking the core cascade. The `boardThinking.ts` module (the heart of the system) imports only the LLM helper — nothing else.

---

## 4. Extraction Strategy

### Phase 1: Foundation (Week 1–2)

**Goal:** Standalone Vite + Express app with auth, DB, and LLM working.

| Task | Details | Days |
|---|---|---|
| Scaffold new project | Vite + React 19 + Express + tRPC 11 (same stack, no Manus template) | 0.5 |
| Set up auth | Clerk integration, session middleware, `protectedProcedure` | 3 |
| Set up database | PlanetScale (MySQL), migrate 14 required tables via Drizzle | 1.5 |
| Abstract LLM layer | Replace `_core/llm.ts` with OpenAI SDK wrapper, same `invokeLLM` interface | 0.5 |
| Abstract storage | Replace `storage.ts` with direct S3/R2 client, same `storagePut`/`storageGet` interface | 0.5 |
| Set up Nango | Nango Cloud for integration OAuth (HubSpot, Salesforce, etc.) | 2 |
| **Subtotal** | | **8 days** |

### Phase 2: Core Engine (Week 2–3)

**Goal:** Executive board cascade, Σ synthesis, website audit, and standalone chat all working.

| Task | Details | Days |
|---|---|---|
| Port `boardThinking.ts` | Copy + update imports (only change: LLM import path) | 0.5 |
| Port `executiveBoard` router | Copy + update tRPC/db imports | 0.5 |
| Port `sigma` router + agents | Copy sigma chat, intent classification, board integration, chat persistence | 1 |
| Port `contextAssembler.ts` | Copy + update integration imports | 1 |
| Port 6 integration connectors | HubSpot, Salesforce, Meta Ads, Google Ads, TikTok Ads, GA4 | 2 |
| Port `websiteAudit.ts` | Copy + update LLM/db imports | 0.5 |
| Port intent engine | Copy board integration + ask board integration | 0.5 |
| Port goals service | Copy goals CRUD + goal-agent mapping | 0.5 |
| Integration tests | Verify cascade end-to-end, Σ synthesis, audit pipeline | 1.5 |
| **Subtotal** | | **8.5 days** |

### Phase 3: Onboarding + UI (Week 3–4)

**Goal:** Full self-contextualizing onboarding flow with executive interviews, quick-start mode, and shareable results.

| Task | Details | Days |
|---|---|---|
| Port `ProOnboarding.tsx` | Copy + update auth hooks (useAuth → Clerk useUser) | 1 |
| Port `ExecutiveBoard.tsx` | Copy + update tRPC hooks | 0.5 |
| Port `SigmaChatUI.tsx` | Copy + update tRPC hooks | 0.5 |
| Port `CascadeDiagram.tsx` | Copy (zero dependencies — pure SVG/React) | 0.1 |
| Port `ContextAssemblyAnimation.tsx` | Copy + update provider list | 0.5 |
| Port `QuickStart.tsx` + `SharedResults.tsx` | Copy + update tRPC hooks, add public route | 0.5 |
| Port `IntentEngine.tsx` | Copy + update tRPC hooks | 0.5 |
| Port `MissionControl.tsx` | Extract strategy tab only | 1 |
| Build new dashboard layout | Simpler sidebar: Board, Σ Chat, Briefings, Integrations, Settings | 2 |
| Port `ChiefOfStaff.tsx` landing page | Copy (already standalone, minimal deps) | 0.1 |
| Admin leads dashboard | Port or rebuild (simple table + KPI cards) | 0.5 |
| **Subtotal** | | **7.7 days** |

### Phase 4: Polish + Launch (Week 4–6)

**Goal:** Production-ready standalone product.

| Task | Details | Days |
|---|---|---|
| Stripe integration | Port existing checkout/webhook code, configure products | 1 |
| Email system | Port Resend integration for briefings + lead nurture | 1 |
| Settings page | Company profile, integration management, briefing preferences | 2 |
| Onboarding email drip | Welcome + reminder + results share emails | 1 |
| Error handling + edge cases | Loading states, empty states, error boundaries, mobile responsiveness | 2 |
| Performance optimization | Code splitting, lazy loading, query caching | 1 |
| Testing | Unit tests (port existing 50+ tests), E2E tests (new) | 3 |
| Deployment | Vercel/Railway/Fly.io setup, domain, SSL, monitoring | 1 |
| **Subtotal** | | **12 days** |

### Total Estimated Effort

| Phase | Duration | Cumulative |
|---|---|---|
| Phase 1: Foundation | 8 days | Week 1–2 |
| Phase 2: Core Engine | 8.5 days | Week 2–3 |
| Phase 3: Onboarding + UI | 7.7 days | Week 3–4 |
| Phase 4: Polish + Launch | 12 days | Week 4–6 |
| **Total** | **36.2 days** | **~6 weeks** |

---

## 5. Architecture: Dual-Mode Design

The extraction supports a **dual-mode architecture** where the executive intelligence can run as both a standalone product and an embedded module within OpenCommand.

### 5.1 Shared Core Package

Extract the pure business logic into a shared npm package (`@opencommand/executive-core`):

```
@opencommand/executive-core/
  boardThinking.ts      ← Cascade logic, persona definitions, perspective generation
  websiteAudit.ts       ← Site scraper + SEO + tech stack + content analyzer
  contextAssembler.ts   ← Integration data aggregation + cross-source insights
  integrations/         ← HubSpot, Salesforce, Meta, Google, TikTok, GA4 adapters
  sigma/                ← Chat persistence, goal integration, lead response integration
  intentEngine/         ← Board integration, ask-board integration
  types.ts              ← Shared TypeScript interfaces
```

This package accepts **injected dependencies** via a factory pattern:

```typescript
// Standalone app
import { createExecutiveBoard } from "@opencommand/executive-core";

const board = createExecutiveBoard({
  llm: openaiClient,        // OpenAI SDK
  db: drizzleDb,            // PlanetScale via Drizzle
  storage: s3Client,        // AWS S3 direct
});

// Embedded in OpenCommand
import { createExecutiveBoard } from "@opencommand/executive-core";

const board = createExecutiveBoard({
  llm: manusForgeClient,    // Manus Forge API
  db: manusDb,              // Manus-managed TiDB
  storage: manusStorage,    // Manus S3
});
```

### 5.2 Standalone App Structure

```
chief-of-staff/
  client/
    src/
      pages/
        Landing.tsx          ← ChiefOfStaff.tsx (ported)
        Onboarding.tsx       ← ProOnboarding.tsx (ported)
        Board.tsx            ← ExecutiveBoard.tsx (ported)
        SigmaChat.tsx        ← SigmaChatUI.tsx (ported)
        QuickStart.tsx       ← QuickStart.tsx (ported)
        SharedResults.tsx    ← SharedResults.tsx (ported)
        Integrations.tsx     ← IntegrationHub.tsx (simplified)
        Settings.tsx         ← New (company + preferences)
        AdminLeads.tsx       ← AdminLeads.tsx (ported)
      components/
        CascadeDiagram.tsx   ← Direct copy (zero deps)
        ContextAssembly.tsx  ← Direct copy
        DashboardLayout.tsx  ← Simplified version
  server/
    routers/
      board.ts              ← executiveBoard router (ported)
      sigma.ts              ← sigma router (ported)
      onboarding.ts         ← onboarding procedures (extracted from routers.ts)
      integrations.ts       ← integration OAuth + context assembly
      audit.ts              ← website audit router
      goals.ts              ← goals CRUD (optional)
    core/
      auth.ts               ← Clerk middleware
      llm.ts                ← OpenAI SDK wrapper (same invokeLLM interface)
      db.ts                 ← Drizzle + PlanetScale
      storage.ts            ← S3 direct
  drizzle/
    schema.ts               ← 14 required tables
```

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **LLM cost at scale** (cascade = 5+ LLM calls per question) | High | Medium | Implement response caching, use GPT-4o-mini for FORGE/SIGNAL, reserve GPT-4o for Σ synthesis |
| **Integration OAuth complexity** (6 connectors) | Medium | High | Use Nango Cloud (managed) to avoid self-hosting OAuth infrastructure |
| **Onboarding drop-off** (full flow = 15-20 min) | Medium | High | Quick-start mode already built (website-only → 60s Σ recommendation) |
| **Feature creep from parent platform** | Low | Medium | Strict scope: Board + Σ + Briefings + Integrations. No blueprints, no marketplace, no sub-agents |
| **Database migration data loss** | Low | High | Export/import scripts with validation, run in staging first |
| **Auth migration** (Manus → Clerk) | Low | Medium | Clerk has well-documented migration paths; session format is standard JWT |
| **Competitor entry** (ChatGPT for business) | Medium | Medium | Defensibility is in the temporal cascade architecture + self-contextualizing onboarding — not replicable by generic chat |

---

## 7. Monetization Strategy

| Tier | Price | Includes |
|---|---|---|
| **Free** | $0/mo | All 4 executives + Σ, unlimited cascade runs, website audit, quick-start mode, 1 briefing/week |
| **Pro** | $29/mo | Everything in Free + unlimited briefings, all integrations (HubSpot, Salesforce, etc.), priority compute, email briefings, shareable results |
| **Business** | $99/mo | Everything in Pro + team collaboration, custom executive personas, API access, white-label embedding, dedicated support |

The free tier is the acquisition funnel. Users experience the full cascade with their own business context (scraped from their website via quick-start or built through onboarding interviews). The moment they want to connect their CRM or get daily briefings, they upgrade.

---

## 8. Go-to-Market: Fastest Path

| Week | Action | Success Metric |
|---|---|---|
| **0 (now)** | Publish OpenCommand, share `/chief-of-staff` URL, measure conversion | Landing page → Quick Start start rate |
| **1** | Monitor admin leads dashboard, follow up with completions | Quick Start completion rate, email capture rate |
| **2** | Iterate messaging/UX based on drop-off data | Onboarding completion > 20% |
| **3–4** | If validated: begin Phase 1 decoupling. If not: iterate within OpenCommand | Day-7 return rate > 40% |
| **5–6** | Private beta of standalone app to first 50 users | Retention, integration connection rate |

> **Key insight:** The landing page, quick-start mode, email capture, and shareable results are already built. The only thing preventing market testing is publishing the current deployment and sharing the `/chief-of-staff` URL. No decoupling is required for initial validation.

---

## 9. Decision Matrix

| Option | Effort | Risk | Speed to Market | Revenue Potential |
|---|---|---|---|---|
| **A: Test within OpenCommand** (publish `/chief-of-staff` now) | 0 days | Very Low | Immediate | Low (no standalone brand) |
| **B: Full decoupling** (6-week extraction) | 36 days | Medium | 6 weeks | High (standalone product) |
| **C: Hybrid** (test in OC → decouple if validated) | 0 + 36 days | Low | Immediate + 6 weeks | High (validated before investment) |

**Recommendation: Option C (Hybrid).** Publish the landing page now within OpenCommand to validate demand, then invest in full decoupling only after seeing conversion and retention signals. This de-risks the 6-week engineering investment while capturing early users immediately.

---

## 10. Files Ready for Direct Copy (Zero or Minimal Changes)

These files can be copied directly into the standalone app with only import path changes:

| File | Changes Required |
|---|---|
| `server/agents/executiveBoard/boardThinking.ts` | Change LLM import path only |
| `server/agents/websiteAudit.ts` | Change LLM + DB import paths |
| `server/integrations/hubspot.ts` | Change Nango token fetch |
| `server/integrations/salesforce.ts` | Change Nango token fetch |
| `server/integrations/metaAds.ts` | Change Nango token fetch |
| `server/integrations/googleAds.ts` | Change Nango token fetch |
| `server/integrations/tiktokAds.ts` | Change Nango token fetch |
| `server/integrations/ga4.ts` | Change Nango token fetch |
| `client/src/components/CascadeDiagram.tsx` | **Zero changes** (pure SVG/React) |
| `client/src/components/ContextAssemblyAnimation.tsx` | **Zero changes** (pure React) |
| `client/src/pages/ChiefOfStaff.tsx` | Change auth hook import |
| `client/src/pages/SharedResults.tsx` | Change tRPC hook import |

---

## 11. Next Steps

1. **Publish OpenCommand** with the `/chief-of-staff` landing page live
2. **Share the URL** with target users and measure: landing page → quick-start start → completion → email capture
3. **Monitor `/admin/leads`** for incoming completions and follow up within 24 hours
4. **Set conversion thresholds** for proceeding with decoupling (e.g., >20% quick-start completion, >40% day-7 return)
5. **If thresholds met:** Begin Phase 1 of decoupling (foundation scaffold + auth)
6. **If thresholds not met:** Iterate on onboarding UX and messaging within OpenCommand before investing in extraction
