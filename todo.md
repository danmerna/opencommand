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
