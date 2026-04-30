# Executive Intelligence: Standalone Product Plan

**Author:** Manus AI | **Date:** April 30, 2026 | **Version:** 1.0

---

## 1. Executive Summary

OpenCommand's executive onboarding flow is currently embedded within a larger operating system that includes lead response agents, multi-agent workspaces, email infrastructure, and dealer-specific tooling. The executive onboarding experience, however, represents the single most differentiated capability in the product: a **self-contextualizing engine** that connects to live business tools, conducts Socratic interviews with five AI personas — four C-suite executives (ARCH/CEO, LEDGER/CFO, SIGNAL/CMO, FORGE/CTO) plus **Σ (Sigma)**, the synthesis executive — and distills all perspectives into the single highest-leverage action you can take right now.

This document proposes extracting and elevating that capability into a **standalone Executive Intelligence product** that can be sold independently, deployed for any business vertical (not just equipment dealers), and serve as the primary entry point for OpenCommand's broader platform.

---

## 2. Current State Audit

### 2.1 What Exists Today

The executive intelligence surface area is distributed across approximately 15 files spanning frontend pages, backend routers, and supporting services. The following table maps the current components and their maturity:

| Component | File(s) | Maturity | Standalone-Ready? |
|-----------|---------|----------|-------------------|
| **Executive Onboarding Flow** | `ProOnboarding.tsx` (1,331 lines) | Production | Partially: tightly coupled to company/agent creation |
| **Per-Agent Interview** | `AgentOnboarding.tsx` | Production | Yes: self-contained chat flow |
| **Executive Board (Socratic Engine)** | `ExecutiveBoard.tsx` | Production | Yes: already functions as standalone workspace |
| **Mission Control Dashboard** | `MissionControl.tsx` | Production | No: deeply coupled to OKRs, fleet, governance |
| **Strategy Generation** | `onboarding.generateStrategy` in `routers.ts` | Production | Partially: depends on agent onboarding state |
| **Briefing Scheduler** | `briefingScheduler.ts` | Production | Yes: independent cron-based delivery |
| **Onboarding Reminder** | `onboardingReminderScheduler.ts` | Production | Yes: independent cron-based delivery |
| **Context Assembly** | `context.liveContextualize` | Production | Yes: the core differentiator |
| **Board Thinking (5-4-3-2-1-Σ)** | `boardThinking.ts` | Production | Yes: pure LLM orchestration with Σ synthesis |
| **Board Integration (Intent Engine)** | `askBoardIntegration.ts` | Production | Partially: depends on action items schema |
| **Email Delivery** | `email.ts`, Resend integration | Production | Yes: generic email service |
| **BYOA Provider System** | `MissionControl.tsx` Fleet tab | Production | No: tied to agent management |

### 2.2 The Core Differentiator

The self-contextualization pipeline is what separates OpenCommand from generic AI chat products. It operates in three stages:

> **Stage 1 (Connect):** User links HubSpot, Salesforce, Meta Ads, Google Analytics, or other tools via OAuth. Each executive persona has role-specific integration suggestions (e.g., CMO gets Meta Ads and Mailchimp; CFO gets Stripe and revenue pipeline data).

> **Stage 2 (Gather):** The `liveContextualize` mutation pulls real-time data from connected tools and assembles a context manifest. This includes pipeline metrics, ad spend, traffic data, and financial signals.

> **Stage 3 (Personalize):** Each executive agent conducts a Socratic interview informed by the live data. ARCH (CEO) asks about 5-year strategic vision; SAGE (CTO) probes technical architecture; NOVA (CMO) explores marketing channels; TED (CFO) analyzes financial health. The questions are not generic templates; they reference actual numbers from the user's business.

### 2.3 What Needs Extraction

The primary coupling points that prevent immediate standalone deployment are:

1. **Company/Agent creation** is embedded in `ProOnboarding.tsx` rather than abstracted into a reusable service
2. **Strategy generation** depends on `agentOnboardings` table state rather than accepting arbitrary context
3. **Mission Control** mixes executive intelligence with operational features (OKRs, fleet, governance, inbox)
4. **Executive Board** depends on `aiCeo` router which is entangled with company-specific queries
5. **Briefing delivery** hardcodes `opencommand.co` as the base URL

---

## 3. Standalone Product Architecture

### 3.1 Product Vision

**Executive Intelligence** is a standalone product that gives any business owner or executive team a personalized AI advisory board. It connects to their existing tools, learns their business context through structured interviews, and delivers ongoing strategic intelligence through multiple channels (dashboard, email briefings, Σ chat).

