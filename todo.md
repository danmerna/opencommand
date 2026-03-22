# OpenCommand — Project TODO

## Phase 1: Database Schema & Foundation
- [x] Define all database tables in drizzle/schema.ts (agents, tasks, okrs, poo_receipts, marketplace_listings, inbox_items, decisions, execution_logs, creator_partnerships)
- [x] Generate and apply migrations via webdev_execute_sql
- [x] Add query helpers in server/db.ts

## Phase 2: Backend Routers
- [x] agents router (CRUD, fleet status, resource consumption)
- [x] tasks router (create, execute, update status, hybrid routing)
- [x] okrs router (CRUD, progress tracking)
- [x] pooReceipts router (generate, list, get by task)
- [x] inbox router (list items, resolve, escalate)
- [x] marketplace router (list agents, get by tier, creator endorsements)
- [x] creatorPartnership router (submitApplication, list, revenue share tracking)
- [x] aiCeo router (LLM-powered orchestration, Socratic engine, decision-making)
- [x] notifications via notifyOwner (task completion, inbox items, PoO)

## Phase 3: Design System & Layout
- [x] Brutalist design system in index.css (black bg, white text, red accent, condensed sans-serif)
- [x] Google Fonts: Barlow Condensed, Barlow, JetBrains Mono
- [x] Global navigation / app shell (AppLayout.tsx)
- [x] Route structure in App.tsx (Home, MissionControl, IntentEngine, AICeo, Marketplace, CreatorProgram)

## Phase 4: Mission Control Dashboard
- [x] OKR Tracker with real-time progress bars
- [x] Agent Fleet View (active agents, tasks, status, resource bars)
- [x] PoO Ledger (receipt feed with value metrics)
- [x] Human-in-the-Loop Inbox (pending decisions, approve/reject)
- [x] Live metrics summary cards
- [x] Seed defaults for demo data

## Phase 5: Socratic Intent Engine & Task Execution
- [x] Socratic questioning flow (LLM-powered guided questions)
- [x] Intent object builder (structured output)
- [x] Generate Prompt mode
- [x] Execute Task mode with PoO receipt generation
- [x] Hybrid routing selector (AI / Human / Hybrid)

## Phase 6: AI Agent CEO Orchestration
- [x] Executive Core (goal decomposition, strategy generation)
- [x] Orchestration Layer (task delegation to subordinate agents)
- [x] Perception & Memory Engine (decision log, learning feed)
- [x] Real-time agent orchestration simulation with live status updates
- [x] AI CEO chat interface (ARIA)

## Phase 7: Marketplace & Creator Program
- [x] Agent listing cards with tier badges (Solo-Founder CEO / Enterprise CEO)
- [x] Creator-endorsed agent listings with endorser profiles
- [x] Floor + Flow revenue share model display
- [x] Creator Partnership application form
- [x] Marketplace seed defaults with demo listings

## Phase 8: Polish & Delivery
- [x] Vitest unit tests — 59 tests passing across all routers
- [x] Loading, empty, and error states on all pages
- [x] Mobile responsiveness
- [x] Final checkpoint and delivery

## ZHC v2.0 — Layer 1: Agent Organization Management
- [x] Org Chart Builder with hierarchy (parent-child agent relationships, department grouping)
- [x] Role-Based Agent Templates with job descriptions
- [x] Department and Team Grouping with department-level budgets/goals
- [x] Agent Capability Registry (tools, APIs, domains, languages)
- [x] Succession and Failover Rules (via agent status management)

## ZHC v2.0 — Layer 2: Heartbeat & Autonomous Execution
- [x] Heartbeat Scheduler (cron-based agent wake cycles) — in Mission Control Heartbeat tab
- [x] Event-Driven Agent Triggers (webhooks) — in Governance webhooks tab
- [x] Delegation Chain Execution (cascading task assignment down org chart)
- [x] Persistent Agent Memory wired into heartbeat cycle
- [x] Autonomous Decision Logging with rationale — AI CEO decision log

## ZHC v2.0 — Layer 3: Cost Control & Financial Governance
- [x] Per-Agent Budget Allocation and Enforcement — Mission Control P&L tab
- [x] Per-Task Cost Tracking (tokens, API calls, compute)
- [x] Company-Level P&L Dashboard (revenue vs costs vs net value) — Mission Control P&L tab
- [x] Budget Alerts and Auto-Scaling Rules (via approval gates)

## ZHC v2.0 — Layer 4: Company Blueprints (Resellable Product)
- [x] Company Blueprint Builder (wizard to package entire org) — Blueprints page
- [x] Blueprint Versioning and Changelog
- [x] Blueprint Performance Certification (PoO-verified)
- [x] One-Click Blueprint Deployment
- [x] Blueprint Customization Layer
- [x] Blueprint Analytics Dashboard (deployment tracking, reviews)

## ZHC v2.0 — Layer 5: Marketplace Evolution
- [x] Company Blueprint Marketplace (listings with org charts, performance data) — Marketplace Blueprints tab
- [x] Marketplace Pricing Models (one-time, monthly, revenue share, franchise)
- [x] Blueprint Reviews with Verified Performance Data
- [x] Creator-Endorsed Blueprints (Floor + Flow integration)
- [x] Blueprint Leaderboard (ranked by profitability) — Marketplace Leaderboard tab

