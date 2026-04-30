# AI Chief of Staff — Decoupling Architecture Plan

**Author:** Manus AI | **Date:** April 30, 2026 | **Status:** Draft for Review

---

## 1. Executive Summary

The Executive Board + Intent Engine (Σ) represents the most defensible and differentiated subsystem within OpenCommand. This document provides a comprehensive plan for extracting it into a standalone product — **AI Chief of Staff** — while preserving the ability to operate as a module within the parent platform.

The extraction involves approximately **7,800 lines of server code** and **4,100 lines of client code** across 6 core module groups. The dependency surface is narrow: the modules rely on only 3 platform primitives (LLM invocation, database access, and tRPC context). This makes the extraction technically clean — estimated at **4–6 weeks** to a deployable MVP.

---

## 2. Module Inventory

The following table maps every file that would transfer to the standalone product, grouped by functional domain.

### 2.1 Server Modules

| Module Group | Files | Lines | Purpose |
|---|---|---|---|
| **Executive Board Core** | `server/routers/executiveBoard.ts`, `server/agents/executiveBoard/boardThinking.ts` | 585 | 5-4-3-2-1-Σ cascade orchestration, individual executive perspectives (ARCH, LEDGER, SIGNAL, FORGE), board member definitions |
| **Σ / Intent Engine** | `server/routers/sigma.ts`, `server/routers/intentEngine.ts`, `server/agents/sigma/*.ts`, `server/agents/intentEngine/*.ts`, `server/intent-engine.ts` | 2,042 | Standalone Σ chat, intent classification, board integration, goal integration, lead response integration, chat persistence |
| **Website Audit** | `server/agents/websiteAudit.ts` | 629 | Background site scraper, SEO checker, tech stack detector, social presence detector, LLM content analyzer |
| **Context Assembly** | `server/integrations/contextAssembler.ts`, `server/integrations/*.ts` (6 connectors) | 2,586 | Live data ingestion from HubSpot, Salesforce, Meta Ads, Google Ads, TikTok Ads, GA4 |
| **Onboarding Backend** | Procedures in `server/routers.ts` (onboarding router ~400 lines), `server/briefingScheduler.ts`, `server/email.ts` | ~700 | Company setup, executive interviews, strategy generation, Σ calibration, briefing scheduler, email delivery |
| **Supporting Services** | `server/agents/registry.ts`, `server/agents/mentionParser.ts`, `server/agents/roi/roiAttribution.ts`, `server/agents/scoring/leadScoring.ts` | ~970 | Agent registry, mention parsing, ROI attribution, lead scoring |
| **Total Server** | | **~7,512** | |

### 2.2 Client Modules

| Module Group | Files | Lines | Purpose |
|---|---|---|---|
| **Executive Board UI** | `ExecutiveBoard.tsx`, `CascadeDiagram.tsx`, `SigmaChatUI.tsx`, `SigmaBadge.tsx`, `SigmaImportModal.tsx` | 1,680 | Board cascade view, individual executive chat, Σ standalone chat, visual cascade diagram |
| **Onboarding UI** | `ProOnboarding.tsx`, `OnboardingSigma.tsx`, `AgentOnboarding.tsx`, `ContextAssemblyAnimation.tsx` | 2,216 | Self-contextualizing interview flow, context assembly visualization, Σ calibration step |
| **Landing Page** | `ChiefOfStaff.tsx` | 527 | Product marketing page (already built) |
| **Supporting UI** | `IntentEngine.tsx`, `IntentEngineCard.tsx`, `IntentEngineActionCard.tsx`, `Briefings.tsx`, `MissionControl.tsx` (strategy tab) | ~1,800 | Intent engine interface, action cards, briefing history, strategy dashboard |
| **Total Client** | | **~6,223** | |

### 2.3 Database Tables

The standalone product requires a subset of the current schema. The following table classifies each table by its transfer status.

