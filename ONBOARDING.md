# OpenCommand — LLM Onboarding Report

> **Purpose:** Everything another LLM needs to understand the codebase, architecture, conventions, and current state of the project in order to contribute code immediately.

---

## 1. What Is OpenCommand?

OpenCommand is **"The Intent-to-Outcome Engine"** — a full-stack SaaS platform for deploying and managing **zero-human companies**. Users describe what they want (an "intent"), and the platform orchestrates AI agents organized into a corporate hierarchy (CEO, CTO, CMO, CFO, VPs, specialists) to deliver verified outcomes.

### Core Concepts

| Concept | Description |
|---|---|
| **Intent Engine** | LLM-powered guided questioning flow that turns a vague user request into a structured "intent object," then executes it |
| **AI CEO ("Arch")** | Executive-level AI agent that decomposes goals, delegates to subordinates, and makes strategic decisions |
| **Proof of Outcome (PoO)** | A verifiable receipt generated after every completed task — records what was done, value created, and labor saved |
| **OKRs** | Hierarchical Objectives & Key Results at company / department / agent / task levels |
| **Heartbeat System** | Cron-scheduled autonomous execution cycles where agents wake, check tasks, act, and report |
| **Blueprints** | Packaged organizational templates (agent hierarchies + config) that can be versioned, deployed, and sold |
| **Human-in-the-Loop Inbox** | Approval/escalation queue for decisions that exceed agent authority |
| **Integration Hub** | OAuth-connected external tools (HubSpot, Mailchimp, Slack, Stripe) with an abstraction layer so agents work against categories, not specific providers |
| **Context Objects** | Structured context assembled per request by pulling live data from connected integrations (3-step: Interpret → Gather → Contextualize) |
| **Companies** | Multi-tenant — each user can create multiple companies, each with its own agents, departments, OKRs, and budgets |
| **Projects** | Per-company workspaces with files, chat, plans, and associated tasks |

---

## 2. Tech Stack

### Frontend
- **React 19** + **TypeScript 5.9**
- **Vite 7.1** (build + dev server)
- **Tailwind CSS 4.1** (OKLCh color tokens, dark theme)
- **shadcn/ui** (Radix UI + Tailwind — `components.json` style: `new-york`)
- **Wouter 3.3** (client-side routing — NOT React Router)
- **TanStack React Query 5.90** (server state / caching)
- **tRPC client** (type-safe API calls — HTTP batch link)
- **Socket.IO client** (real-time events)
- **React Hook Form + Zod** (forms + validation)
- **Framer Motion** (animations)
- **Recharts** (charts)
- **Lucide React** (icons)
- **Sonner** (toast notifications)

### Backend
- **Express 4.21** + **Node.js**
- **tRPC 11.6** (type-safe RPC — all routes in one file)
- **Drizzle ORM 0.44** + **MySQL** (schema in `drizzle/schema.ts`)
- **Socket.IO 4.8** (real-time bidirectional events)
- **Stripe SDK 20.4** (payments, subscriptions, webhooks)
- **AWS S3 SDK** (file storage)
- **jose** (JWT session management)

### Build & Dev
- **pnpm 10.4** (package manager)
- **esbuild** (server bundle)
- **Vitest 2.1** (unit tests — server only)
- **Prettier** (formatting — double quotes, trailing commas, 80 char width)
- **drizzle-kit** (migrations)

---

## 3. Repository Structure

