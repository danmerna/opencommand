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
- [x] aiCeo router (LLM-powered orchestration, Intent Engine, decision-making)
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

## Phase 5: Intent Engine & Task Execution
- [x] Intent-driven questioning flow (LLM-powered guided questions)
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
- [x] Self-contextualization pipeline: Interpret → Gather → Contextualize (3-step before Intent Engine questions)

### Frontend — Integration Hub Page
- [x] Integration Hub page with 8 category cards showing connected/available tools
- [x] Tool connection flow with simulated OAuth
- [x] Connected tools dashboard showing status, last sync, data available
- [x] Category detail view showing abstract actions and mapped providers

### Upgraded Intent Engine
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

## v3.2 — Minimal Theme Redesign, Payment History, Public PoO Receipt

### Theme Redesign (inspired by davidprotein.com)
- [x] Analyze davidprotein.com design language (typography, spacing, color, layout)
- [x] Rewrite index.css with minimal dark design tokens (Inter font, subtle borders, warm accents)
- [x] Redesign AppLayout sidebar to minimal aesthetic
- [x] Redesign Home landing page to minimal style
- [x] Retheme MissionControl page
- [x] Retheme IntentEngine page
- [x] Retheme AICeo page
- [x] Retheme Blueprints page
- [x] Retheme Marketplace page
- [x] Retheme CreatorProgram page
- [x] Retheme Governance page
- [x] Retheme IntegrationHub page
- [x] Retheme CompatibilityChecker page
- [x] Retheme ContextHistory page
- [x] Retheme BlueprintDashboard page

### Payment History Page
- [x] Payment History page at /payments
- [x] List user's past Stripe purchases with date, amount, status
- [x] Subscription status display
- [x] Backend router to fetch payment data from Stripe API
- [x] Route and navigation entry

### Public PoO Receipt Viewer
- [x] Public PoO Receipt page at /receipt/:receiptNumber (no auth required)
- [x] Shareable receipt layout showing task, outcome, value created, labor saved
- [x] Verification badge and timestamp
- [x] Backend public procedure to fetch receipt by receiptNumber
- [x] Copy link button for sharing (OG tags require SSR — noted for future)

## v3.4 — Live Socket.IO Emit Wiring

- [x] Audit existing Socket.IO server setup and io instance location
- [x] Expose io instance to tRPC router context or as a shared singleton
- [x] Emit `task_completed` on tasks.executeTask with task id, title, value created
- [x] Emit `poo_receipt` on pooReceipts generation with receipt number and value
- [x] Emit `inbox_item` on inbox item creation (via executeTask and killSwitch)
- [x] Emit `agent_status` on agent status changes (active/idle/error)
- [x] Emit `heartbeat` on heartbeat scheduler cycle
- [x] Emit `okr_updated` on OKR progress updates
- [x] Verify client-side listeners handle all new event types (okr_updated, kill_switch added)
- [x] Run vitest to confirm no regressions (108 tests passing)

## v3.5 — Login Page Cleanup