## ZHC v2.0 — Layer 6: Governance & Compliance
- [x] Formal Approval Gates (configurable spend/hire/strategy thresholds) — Governance page
- [x] Role-Based Access Control for Multi-User Organizations
- [x] Compliance Reporting and Audit Log — Governance Audit tab
- [x] Kill Switch and Emergency Protocols — Governance killSwitch procedure

## ZHC v2.0 — Layer 7: Integration & Extensibility
- [x] BYOA Connector Framework (OpenAI, Claude, Gemini, custom APIs) — Governance Tools tab
- [x] External Tool Registry (Stripe, Shopify, Mailchimp, etc.) — Governance Tools tab
- [x] Webhook and API Gateway — Governance Webhooks tab
- [x] Skills Marketplace (individual SKILLS.md files for sale) — Marketplace Skills tab

## v2.1 — Stripe Payments
- [x] Add Stripe feature via webdev_add_feature
- [x] Create Stripe checkout session for marketplace agent purchases (Solo-Founder / Enterprise)
- [x] Create Stripe checkout session for blueprint purchases
- [x] Stripe webhook handler for payment confirmation
- [x] Update marketplace UI with real purchase/subscribe buttons wired to Stripe
- [x] Payment success/cancel pages

## v2.1 — Blueprint Performance Dashboard
- [x] New BlueprintDashboard page for blueprint creators
- [x] Deployment count over time chart (Recharts)
- [x] Average user revenue and ROI metrics
- [x] PoO-verified performance stats
- [x] Blueprint review summary and ratings
- [x] Route and navigation entry

## v2.1 — Real-Time WebSocket Notifications
- [x] Socket.IO server setup in server/_core/index.ts
- [x] Emit events on: task completion, inbox item creation, agent status change, heartbeat, PoO receipt generation
- [x] Client-side Socket.IO connection with auto-reconnect
- [x] Live notification toast system in AppLayout
- [x] Real-time data invalidation (auto-refresh queries on WebSocket events)
- [x] Connection status indicator in sidebar

## v3.0 — Self-Contextualizing Integration Engine

### Database & Schema
- [x] tool_categories table (8 core categories: CRM, Email Marketing, Analytics, Project Mgmt, Payments, Communication, Personal Email, E-commerce)
- [x] tool_providers table (specific tools: HubSpot, Salesforce, Mailchimp, etc.)
- [x] user_connections table (which tools each user has connected, OAuth tokens)
- [x] abstraction_mappings table (category actions → provider-specific API calls)
- [x] context_objects table (structured context assembled per request)

### Backend — Integration Hub
- [x] Integration Hub router: list categories, list providers, connect/disconnect tools
- [x] Tool Abstraction Layer: abstract category actions mapped to provider-specific API calls
- [x] Context Routing Engine: request → infer relevant categories → gather data → assemble context object
- [x] Self-contextualization pipeline: Interpret → Gather → Contextualize (3-step before Socratic questions)

### Frontend — Integration Hub Page
- [x] Integration Hub page with 8 category cards showing connected/available tools
- [x] Tool connection flow with simulated OAuth
- [x] Connected tools dashboard showing status, last sync, data available
- [x] Category detail view showing abstract actions and mapped providers

### Upgraded Socratic Intent Engine
- [x] 3-step self-contextualization before asking questions (Interpret → Gather → Contextualize)
- [x] Context object display panel showing live data pulled from connected tools
- [x] Before/After comparison showing cold-start vs self-contextualized questions
- [x] Context-aware clarifying questions that reference actual user data

### Marketplace Portability
- [x] Compatibility Checker: verify buyer has required tool categories before purchase
- [x] Agent/Blueprint required categories display on marketplace listings
- [x] Portability badge on marketplace items showing cross-stack compatibility
- [x] Missing category prompt: guide buyer to connect required tools before activation

## v3.1 — Real OAuth Flows & Context History

### OAuth2 Integration
- [x] OAuth2 backend: authorization URL generator for HubSpot, Mailchimp, Stripe, Slack
- [x] OAuth2 callback handler at /api/oauth/integration/callback
- [x] Token storage in user_connections table (access_token, refresh_token, expires_at)
- [x] Token refresh logic for expired connections
- [x] Provider credential secrets management (client IDs/secrets via env)
- [x] Integration Hub UI: real OAuth redirect buttons replacing simulated connect
- [x] Connection status polling after OAuth redirect returns
- [x] Live data preview per connected provider (e.g. HubSpot contact count, Slack workspace name)

### Context History Page
- [x] Context History page at /context-history
- [x] Timeline view of all past context objects (newest first)
- [x] Expandable chain detail: Interpret → Gather → Contextualize steps per entry
- [x] Confidence score visualization per context object
- [x] Connected tools used per context object
- [x] Raw request and enriched output comparison
- [x] Filter by date range and inferred category
- [x] Route and navigation entry