The product should be deployable as:
1. A **standalone SaaS** at its own domain (e.g., `exec.opencommand.co`)
2. An **embeddable module** within the broader OpenCommand platform
3. A **white-label offering** for partners and resellers

### 3.2 Architecture Layers

The standalone product requires four distinct layers, each of which can be developed and tested independently:

| Layer | Purpose | Key Services |
|-------|---------|-------------|
| **Data Layer** | Connect, ingest, and normalize business data | OAuth connectors, context assembly, data normalization |
| **Intelligence Layer** | Process data through executive personas | Board Thinking (5-4-3-2-1), Socratic Engine, strategy synthesis |
| **Interaction Layer** | Present intelligence to users | Executive Board UI, Σ Chat, briefing emails, approval workflows |
| **Memory Layer** | Persist context, decisions, and learning | Context history, decision log, onboarding state, strategy proposals |

### 3.3 Extraction Plan

The extraction should proceed in three phases, each producing a deployable increment:

**Phase A: Decouple Core Services (1 week)**

Extract the following into self-contained modules with clean interfaces:

1. **`/lib/executive-intelligence/context.ts`** — Context assembly service that accepts arbitrary tool connections and returns a structured context manifest. Remove dependency on company/agent tables; accept a generic `businessProfile` object instead.

2. **`/lib/executive-intelligence/personas.ts`** — Executive persona definitions (ARCH, LEDGER, SIGNAL, FORGE, Σ) with their system prompts, time horizons, and interview question generators. Currently hardcoded in `ProOnboarding.tsx` and `boardThinking.ts`; consolidate into a single source of truth.

3. **`/lib/executive-intelligence/interview.ts`** — Socratic interview engine that accepts a persona, context manifest, and conversation history, and returns the next question. Currently split between `onboarding.start`, `onboarding.respond`, and `boardThinking.ts`.

4. **`/lib/executive-intelligence/strategy.ts`** — Strategy synthesis service that accepts interview transcripts from all personas and generates a combined strategic plan. Currently in `onboarding.generateStrategy`.

5. **`/lib/executive-intelligence/briefing.ts`** — Briefing generation and delivery service. Currently in `briefingScheduler.ts` but hardcoded to company-specific queries.

**Phase B: Build Standalone UI (1-2 weeks)**

Create a new page set that uses the extracted services without depending on the broader OpenCommand platform:

1. **`/executive-intelligence/onboard`** — Streamlined onboarding flow: connect tools, select personas, conduct interviews, generate strategy. Reuses the self-contextualization pipeline but with a cleaner, more focused UI.

2. **`/executive-intelligence/board`** — The Executive Board experience (already mostly standalone). Refactor to accept a `businessProfile` instead of requiring a `companyId`.

3. **`/executive-intelligence/briefings`** — Briefing history and on-demand generation. Already exists as `Briefings.tsx` but needs decoupling from company-specific queries.

4. **`/executive-intelligence/context`** — Context history and explainability. Already exists as `ContextHistory.tsx`.

5. **`/executive-intelligence/chat`** — Σ Chat with executive persona selection. Users can chat with individual executives or the full board.

**Phase C: Productize (1-2 weeks)**

1. **Pricing tiers** — Free tier (1 persona, no integrations), Pro tier (4 personas, unlimited integrations, briefings), Enterprise tier (custom personas, white-label, API access).

2. **Onboarding funnel optimization** — A/B test interview length (3 vs. 5 questions), integration prompts, and strategy reveal format.

3. **API access** — Expose Executive Intelligence as an API for programmatic access. Endpoints: `/api/ei/context`, `/api/ei/interview`, `/api/ei/strategy`, `/api/ei/briefing`.

4. **White-label configuration** — Allow partners to customize persona names, colors, system prompts, and branding.

---

## 4. Data Architecture

### 4.1 New Schema: `executive_profiles`

The standalone product needs a simplified data model that doesn't depend on the broader OpenCommand schema. The core entity is an **Executive Profile** rather than a company + agents:

```
executive_profiles
├── id (primary key)
├── user_id (foreign key to users)
├── business_name
├── business_mission
├── industry
├── briefing_frequency (daily/weekly/monthly/quarterly)
├── active_personas (JSON array: ["ceo", "cfo", "cmo", "cto", "sigma"])
├── context_manifest (JSON: latest assembled context)
├── strategy_document (TEXT: latest generated strategy)
├── onboarding_status (enum: pending/in_progress/complete)
├── created_at
├── updated_at

executive_interviews
├── id (primary key)
├── profile_id (foreign key to executive_profiles)
├── persona_type (enum: ceo/cfo/cmo/cto/sigma)
├── messages (JSON array of {role, content})
├── status (enum: pending/in_progress/complete/skipped)
├── context_at_time (JSON: context manifest snapshot)
├── created_at
├── completed_at

executive_briefings
├── id (primary key)
├── profile_id (foreign key to executive_profiles)
├── frequency (enum: daily/weekly/monthly/quarterly)
├── title
├── content (TEXT)
├── action_items (JSON array)
├── delivered_via (enum: email/in_app/both)
├── delivered_at

executive_decisions
├── id (primary key)
├── profile_id (foreign key to executive_profiles)
├── persona_type (enum: ceo/cfo/cmo/cto/sigma)
├── question
├── recommendation
├── user_action (enum: approved/rejected/deferred)
├── outcome_notes (TEXT)
├── created_at
├── resolved_at
```

### 4.2 Context Assembly Pipeline

The context assembly pipeline is the technical moat. It should be extracted into a standalone service with the following interface:

```typescript
interface ContextAssemblyService {
  // Connect a data source via OAuth
  connectSource(profileId: number, provider: string, credentials: OAuthTokens): Promise<Connection>;
  
  // Pull latest data from all connected sources
  assembleContext(profileId: number): Promise<ContextManifest>;
  
  // Get context for a specific persona (filtered by relevance)
  getPersonaContext(profileId: number, persona: PersonaType): Promise<PersonaContext>;
  
  // Explain what data was used and why
  explainContext(profileId: number): Promise<ContextExplanation>;
}
```

### 4.3 Executive Agent Data Context Declaration

Each executive agent must explicitly declare the data it accesses from the universal data platform. This declaration establishes the contextual framework within which all sub-agents operate. The declaration includes:

1. **Primary data sources** — Which connected tools this persona reads from
2. **Key metrics** — Which specific metrics inform this persona's thinking
3. **Time horizon** — How far back and forward this persona looks
4. **Decision authority** — What actions this persona can recommend vs. execute

---

## 5. Executive Agent Task Mapping

### 5.1 Persona Hierarchy and Sub-Agent Recommendations

Each executive agent should be designed to map out tasks for its sub-agents. Additionally, each executive agent should recommend the optimal team of sub-agents to maximize autonomous work completion.

| Persona | Time Horizon | Primary Data | Sub-Agent Recommendations |
|---------|-------------|-------------|--------------------------|
| **ARCH (CEO)** | 5-year strategic | All sources aggregated | Recommends which other personas to activate based on business needs |
| **LEDGER (CFO)** | 4-month financial | Stripe, QuickBooks, revenue pipeline, ad spend | Budget agents, forecasting agents, compliance agents |
| **SIGNAL (CMO)** | 3-week marketing | Meta Ads, Google Ads, GA4, Mailchimp, social | Content agents, campaign agents, SEO agents, social schedulers |
| **FORGE (CTO)** | 2-day technical | GitHub, Jira, Datadog, infrastructure metrics | Code review agents, deployment agents, monitoring agents |
| **Σ (Sigma)** | NOW — synthesis | Inherits ALL sources from all executives | No sub-agents — Σ synthesizes all perspectives into one highest-leverage action |

### 5.2 Intent Engine Integration

The intent engine should automatically set up any necessary data integrations as part of each executive agent's onboarding process. When a new persona is activated, the system should:

1. Identify which data sources are required for that persona's role
2. Check which sources are already connected
3. Prompt the user to connect missing sources (with clear explanation of why each is needed)
4. Assemble initial context from available data
5. Begin the Socratic interview with data-informed questions

---

## 6. Interaction Design

### 6.1 Three Modes of Engagement

The standalone product should support three distinct interaction modes, each serving a different user need:

**Mode 1: Board Room (Synchronous)**
The user asks a question and receives perspectives from all five executives in sequence: ARCH (5-year) → LEDGER (4-month) → SIGNAL (3-week) → FORGE (2-day) → YOU (now) → **Σ (synthesis)**. This is the 5-4-3-2-1-Σ Temporal Cascade. Each executive inherits context from those above. Σ goes last and collapses all perspectives into the single highest-leverage move. The board room is ideal for strategic decisions that benefit from multiple perspectives.

