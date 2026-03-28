# OpenCommand — Johnson Tractor Pilot: Full Deployment Guide

> For another coding agent to understand the entire codebase and deploy it.

---

## Architecture Overview

```
opencommand/
├── client/                    # React 19 + Vite frontend
│   └── src/
│       ├── pages/             # Route pages (AgentDetail, AICeo, MissionControl, etc.)
│       ├── components/ui/     # shadcn/ui components
│       └── lib/trpc.ts        # tRPC client setup
├── server/                    # Express + tRPC backend
│   ├── _core/
│   │   ├── index.ts           # Express server, Socket.IO, tRPC middleware
│   │   ├── llm.ts             # invokeLLM() wrapper (Gemini 2.5 Flash)
│   │   ├── env.ts             # Environment variable accessor
│   │   ├── trpc.ts            # tRPC router/procedure factories
│   │   └── cookies.ts         # Session cookie config
│   ├── routers.ts             # All tRPC routers (1875 lines)
│   ├── db.ts                  # Drizzle ORM helpers (944 lines)
│   ├── socketEmit.ts          # Socket.IO emit helpers
│   ├── agents/
│   │   ├── leadResponse/      # Phase 1 + 4: Lead Response Agent
│   │   │   ├── types.ts       # Domain types, system prompts, guardrail rules
│   │   │   ├── guardrails.ts  # 7 deterministic guardrail rules (regex, no LLM)
│   │   │   ├── ingestLeads.ts # LLM-powered lead parsing
│   │   │   ├── draftResponse.ts  # LLM draft generation + auto-approve for L2+
│   │   │   ├── approvalFlow.ts   # Approve/modify/dismiss/promotion eligibility
│   │   │   ├── execute.ts        # Stubbed execution (no Gmail/Twilio yet)
│   │   │   └── executionWorker.ts # Queue processor, L0-L3 autonomy
│   │   └── morningBriefing/   # Phase 5: Morning Briefing
│   │       └── briefingService.ts # Overnight change detection + LLM strategy
│   └── integrations/          # Phase 2: Data source connectors
│       ├── types.ts           # Shared integration types
│       ├── anvilPro.ts        # CSV parser (50+ header aliases, auto-detection)
│       └── tractorHouse.ts    # Email parser + competitor pricing extraction
├── drizzle/
│   └── schema.ts              # All database tables (811 lines)
├── shared/
│   └── const.ts               # Shared constants (cookie name, etc.)
└── package.json               # Dependencies + scripts
```

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 19.2 + Vite 7.1 | SPA with client-side routing (wouter) |
| UI | Tailwind CSS + shadcn/ui + Radix | Dark theme, `#00D4AA` green accent |
| API | tRPC 11.6 | Type-safe RPC, `protectedProcedure` for auth |
| Backend | Express 4.21 | Serves both API and static assets |
| Database | MySQL + Drizzle ORM 0.44 | All tables in `drizzle/schema.ts` |
| Real-time | Socket.IO 4.8 | Notifications at `/api/ws` |
| LLM | Gemini 2.5 Flash | Via `invokeLLM()` in `server/_core/llm.ts` |
| Auth | JWT cookies (HS256) | 1-year expiry, `app_session_id` cookie |
| Payments | Stripe 20.4 | Checkout sessions + webhooks |
| Storage | AWS S3 | File uploads for projects |

---

## Environment Variables (Required)

```env
DATABASE_URL=mysql://user:password@host:3306/opencommand
JWT_SECRET=your-jwt-secret
OAUTH_SERVER_URL=https://your-oauth-provider
OWNER_OPEN_ID=owner-open-id
PORT=3000

# LLM (Gemini via Forge proxy)
BUILT_IN_FORGE_API_URL=https://forge.manus.im/v1/chat/completions
BUILT_IN_FORGE_API_KEY=your-forge-api-key

# Optional
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_BASE_URL=https://opencommand.cloud
```

---

## Database Schema (Phase 1-5 Additions)

### New Tables (6)

**`leads`** — Inbound equipment inquiries
- `source`: enum `tractorhouse | website | phone | walkin | email | manual`
- `status`: enum `new | processing | draft_ready | approved | sent | replied | closed | stale`
- Fields: contactName, contactEmail, contactPhone, contactLocation, equipmentInterest, inventoryMatchId, confidenceScore, receivedAt, respondedAt