| Table | Transfer | Notes |
|---|---|---|
| `users` | **Required** | Core identity. Replace Manus OAuth with standard auth provider |
| `companies` | **Required** | Company context for executive agents |
| `agents` | **Required** | Executive agent definitions and state |
| `agent_onboardings` | **Required** | Interview state and resume logic |
| `strategy_proposals` | **Required** | Generated strategies from the cascade |
| `briefing_logs` | **Required** | Morning briefing history |
| `website_audits` | **Required** | Background audit results |
| `context_objects` | **Required** | Assembled context snapshots |
| `executive_context_manifests` | **Required** | Live context manifests per executive |
| `action_items` | **Required** | Board-generated action items |
| `overnight_changes` | **Required** | Overnight change detection for briefings |
| `strategy_cards` | **Required** | Strategy card breakdowns |
| `user_connections` | **Required** | OAuth tokens for connected integrations |
| `okrs` | **Partial** | Strategy-sourced OKRs only |
| `feature_events` | **Optional** | Analytics (rebuild or use PostHog) |
| `user_feedback` | **Optional** | Feedback widget data |
| `departments` | **Drop** | Not used by executive board |
| `tasks`, `task_threads` | **Drop** | Sub-agent task execution (future feature) |
| `blueprints`, `blueprint_*` | **Drop** | Marketplace/blueprint system |
| `projects`, `project_*` | **Drop** | Project management module |
| `marketplace_listings` | **Drop** | Marketplace module |
| `skills`, `tool_registry`, `tool_*` | **Drop** | Tool/skill registry |
| `webhooks`, `email_templates` | **Drop** | Generic webhook/email system |
| `creator_partnerships` | **Drop** | Creator program |
| `waitlist_entries` | **Drop** | Waitlist (rebuild simpler version) |

---

## 3. Dependency Map

The executive board modules have a remarkably narrow dependency surface. The following diagram shows the three layers of coupling.

### 3.1 Platform Primitives (Must Abstract)

These are the only hard dependencies on the Manus platform infrastructure:

| Primitive | Current Implementation | Standalone Replacement | Effort |
|---|---|---|---|
| **LLM Invocation** | `server/_core/llm.ts` → Manus Forge API | OpenAI SDK direct, or LiteLLM proxy | 1 day |
| **Authentication** | `server/_core/oauth.ts` → Manus OAuth | Clerk, Auth0, or NextAuth.js | 3–5 days |
| **tRPC Context** | `server/_core/trpc.ts` + `context.ts` | Same tRPC setup, swap auth middleware | 1 day |
| **Database** | `server/db.ts` → Manus-managed TiDB | PlanetScale, Neon, or Supabase (MySQL/Postgres) | 1–2 days |
| **Notifications** | `server/_core/notification.ts` → Manus notification API | Resend (already integrated) + in-app toast | 1 day |
| **File Storage** | `server/storage.ts` → Manus S3 | AWS S3 or Cloudflare R2 direct | 1 day |
| **Integration OAuth** | `server/integrationOAuth.ts` → Nango via Manus | Nango Cloud (hosted) or self-hosted | 2–3 days |

### 3.2 Internal Cross-Module Dependencies

These are dependencies between the executive board modules and other OpenCommand modules. All are **optional** and can be stubbed or removed.

| Dependency | Used By | Required? | Extraction Strategy |
|---|---|---|---|
| `agents` table (generic agent CRUD) | Board members are stored as agents | **Yes** | Keep the agents table, remove non-executive agent types |
| `agent_capabilities` table | Capability tagging | **No** | Drop — executive agents have fixed capabilities |
| `poo_receipts` (Proof of Outcome) | Action item completion | **No** | Defer — add as v2 feature |
| `completed_work` | Work log | **No** | Defer — add as v2 feature |
| `sub_agent_recommendations` | Executive → sub-agent delegation | **No** | Defer — add as v2 feature |
| Lead Response module | Σ lead response integration | **Optional** | Include if targeting sales-heavy users |
| Goals module | Σ goal integration | **Optional** | Include — lightweight and high-value |
| ROI Attribution | Campaign ROI tracking | **No** | Defer — add as v2 feature |

### 3.3 Coupling Assessment

> **Verdict: Low coupling.** The executive board modules depend on exactly 3 platform primitives (LLM, auth, DB) and 0 other feature modules. All cross-module integrations (leads, goals, ROI) are injected via Σ's integration layer and can be toggled on/off without breaking the core cascade.

---

## 4. Extraction Strategy

### Phase 1: Foundation (Week 1–2)

**Goal:** Standalone Next.js or Vite + Express app with auth, DB, and LLM working.

| Task | Details | Days |
|---|---|---|
| Scaffold new project | Vite + React + Express + tRPC (same stack, no Manus template) | 0.5 |
| Set up auth | Clerk or Auth0 integration, session middleware, `protectedProcedure` | 3 |
| Set up database | PlanetScale or Neon, migrate schema (14 required tables) | 1.5 |
| Abstract LLM layer | Replace `_core/llm.ts` with OpenAI SDK wrapper, same interface | 0.5 |
| Abstract storage | Replace `_core/storage.ts` with direct S3/R2 client | 0.5 |
| Set up Nango | Self-hosted or Nango Cloud for integration OAuth | 2 |
| **Subtotal** | | **8 days** |

### Phase 2: Core Engine (Week 2–3)