**Mode 2: Executive Chat (Asynchronous)**
The user chats with a specific executive persona for deep-dive conversations. ARCH for strategy, FORGE for technical decisions, SIGNAL for marketing campaigns, LEDGER for financial planning, or **Σ for the highest-leverage synthesis**. Each conversation maintains full context from previous sessions and connected data sources.

**Mode 3: Briefing (Scheduled)**
The system proactively delivers strategic intelligence on the user's chosen cadence. Daily briefings focus on operational urgency; weekly briefings on tactical execution; monthly on strategic progress; quarterly on vision alignment. Briefings include actionable items that the user can approve or defer.

### 6.2 Trust Gradient for Executive Intelligence

Applying the L0-L3 trust framework from the broader OpenCommand platform:

| Level | Behavior | Example |
|-------|----------|---------|
| **L0 (Observe)** | Read-only analysis, no recommendations | "Your MRR grew 12% this quarter" |
| **L1 (Recommend)** | Suggest actions, require approval | "I recommend increasing Meta Ads budget by 20%. Approve?" |
| **L2 (Act with Oversight)** | Execute approved actions, report results | Auto-adjusts ad budget within approved range, sends summary |
| **L3 (Autonomous)** | Full autonomy within defined boundaries | Manages entire marketing budget allocation based on ROAS targets |

New users start at L0. Promotion to L1 requires completing onboarding. Promotion to L2 requires 95% approval rate over 30 days. L3 requires explicit opt-in with defined guardrails.

---

## 7. Implementation Roadmap

### 7.1 Sprint 1: Extract Core Services (Week 1)

| Task | Effort | Dependencies |
|------|--------|-------------|
| Create `/lib/executive-intelligence/` module directory | 2h | None |
| Extract persona definitions from ProOnboarding + boardThinking | 4h | None |
| Extract context assembly into standalone service | 8h | Persona definitions |
| Extract interview engine with clean interface | 8h | Context assembly |
| Extract strategy synthesis | 4h | Interview engine |
| Extract briefing generation | 4h | Strategy synthesis |
| Write integration tests for all extracted services | 8h | All extractions |

### 7.2 Sprint 2: Build Standalone UI (Week 2-3)

| Task | Effort | Dependencies |
|------|--------|-------------|
| Create `/executive-intelligence/onboard` page | 16h | Extracted services |
| Refactor Executive Board to accept generic profile | 8h | Extracted services |
| Build briefing history page | 8h | Briefing service |
| Build context explainability page | 8h | Context service |
| Build Σ Chat with persona selection | 12h | Interview engine |
| Add routing and navigation | 4h | All pages |
| Responsive design and polish | 8h | All pages |

### 7.3 Sprint 3: Productize (Week 3-4)

| Task | Effort | Dependencies |
|------|--------|-------------|
| Implement pricing tiers (Free/Pro/Enterprise) | 12h | Stripe integration |
| Build API endpoints for programmatic access | 16h | Extracted services |
| Add white-label configuration | 8h | All services |
| Onboarding funnel A/B testing infrastructure | 8h | Onboard page |
| Analytics and conversion tracking | 4h | All pages |
| Documentation and API reference | 8h | API endpoints |

### 7.4 Total Estimated Effort

| Phase | Duration | Effort |
|-------|----------|--------|
| Phase A: Extract Core Services | 1 week | ~38 hours |
| Phase B: Build Standalone UI | 1-2 weeks | ~64 hours |
| Phase C: Productize | 1-2 weeks | ~56 hours |
| **Total** | **3-5 weeks** | **~158 hours** |

---

## 8. Revenue Model

### 8.1 Pricing Tiers

| Tier | Price | Personas | Integrations | Briefings | API Access |
|------|-------|----------|-------------|-----------|----------|
| **Free** | $0/mo | All 4 (full C-suite) | 0 (manual context only) | In-app only, weekly | No |
| **Pro** | $49/mo | All 4 + custom personas | Unlimited live integrations | All channels + all cadences | No |
| **Enterprise** | $199/mo | All 4 + unlimited custom | Unlimited + custom connectors | All + custom cadence + Slack/Teams | Yes (1000 calls/mo) |
| **White-Label** | Custom | Custom | Custom | Custom | Unlimited |

### 8.2 Conversion Strategy