**`inventory`** — Equipment from Anvil Pro DMS
- Fields: stockNumber, serialNumber, make, model, year, category, condition (new/used), price, location, hours, description, listingUrl, dealBuilderUrl, photos (JSON array), isAvailable, daysOnLot

**`competitive_pricing`** — TractorHouse market data
- `source`: enum `tractorhouse | machinefinder | equipmenttrader | manual`
- Fields: make, model, year, condition, askingPrice, dealerName, dealerLocation, listingUrl, hours, scrapedAt

**`draft_responses`** — LLM-generated response drafts
- `channel`: enum `email | sms`
- `status`: enum `pending_review | approved | modified | dismissed | sent | failed`
- Fields: subject, body, modifiedBody, dealBuilderLink, wordCount, confidenceScore, guardrailsPassed, guardrailNotes, llmModel, llmCost, executionLog (JSON), approvedAt/By, sentAt

**`execution_queue`** — Approved items queued for sending
- `status`: enum `queued | sending | sent | failed | stubbed`
- Fields: draftId, leadId, channel, recipientAddress, attempts, lastAttemptAt, sentAt, errorMessage

**`guardrail_violations`** — Audit trail
- `severity`: enum `warning | block`
- Fields: ruleCode, ruleDescription, violationDetail, wasOverridden

### Modified Tables

**`agents`** — Added `autonomyLevel` column:
- enum `L0 | L1 | L2 | L3` (default `L1`)
- L0 = Notify Only, L1 = Drafts for Review, L2 = Auto-Execute + Log, L3 = Full Autonomy

**`inbox_items`** — Added `"lead_response"` to type enum

### Applying Migrations

```bash
npx drizzle-kit push
```

---

## Key Patterns

### 1. LLM Calls

All LLM calls go through `server/_core/llm.ts`:

```typescript
import { invokeLLM } from "../../_core/llm";

const result = await invokeLLM({
  messages: [
    { role: "system", content: "Your system prompt" },
    { role: "user", content: "User input" },
  ],
  // Optional: structured JSON output
  responseFormat: {
    type: "json_schema",
    json_schema: {
      name: "schema_name",
      schema: {
        type: "object",
        properties: { ... },
        required: ["field1", "field2"],
      },
    },
  },
});

// Extract text content
const content = result.choices[0]?.message?.content;
const text = typeof content === "string"
  ? content
  : Array.isArray(content)
    ? content.map(c => "text" in c ? c.text : "").join("")
    : "";
```

Config: model `gemini-2.5-flash`, max_tokens 32768, thinking budget 128 tokens.

### 2. Database Helpers

All DB functions follow the pattern:

```typescript
export async function getThingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(things).where(eq(things.id, id)).limit(1);
  return r[0];
}
```

Insert results return `[ResultSetHeader, FieldPacket[]]`. Extract insertId:
```typescript
const id = Number((result as any)[0]?.insertId ?? 0);
```

### 3. tRPC Procedures

```typescript
const myRouter = router({
  myEndpoint: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => {
      // ctx.user.id is the authenticated user
      return getThingById(input.id);
    }),
});
```

Registered in `appRouter` at bottom of `server/routers.ts`.

### 4. Socket.IO Notifications

```typescript
import { emitToUser } from "../../socketEmit";

emitToUser(userId, "lead_response", "Title", "Message body", {
  leadId: 123,
  draftId: 456,
});
```

Event types: `task_completed | inbox_item | agent_status | heartbeat | poo_receipt | payment_success | okr_updated | kill_switch | lead_response`

### 5. Dynamic Imports in Routers

Agent logic files use dynamic imports in routers to avoid circular dependencies:

```typescript
draftsApprove: protectedProcedure
  .input(z.object({ draftId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    const { approveDraft } = await import("./agents/leadResponse/approvalFlow");
    return approveDraft(input.draftId, ctx.user.id);
  }),
```

---

## The 5 Phases (All Complete)

### Phase 1: Lead Response Agent

**Pipeline**: Raw text → LLM parse → inventory match → LLM draft → guardrails → human review → approve → queue → execute (stubbed)

