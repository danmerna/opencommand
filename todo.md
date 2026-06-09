# OpenCommand TODO

- [x] Replace hero label: 'THE INTENT-TO-OUTCOME ENGINE' → 'IntelligenceOS'
- [x] Keep headline: 'Deploy your zero-human company' (no change)
- [x] Update subheadline to Force Multiplier narrative
- [x] Change primary CTA: 'Deploy Your Zero-Human Company' → 'Hire Your AI CEO'
- [x] Update page title to include IntelligenceOS branding
- [x] Update footer text: reference IntelligenceOS instead of Intent-to-Outcome Engine
- [x] Add Agents section to sidebar navigation above Projects, matching the same format
- [x] Create AgentDetail page component at /agents/:id
- [x] Add tRPC procedure to fetch a single agent by ID (already existed as agents.get)
- [x] Wire up /agents/:id route in App.tsx
- [x] Update sidebar agent links to navigate to /agents/:id
- [x] Add active state highlighting for agent links in sidebar
- [x] Add Stripe payment feature scaffold
- [x] Configure Stripe products and pricing — Starter $1/mo and Pro $5/mo added to products.ts
- [x] Build payment UI — /pricing page with plan cards, checkout buttons, trust section
- [x] Wire up Stripe webhooks for subscription lifecycle events (existing webhook handler)
- [x] Add current plan badge on Pricing page using subscription tier detection
- [x] Gate Pro-only features with upgrade prompts (unlimited agents, advanced orchestration)
- [x] Add pricing section to public landing page (Home.tsx)
- [x] Build ProOnboarding page: auto-create executive agents, combined strategy generation, first question walkthrough
- [x] Wire post-checkout Stripe redirect to /onboarding/pro route
- [x] Add /onboarding/pro route to App.tsx
- [x] Persist Pro onboarding progress to DB with resume logic
- [x] Add combined strategy view to Mission Control
- [x] Generate PDF mockup of combined strategy document
- [x] Add strategy briefing frequency preference step to ProOnboarding (daily/weekly/monthly/quarterly)
- [x] Allow users to skip CTO or CFO interviews without blocking strategy generation
- [x] Make CMO interview skippable in Pro onboarding (same as CTO/CFO)
- [x] Update landing page headline: "zero-human company" → "zero-human workforce"
- [x] Show briefing frequency badge + edit control on Mission Control Strategy tab
- [x] Add scheduled briefing delivery via cron/notification on chosen cadence
- [x] "Accept Strategy" button auto-populates OKRs from Key Metrics section
- [x] Replace "IntelligenceOS" with "Personal Intelligence Engine" across all files
- [x] Add OKR source column (strategy/manual) to schema and migrate DB
- [x] Tag auto-created OKRs with source "strategy" in acceptStrategy procedure
- [x] Display "Generated from strategy" badge on OKR cards in Mission Control
- [x] Build /briefings history log page with timestamped list of past briefings
- [x] Add briefing_logs DB table and server procedure to store/retrieve briefing history
- [x] Add briefing preview card in ProOnboarding after frequency selection step
- [x] Notify owner when a strategy-sourced OKR reaches "achieved" (100%)
- [x] Notify owner when a strategy-sourced OKR status changes to "at_risk"
- [x] Notify owner when a strategy-sourced OKR reaches "achieved" (100%)
- [x] Notify owner when a strategy-sourced OKR status changes to "at_risk"
- [x] Integrate Resend email API to send briefing content as formatted email
- [x] Add PDF download button per briefing entry on /briefings page
- [x] Add email unsubscribe token to users table and one-click unsubscribe endpoint
- [x] Add unsubscribe link to briefing email footer
- [x] Update RESEND_FROM_EMAIL to briefings@opencommand.co
- [x] Create server/integrations/hubspot.ts with token refresh and CRM data fetchers
- [x] Create server/integrations/contextAssembler.ts orchestrator
- [x] Add context.liveContextualize tRPC procedure to routers.ts
- [x] Update IntentEngine.tsx with progressive loading, context card, and no-connection fallback banner
- [x] Create server/integrations/salesforce.ts with token refresh and CRM data fetchers
- [x] Register Salesforce in contextAssembler.ts fetchLiveData and integrationOAuth.ts
- [x] Show context card in ProOnboarding CEO interview step with live business data
- [x] Add History tab to Intent Engine linking to existing /context-history page
- [x] Server procedure for listing past context objects already exists (context.list)
- [x] Create server/integrations/metaAds.ts for Meta Ads campaign data
- [x] Create server/integrations/googleAds.ts for Google Ads campaign data
- [x] Create server/integrations/tiktokAds.ts for TikTok Ads campaign data
- [x] Create server/integrations/ga4.ts for Google Analytics data
- [x] Register Meta Ads, Google Ads, TikTok Ads, GA4 in contextAssembler, integrationOAuth, env, IntegrationHub
- [x] Add integration prompt step before each executive interview in ProOnboarding (role-specific tool suggestions)
- [x] Feed assembled live context into onboarding.start so first question references real business data
- [x] Add LLM-based data gap detection when onboarding interview completes
- [x] Return suggested integrations from onboarding.respond when isComplete=true
- [x] Show targeted integration suggestions on ProOnboarding post-interview completion screen
- [x] Show integration suggestions on agent detail page for agents with detected gaps
- [x] Auto-dismiss integration suggestions when user has already connected that tool
- [x] Add integration health indicators with last sync time and data freshness on connected tools
- [x] Add re-analyze gap detection button on agent detail page
- [x] Fix v3_1 test timeout by updating LLM mock to return inferredCategories instead of categories
- [x] Redesign homepage: rewrite hero subheadline to highlight self-contextualizing engine
- [x] Redesign homepage: replace fake metrics strip with animated Context Engine Demo
- [x] Redesign homepage: add Integration Logo Bar section with tool logos
- [x] Redesign homepage: update nav with How It Works + Marketplace links + Start Free CTA
- [x] Redesign homepage: update feature card copy (Intent Engine, AI CEO, Company Blueprints → Agent Marketplace)
- [x] Redesign homepage: expand How It Works from 3 to 4 steps (add context-pull step)
- [x] Redesign homepage: add Marketplace + Creators section with example agent cards
- [x] Redesign homepage: update pricing to Free/$29/$99 three-tier layout
- [x] Redesign homepage: replace bottom CTA with email capture + Join the Beta
- [x] Redesign homepage: expand footer to 4-column layout
- [x] Replace Agent Marketplace section with Blueprints differentiator section (coming soon)
- [x] Update Core Systems feature card from "Agent Marketplace" to "Company Blueprints" with unique value prop
- [x] Update nav from "Marketplace" to "Blueprints" throughout
- [x] Add Blueprints vs. existing AI agent marketplaces comparison content
- [x] Update footer links to reference Blueprints instead of Marketplace
- [x] Update tests to reflect marketplace → blueprints changes
- [x] Update homepage pricing section: replace Free tier with 7-day free trial, no credit card required
- [x] Update homepage CTAs and copy to reference 7-day free trial
- [x] Update Pricing page to reflect 7-day free trial model
- [x] Update products.ts: removed Starter ($1), updated Pro to $29, added Business at $99, added trialDays: 7
- [x] Update tests to reflect free trial changes
- [x] Disable all pricing tiers: replace homepage pricing section with "Free during beta" message
- [x] Disable pricing page: replace with beta access message, remove checkout flows
- [x] Update subscription hook to grant full features to all signed-up users
- [x] Remove pricing nav link from homepage if present (kept as route but content is beta-only)
- [x] Update bottom CTA and any other copy referencing paid tiers
- [x] Update tests to reflect pricing removal
- [x] Add Beta badge next to OpenCommand logo in homepage nav
- [x] Add Beta badge next to OpenCommand logo in DashboardLayout sidebar
- [x] Build usage analytics: create feature_events table in schema
- [x] Build usage analytics: create server procedures to log and query events
- [x] Build usage analytics: create Analytics dashboard page with charts
- [x] Build usage analytics: add route in App.tsx
- [x] Build feedback widget: create feedback table in schema
- [x] Build feedback widget: create server procedures for submitting/listing feedback
- [x] Build feedback widget: create persistent FeedbackWidget component
- [x] Build feedback widget: add to Mission Control / AppLayout
- [x] Write tests for analytics and feedback features
- [x] Add Analytics nav link in AppLayout sidebar (admin-only or all users)
- [x] Add Feedback Admin nav link in AppLayout sidebar
- [x] Build Feedback Admin page: list all feedback, filter by type/status, update status
- [x] Wire useAnalytics hook into agent creation flow
- [x] Wire useAnalytics hook into blueprint deployment flow
- [x] Wire useAnalytics hook into intent engine queries
- [x] Wire useAnalytics hook into onboarding completion
- [x] Redesign multi-agent executive onboarding: clearer entry point from Mission Control
- [x] Redesign onboarding: add self-contextualization step explanation
- [x] Redesign onboarding: show which tools will be connected and what context will be pulled
- [x] Redesign onboarding: visual progress indicator for context assembly
- [x] Write tests for Feedback Admin page and onboarding redesign
- [x] Build animated context assembly visualization: create ContextAssemblyAnimation component
- [x] Build animated context assembly visualization: show data flowing from connected tools during interview loading
- [x] Build animated context assembly visualization: integrate into ProOnboarding interview loading phase
- [x] Build onboarding resume banner: detect incomplete onboarding state in Mission Control
- [x] Build onboarding resume banner: show "Continue building your team (X/4 executives complete)" card
- [x] Build onboarding resume banner: link to /onboarding/pro to resume
- [x] Build Quick Tour overlay: create QuickTour component with tooltip-style callouts
- [x] Build Quick Tour overlay: highlight Strategy tab, agent cards, and Intent Engine
- [x] Build Quick Tour overlay: show only for first-time users after onboarding completion
- [x] Build Quick Tour overlay: persist tour completion state so it doesn't repeat
- [x] Write tests for all three new features
- [x] Build animated hero illustration: create ContextEngineHero component showing data flowing from tool icons into central brain
- [x] Build animated hero illustration: integrate into homepage right column alongside hero text
- [x] Build onboarding reminder emails: create server procedure to check incomplete onboarding after 48 hours
- [x] Build onboarding reminder emails: send reminder email with direct resume link
- [x] Build onboarding reminder emails: track reminder state to avoid duplicate sends
- [x] Write tests for hero illustration and onboarding reminders
- [x] Add social proof section to homepage with three beta user testimonial cards
- [x] Place section between Blueprints and Beta Access sections
- [x] Write tests for the social proof section
- [x] Rename "The Magic Moment" to "Introducing Self-Contextualization"
- [x] Rewrite Context Engine Demo to show multi-source onboarding example (3+ data sources)
- [x] Remove fake social proof / testimonials section entirely
- [x] Add Meta Ads integration: schema, OAuth flow, data pull infrastructure (already existed)
- [x] Add Google Ads integration: schema, OAuth flow, data pull infrastructure (already existed)
- [x] Add TikTok Ads integration: schema, OAuth flow, data pull infrastructure (already existed)
- [x] Update integration logo bar and onboarding to include ad platforms (already done)
- [x] Write/update tests for homepage and integration changes
- [x] Build post-onboarding welcome email: send when all 4 executives are contextualized
- [x] Build post-onboarding welcome email: template with team composition summary and Strategy tab link
- [x] Build post-onboarding welcome email: track sent state to avoid duplicate sends
- [x] Build What's New changelog: create changelog_entries table in schema
- [x] Build What's New changelog: server procedures to list and create entries
- [x] Build What's New changelog: sidebar link in AppLayout
- [x] Build What's New changelog: page at /changelog with dated entries
- [x] Write tests for welcome email and changelog features
- [x] Build admin analytics dashboard: add page_views and user_sessions tables to schema and migrate DB
- [x] Build admin analytics dashboard: add admin tRPC procedures (user list, KPIs, timeline, sessions, top pages)
- [x] Build admin analytics dashboard: add tracking tRPC procedure for page view beacon
- [x] Build admin analytics dashboard: create AdminUsers page at /admin/users
- [x] Build admin analytics dashboard: wire page tracking beacon via usePageTracking hook
- [x] Build admin analytics dashboard: add Admin section to DashboardLayout sidebar (admin-only)
- [x] Build admin analytics dashboard: write 9 vitest tests for admin analytics helpers
- [x] Set OG link preview image to Full Access card screenshot (og-preview.png)
- [x] Fix hero CTA buttons to go directly to onboarding builder instead of scrolling to beta sign-up
- [x] Build sign-up funnel view: define funnel stages from DB data
- [x] Build sign-up funnel view: add adminGetFunnelStats DB helper
- [x] Build sign-up funnel view: add admin.funnelStats tRPC procedure
- [x] Build sign-up funnel view: build FunnelView component in AdminUsers page
- [x] Build sign-up funnel view: write vitest tests
- [x] Fix NaN agentId error on /onboarding/:agentId — safely parse route param before tRPC query
- [x] Fix duplicate /mission-control key in DashboardLayout sidebar nav
- [x] Fix broken DATE() SQL query in admin activity chart helper
- [x] Waitlist: Add waitlist columns to users table (waitlistStatus, waitlistPosition, referralCode, referralCount, referredBy)
- [x] Waitlist: Build DB helpers (findOrCreateUserByEmail, getWaitlistInfo, processReferral, adminApproveUser, adminRejectUser, adminGetWaitlistUsers)
- [x] Waitlist: Build tRPC procedures (emailSignup, myWaitlistInfo, admin.waitlistUsers, admin.approveUser, admin.rejectUser)
- [x] Waitlist: Replace hero CTA with email input that flows into OAuth then onboarding
- [x] Waitlist: Remove 'See How It Works' button from hero
- [x] Waitlist: Build Waitlist page with position, referral link, share buttons
- [x] Waitlist: Add access gating in AppLayout — redirect non-approved users to /waitlist
- [x] Waitlist: Redirect onboarding completion to /waitlist instead of /mission-control
- [x] Waitlist: Build WaitlistPanel in admin dashboard with approve/reject buttons
- [x] Waitlist: Migrate all existing users to waitlist pending status
- [x] Waitlist: Write vitest tests for waitlist system
- [x] Waitlist: Add mergeEmailUserToOAuth helper to link email-first users to OAuth accounts
- [x] Waitlist: Update OAuth callback to call mergeEmailUserToOAuth before upsertUser
- [x] Waitlist: Clean up junk/duplicate users in database
- [x] Fix agent names: CEO = ARCH (uppercase), CMO = NOVA, CTO = SAGE, CFO = TED
- [x] Fix CEO agent thinking user's name is "Arch" instead of its own name being ARCH
- [x] Add progress bar to onboarding showing current executive and question progress
- [x] Shorten onboarding: 3 required questions per executive, then option to continue or move on
- [x] Add 2 optional questions (Q4, Q5) per executive with skip/continue option
- [x] Apply same 3-required + 2-optional pattern to all four executives (ARCH, NOVA, SAGE, TED)
- [x] Add "Skip all optional" button to onboarding so power users can blast through all executives with only required questions
- [x] Build waitlist approval notification email: send formatted email when admin approves a user
- [x] Create visual mockup of the approval email for user review
- [x] Fix: tRPC mutation on /onboarding/30006 returns HTML instead of JSON (API route not matching)
- [x] Fix: Onboarding progress counter shows 0/4 after ARCH completion (was caused by timeout preventing completeOnboarding DB call)
- [x] Fix: Onboarding resume returns conversation history so in-progress interviews can be continued
- [x] Set up HubSpot developer account and OAuth app, configure credentials
- [x] Set up Salesforce OAuth via Nango (Nango developer app — no Connected App required)
- [ ] Set up Google Cloud project for GA4 + Google Ads OAuth (submit for review)
- [ ] Set up Meta developer app for Meta Ads OAuth (submit for review)
- [ ] Test all configured integrations end-to-end
- [x] Create demo user system: add isDemoUser flag and mock integration data to context assembler
- [x] Seed demo user in DB with pre-connected Salesforce, Meta Ads, Google Ads, GA4 mock connections
- [x] Add mock data module with realistic business metrics for all four integrations (Meridian Software)
- [x] Add admin UI button to create/reset demo user (Admin > Demo tab)
- [x] Write vitest tests for demo mode data (demoUser.test.ts)
- [x] Restore Socratic onboarding interview style: 3 deep questions per agent, no JSON signals, conversational flow
- [x] Improve live integration data injection: liveContextSummary stored in onboarding.context and re-injected on every LLM call
- [x] Update onboarding tests to reflect new Socratic prompt structure
- [x] Add professional manual interview completion button to ProOnboarding UI (count-based two-button card after 3rd answer)
- [x] Test demo user onboarding flow end-to-end (demo login verified, mission control shows correct onboarding state)
- [x] Show two-button choice UI after 3rd user answer: "Continue the conversation" vs "Next: [executive name]" (count-based, no JSON)
- [x] Refine two-button choice card copy in onboarding interview: "Go deeper" vs "Advance to [Name]"
- [x] Add Demo Mode banner in app header when logged in as demo user (amber pulsing indicator, sticky)
- [x] Tune completion phrase detection: expanded to 35+ natural closing phrases across 4 categories
- [x] Fix: LLM still emitting raw JSON in onboarding chat — sanitize legacy JSON from history + strip JSON from reply before returning to frontend
- [x] Fix: Two-button choice card not appearing on resume — initialize isCoreComplete=true when loading history with 3+ user messages
- [x] Landing page: compact terminal demo section (less vertical height)
- [x] Landing page: add CEO/CTO/CFO agent examples alongside CMO with 4-way toggle
- [x] Landing page: revert primary CTA to email collection (remove "Mission Control" CTA)
- [x] Landing page: replace nav with hamburger menu containing Login option only
- [x] Change agent demo toggle tabs to show only job titles (CEO, CMO, CTO, CFO) — no agent names
- [x] Redesign Context Engine Demo: replace onboarding terminal with Socratic intent engine UI (user request → live data → cross-source insights → numbered strategic questions)
- [x] Reorder agent demo tabs: CEO first, CMO second, CTO third, CFO fourth
- [x] Fix Socratic demo data source cards: always 2x2 grid on all screen sizes (not stacking on mobile)
- [x] Add Execute button to each Socratic question in the landing page demo (moved to app instead)
- [x] Phase 1: Add structured types to shared/types.ts (DataSourceCard, CrossSourceInsight, SocraticQuestion, SocraticEngineResponse)
- [x] Phase 1: Add getDisplayMetrics() to HubSpot adapter
- [x] Phase 1: Add getDisplayMetrics() to Salesforce adapter
- [x] Phase 1: Add getDisplayMetrics() to Meta Ads adapter
- [x] Phase 1: Add getDisplayMetrics() to Google Ads adapter
- [x] Phase 1: Restructure contextAssembler.ts to return structured output instead of freeform text
- [x] Phase 1: Update contextEngineRouter tRPC procedures to use new structured types
- [x] Phase 1: Write tests for restructured assembler and adapters
- [x] Phase 2: Rebuild AICeo.tsx as Executive Board with 4 tabs (Board / Individual / Direct LLM / Decision Log)
- [x] Phase 2: Board tab — multi-executive Socratic query with 2x2 data cards, insights, questions
- [x] Phase 2: Individual tab — pick one executive for focused 1:1 chat
- [x] Phase 2: Direct LLM tab — raw AI chat without executive persona
- [x] Phase 3: Add Execute buttons to each Socratic question in the app
- [x] Phase 3: Wire Execute → task creation → agent routing
- [x] Phase 4: Sub-agent recommendation engine based on connected tools
- [x] Phase 5: RALF loop execution + cross-model verification
- [x] Phase 5: Autonomy controls UI on Agent Detail page
- [x] Phase 6: Morning briefing with approve buttons in briefingScheduler
- [x] Phase 7: Execution dashboard showing real-time agent activity
- [x] Generate formal PoO receipt for Phases 2-7 delivery and log to PoO Ledger
- [x] Create 5-4-3-2-1 Temporal Cascade one-sheet document
- [x] Generate mockup images of morning briefing task approval flow
- [x] Update one-sheet with executives-as-design-language reframe (internal)
- [x] Produce official shipped features audit report
- [x] QA: Diagnose and fix login/OAuth issue reported by user
- [x] QA: Full site flow test (landing, onboarding, executive board, briefings)
- [x] Fix mobile login: add same-origin relay page after OAuth callback so iOS Safari persists session cookie
- [x] Fix analytics overcounting: deduplicate page views, fix session counting, fix user KPIs
- [x] Fix DATE() SQL bug in admin activity chart timeline
- [x] Audit Integration Hub: identify which integrations work, which are broken, and which need OAuth review
- [x] Fix broken integrations or clearly mark them as "coming soon" with smooth UX
- [x] Improve Integration Hub overall UX (smoother connect flow, better error states, status indicators)
- [ ] Move Meta Ads from Coming Soon to Live tier (OAuth approved)
- [x] Streamline sidebar: reduce from 15 items to 6 primary + Settings gear
- [x] Create Settings page with tabs: Account, Connections, Governance, History, About
- [x] Move Governance, Integrations, Context History, Payments, Pricing, What's New into Settings
- [x] Move Feedback to profile dropdown (floating widget already exists)
- [x] Redirect AI CEO to Executive Board with ARCH pre-selected
- [x] Add Settings gear icon to sidebar nav
- [x] Write tests for Settings page and navigation changes
- [x] Move Projects section above Agents section in sidebar navigation
- [x] Update landing page CTA to "Join Waitlist" linking to /waitlist (not onboarding)