- [x] Locate Meta branding on the login page (it's the Manus OAuth portal)
- [x] Provided VITE_APP_TITLE and VITE_APP_LOGO instructions to override Meta branding

## v3.5 — Company Switcher Rail + Projects

- [x] Add `projects` table (id, userId, companyId, name, goal, color, status, createdAt)
- [x] Add `project_files` table (id, projectId, name, url, fileKey, mimeType, size, createdAt)
- [x] Add `project_chats` table (id, projectId, userId, role, content, createdAt)
- [x] Generate migration SQL and apply via webdev_execute_sql
- [x] Add DB helpers: getProjectsByUserId, getProjectById, createProject, updateProject, deleteProject
- [x] Add DB helpers: getProjectFiles, createProjectFile, deleteProjectFile
- [x] Add DB helpers: getProjectChats, createProjectChat
- [x] Add tRPC projects router (list, get, create, update, delete, files, chat, assignTask)
- [x] Rebuild AppLayout: add far-left company-switcher icon rail (inspired by Paperclip layout)
- [x] Company switcher rail: avatar/icon per company, active highlight, + button to create company
- [x] Sidebar now contextual to selected company (agents, OKRs, tasks scoped to that company)
- [x] Add Projects section to sidebar (list projects for selected company, + to create)
- [x] Build /projects page — grid of project cards with color, goal, task count, status
- [x] Build /projects/:id page — tabs: Overview, Files, Chat, Plan, Tasks
- [x] Project Overview tab: goal, status, quick stats, action buttons
- [x] Project Files tab: upload files, list with download/delete
- [x] Project Chat tab: threaded chat with LLM context
- [x] Project Plan tab: markdown plan editor with save
- [x] Project Tasks tab: assign existing tasks scoped to project
- [x] Wire Socket.IO emit on project chat messages (inbox_item type)
- [x] Write vitest tests for projects router (14 tests passing)
- [x] 122 total tests passing, 0 TypeScript errors

## v3.5.1 — Mobile Layout Fix

- [x] Fix mobile: main content has desktop left margin (264px) applied, cutting off content
- [x] Ensure both sidebars (rail + nav) are hidden on mobile by default
- [x] Mobile hamburger menu should toggle both sidebars together

## v3.5.2 — Mobile UX Improvements

- [x] Add close button (X) inside the mobile sidebar overlay
- [x] Make the mobile header sticky (pinned to top when scrolling)
- [x] Add swipe-to-close gesture on the mobile sidebar

## v3.6 — Hide Marketplace + Rename ARIA to Arch

- [x] Hide Marketplace from sidebar navigation
- [x] Hide Creator Program from sidebar navigation
- [x] Hide Blueprint Dashboard (Analytics) from sidebar navigation
- [x] Hide Compatibility Checker from sidebar navigation
- [x] Remove marketplace routes from App.tsx (keep files, just hide routes)
- [x] Remove marketplace links from Home landing page
- [x] Rename all ARIA references to Arch across the codebase (12 files updated)
- [x] 122 tests passing, 0 TypeScript errors

## v3.7 — Socratic C-Suite Onboarding

### Data Model
- [x] Add `agent_onboardings` table (id, agentId, userId, companyId, agentType, status, context JSON, conversationHistory JSON, summary, completedAt, createdAt)
- [x] Add `strategy_proposals` table (id, userId, companyId, proposedByAgentId, title, content, executiveSummary, status, createdAt)
- [x] Generate migration SQL and apply via webdev_execute_sql

### Backend
- [x] DB helpers: getOnboardingByAgentId, getOnboardingById, createOnboarding, updateOnboarding, completeOnboarding
- [x] DB helpers: getStrategyProposalsByCompanyId, createStrategyProposal, updateStrategyProposalStatus
- [x] tRPC onboarding.status — check onboarding status for all C-suite agents in a company
- [x] tRPC onboarding.getForAgent — get single agent's onboarding
- [x] tRPC onboarding.start — begin Socratic onboarding for a C-suite agent (LLM first question)
- [x] tRPC onboarding.respond — send user answer, get next LLM question (role-specific prompts)
- [x] tRPC onboarding.generateStrategy — after all C-suite onboarded, CEO synthesizes formal strategy
- [x] tRPC onboarding.proposals — list strategy proposals
- [x] tRPC onboarding.updateProposalStatus — accept/revise proposals
- [x] Role-specific system prompts for CEO, CTO, CMO, CFO, VP (6-8 questions each)

### Frontend
- [x] AgentOnboarding.tsx — Socratic question flow UI (chat-like, one question at a time)
- [x] Role-specific question sets via LLM system prompts per agent type
- [x] OnboardingBanner in MissionControl — shows which agents need onboarding, links to each
- [x] After onboarding complete, shows green "Onboarded" badge on agent button
- [x] After all executives onboarded, "Generate Strategy" button appears in banner
- [x] Route /onboarding/:agentId registered in App.tsx

### UX
- [x] Onboarding only required once per executive agent (auto-resumes if in progress)
- [x] Users can alter baseline later via agent's strategy engine chat
- [x] Progress indicator showing X of Y executives onboarded
- [x] 130 tests passing, 0 TypeScript errors

## v3.8 — Home Page CTA Updates
- [x] Swap "Deploy Your AI CEO" button text to "Deploy Your Zero-Human Company"
- [x] Replace "View Blueprints" button with "See How It Works" (links to /intent-engine)

## v3.9 — Hero Headline Update
- [x] Rewrite hero headline to match zero-human company framing ("Deploy your / zero-human company.")

## v3.10 — Home Page Polish
- [x] Update bottom CTA section copy to zero-human company framing ("Your zero-human company starts here.")
- [x] Add 3-step "How It Works" section (State Your Intent → Arch Orchestrates → Proof of Outcome)

## v3.11 — Animations + CTA Revert
- [x] Animate How It Works steps with scroll-triggered fade-in-up stagger (IntersectionObserver, 150ms delay per step)
- [x] Revert bottom CTA headline back to "Hire your AI CEO today." with original supporting copy

## v3.12 — Nav + Hero Animation
- [x] Add Creators nav link to top nav (links to /creators)
- [x] Create Creators.tsx coming-soon page with waitlist CTA and 4 benefit cards
- [x] Register /creators route in App.tsx
- [x] Add hero load animation (staggered fade-in-up on label, h1, subheading, and CTA buttons)

## v3.13 — Agents Sidebar Section
- [x] Add Agents section to sidebar above Projects, formatted identically to Projects section (status dot, name, type label, + button, empty state, 8-item cap with overflow link)

## v3.14 — Sidebar Section Order
- [x] Swap Projects and Agents sections so Projects is above Agents

## v3.15 — OAuth Callback Retry
- [x] Add retry logic (up to 3 attempts, exponential backoff 200/400/800ms) to OAuth callback DB write to handle ECONNRESET/ETIMEDOUT/ECONNREFUSED

## v3.16 — SEO Fixes (Home Page)
- [x] Add meta description (137 chars) to index.html
- [x] Add meta keywords to index.html (9 keywords)
- [x] Add meta robots index/follow tag