```
opencommand/
├── client/                      # React frontend
│   ├── index.html               # Entry HTML (meta tags, OG tags, favicon)
│   ├── public/                  # Static assets (favicon, sitemap, robots.txt)
│   └── src/
│       ├── main.tsx             # React entry — tRPC + QueryClient setup
│       ├── App.tsx              # All routes (Wouter)
│       ├── index.css            # Tailwind config + design tokens + custom styles
│       ├── components/
│       │   ├── ui/              # shadcn/ui primitives (button, card, dialog, etc.)
│       │   ├── AppLayout.tsx    # Main shell — company rail + sidebar + content area
│       │   └── AIChatBox.tsx    # Reusable AI chat component
│       ├── contexts/            # React contexts (theme)
│       ├── hooks/               # Custom hooks (useSocket, useMobile, etc.)
│       ├── lib/
│       │   ├── trpc.ts          # tRPC client config
│       │   ├── queryClient.ts   # React Query client
│       │   └── utils.ts         # cn() helper
│       └── pages/               # Route page components
│           ├── Home.tsx         # Landing page
│           ├── MissionControl.tsx  # Dashboard (OKRs, agents, P&L, heartbeat, PoO)
│           ├── IntentEngine.tsx    # Intent → execution flow
│           ├── AICeo.tsx           # AI CEO chat ("Arch")
│           ├── Blueprints.tsx      # Blueprint builder/viewer
│           ├── Governance.tsx      # Approval gates, audit log, webhooks, tools
│           ├── IntegrationHub.tsx  # OAuth tool connections
│           ├── Projects.tsx        # Project grid + detail pages
│           ├── Creators.tsx        # Creator landing page + waitlist
│           └── ...
│
├── server/                      # Express + tRPC backend
│   ├── _core/
│   │   ├── index.ts             # Server bootstrap (Express + Socket.IO + Vite)
│   │   ├── trpc.ts              # tRPC router + procedure definitions
│   │   ├── context.ts           # Request context (user session)
│   │   ├── llm.ts               # LLM invocation wrapper (OpenAI-compatible API)
│   │   ├── env.ts               # Environment variable map
│   │   ├── notification.ts      # notifyOwner() — real-time alerts
│   │   ├── oauth.ts             # User authentication (OAuth + JWT)
│   │   ├── cookies.ts           # Session cookie config
│   │   ├── vite.ts              # Vite dev middleware
│   │   └── types/               # Shared TS types
│   ├── routers.ts               # ALL tRPC routes (~91KB, single file)
│   ├── db.ts                    # ALL database helpers (~48KB, single file)
│   ├── integrationOAuth.ts      # OAuth flows for HubSpot/Mailchimp/Slack/Stripe
│   ├── socketEmit.ts            # emitToUser() helper
│   ├── storage.ts               # S3 upload/download
│   ├── stripe/                  # Stripe products + webhook handler
│   └── *.test.ts                # Vitest test files (9 files, ~130+ tests)
│
├── shared/                      # Code shared between client + server
│   ├── const.ts                 # Constants (cookie name, timeouts, error messages)
│   └── types.ts                 # Type re-exports from Drizzle schema
│
├── drizzle/                     # Database layer
│   ├── schema.ts                # Complete MySQL schema (~40 tables)
│   ├── relations.ts             # Drizzle ORM relationship definitions
│   └── migrations/              # SQL migration files (0000–0005)
│
├── package.json                 # Dependencies + scripts
├── tsconfig.json                # TypeScript config (path aliases)
├── vite.config.ts               # Vite build config
├── vitest.config.ts             # Test config
├── drizzle.config.ts            # Drizzle migration config
├── components.json              # shadcn/ui config
├── .prettierrc                  # Formatting rules
└── todo.md                      # Full project history (396 completed tasks)
```

---

## 4. Key Architectural Patterns

### 4.1 tRPC (Type-Safe API)

All API routes live in **`server/routers.ts`** as a single merged tRPC router. Sub-routers are organized by domain:

```
appRouter
├── companies.*        # CRUD, P&L, seed defaults
├── agents.*           # CRUD, fleet management, capabilities
├── tasks.*            # Create, execute, update, thread messages
├── okrs.*             # CRUD, progress tracking
├── pooReceipts.*      # Generate, list, public viewer
├── inbox.*            # Human-in-the-loop approvals
├── marketplace.*      # Listings, blueprints, skills
├── creators.*         # Partnerships
├── aiCeo.*            # LLM orchestration, decisions
├── departments.*      # Org structure
├── heartbeat.*        # Autonomous execution
├── governance.*       # Approval gates, audit, webhooks, tools, kill switch
├── blueprints.*       # Builder, versioning, deployment
├── integrations.*     # Tool categories, providers, connections, context
├── projects.*         # Projects, files, chat
├── onboarding.*       # Socratic C-suite onboarding
├── waitlist.*         # Email capture
└── stripe.*           # Checkout, webhooks
```

**Client calls are made via:**
```ts
import { trpc } from "@/lib/trpc";
const { data } = trpc.agents.list.useQuery({ companyId: 1 });
```

### 4.2 Database (Drizzle ORM + MySQL)

- Schema: `drizzle/schema.ts` (~40 tables)
- All query helpers: `server/db.ts` (exported functions like `getAgentsByCompanyId`, `createTask`, etc.)
- Migrations generated with `drizzle-kit generate`, applied with `drizzle-kit migrate`
- Run `pnpm db:push` to generate + apply migrations

**Important tables:** `users`, `companies`, `agents`, `departments`, `tasks`, `task_threads`, `okrs`, `poo_receipts`, `inbox_items`, `heartbeat_log`, `blueprints`, `blueprint_deployments`, `tool_categories`, `tool_providers`, `user_connections`, `abstraction_mappings`, `context_objects`, `projects`, `project_files`, `project_chats`, `agent_onboardings`, `strategy_proposals`, `waitlist_entries`

### 4.3 LLM Integration