**Files**:
- `server/agents/leadResponse/types.ts` — Types + system prompts + guardrail rule constants
- `server/agents/leadResponse/ingestLeads.ts` — `ingestLead()`: LLM parses raw text, matches inventory, creates lead record
- `server/agents/leadResponse/draftResponse.ts` — `generateDraft()`: LLM drafts response, runs guardrails, saves draft, creates inbox item, emits notification
- `server/agents/leadResponse/guardrails.ts` — `checkGuardrails()`: 7 regex rules (no price commits, no impersonation, sign as team, max 150 words, include DealBuilder link, max follow-ups)
- `server/agents/leadResponse/approvalFlow.ts` — `approveDraft()`, `modifyDraft()`, `dismissDraft()`, `checkPromotionEligibility()`
- `server/agents/leadResponse/execute.ts` — `executeResponse()`: stubbed (no Gmail/Twilio), generates PoO receipt, updates agent stats

**Guardrail Rules**:
| Rule | Severity | Check |
|------|----------|-------|
| NO_PRICE_COMMIT | block | Regex for `$` amounts + price commitment phrases |
| NO_IMPERSONATION | block | Detects personal name signatures |
| NO_INVENTORY_FABRICATION | block | Verify specs match inventory |
| SIGN_AS_TEAM | warning | Must contain "Johnson Tractor Team" |
| MAX_WORD_COUNT | warning | Body must be <= 150 words |
| MAX_FOLLOW_UPS | block | Lead at max follow-ups (default 3) |
| MUST_INCLUDE_DEALBUILDER | warning | Include DealBuilder URL if inventory matched |

**tRPC Endpoints** (all under `leadResponse.*`):
- `leadsList`, `leadsGet`, `leadsIngest`, `leadsCreate`
- `draftsPending`, `draftsForLead`, `draftsApprove`, `draftsModify`, `draftsDismiss`, `draftsRegenerate`
- `execute`
- `stats`, `violations`, `promotionCheck`

### Phase 2A: Anvil Pro DMS Connector

**File**: `server/integrations/anvilPro.ts`

`parseAnvilProCsv(csvText, overrideMapping?)` handles messy dealer CSV exports:
- **Auto-header mapping**: 50+ aliases (e.g., "Stock #", "STK", "Unit #" all → `stockNumber`)
- **Delimiter detection**: comma, tab, pipe, semicolon
- **Quote-aware splitting**: handles `"Smith, John"` correctly
- **Price parsing**: `$45,000`, `45K`, `$45k` all normalized
- **Condition normalization**: "N", "new", "New" → `"new"`

**tRPC Endpoint**: `leadResponse.anvilProParseCsv` — upserts by stock number (updates existing, inserts new)

### Phase 2B: TractorHouse Integration

**File**: `server/integrations/tractorHouse.ts`

Two LLM-powered parsers with fallbacks:
1. `parseTractorHouseLeadEmail(emailBody)` — extracts contact info + equipment interest from TractorHouse notification emails. Regex fallback handles common patterns.
2. `parseTractorHouseCompetitorData(content)` — extracts competitor listings (make, model, price, dealer) from TractorHouse search results or market digests.

**tRPC Endpoints**:
- `leadResponse.tractorHouseIngest` — parses email → creates lead → auto-generates draft
- `leadResponse.tractorHouseCompetitorIngest` — extracts competitor data → saves to `competitive_pricing` table
- `leadResponse.competitivePricingList`, `competitivePricingSearch` — query competitor data

### Phase 3: Executive Board (Live LLM)

**tRPC Endpoint**: `aiCeo.boardAnalysis`

Runs 4 LLM calls in parallel via `Promise.all()`:

| Executive | Name | Focus |
|-----------|------|-------|
| CEO | Arch | Strategic vision, competitive positioning, growth |
| CTO | Sage | Technical feasibility, architecture, security |
| CMO | Nova | Customer impact, market positioning, go-to-market |
| CFO | Ledger | ROI analysis, cost implications, risk assessment |

Each returns 3-4 sentences + one recommendation. All analyses logged to `decision_log` table.

**Client**: "Executive Board" tab in `AICeo.tsx` — input topic, get 4 perspective cards.

### Phase 4: Approval → Execution Pipeline