**Goal:** Executive board cascade, Σ synthesis, and standalone chat all working.

| Task | Details | Days |
|---|---|---|
| Port `boardThinking.ts` | Copy + update imports (only change: LLM import path) | 0.5 |
| Port `executiveBoard` router | Copy + update tRPC/db imports | 0.5 |
| Port `sigma` router + agents | Copy sigma chat, intent classification, board integration | 1 |
| Port `contextAssembler.ts` | Copy + update integration imports | 1 |
| Port 6 integration connectors | HubSpot, Salesforce, Meta Ads, Google Ads, TikTok Ads, GA4 | 2 |
| Port `websiteAudit.ts` | Copy + update LLM/db imports | 0.5 |
| Port `briefingScheduler.ts` | Copy + wire to new cron system (node-cron or external) | 1 |
| Integration tests | Verify cascade end-to-end, Σ synthesis, audit pipeline | 1.5 |
| **Subtotal** | | **8 days** |

### Phase 3: Onboarding + UI (Week 3–4)

**Goal:** Full self-contextualizing onboarding flow with executive interviews.

| Task | Details | Days |
|---|---|---|
| Port `ProOnboarding.tsx` | Copy + update auth hooks (useAuth → Clerk useUser) | 1 |
| Port `ExecutiveBoard.tsx` | Copy + update tRPC hooks | 0.5 |
| Port `SigmaChatUI.tsx` | Copy + update tRPC hooks | 0.5 |
| Port `CascadeDiagram.tsx` | Copy (zero dependencies — pure SVG/React) | 0.1 |
| Port `ContextAssemblyAnimation.tsx` | Copy + update provider list | 0.5 |
| Port `IntentEngine.tsx` + action cards | Copy + update tRPC hooks | 1 |
| Port `MissionControl.tsx` (strategy tab) | Extract strategy tab only | 1 |
| Port `Briefings.tsx` | Copy + update tRPC hooks | 0.5 |
| Build new dashboard layout | Simpler sidebar with: Board, Σ Chat, Briefings, Integrations, Settings | 2 |
| Port `ChiefOfStaff.tsx` landing page | Copy (already standalone) | 0.1 |
| **Subtotal** | | **7.2 days** |

### Phase 4: Polish + Launch (Week 4–6)

**Goal:** Production-ready standalone product.

| Task | Details | Days |
|---|---|---|
| Stripe integration | Port existing checkout/webhook code, configure products | 1 |
| Email system | Port Resend integration for briefings | 0.5 |
| Settings page | Company profile, integration management, briefing preferences | 2 |
| Onboarding email drip | Welcome + reminder emails | 1 |
| Error handling + edge cases | Loading states, empty states, error boundaries | 2 |
| Performance optimization | Code splitting, lazy loading, query caching | 1 |
| Testing | Unit tests (port existing), E2E tests (new) | 3 |
| Deployment | Vercel/Railway/Fly.io setup, domain, SSL | 1 |
| **Subtotal** | | **11.5 days** |

### Total Estimated Effort

| Phase | Duration | Cumulative |
|---|---|---|
| Phase 1: Foundation | 8 days | Week 1–2 |
| Phase 2: Core Engine | 8 days | Week 2–3 |
| Phase 3: Onboarding + UI | 7.2 days | Week 3–4 |
| Phase 4: Polish + Launch | 11.5 days | Week 4–6 |
| **Total** | **34.7 days** | **~6 weeks** |

---

## 5. Architecture: Standalone vs. Embedded

The extraction should support a **dual-mode architecture** where the executive board can run as both a standalone product and an embedded module within OpenCommand.

### 5.1 Shared Core Package

Extract the following into a shared npm package (`@opencommand/executive-core`):

```
@opencommand/executive-core/
  boardThinking.ts      ← Cascade logic, persona definitions
  websiteAudit.ts       ← Site scraper + analyzer
  contextAssembler.ts   ← Integration data aggregation
  integrations/         ← HubSpot, Salesforce, Meta, Google, TikTok, GA4
  types.ts              ← Shared TypeScript interfaces
```

This package accepts **injected dependencies** (LLM client, DB client, auth context) via a factory pattern:

```typescript
// Usage in standalone app
import { createExecutiveBoard } from "@opencommand/executive-core";

const board = createExecutiveBoard({
  llm: openaiClient,
  db: drizzleDb,
  storage: s3Client,
});
```