## BYOA — Bring Your Own Agent
- [x] Add BYOA_ENCRYPTION_KEY secret for AES-256-GCM connector config encryption
- [x] Create server/connectors/encrypt.ts — AES-256-GCM encrypt/decrypt helpers
- [x] Create server/connectors/dispatcher.ts — route task execution by connectorType
- [x] Wire dispatcher into agents.executeTask procedure
- [x] Wire dispatcher into agents.triggerHeartbeat procedure
- [x] Wire dispatcher into ralf.execute procedure
- [x] Add agents.updateConnector tRPC procedure (save encrypted connectorConfig)
- [x] Add agents.testConnection tRPC procedure (ping external connector)
- [x] Build Connector Config tab on Agent Detail page (masked key UI + Test Connection)
- [x] Build BYOA step in agent creation flow ("How should this agent run?")
- [x] Write vitest tests for dispatcher, encrypt, and new procedures

## Provider Badges, Gemini UI, Heartbeat Auto-Pause, OpenCommand AI Provider
- [x] Add Connected provider badge to agent cards in Mission Control (show provider logo next to agent name)
- [x] Add OpenCommand AI as a paid provider option in BYOA selector with owl logo
- [x] Add Gemini connector UI flow with aistudio.google.com/apikey tooltip in AgentDetail Connector tab
- [x] Wire heartbeat auto-pause: if testConnection returns ok:false, pause heartbeat + notify owner
- [x] Write tests for provider badges, Gemini UI, and heartbeat auto-pause