The free tier is designed to maximize the "aha moment" by giving users the full multi-persona experience. Users interact with all four executives, experience the Socratic interview, and receive a combined strategy — all without paying. The upgrade trigger is natural: executives reference data they *could* see if integrations were connected.

**Free tier experience:** "ARCH: Based on what you've told me, your growth rate looks healthy. *If I could see your actual Stripe revenue data, I could tell you exactly where the inflection point is.*"

This creates a pull-based conversion rather than a gate-based one. Users upgrade because they want deeper intelligence, not because they're locked out of core functionality.

### 8.3 Revenue Projections

Higher free-tier engagement drives stronger conversion rates (projected 8% vs. industry average 3-5%):

| Metric | Month 1 | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|---------|----------|
| Free users | 150 | 750 | 3,000 | 15,000 |
| Pro conversions (8%) | 12 | 60 | 240 | 1,200 |
| Enterprise (1.5%) | 2 | 11 | 45 | 225 |
| **MRR** | **$986** | **$5,139** | **$20,715** | **$103,575** |

---

## 9. Competitive Positioning

### 9.1 What Makes This Different

Most AI business tools fall into one of two categories: **generic chat** (ChatGPT, Claude) or **narrow automation** (Jasper for content, Copy.ai for marketing). Executive Intelligence occupies a unique position: it is a **personalized advisory board** that combines multiple specialized perspectives with real business data.

The self-contextualization pipeline is the key differentiator. Competitors require users to manually describe their business; Executive Intelligence pulls real numbers from connected tools and asks questions informed by actual data. This creates a fundamentally different user experience: instead of "tell me about your business," the system says "I see your MRR is $45K with 12% month-over-month growth, but your CAC has increased 23% in the last quarter. Let's talk about that."

### 9.2 Competitive Landscape

| Competitor | Approach | Weakness vs. Executive Intelligence |
|-----------|----------|-------------------------------------|
| ChatGPT / Claude | Generic AI chat | No business context, no personas, no proactive briefings |
| Notion AI | Document-embedded AI | No live data integration, no executive personas |
| Fireflies.ai | Meeting intelligence | Retrospective only, no strategic synthesis |
| Tome / Beautiful.ai | Presentation AI | Output-focused, no ongoing advisory relationship |
| **Executive Intelligence** | **Personalized C-suite advisory board** | **Live data + multiple personas + proactive briefings** |

---

## 10. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Extraction breaks existing OpenCommand features | Medium | High | Comprehensive test coverage before extraction; feature flags for gradual rollout |
| Users don't complete onboarding (drop-off) | High | Medium | Speed mode (3 questions), skip options, resume capability already built |
| Connected tool APIs change or rate-limit | Medium | Medium | Abstraction layer with fallback to cached data; graceful degradation |
| LLM quality varies across personas | Low | High | Persona-specific system prompts with few-shot examples; quality monitoring |
| White-label partners dilute brand | Low | Medium | Minimum quality standards; "Powered by OpenCommand" attribution |

---

## 11. Success Metrics

| Metric | Target (Month 3) | Target (Month 12) |
|--------|------------------|-------------------|
| Onboarding completion rate | 70% | 85% |
| Tool connection rate (at least 1) | 50% | 75% |
| Weekly active users (Pro) | 60% | 80% |
| Briefing open rate | 45% | 55% |
| Free-to-Pro conversion | 5% | 8% |
| Net Promoter Score | 40 | 60 |

---

## 12. Conclusion

The executive onboarding flow is not just a feature of OpenCommand; it is the **core value proposition** of the entire platform. By extracting it into a standalone Executive Intelligence product, we accomplish three strategic objectives:

1. **Expand addressable market** — Any business owner, not just equipment dealers, can benefit from a personalized AI advisory board.
2. **Create a natural upsell path** — Free users experience the full C-suite advisory board and get hooked on multi-perspective intelligence. When executives reference data they *could* see with live integrations, users upgrade to Pro organically. Pro users who want to act on recommendations naturally upgrade to the full OpenCommand platform.
3. **Strengthen the moat** — The self-contextualization pipeline becomes more valuable with each connected tool and completed interview, creating switching costs that generic AI tools cannot match.
4. **Maximize free-tier virality** — Because free users get the full persona experience (not a crippled version), they are more likely to share and recommend the product, driving organic growth.

The estimated 3-5 week timeline and ~158 hours of development effort represent a high-ROI investment given the revenue potential and strategic positioning advantages.

---

*This document was prepared by Manus AI for the OpenCommand project. Last updated April 30, 2026.*