**Trust Gradient (L0-L3)**:
- **L0 — Notify Only**: No draft generation
- **L1 — Drafts for Review** (default): Human must approve before sending
- **L2 — Auto-Execute + Log**: Drafts auto-approved if guardrails pass, human reviews after
- **L3 — Full Autonomy**: Sends + handles follow-ups without oversight

**L2 Promotion Requirements**: 95% approval rate over 30+ reviewed drafts.

**File**: `server/agents/leadResponse/executionWorker.ts`
- `startExecutionWorker(intervalMs)` — polls queue every 30s
- `shouldAutoExecute(agentId)` — checks agent's autonomy level
- `autoApproveAndQueue(draftId, agentId)` — auto-approves for L2+ agents

**Integration**: `draftResponse.ts` calls `autoApproveAndQueue()` after draft generation for L2+ agents.

**tRPC Endpoints**:
- `leadResponse.setAutonomyLevel` — change agent's L0-L3 level (with eligibility check for L2)
- `leadResponse.processQueue` — manually trigger queue processing

### Phase 5: Morning Briefing

**File**: `server/agents/morningBriefing/briefingService.ts`

`generateMorningBriefing(companyId, userId)`:
1. Gathers data in parallel: leads, stats, inventory, competitive pricing, agents, audit log
2. Detects overnight changes (last 24 hours)
3. Categorizes by severity:
   - **RED**: Unreplied leads (4+ hours), 5+ pending drafts, agents in error
   - **YELLOW**: Stale leads, aging inventory (90+ days), low approval rate
   - **BLUE**: New leads, new inventory, competitor listings tracked
   - **GREEN**: High approval rate, active agents
4. Generates "Today's Strategy" via LLM (3-5 actionable bullet points)

**tRPC Endpoint**: `aiCeo.morningBriefing` — defaults as first tab in AI CEO page.

---

## Client Pages

### AgentDetail (`/agents/:id`)

7 tabs:
1. **Approval Queue** — Pending drafts with approve/modify/dismiss, bulk "Deploy Auto-Reply"
2. **Lead Queue** — Lead list with TractorHouse/General ingest dialog
3. **Inventory** — Table with Anvil Pro CSV upload (server-side parsing)
4. **Market Intel** — Competitive pricing table + TractorHouse data import
5. **Guardrails** — Active rules + violation log
6. **Stats** — Performance metrics + Trust Gradient L0-L3 selector + queue processor

### AICeo (`/ai-ceo`)

5 tabs:
1. **Morning Briefing** (default) — Severity-coded items + LLM strategy
2. **Arch Chat** — Conversational AI with Socratic questioning
3. **Executive Board** — 4-perspective parallel analysis
4. **Strategy Engine** — Goal → strategic action plan
5. **Decision Log** — Audit trail of all AI decisions

---

## Build & Deploy

```bash
# Install dependencies
pnpm install

# Apply database schema
npx drizzle-kit push

# Development
pnpm dev

# Production build
pnpm build          # vite build + esbuild server bundle
pnpm start          # NODE_ENV=production node dist/index.js
```

Server binds to `0.0.0.0:3000` (auto-finds available port if busy).

---

## Git History

Branch: `claude/lead-response-agent-YHxGy`

```
931daaa Phases 2-5: Anvil Pro DMS, TractorHouse, Executive Board, Execution Pipeline, Morning Briefing
69a3b08 Refine Phase 1: fix 10 bugs found in code review
bd0be41 Phase 1: Lead Response Agent — full pipeline from ingestion to execution
```

PR #1 open at `danmerna/opencommand#1`.

---

## What's Stubbed / Not Yet Implemented

1. **Email/SMS sending** — `execute.ts` marks as "stubbed". Real sending needs Gmail API or Twilio SDK credentials.
2. **IMAP polling** — TractorHouse leads ingested via text paste, not auto-polling inbox.
3. **Execution worker startup** — `startExecutionWorker()` exists but isn't called from server startup. Wire it in `server/_core/index.ts` when ready.
4. **L3 follow-up automation** — L3 autonomy level exists but follow-up logic not implemented.
5. **Real OAuth for data sources** — OAuth framework exists (`server/integrationOAuth.ts`) but not wired to Anvil Pro or TractorHouse.
