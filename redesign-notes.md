# Landing Page Redesign Notes

## From PDF (Landing Page Redesign Document)

### Changes Summary
- Hero rewritten — clearer value prop, self-contextualizing feature front and center
- Fake metrics strip replaced with animated PoO receipt demo
- Pricing updated to Free / $29 / $99 tiers (from $1 / $5)
- Self-contextualizing engine gets its own section
- Integration logo bar added
- Marketplace / creator section added
- How It Works expanded to 4 steps showing context-engineering loop
- CTAs changed to email capture (waitlist) as primary conversion
- "Arch" / "AI CEO" references kept but given more context
- Personal Intelligence Engine branding retained throughout

### Unchanged
- "Deploy your zero-human workforce" headline — kept as-is
- "Personal Intelligence Engine" label — retained
- Dark theme visual aesthetic
- Scroll reveal animations

### Section 1: Navigation
- Current: OpenCommand | Creators | Sign In
- Proposed: OpenCommand | How It Works | Marketplace | Creators | [Start Free]
- "Start Free" button uses primary accent style
- Mobile menu adds all links

### Section 2: Hero
- Label (eyebrow): PERSONAL INTELLIGENCE ENGINE
- Headline: Deploy your zero-human workforce.
- Subheadline: "Open Command connects to your tools, builds its own context, and executes work autonomously — delivering a verified receipt for every outcome. The intent engine that context-engineers itself."
- Primary CTA: Start Free → (links to signup/waitlist)
- Secondary CTA: See How It Works (anchor scrolls to How It Works section)

### Section 3: Context Engine Demo (replaces fake metrics strip)
- Animated sequence on scroll:
  - Step 1: User input field typing "I want more leads"
  - Step 2: Status indicators appear: Connecting to HubSpot... → Reading pipeline: 47 deals, $847K value → Analyzing closed deals: 80% manufacturing → Context assembled in 3.2s
  - Step 3: Context card: "Context from HubSpot — 142 contacts · 47 deals · $847K pipeline · 12 closed last month"
  - Step 4: AI response: "Your pipeline is $847K across 47 deals. 80% of your closed deals last month came from manufacturing at $18K avg. Should we double down on that segment, or are you looking to diversify?"
- Below demo: "The intent engine doesn't ask you for context. It goes and gets it." (italic, accent color)
- Build as React component with CSS animations + IntersectionObserver

### Section 4: Integration Logo Bar (NEW)
- Label: "Connects to 100+ tools. Context-engineers itself from your stack."
- Logos: HubSpot, Salesforce, Stripe, Gmail, Slack, Notion, Google Analytics, Mailchimp, Asana, Shopify, QuickBooks, Linear, Pipedrive, ConvertKit
- Grayscale logos, full-color on hover, "+90 more" at end
- Small size (24-32px height)

### Section 5: Core Systems (Features Grid)
- Keep 6-card grid, update copy on two cards and swap one:
  - Intent Engine: new copy about pulling live data before asking questions
  - AI CEO — Arch: new copy about deploying agents, tracking OKRs, making decisions
  - Company Blueprints → RENAME TO: Agent Marketplace: new copy about buying/selling portable business setups
- Other 3 cards (Mission Control, Proof of Outcome, Governance) — keep current copy

### Section 6: How It Works (expand to 4 steps)
- 01: State your intent — just describe the outcome
- 02: We pull your context — intent engine connects to tools, reads data
- 03: Your workforce executes — Arch deploys agents, orchestrates execution
- 04: Proof of Outcome — verified receipt documenting what was done, cost, etc.

## From Text File (Self-Contextualization Assessment)

### Ratings
- Technical Feasibility: 8/10
- User Value: 10/10
- Competitive Moat: 9/10
- Market Timing: 9/10
- Revenue Impact: 8/10
- Risks: 6/10 (moderate)

### Key Insights for Landing Page
- "The difference between 'what type of leads do you want?' and '80% of your closed deals are manufacturing at $18K avg — double down?' is the difference between a tool and an advisor"
- "Users will feel this immediately on first use. It's the kind of feature that makes someone say 'how did it know that?'"
- "No AI chatbot does this today. ChatGPT, Claude, and Gemini all start with zero context every session"
- "The intent engine doesn't ask you for context. It goes and gets it." — this is the tagline
- Value compounds over time — switching cost grows with usage
- Ship narrow first: HubSpot only, one use case, one magical demo
- The demo that raises the round

### Risks to Address in UX
- Data quality variance (sparse CRM = mediocre experience)
- Stale/wrong data eroding trust
- Privacy sensitivity (surfacing data can feel invasive)
- LLM hallucination on data interpretation

## From PDF (continued - pages 6-10)

### Section 7: Marketplace + Creators (NEW)
- Label: AGENT MARKETPLACE
- Heading: "Buy proven agents. Or sell your own."
- Subheading: "Browse AI agents and full business setups built by creators and operators. Every listing is portable — built on one stack, runs on any stack. Creators earn 70% on every sale."
- Show 3 example agent cards: The Pipeline Doctor (@SalesGuru, $19/mo), The Content Engine (@ContentPro, $29/mo), Freelancer Back Office (@AgencyBuilder, $59/mo)
- Two CTAs: Browse Marketplace → | Become a Creator →

### Section 8: Pricing (3 tiers)
- Free: $0, 10 commands/mo, 2 connected tools, 1 agent, Basic Socratic engine, Summary PoO, 1 workspace
- Pro: $29/mo, 100 commands/mo, 10 tools, 5 agents, Self-contextualizing engine, Full+trace PoO, 3 workspaces, $10/mo execution credits
- Business: $99/mo, Unlimited commands, Unlimited tools, Unlimited agents, Full+custom engine, Full+API PoO, Unlimited workspaces, $50/mo credits, + featured marketplace selling
- Heading: "Simple pricing. Start free. Scale when it works."
- Subheading: "No seat fees. No enterprise contracts. Free tier lets you experience the self-contextualizing engine before you pay a cent."
- Pro gets "Most Popular" badge
- Founding Member callout: "$19/mo for Pro, locked in forever. First 500 users."

### Section 9: Bottom CTA
- Label: PERSONAL INTELLIGENCE ENGINE
- Heading: Deploy your zero-human workforce.
- Subheading: "Connect your tools. State your intent. Arch handles execution. You get a receipt proving what it accomplished."
- Primary CTA: Email capture field + "Join the Beta →" button
- Below: "500 founding member spots. Free tier. No credit card."
- Secondary: "Already have an account? Sign in →"

### Section 10: Footer (4-column)
- Column 1: OpenCommand logo + "Personal Intelligence Engine" + "From idea to verified outcome."
- Column 2 — Product: Intent Engine | Marketplace | Blueprints | Pricing
- Column 3 — Company: Creators | About | Blog (placeholder)
- Column 4 — Connect: Twitter/X | LinkedIn | GitHub
- Bottom bar: © 2026 Open Command. All rights reserved. | opencommand.co

### Complete Page Structure
1. Navigation
2. Hero
3. Context Engine Demo
4. Integration Logo Bar
5. Core Systems (6 cards)
6. How It Works (4 steps)
7. Marketplace + Creators
8. Pricing (3 tiers)
9. Bottom CTA
10. Footer