`server/_core/llm.ts` exports `invokeLLM()` — an OpenAI-compatible chat completions wrapper:
- Currently uses **Gemini 2.5 Flash** via a Forge API proxy
- Accepts messages, tools, tool_choice, response_format, output_schema
- Returns standard OpenAI-shaped response (choices, usage, tool_calls)
- API URL: `BUILT_IN_FORGE_API_URL` env var (falls back to `forge.manus.im`)
- API Key: `BUILT_IN_FORGE_API_KEY` env var

**Used in:** Intent Engine questioning, AI CEO orchestration, onboarding flows, context assembly

### 4.4 Real-Time (Socket.IO)

- Server emits events via `emitToUser(userId, event, data)` in `server/socketEmit.ts`
- Events: `task_completed`, `poo_receipt`, `inbox_item`, `agent_status`, `heartbeat`, `okr_updated`, `kill_switch`
- Client connects in `AppLayout.tsx`, listens for events, shows toasts, and invalidates React Query caches

### 4.5 Authentication

- OAuth-based auth via `OAUTH_SERVER_URL` (Manus OAuth portal)
- JWT stored in HTTP-only cookie (`COOKIE_NAME` from shared/const.ts)
- `protectedProcedure` in tRPC enforces auth; `publicProcedure` allows anonymous access
- Session context provides `ctx.user.id` and `ctx.user.openId`

### 4.6 Routing (Frontend)

Uses **Wouter** (not React Router). Routes defined in `App.tsx`:
```tsx
<Route path="/" component={Home} />
<Route path="/mission-control" component={MissionControl} />
<Route path="/intent-engine" component={IntentEngine} />
<Route path="/ai-ceo" component={AICeo} />
<Route path="/blueprints" component={Blueprints} />
<Route path="/governance" component={Governance} />
<Route path="/integration-hub" component={IntegrationHub} />
<Route path="/projects" component={Projects} />
<Route path="/projects/:id" component={ProjectDetail} />
<Route path="/onboarding/:agentId" component={AgentOnboarding} />
<Route path="/creators" component={Creators} />
<Route path="/receipt/:receiptNumber" component={PublicReceipt} />
// ... more
```

---

## 5. Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Session cookie signing |
| `OAUTH_SERVER_URL` | OAuth provider base URL |
| `OWNER_OPEN_ID` | Admin user's OpenID |
| `BUILT_IN_FORGE_API_URL` | LLM API endpoint |
| `BUILT_IN_FORGE_API_KEY` | LLM API key |
| `STRIPE_SECRET_KEY` | Stripe payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `HUBSPOT_CLIENT_ID/SECRET` | HubSpot OAuth |
| `MAILCHIMP_CLIENT_ID/SECRET` | Mailchimp OAuth |
| `SLACK_CLIENT_ID/SECRET` | Slack OAuth |
| `STRIPE_OAUTH_CLIENT_ID` | Stripe Connect OAuth |
| `APP_BASE_URL` | Public app URL (for OAuth callbacks) |
| `VITE_APP_ID` | Application identifier |
| `PORT` | Server port (default 3000) |

---

## 6. NPM Scripts

```bash
pnpm dev          # Start dev server (tsx watch + Vite HMR)
pnpm build        # Production build (Vite frontend + esbuild server)
pnpm start        # Run production build
pnpm check        # TypeScript type-check (tsc --noEmit)
pnpm test         # Run Vitest (server tests only)
pnpm format       # Prettier format all files
pnpm db:push      # Generate + apply Drizzle migrations
```

---

## 7. Testing

- **Framework:** Vitest 2.1
- **Location:** `server/*.test.ts` (9 test files, 130+ tests)
- **Scope:** Backend-only (tRPC router logic, DB helpers)
- **No frontend tests** currently exist

Test files:
- `opencommand.test.ts` — Core system tests (26KB, largest)
- `v2_1.test.ts` through `v3_2.test.ts` — Feature-version tests
- `projects.test.ts` — Project CRUD
- `onboarding.test.ts` — Socratic onboarding flow
- `auth.logout.test.ts` — Auth
- `waitlist.test.ts` — Waitlist

---

## 8. Design System & Styling

- **Tailwind CSS v4** with OKLCh color space tokens
- **Dark mode** by default (black `#000` background, white `#fafafa` text)
- **Accent color:** Yellow/amber (`oklch(0.85 0.15 85)`)
- **Fonts:** Inter (sans), JetBrains Mono (code)
- **Component library:** shadcn/ui (Radix UI primitives styled with Tailwind)
- All design tokens defined in `client/src/index.css`
- CSS variables follow shadcn convention: `--background`, `--foreground`, `--primary`, `--card`, etc.

---

## 9. Path Aliases

Defined in `tsconfig.json`:

```
@/*        → client/src/*       (e.g., import { Button } from "@/components/ui/button")
@shared/*  → shared/*           (e.g., import { COOKIE_NAME } from "@shared/const")
@assets/*  → attached_assets/*
```

---

## 10. Code Conventions

1. **Single-file routers:** All tRPC routes in `server/routers.ts`, all DB queries in `server/db.ts`. These files are large by design.
2. **Zod validation:** All tRPC inputs validated with Zod schemas inline.
3. **nanoid:** Used for generating unique IDs (receipt numbers, etc.)
4. **Socket.IO events:** Emitted after mutations using `emitToUser()`.
5. **Formatting:** Prettier with double quotes, es5 trailing commas, 80 char width. Run `pnpm format`.
6. **No semicolons rule:** Actually uses semicolons (`"semi": true`).
7. **shadcn/ui components:** Added via `npx shadcn@latest add <component>` — land in `client/src/components/ui/`.
8. **Protected vs Public:** Most routes use `protectedProcedure`. Public ones (PoO receipt viewer, waitlist) use `publicProcedure`.

---

## 11. Current State (as of v3.23)

- **396 completed tasks** across 30+ versioned phases
- **130+ passing tests**, 0 TypeScript errors
- **No CI/CD pipeline** — local development workflow only
- **No Docker** — runs directly on Node.js
- **No `.env.example`** — refer to the env table above
- **Marketplace/Creator pages** are built but hidden from navigation (v3.6)
- **"ARIA" was renamed to "Arch"** everywhere (v3.6)
- The LLM backing the AI features is Gemini 2.5 Flash via Forge proxy

---

## 12. How to Add a Feature (Typical Workflow)

1. **Schema** — Add tables in `drizzle/schema.ts`, run `pnpm db:push`
2. **DB helpers** — Add query functions in `server/db.ts`
3. **tRPC router** — Add a sub-router in `server/routers.ts`, merge into `appRouter`
4. **Frontend page** — Create in `client/src/pages/`, add route in `App.tsx`
5. **Socket events** — Emit via `emitToUser()` after relevant mutations
6. **Tests** — Add Vitest tests in `server/*.test.ts`
7. **Navigation** — Update `AppLayout.tsx` sidebar if needed

---

## 13. Database Schema Quick Reference

The full schema is in `drizzle/schema.ts`. Here are the most important tables and their key columns:

| Table | Key Columns | Purpose |
|---|---|---|
| `users` | id, openId, email, role | Authentication |
| `companies` | id, userId, name, mission, monthlyBudget, status | Multi-tenant orgs |
| `agents` | id, userId, companyId, name, type, status, parentAgentId, departmentId | AI workforce |
| `departments` | id, companyId, name, headAgentId, budget | Org structure |
| `tasks` | id, userId, companyId, title, intentObject, routingMode, status, cost | Work items |
| `task_threads` | id, taskId, sender, content, toolCalls | Ticket conversation |
| `okrs` | id, userId, companyId, title, progress, level, parentOkrId | Goal tracking |
| `poo_receipts` | id, userId, taskId, receiptNumber, valueCreated, laborSaved, verified | Outcome proof |
| `inbox_items` | id, userId, type, title, status, agentId | Approval queue |
| `heartbeat_log` | id, agentId, companyId, tasksChecked, tasksActedOn, duration, cost | Agent cycles |
| `blueprints` | id, userId, name, version, config, status | Org templates |
| `tool_categories` | id, name, slug, actions | Integration categories |
| `tool_providers` | id, categoryId, name, slug | Specific SaaS tools |
| `user_connections` | id, userId, providerId, accessToken, status | OAuth connections |
| `context_objects` | id, userId, request, inferredCategories, gatheredData, enrichedContext | Context assembly |
| `projects` | id, userId, companyId, name, goal, status | Workspaces |
| `agent_onboardings` | id, agentId, userId, companyId, agentType, status, conversationHistory | Socratic setup |
| `strategy_proposals` | id, userId, companyId, title, content, status | Strategy docs |

---

## 14. Critical Files to Read First

If you're picking up development, read these files in order:

1. **`drizzle/schema.ts`** — Understand the data model
2. **`server/routers.ts`** — Understand all API endpoints
3. **`server/db.ts`** — Understand database access patterns
4. **`server/_core/llm.ts`** — Understand LLM integration
5. **`client/src/App.tsx`** — Understand all routes
6. **`client/src/components/AppLayout.tsx`** — Understand navigation and layout
7. **`client/src/pages/MissionControl.tsx`** — Understand the main dashboard
8. **`client/src/pages/IntentEngine.tsx`** — Understand the core user flow
9. **`todo.md`** — Understand what's been built and the project history

---

*Generated 2026-03-25 for LLM onboarding purposes.*