## One-Instance-Per-Executive BYOA Architecture
- [x] Add executive_context_manifests table to schema (agentId, dataSources JSON, lastAssembledAt)
- [x] Add agents.getContextManifest and agents.updateContextManifest tRPC procedures
- [x] Auto-generate context manifest when executive completes onboarding (link to connected integrations)
- [x] Add crew_name field to connectorConfig so dispatcher routes to correct executive instance
- [x] Add claude_code connector type to dispatcher (HTTP wrapper endpoint)
- [x] Wire context manifest into executeTask: pass manifest as context to external connector
- [x] Wire context manifest inheritance into sub-agent task delegation (sub-agents receive parent executive manifest)
- [x] Update AgentDetail Connector tab: show context manifest panel (data sources + freshness)
- [x] Add claude_code option to BYOA selector with container URL field
- [x] Write tests for manifest system, crew routing, claude_code connector, and sub-agent inheritance


## Intent Engine & Morning Briefing (Phase 1-2)

- [x] Create action_items table in schema (agentId, actionText, riskLevel, options JSONB, status, createdAt)
- [x] Create overnight_changes table (userId, changeType, title, description, dataSource, priority, createdAt)
- [x] Create strategy_cards table (userId, title, recommendation, riskLevel, context, createdAt)
- [x] Create completed_work table (userId, agentId, taskDescription, timeSaved, laborValue, createdAt)
- [x] Generate and apply database migrations via drizzle-kit
- [ ] Build tRPC procedures: actions.generate, actions.regenerateOption, actions.approve, actions.dismiss
- [ ] Build tRPC procedures: briefing.getOvernightChanges, briefing.getStrategyCards
- [ ] Build tRPC procedures: completedWork.getRecent, completedWork.getTotalSavings
- [ ] Build IntentEngine frontend component with swipeable cards
- [ ] Build GestureHandler component for swipe left/right detection
- [ ] Build MorningBriefing frontend component with tabs (Overnight Changes / Today's Strategy)
- [ ] Add "Ask Board" button that pre-populates Executive Board with framed question
- [ ] Build CompletedWorkDashboard with ROI metrics and recent tasks
- [ ] Add red dot indicators on agent cards for pending work
- [ ] Implement three risk-level options (Recommended/Conservative/Aggressive) per action
- [ ] Write tests for action generation, approval workflow, and gesture handling

## BYOA Section Refinement (Phase 2)

- [ ] Replace emoji icons with actual provider logos (Claude, OpenAI, Anthropic, etc.)
- [ ] Add hover effect showing provider description (e.g., "Claude Code - Self-hosted code execution")
- [ ] Add setup guide links for each provider (opens modal or external guide)
- [ ] Improve responsive layout for mobile (stack providers vertically on small screens)
- [ ] Add "Connect Provider" button below each provider card

## BYOA Launch (Phase 3)

- [ ] Write provider setup guides (OpenAI, Anthropic, Gemini, Custom API, CrewAI, Claude Code)
- [ ] Create /docs/byoa page with step-by-step integration instructions
- [ ] Add BYOA section to public landing page (already done)
- [ ] Update marketing copy to highlight BYOA as core differentiator
- [ ] Create video demo of BYOA connector setup flow
- [ ] Test all connectors with real API keys (OpenAI, Anthropic, Gemini)
- [ ] Add BYOA feature to pricing page (available on all tiers)
- [ ] Prepare launch announcement and email

## Premium Model Evaluator (Phase 4)

- [ ] Create blueprint_model_evaluations table (blueprintId, modelName, qualityScore, speedMs, costPerRun, createdAt)
- [ ] Build model evaluator service that tests against top 10 OpenRouter models
- [ ] Build tRPC procedure: blueprints.evaluateModels
- [ ] Build tRPC procedure: blueprints.setRecommendedModel
- [ ] Build ModelEvaluator frontend component with results table
- [ ] Display cost savings vs. most expensive model
- [ ] Add recommendation badge showing cheapest model that meets 80% quality threshold
- [ ] Write tests for model evaluation logic and recommendation algorithm


## Σ Agent Builder Integration (Phase 1-5)

- [ ] Create tRPC procedure: agents.importFromSigma (accepts Σ JSON spec)
- [ ] Add sigma_spec field to agents table (stores original Σ JSON)
- [ ] Add built_with_sigma boolean field to agents table
- [ ] Create agent import modal with Σ JSON paste/upload
- [ ] Update Home.tsx landing page: add "Use Σ to discover" messaging
- [ ] Add Σ section to landing page with link to Σ Agent Builder
- [ ] Update landing page copy: "Use Σ to discover. Use OpenCommand to execute."
- [ ] Create AgentCard component with "Built with Σ" badge
- [ ] Add "Use Σ to discover your agent" link in agent creation flow
- [ ] Create unified onboarding page at /onboarding/sigma
- [ ] Wire Σ → OpenCommand → execution flow in onboarding
- [ ] Add Σ branding (logo, green accent #00D4AA) to integration UI
- [ ] Write tests for Σ import flow and badge rendering


## Σ (OK Computer) Integration

- [x] Add builtWithSigma and sigmaSpec fields to agents table
- [x] Create agents.importFromSigma tRPC procedure
- [x] Update landing page with Σ messaging and link to okcomputer.cloud
- [x] Create SigmaBadge component for agent cards
- [x] Create SigmaImportModal component for pasting Σ specs
- [x] Create unified onboarding page (/onboarding/sigma) with 3-step flow
- [x] Add /onboarding/sigma route to App.tsx
- [x] Write tests for Σ import functionality (5 tests passing)
- [ ] Display SigmaBadge on agent cards when builtWithSigma=true
- [ ] Add "Import from Σ" button to agent creation flow

## BYOA Provider Logos Update

- [x] Update BYOA provider cards with real logos and branding
- [x] Add gradient backgrounds for each provider (Claude Code orange, Codex gray, OpenCode blue, Pi Agent indigo, Hermes purple, OpenClaw red)
- [x] Add hover scale animation to provider cards
- [x] Update subtitle to mention Hermes local execution
- [ ] Replace emoji logos with official SVG/PNG assets from each provider
- [ ] Add provider links to official documentation
- [ ] Add "Set up guide" button to each provider card


## Intent Engine Backend (In Progress)

- [ ] Create action_items table with three risk-level options
- [ ] Create overnight_changes table for morning briefing
- [ ] Create strategy_cards table for strategy recommendations
- [ ] Implement action generation with LLM integration
- [ ] Implement option regeneration (Conservative/Aggressive)
- [ ] Implement batch approval procedure
- [ ] Write backend tests for action flows

## Completed Work Dashboard

- [ ] Create completed_work table with ROI tracking
- [ ] Implement procedure to fetch completed work
- [ ] Build CompletedWorkDashboard component
- [ ] Add cumulative savings banner
- [ ] Add red dot indicators on agent cards
- [ ] Implement time/labor value calculations
- [ ] Write tests for ROI calculations


## OpenAgents Integration (Phase 1-3)

### Phase 1: OpenAgents Launcher Integration + @mention Delegation
- [ ] Create OpenAgents agent registry service (track running agents, their types, capabilities)
- [ ] Build agent discovery endpoint (list available agents in workspace)
- [ ] Implement @mention parsing in Σ Chat (extract agent names from messages)
- [ ] Create agent delegation tRPC procedure (route tasks to specific agents)
- [ ] Build agent status monitor (online/offline, last heartbeat)
- [ ] Add agent configuration UI (set credentials, environment variables)
- [ ] Create agent startup/shutdown procedures
- [ ] Implement agent health checks and auto-restart

### Phase 2: Shared Browser Preview + File Collaboration
- [ ] Integrate OpenAgents shared browser component
- [ ] Create email preview in shared browser (show drafted responses)
- [ ] Build template file upload/download (store in workspace)
- [ ] Implement real-time template editing (multiple agents editing same template)
- [ ] Add file versioning and rollback
- [ ] Create template collaboration UI (show who's editing what)
- [ ] Build file sharing permissions (read/write/admin)
- [ ] Add file search and tagging

### Phase 3: Multi-Workspace Support + Custom Agent Types
- [ ] Create workspace registry (track workspaces per dealer)
- [ ] Implement workspace isolation (data separation per dealer)
- [ ] Build custom agent type registration
- [ ] Create agent capability registry (what each agent can do)
- [ ] Implement agent-to-agent messaging (A2A protocol)
- [ ] Build agent orchestration patterns (cascade, voting, consensus)
- [ ] Add workspace analytics (agent activity, performance)
- [ ] Create workspace templates (pre-configured agent swarms)


## Multi-Agent Goals Feature (NEW)

- [ ] Create workspaceGoals, goalAgents, goalProgress database tables
- [ ] Build Goals Dashboard page with CRUD operations (create/edit/delete/list goals)
- [ ] Integrate goal creation into Σ Chat (@create-goal command)
- [ ] Add real-time goal progress tracking and WebSocket updates
- [ ] Build agent collaboration interface for goals (assign agents, track contributions)
- [ ] Create goal status visualization (on-track, at-risk, completed)
- [ ] Add goal performance metrics and KPI tracking
- [ ] Test multi-agent goal workflows end-to-end

## Σ Chat Goal Integration
- [x] @create-goal natural language command in Σ Chat
- [x] Real-time progress WebSocket updates for goals dashboard
- [x] Goal collaboration interface with thread-based communication

## Σ as 5th Executive in Temporal Cascade (5-4-3-2-1-Σ)
- [x] Update Executive Intelligence plan document with Σ persona definition
- [x] Update boardThinking.ts to add Σ as final cascade step (inherits all 4 executive contexts)
- [x] Update Executive Board frontend with Σ persona card and color scheme
- [x] Update ProOnboarding EXEC_AGENTS array to include Σ
- [x] Update persona hierarchy table in plan doc (5-4-3-2-1-Σ)
- [x] Add Σ system prompt: synthesize all perspectives into single highest-leverage action
- [x] Test full cascade flow with Σ as final step

## 5-4-3-2-1-Σ Cascade Diagram Update
- [x] Generate updated cascade diagram as inline SVG/React component
- [x] Show ARCH (5yr, blue/indigo) → LEDGER (4mo, green) → SIGNAL (3wk, orange/amber) → FORGE (2d, red/rose) → YOU (now) → Σ (highest-leverage, #00D4AA teal)
- [x] Replace current image reference in ExecutiveBoard.tsx with new inline diagram

## Σ ProOnboarding Calibration Step
- [x] Add 5th step to ProOnboarding after 4 executive interviews
- [x] Σ synthesizes all four perspectives into one highest-leverage recommendation
- [x] Call onboarding.sigmaCalibrate tRPC mutation with collected onboarding context
- [x] Display Σ synthesis result as preview of ongoing capability

## Σ Standalone Chat Mode
- [x] Create Σ standalone chat page/component
- [x] Backend checks for cached board context from last cascade run
- [x] New tRPC procedure for standalone Σ chat
- [x] Σ responds with highest-leverage perspective using cached context without full cascade
- [x] Write vitest tests for all three features (9/9 passed)

## Temporary Home Page Onboarding Button
- [x] Add temporary button to home page menu to launch new executive onboarding session (/onboarding/pro)

## Company Website Field in Onboarding
- [x] Add "Company Website" input field to company-setup step in ProOnboarding
- [x] Persist website to companies table (migration applied, column added)

## Background Website Audit Pipeline
- [x] Create website_audits table schema with all audit result fields
- [x] Run migration for website_audits table
- [x] Build website scraper module (fetch HTML, extract metadata, headers, response time)
- [x] Build technical SEO checker (meta tags, robots.txt, sitemap.xml, HTTPS, security headers)
- [x] Build social presence detector (find social links in HTML)
- [x] Build tech stack detector (identify frameworks, analytics, ad pixels, CRM from HTML/headers)
- [x] Build LLM content analyzer (value prop, target audience, competitive positioning, tone)
- [x] Create orchestrator that runs all checks and stores results in website_audits
- [x] Add tRPC procedure to trigger audit and fetch results
- [x] Trigger audit automatically when company is created with a website URL during onboarding
- [x] Show audit progress/results in onboarding UI during executive interviews
- [x] Feed audit results into executive agent context (ARCH, SIGNAL, LEDGER, FORGE, Σ)
- [x] Write vitest tests for audit pipeline (18/18 passed)

## AI Chief of Staff Landing Page
- [x] Create dedicated /chief-of-staff landing page
- [x] Hero section with product name, tagline, and CTA to start onboarding
- [x] Visual showing the 5-4-3-2-1-Σ temporal cascade
- [x] Four executive persona cards (ARCH, LEDGER, SIGNAL, FORGE + Σ)
- [x] "How It Works" section showing self-contextualizing onboarding flow
- [x] Capabilities grid (Morning Briefings, Individual Chat, Cascade, Website Intel, Tool Integration, Proof of Outcome)
- [x] Pricing section (Beta free + Pro coming soon)
- [x] CTA button routes to /onboarding/pro for logged-in users or login for new users
- [x] Full cascade example (Denver market expansion)
- [x] Problem section with stats (23hrs/week, 4.2 tools, 67% incomplete context)
- [x] Add route in App.tsx
- [x] Write vitest tests for the landing page (14/14 passed)

## Decoupling Architecture Plan
- [x] Write comprehensive decoupling plan document covering module inventory, dependency map, extraction strategy, timeline, and architecture

## Main Menu Chief of Staff Link + Quick-Start Mode
- [x] Add "AI Chief of Staff" link to the main hamburger menu on Home page
- [x] Build quick-start onboarding mode: company name + website URL only → website audit → instant Σ recommendation
- [x] Add quick-start CTA on the /chief-of-staff landing page
- [x] Backend: new tRPC procedure for quick-start that runs website audit + Σ synthesis without interviews
- [x] Frontend: quick-start results page showing Σ's first recommendation based on website audit alone
- [x] Write vitest tests for quick-start mode (21/21 passed)

## Email Capture Gate + Shareable Results
- [x] Create quick_start_results table (id, shareId, email, companyName, website, industry, recommendation, auditSummary, seoScore, createdAt)
- [x] Add email capture step between analyzing and results in Quick Start flow
- [x] Backend: save results to DB with unique shareId, store email for lead capture
- [x] Backend: public procedure to fetch results by shareId (no auth required)
- [x] Frontend: shareable results page at /results/:shareId (publicly accessible)
- [x] Frontend: show share button with copy-to-clipboard on results page
- [x] Write vitest tests for email capture and shareable results (21/21 passed)

## Admin Leads Dashboard
- [x] Backend: add tRPC procedure to list all quick-start leads (admin-only)
- [x] Backend: add tRPC procedure to list intent engine queries by user/company
- [x] Frontend: build /admin/leads page showing leads table (email, company, website, date, SEO score)
- [x] Frontend: expandable row showing Σ recommendation, audit summary, tech stack, social presence
- [x] Add route and nav link for admin leads dashboard
- [x] Write vitest tests for admin leads dashboard (8/8 passed)

## Decoupling Plan
- [x] Write comprehensive DECOUPLING_PLAN.md with module inventory, dependency map, 4-phase extraction strategy, dual-mode architecture, risk assessment, monetization, and GTM recommendations
- [x] Update DECOUPLING_PLAN.md with latest LOC counts (7,687 server / 6,209 client), new modules (QuickStart, SharedResults, AdminLeads), and refined phase estimates (~36 days total)

## Decoupling: Separate Executive Intelligence from OpenCommand
- [x] Audit all executive board references across codebase
- [x] Strip executive board integration from intent engine (remove boardIntegration.ts, askBoardIntegration.ts deps)
- [x] Remove executive-intelligence routes from OpenCommand (ProOnboarding, ExecutiveBoard, SigmaChat, ChiefOfStaff, QuickStart, SharedResults, AdminLeads)
- [x] Remove executive-intelligence menu links from Home.tsx and navigation
- [x] Ensure all integrations (HubSpot, Salesforce, Meta, Google, TikTok, GA4) remain functional in OpenCommand
- [x] Copy executive intelligence modules to standalone /home/ubuntu/executive-intelligence directory
- [x] Ensure standalone executive intelligence has full integration support
- [x] Update App.tsx routes for streamlined OpenCommand
- [x] Update tests for decoupled OpenCommand (38 files, 658 tests passing)
- [x] Save checkpoint

## Agent OS Positioning & Deployment UX
- [x] Update landing page hero: new headline, subheadline, and CTA for agent OS
- [x] Update "How It Works" steps to reflect agent deployment workflow
- [x] Update feature cards to reflect agent OS capabilities
- [x] Update footer tagline and product description
- [x] Build Agent Templates library in Mission Control (fleet tab)
- [x] Build one-click agent deploy flow with configuration modal
- [x] Build agent monitoring dashboard (status, health, last run, outcomes)
- [x] Add multi-agent workplace goal setting
- [x] Initialize Executive Intelligence as standalone webdev project (/home/ubuntu/exec-intelligence)
- [x] Wire executive intelligence integrations (HubSpot, Salesforce, Meta, Google, TikTok, GA4)

## Hero Copy Update — Non-Human Labor + Tagline
- [x] Change hero label from "AGENT OPERATING SYSTEM" to "AUTOMATE THE MUNDANE. ELEVATE THE HUMAN."
- [x] Change hero headline to "The OS for non-human labor."
- [x] Update hero subheadline to "Deploy agents across every function. Set goals. Measure outcomes. OpenCommand manages the rest."
- [x] Add tagline to footer brand column
- [x] Update tests to reflect new copy

## ProOnboarding Page
- [x] Create ProOnboarding.tsx component
- [x] Register /onboarding/pro route in App.tsx
- [x] Add auth redirect suppression for public onboarding path
- [x] Verify TypeScript compiles and tests pass

## ProOnboarding Page Restoration
- [x] Restore /onboarding/pro to 'Build Your AI Executive Team' design: Beta Access banner, headline, 3-step flow (Connect Tools → Pull Context → Personalized Interviews), and executive agent cards (CEO/ARCH, CTO/FORGE, CMO/SIGNAL, CFO/LEDGER)

## ProOnboarding Full Interview Flow Upgrade
- [x] Remove email gate from /onboarding/pro — go straight into interview flow
- [x] Add Σ as 5th card on the landing section ("After your interviews, Σ identifies your single highest-leverage move")
- [x] Add sample question preview teaser (show ARCH's first Socratic question as a teaser)
- [x] Wire "Begin Onboarding" / executive card CTAs into the actual Socratic interview flow (start, respond, complete)
- [x] CTA checks auth: logged-in users go straight to company-setup, unauthenticated users are redirected via OAuth and returned to /onboarding/pro
- [x] Show per-executive progress (questions answered, complete/incomplete state) — progress bar + question dots in interview header
- [x] After all 4 executives complete, trigger Σ synthesis step (sigma-calibration screen)
- [x] Show Σ synthesis result as the final screen, then strategy reveal, then launch Mission Control

## ProOnboarding UX Refinements
- [x] Add "Company Website" field to Tell Us About Your Company page
- [x] Lock all integration cards with "Coming Soon" badge (visible but not clickable)
- [x] Add progress indicator on landing page for returning logged-in users mid-onboarding

## Website URL Validation + Auto-Enrichment
- [x] Add URL validation on company website field with auto-prepend https:// and subtle hint
- [x] Add server-side website metadata scraping endpoint (title, description, favicon)
- [x] After company setup, auto-enrich company context from website metadata for executive interviews

## Company Size Dropdown
- [x] Add Company Size dropdown to company setup form (1-10, 11-50, 51-200, 201-1000, 1000+)

## Post-Onboarding Personalized Recommendations (Demo Output)
- [x] Add generateRecommendations tRPC endpoint (LLM-powered, uses interview context + 54321 framework)
- [x] Add recommendations JSON column to onboardings table
- [x] Build tabbed results page after interview: Strategy tab, Your Team tab, /goals tab
- [x] Strategy tab shows Σ synthesis / strategy reveal
- [x] Your Team tab shows personalized subagent recommendations with 54321 horizon tags
- [x] /goals tab shows formatted /goals prompts with horizon, outcome, context, success criteria
- [x] Wire flow: after all interviews complete → generate recommendations → show tabbed results
- [x] Add 54321 visual legend at top of results page
- [x] Store recommendations in DB for return visits

## Post-Results Feedback Flow + Waitlist
- [x] Add generateSurvey tRPC endpoint (LLM generates 5 questions based on thumbs + interview context)
- [x] Add feedback/survey DB storage (thumbs value, survey responses, email)
- [x] Build feedback step UI: thumbs up/down binary choice
- [x] Build dynamic survey UI: 5 questions rendered after LLM generates them
- [x] For thumbs-up: include briefing frequency as one of the survey questions
- [x] Build waitlist CTA at the end (email capture for OpenCommand access)
- [x] Remove "Launch Mission Control" from the results page footer
- [x] Move briefing frequency question out of company setup step

## OG Meta Tags + Tagline Readability
- [x] Add OG meta tags (title, description, image) to index.html for social sharing
- [x] Improve tagline readability on homepage and in OG description

## Post-Onboarding Follow-ups (All Three)
- [x] Add generateSurvey tRPC procedure (LLM generates 5 questions based on thumbs + interview context)
- [x] Add submitSurvey tRPC procedure (saves thumbs + responses + email to DB)
- [x] Build feedback step UI: thumbs binary → dynamic 5-question survey → waitlist CTA
- [x] Move briefing frequency question out of company setup into thumbs-up survey
- [x] Add Download Summary button to results page (exports Strategy + Team + Goals as markdown)
- [x] Add Share Results link to results page (Web Share API or clipboard fallback)

## Admin Analytics Dashboard
- [x] Audit existing schema for activity_events / feature_events tables (used existing featureEvents + pageViews + userSessions)
- [x] Promote owner account to admin role in DB
- [x] Add adminGetAllSurveys, adminGetSurveyByUserId, adminGetUserCompany, adminGetUserOnboardings DB helpers
- [x] Add admin.allSurveys, admin.userSurvey, admin.userCompany, admin.userOnboardings tRPC procedures
- [x] Enhance /admin/users UserDetail panel: add Company, Onboarding, and Survey tabs
- [x] Add Survey Responses link from /admin/users header
- [x] Build /admin/survey-responses page (thumbs split summary + flat table + expandable rows + CSV export)
- [x] Register /admin/survey-responses route in App.tsx

## Sticky CTA Bar on /onboarding/pro
- [x] Add sticky floating CTA bar that appears after scrolling past the headline
- [x] Bar contains "Begin Onboarding" button + one-line value prop
- [x] Disappears when user clicks or scrolls back to top
- [x] Smooth slide-in animation

## Guest Session / Email Gate (No Account Required)
- [x] Add guest_sessions table to DB (id, guestToken, name, email, companyId, onboardingId, createdAt)
- [x] Create public guest tRPC procedures: guest.init, guest.setupCompany, guest.startInterview, guest.respond, guest.generateStrategy, guest.generateRecommendations, guest.generateSurvey, guest.submitSurvey
- [x] Build email gate modal (Name + Email, 2 fields) that appears when Begin Onboarding is clicked
- [x] Generate UUID guest token on email submit, store in localStorage
- [x] Wire entire ProOnboarding flow to use guest procedures when not authenticated
- [x] Pre-fill waitlist email at the end with the email entered at the gate
- [x] Logged-in users bypass the gate and use existing protected procedures
- [x] Add Guests tab to /admin/users with KPIs (total, started onboarding, completed survey, thumbs up)
- [x] Add adminGetAllGuestSessions DB helper with joined company and survey data
- [x] Add admin.guestSessions and admin.guestOnboardingProgress tRPC procedures
- [x] Build GuestsPanel component with search, table, and detail slide-over
- [x] Fix progress counter bug showing "5 of 4 executives" — now filters to exec types only (ceo/cto/cmo/cfo)
- [x] End-to-end test: guest.init, guest.setupCompany, guest.startInterview all verified working
- [x] Update OG preview meta tags for /onboarding/pro route
- [x] Remove misleading "Claude Code or Codex subscription / Hermes runs locally" text from homepage
- [x] Add post-onboarding results email via Resend after guest completes Σ synthesis
- [x] Add "Copy shareable link" button to Guests detail slide-over
- [x] Add "Convert to user" action in Guests tab with invite email
- [x] Fix: "Begin Onboarding" and "Begin" buttons on /onboarding/pro landing page not working
- [x] Fix: Guest onboarding fails to create FORGE/SIGNAL/LEDGER agents — "Please login (10001)" error for non-authenticated guests
- [x] Add owner notification when someone fills out the email gate form on /onboarding/pro
- [x] Fix: Guest flow "Failed to finalize" after ARCH interview — "Please login (10001)" error on finalize step
- [x] Fix: Agent names in chat don't match — FORGE shows "SAGE", SIGNAL shows "NOVA", LEDGER shows "TED"
- [x] Make goals page mobile-friendly with subtabs by category (2-day tactical, 3-week sprint, etc.)
- [x] Make feedback button sticky across all three result tabs (Strategy, Team, Goals)
- [x] Update goal generation LLM prompt to produce 8-section /goal contracts (Objective, Context, Scope, Verification, Iteration, Escalation, Output, Stop Condition)
- [x] Redesign goal card UI to display all 8 sections of the master /goal contract template
- [x] Update copy-to-clipboard to output the full /goal contract format
- [x] Remove 54321 horizon dependency from goals (horizons are upstream strategy context only)
- [x] Update download summary to include new 8-section contract format
- [x] Change subtabs from horizon-based to agent-role-based filtering
- [x] Build AutonomyDial component (L0-L3 interactive selector with risk warning at L2/L3)
- [x] Build AgentCard component with progressive disclosure (collapsed: name+mission+dial, expanded: tools+guardrails+rationale)
- [x] Update LLM prompt to produce structured tools array (name/source/permission) and guardrails array (severity/title/description)
- [x] Replace horizon badge with executive owner badge (ARCH/FORGE/SIGNAL/LEDGER/APEX) with color coding
- [x] Add global CSS design tokens for agent cards (--a, --ad, --cr, --w, --b, --s2, --t2, --t3)
- [x] Add improved empty state for Your Team tab
- [x] Send owner notification when authenticated user completes onboarding (fires on generateRecommendations, includes company name, user, exec count, subagent/goal counts)
- [x] Send owner notification when guest user completes onboarding (fires on guest generateRecommendations, includes guest name, email, company, exec count)
- [x] Add deep-link URL to onboarding completion notifications (auth + guest) so owner can click directly to their results
- [x] Add onboarding completion counter to admin dashboard (total, this week, this month, auth vs guest breakdown)
- [x] Add adminGetOnboardingTranscripts db helper (returns conversationHistory + summary + recommendations per executive for userId or companyId)
- [x] Add admin.onboardingTranscripts tRPC procedure (works for both userId and companyId/guest)
- [x] Add "Interviews" tab to user detail panel showing full Q&A transcripts per executive
- [x] Add "Interviews" section to guest detail slide-over showing full Q&A transcripts
- [x] Add early CTA button below headline on /onboarding/pro start page (Option A)

## Σ Intent Engine & Blueprint System
- [x] Design and create Blueprint database schema (blueprints, blueprint_agents, blueprint_workflows, blueprint_goals, blueprint_verifications, tickers)
- [x] Build Σ chat interface (conversational intent engine that asks questions until blueprint can be generated)
- [x] Build blueprint generation backend (LLM structured output → full blueprint with agents, workflows, tools, guardrails)
- [x] Build React Flow visual builder canvas (nodes = agents/steps, edges = data flow, click-to-edit side panel)
- [ ] Build dual-LLM verification system (two independent models must agree goal is complete before verified badge)
- [x] Build blueprint persistence with ticker assignment and versioning
- [x] Build "My Blueprints" dashboard with saved blueprints, tickers, and status
- [x] Wire routing and navigation (Σ chat → blueprint generation → visual builder → My Blueprints)
- [x] Marketplace-ready blueprint format (description, category, required agents, estimated runtime, price fields)
- [x] Fix BlueprintBuilder.tsx TypeScript errors (React Flow typing, toast import, data access patterns)
- [x] Fix BlueprintChat.tsx TypeScript errors (auth import, procedure name, message type)
- [x] Add login button to homepage dropdown menu (working with Manus OAuth)
- [x] Create model registry with all available LLMs (11 models) and role-based categorization
- [x] Add agent_model_config table to track per-agent model assignments
- [x] Add model_execution_logs table to track cost, latency, tokens, and success per invocation
- [x] Build dynamic workflow role-based defaults (coordinator, implementer, verifier, fixer/synthesizer)
- [x] Add model selector dropdown to BlueprintBuilder agent side panel
- [x] Display model cost/performance metrics in the visual builder
- [x] Build model performance analytics view (cost per agent, latency trends, success rates)
- [x] Add model popularity tracking: aggregate model selections across all users per role
- [x] Add "Community Popular" toggle alongside "OpenCommand Recommended" defaults
- [x] Show percentage breakdown of users using each model per role
- [x] Add real-time blueprint cost estimator in visual builder (updates on model change)
- [x] Show per-agent cost + total estimated blueprint run cost in builder header
- [x] Implement LLM Council verification option (3 independent models vote on completion)
- [x] Make LLM Council a premium feature with configurable quorum (2/3, 3/3, 3/5)
- [x] Redesign autonomy dial as Human-in-the-Loop (HITL) checkpoints
- [x] HITL checkpoints represented as orange flag nodes insertable anywhere in workflow
- [x] Two HITL modes: "Approve before execution" and "Review after completion"
- [x] Design checkpoint interface options (push notification swipe, voice call, file upload watch, email approval)
- [x] Default HITL rule example: swipe-approve before any message sent from user's account
- [x] Create blueprint framework infographic explaining all adjustable components
- [x] Rename HITL checkpoint modes: "Pre-execution Gate" → "Ask Permission", "Post-completion Review" → "Notify Complete"
- [x] Regenerate blueprint framework infographic: swap Layer 2/3 (Workflow before Agent) and Layer 4/5 (Verification before HITL)
- [x] Redesign infographic with McKinsey/Blue Ace management consulting theme (navy/white/gold, serif typography, clean geometric)
- [x] Make LLM Council available as an add-on toggle on any task/agent that has a verifier (not just goal-level)

## Nav Simplification
- [x] Remove Mission Control from nav and routes — redirect root authenticated users to /blueprints/chat
- [x] Remove agent personas and projects from main sidebar nav
- [x] Remove Goals from nav
- [x] New nav order: Σ (Intent Engine) → Blueprints → Execution → Analytics → Model Performance → Settings

## Brand Rebuild v2 (First Principles)
- [x] Update index.css: new color tokens (slate-blue accent, adjusted surfaces), remove gradient utilities
- [x] Update index.html: new meta title/description, remove old taglines
- [x] Rewrite Home.tsx: minimal hero, no animation, product-focused messaging
- [x] Update AppLayout.tsx: apply new surface colors and accent
- [x] Remove ContextEngineHero.tsx (no longer imported — dead code)
- [x] Update all accent-line and gradient utilities to solid borders

## Dashboard Menu & Intent Engine Visual Builder
- [x] Add contextual menu/navigation inside the dashboard content area
- [x] Rework Intent Engine (Σ) into a visual blueprint builder using React Flow
- [x] Intent Engine should ask questions and output a fully editable blueprint
- [x] Blueprint includes: agent team, workflows, data, tools, guardrails
- [x] Visual builder uses canvas-style React Flow interface

## Menu Button + Example Blueprints
- [x] Add menu button (hamburger/options) to the Σ interview screen header
- [x] Seed 2 example blueprints into user's account via SQL

## Home Screen Dashboard (Morning Briefing / Swipe UX)
- [x] Create /dashboard route with AppLayout
- [x] Swipe-card deck: HITL notifications (approve/dismiss), briefing items, blueprint status, quick actions
- [x] Redirect authenticated users from / to /dashboard after login
- [x] Seed demo HITL checkpoint notifications for evaluation (built from live blueprint data)

## Visual Builder — Primary Nav + Scratch Canvas
- [x] Add "Visual Builder" to primary nav sidebar linking to /blueprints/new/builder
- [x] /blueprints/new/builder opens a blank React Flow canvas (no blueprint ID required)
- [x] Node palette sidebar with all 6 framework layers: Trigger, Workflow, Agent, Verification (LLM Council), HITL Checkpoint, Goal Tracking
- [x] Each node type has distinct icon, color, and editable fields matching the blueprint framework
- [x] Save blank canvas as new blueprint_template with auto-generated ticker via createBlank mutation

## Verification per Agent + Signup/Onboarding
- [x] Agent nodes: add "Verification" sub-panel showing assigned verifier model (default: 1 LLM) and Council toggle
- [x] When an Agent node is added to canvas, auto-suggest adding a Verification node connected to it
- [x] Verification node edit panel: choose verifier model, enable Council (3-model vote), set criteria
- [x] Landing page: add prominent signup/login CTA button (top nav + hero section)
- [x] Quick onboarding flow: 3-step modal after first login (Welcome → Choose start → Launch)
- [x] Notify owner when a new user completes onboarding

## Blueprint Templates + Execution Layer
- [x] Seed 3 fully pre-populated blueprint templates in DB (Prediction Market Trader, Content Engine, Market Intelligence) with all 6 layers as React Flow nodes/edges
- [x] Wire onboarding template selection to open the specific pre-built blueprint in the visual builder
- [x] Add Deploy button to BlueprintBuilder toolbar that triggers a blueprint run
- [x] Create blueprint_runs, blueprint_run_events, hitl_notifications tables in schema + migration
- [x] Add deployBlueprint, getRunStatus, getRuns, resolveHitl, getPendingHitl procedures to execution router
- [x] Build Execution page with live run log: step-by-step agent activity, verification results, HITL checkpoint events
- [x] Wire HITL swipe cards on home dashboard to real hitl_notifications via execution.getPendingHitl (polls every 5s)

## Auto-seed + Real LLM Execution + HITL Badge
- [x] Auto-seed 3 blueprint templates for every new user on first login (not hardcoded to user 1)
- [x] Wire real invokeLLM calls into execution simulation for Agent nodes (genuine reasoning output)
- [x] Wire real invokeLLM calls into Verification nodes (actual pass/fail judgment)
- [x] Add HITL notification badge (accent pill) on Home nav item when pending HITL count > 0
- [x] Show toast notification when a new HITL card arrives during an active session (with View action)

## Fix Blueprints + Status + Intent Engine Redesign + Mobile + Landing + Voice
- [ ] Seed blueprints for existing user (Dan) who already completed onboarding
- [ ] Blueprints list page: add status badges (Draft / Active / last run time)
- [x] Intent Engine chat redesign: model dropdown in upper-left header (replace "Σ Intent Engine" text)
- [x] Intent Engine chat: mockup-inspired UI (Σ avatar, "Message Σ" placeholder, Blueprint/Chat quick actions in input bar)
- [x] Voice input: integrate Whisper-based transcription with mic button in chat input
- [x] Mobile polish: full-width swipe cards with larger touch targets
- [x] Mobile polish: execution page responsive layout
- [x] Mobile polish: prominent Deploy button in builder on mobile
- [x] Landing page: add demo GIF/animation showing Deploy → HITL loop
- [x] Landing page: stronger value prop above the fold
- [x] Landing page: clearer beta messaging and social proof


## Intent Engine: Advisor/Builder Toggle + Session History + Socratic Refinement

### Core Intent Engine Architecture
- [ ] Rename Intent Engine to "Σ" in UI and navigation (already partially done)
- [ ] Implement Advisor/Builder toggle in header ("Think" / "Do" modes)
- [ ] Add session history to intent engine: persist conversation history per user, allow resuming previous sessions
- [ ] Session history UI: sidebar showing recent conversations with timestamps, ability to load and continue
- [ ] Implement Socratic questioning framework in both Advisor and Builder modes
- [ ] Integrate unified context graph into intent reasoning: pull live business data during Socratic questioning
- [ ] Intent should ask clarifying questions about: business context, goals, constraints, success metrics, approval patterns

### Advisor Mode (Think)
- [ ] Advisor generates complete, executable workflow blueprints from natural language descriptions
- [ ] Advisor composes agent teams from the registry based on business context and problem description
- [ ] Advisor recommends governance controls (agent verification / LLM council / human approval) based on stakes and business risk profile
- [ ] Advisor outputs fully executable blueprint ready to deploy (user can edit in Builder, not required)
- [ ] Advisor contextualizes recommendations from unified context graph (customer data, revenue patterns, approval history, etc.)

### Builder Mode (Do)
- [ ] Builder uses intent to ask questions as user edits workflow (e.g., "Are you confident removing this verification gate?")
- [ ] Builder contextualizes from unified context graph (e.g., "Your approval rate for this agent is 87%")
- [ ] Builder suggests agent swaps, governance adjustments, data template changes based on business context
- [ ] Builder recommends event triggers based on existing workflows and business rhythms
- [ ] Builder surfaces optimization opportunities (e.g., "This task is low-risk; consider removing human approval")

### Agent Composition & Registry
- [ ] Create agent registry data model: capabilities, cost profile, optimal use cases, prompts, model selection
- [ ] Seed initial agent registry with 10-15 pre-built agents (marketing analyst, financial analyst, content creator, data scientist, etc.)
- [ ] Implement agent selection logic: rule-based + LLM-based reasoning for which agent fits which task
- [ ] Allow users to create custom agents and save to registry
- [ ] Track agent performance metrics: usage count, approval rate, cost, latency, quality scores

### Governance & Approval System
- [ ] Implement three governance options: agent verification (one agent reviews another), LLM council (multiple LLMs vote), human approval
- [ ] Make governance options composable (user can stack multiple governance layers)
- [ ] Implement approval recommendations based on task type and business context
- [ ] Track approval patterns per agent type and per user to inform future recommendations
- [ ] Build approval rate analytics: show which agents have high/low approval rates

### Event Triggers & Scheduling
- [ ] Implement scheduled runs (daily, weekly, monthly, custom cron)
- [ ] Implement webhook triggers (from connected systems: deal closed in Salesforce, customer created in Stripe, etc.)
- [ ] Implement chat triggers (Slack commands, email commands, direct message to OpenCommand)
- [ ] Implement manual triggers (user clicks "run now")
- [ ] Surface trigger recommendations based on existing workflows and business rhythms

### Session History & Persistence
- [ ] Persist all intent conversations to database (user_id, conversation_id, messages, context_snapshot, timestamp)
- [ ] Implement session resume: user can click on a past conversation and continue from where they left off
- [ ] Implement context refresh: when resuming a session, re-pull live data from unified context graph
- [ ] Show session metadata: creation date, last message, related blueprints/workflows
- [ ] Allow users to name and organize sessions (e.g., "Content Marketing Campaign", "Q4 Financial Planning")

## Unified Context Graph & Integrations

- [ ] Ensure context graph is continuously updated from all connected systems
- [ ] Implement context refresh on demand (user can trigger a manual refresh in the intent engine)
- [ ] Build context visualization: show what data is currently available in the unified context graph
- [ ] Implement context filtering: user can specify which data sources to include in a specific workflow
- [ ] Track context utilization: measure how often intent references context graph in recommendations

## Marketplace & Agent Monetization

- [ ] Implement workflow packaging: users can version and publish workflows to marketplace
- [ ] Implement custom agent packaging: users can publish custom agents they have created
- [ ] Implement marketplace discovery: browse, search, filter workflows and agents
- [ ] Implement revenue sharing: calculate payouts for workflow/agent sales
- [ ] Implement quality gates: review process for marketplace submissions

## Metrics & Learning Loop

- [ ] Track intent effectiveness: how often do users act on intent's questions and recommendations?
- [ ] Track agent composition quality: how often does Advisor recommend an agent that user approves?
- [ ] Track context utilization: how often does intent reference unified context graph?
- [ ] Track governance effectiveness: approval vs. rejection rates per agent type
- [ ] Track agent reuse: which agents are most valuable across all workflows?
- [ ] Implement optimization recommendations based on execution data (cheaper models, governance adjustments, etc.)

## Phase 1: Automated Agent Generation

- [ ] Implement agent generation: Advisor can create custom agents on the fly for novel tasks
- [ ] Agent generation includes: prompt engineering, model selection, capability definition, cost estimation
- [ ] Implement agent quality validation: test generated agents before surfacing to user
- [ ] Allow users to save generated agents to registry for reuse
- [ ] Build feedback loop: track which generated agents work well vs. poorly

## Intent Engine: Socratic UX Controls
- [x] Add "New Question" button above chat input during Socratic questioning phase: skips the current question and asks a different one (user doesn't find it relevant or doesn't know the answer)
- [x] Add "Finish" button above chat input during Socratic questioning phase: stops questioning immediately and generates the blueprint/response with context gathered so far
- [x] Both buttons should only appear when the intent engine is in active Socratic questioning mode (not during blueprint generation or idle state)
- [x] "New Question" sends a system signal to the backend to generate a different clarifying question rather than repeating or following up on the skipped one
- [x] "Finish" sends a signal to skip remaining questions and proceed directly to blueprint generation with whatever context has been collected