```typescript
// Usage in OpenCommand (embedded)
import { createExecutiveBoard } from "@opencommand/executive-core";

const board = createExecutiveBoard({
  llm: manusForgeClient,
  db: manusDb,
  storage: manusStorage,
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
        Briefings.tsx        ← Briefings.tsx (ported)
        Integrations.tsx     ← IntegrationHub.tsx (simplified)
        Settings.tsx         ← New (company + preferences)
      components/
        CascadeDiagram.tsx   ← Direct copy
        ContextAssembly.tsx  ← Direct copy
        DashboardLayout.tsx  ← Simplified version
  server/
    routers/
      board.ts              ← executiveBoard router (ported)
      sigma.ts              ← sigma router (ported)
      onboarding.ts         ← onboarding procedures (extracted)
      integrations.ts       ← integration OAuth + context
      audit.ts              ← website audit router
    core/
      auth.ts               ← Clerk/Auth0 middleware
      llm.ts                ← OpenAI SDK wrapper
      db.ts                 ← Drizzle + PlanetScale
  drizzle/
    schema.ts               ← 14 required tables
```

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LLM cost at scale (cascade = 5+ LLM calls per question) | High | Medium | Implement caching, use cheaper models for FORGE/SIGNAL, reserve GPT-4 for Σ |
| Integration OAuth complexity (6 connectors) | Medium | High | Use Nango Cloud (managed) to avoid self-hosting OAuth infrastructure |
| Onboarding drop-off (20-min setup) | Medium | High | Add "quick start" mode with website-only context (skip interviews) |
| Feature creep from parent platform | Low | Medium | Strict scope: Board + Σ + Briefings + Integrations. No blueprints, no marketplace, no sub-agents |
| Database migration data loss | Low | High | Export/import scripts with validation, run in staging first |
| Auth migration (Manus → Clerk) | Low | Medium | Clerk has well-documented migration paths; session format is standard JWT |

---

## 7. Monetization Strategy

Based on the existing pricing architecture and the "free tier = personas, paid = integrations" principle:

| Tier | Price | Includes |
|---|---|---|
| **Free** | $0/mo | All 4 executives + Σ, unlimited cascade runs, website audit, 1 briefing/week |
| **Pro** | $29/mo | Everything in Free + unlimited briefings, all integrations (HubSpot, Salesforce, etc.), priority compute, email briefings |
| **Business** | $99/mo | Everything in Pro + team collaboration, custom executive personas, API access, dedicated support |

The free tier is the onboarding funnel. Users experience the full cascade with their own business context (scraped from their website). The moment they want to connect their CRM or get daily briefings, they upgrade.

---

## 8. Go-to-Market: Fastest Path

The fastest path to market validation does **not** require full decoupling:

1. **Week 0 (now):** The `/chief-of-staff` landing page is already built and routes to the existing onboarding flow. Publish OpenCommand, share the `/chief-of-staff` URL, and measure conversion.

2. **Week 1–2:** If conversion signals are strong, begin Phase 1 (foundation) of the decoupling. If weak, iterate on messaging and onboarding UX within OpenCommand first.

3. **Week 3–4:** Launch a private beta of the standalone app to the first 50 users from the waitlist. Measure retention (do users return for briefings?) and expansion (do they connect integrations?).

4. **Week 5–6:** Based on beta feedback, decide whether to launch publicly or pivot the positioning.

> **Key insight:** The landing page and onboarding flow are already built. The only thing preventing market testing is publishing the current OpenCommand deployment and sharing the `/chief-of-staff` URL. No decoupling is required for initial validation.

---

## 9. Decision Matrix

| Option | Effort | Risk | Speed to Market | Revenue Potential |
|---|---|---|---|---|
| **A: Test within OpenCommand** (publish `/chief-of-staff` now) | 0 days | Very Low | Immediate | Low (no standalone brand) |
| **B: Full decoupling** (6-week extraction) | 35 days | Medium | 6 weeks | High (standalone product) |
| **C: Hybrid** (test in OC → decouple if validated) | 0 + 35 days | Low | Immediate + 6 weeks | High (validated before investment) |

**Recommendation: Option C (Hybrid).** Publish the landing page now within OpenCommand to validate demand, then invest in full decoupling only after seeing conversion and retention signals. This de-risks the 6-week engineering investment while capturing early users immediately.

---

## 10. Next Steps

1. **Publish OpenCommand** with the `/chief-of-staff` landing page live
2. **Share the URL** with target users and measure: landing page → onboarding start → onboarding complete → return for briefing
3. **Set conversion thresholds** for proceeding with decoupling (e.g., >20% onboarding completion, >40% day-7 return)
4. **If thresholds met:** Begin Phase 1 of decoupling (foundation scaffold + auth)
5. **If thresholds not met:** Iterate on onboarding UX and messaging within OpenCommand before investing in extraction
