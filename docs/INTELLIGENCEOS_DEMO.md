# IntelligenceOS Demo — Implementation Report

**Route:** `/demo` (public, no sign-in) · **Scenario:** Johnson Tractor, illustrative only
**Run locally:** `pnpm install && pnpm dev`, then open `http://localhost:3000/demo`
(the dev server needs placeholder env to boot: `RESEND_API_KEY`, `OAUTH_SERVER_URL`, `JWT_SECRET`, `VITE_OAUTH_PORTAL_URL`, `VITE_APP_ID` — any non-empty values work locally).

## What this is

A chatbot-free IntelligenceOS demo built around one promise: **see what changed, decide what
matters, command what happens next.** There is no chat transcript, no message bubbles, and no
blank prompt box. Business signals become persistent visual decision objects the operator
inspects, steers with optional voice commands and direct gestures, approves deliberately, and
verifies after simulated execution.

Everything is deterministic and simulated. No external system is read or written; no model is
called. "Generative" analysis is a typed visual-composition layer over fixture data, built so a
real generative layer can replace the recipes later.

## Architecture: three persistent tabs

| Tab | Question | Subtabs |
|---|---|---|
| **Command Center** | What needs my attention? | Updates, Approvals, Recommendations |
| **Σ** | What can intelligence help me understand or do? | Think, Advisor, Do |
| **Workspace** | What has my organization built and run? | Blueprints, Workflows, Agents, Audit Log |

Every destination is URL-addressable (`/demo/<tab>/<subtab>`), survives refresh (state persists
in `sessionStorage` for the browser session), and supports shared links. A **Reset demo** control
restores the canonical scenario.

## The end-to-end loop (proven in a browser)

1. `/demo` opens **Command Center → Updates**: four prioritized overnight changes (Birkey's −6.8%
   combine reprice on TractorHouse, a Gmail lead, Anvil Pro service tickets, QuickBooks
   floor-plan interest) — before any user input.
2. **Analyze in Σ** on the combine update opens **Think** with the update, its evidence, and data
   scope carried over. Think assembles a scenario model: a constraint band from 0% to −8% list
   adjustment, an option comparison, filterable evidence, and a scrub slider whose readout
   (units moved, revenue, margin, net-vs-holding) recomputes deterministically.
3. **Ask Advisor** keeps the same canvas. The operator selects **LEDGER** and **SIGNAL** (or any
   of ARCH / LEDGER / SIGNAL / FORGE), then **Board Synthesis**. Perspectives align on one shared
   axis; **“Show me where they disagree”** highlights the LEDGER-vs-SIGNAL depth conflict; Σ
   presents the reconciled move (−5.5% on 12 of 16 units — the modeled optimum).
4. **Save as Recommendation** creates a ranked, inspectable proposal with full lineage.
5. **Act in Do** builds an editable plan: goal, agent team (Listing Optimizer, Photo Enhancer,
   Lead Response), ordered steps with a human checkpoint, data scope, tools, guardrails,
   approvals, expected outcome, and receipt definition. The Photo Enhancer can be removed and
   restored; the adjustment can still be edited.
6. **Open preflight** shows exact scope, systems, economic effect, command boundary,
   reversibility, and exception handling, and files a pending item in **Approvals**.
   Confirmation is a **press-and-hold** (1.5 s, pointer or Space/Enter); early release cancels;
   completion opens a **5-second undo window** before anything runs.
7. The workflow runs in **Workspace → Workflows** with a live trace, pauses at the
   **human checkpoint** (also surfaced in Approvals), and completes after approval.
8. Completion generates a **Proof of Outcome** in the **Audit Log** — original signal, Think
   result, personas, recommendation, operator modification, approval, per-task simulated
   results, and the one remaining exception — plus an **outcome Update** back in Command Center.
   The original update flips to *resolved*.

## Modalities

- **Voice** — opt-in push-to-talk (Web Speech API, feature-detected, consent dialog first,
  single utterance, nothing persisted). A bounded grammar maps phrases ("Open Advisor",
  "What does LEDGER see?", "Show me where they disagree", "Act in Do", "Open preflight") to
  typed domain actions. Voice can navigate and reveal; it can **never** confirm execution.
  Unsupported browsers show a labeled fallback; the **Command menu** lists every phrase as a
  clickable equivalent.
- **Gestures** — pointer-based swipe to queue/defer updates (with first-use hint, threshold
  preview, and undo), drag-free reorder via Move Up/Down, scrub via native range input,
  press-and-hold for consequential confirmation. Every gesture has visible-button and keyboard
  equivalents (arrow keys triage a focused card; Space/Enter holds the confirm).
- **Text** — exact values, sources, consent, captions, and the receipt stay textual and mono.

## Where things live

| Path | Responsibility |
|---|---|
| `client/src/demo/fixtures/` | Canonical scenario values, evidence, personas, updates, agents, blueprint, workflow templates — every number in the UI originates here |
| `client/src/demo/domain/` | Types, pure reducer (all state transitions), deterministic calculations, selectors/lineage, bounded voice-command grammar |
| `client/src/demo/hooks/` | Store + sessionStorage persistence, hold-to-confirm, swipe, speech/narration, reduced motion, announcer, simulation clock |
| `client/src/demo/components/` | Shell + two-level ARIA tablists, Command Center, Σ (Think/Advisor/Do), Workspace, interaction layer (voice, command menu, undo toast, scrub) |
| `client/src/demo/DemoApp.tsx` | Routes and providers |
| `client/src/demo/domain/demo-domain.test.ts` | 41 deterministic tests: calculations, triage/undo, think, advisor states, recommendations, preflight/hold/undo, workflow lifecycle, receipt lineage, reset |

Platform files touched (three, minimally): `client/src/App.tsx` (route), `client/src/main.tsx`
(public-path allowlist), `vitest.config.ts` (test include).

## Personas and marketplace readiness

ARCH (Direction), LEDGER (Economics), SIGNAL (Demand), FORGE (Feasibility) are versioned,
marketplace-ready fixture objects — identity, versioning, strategic contract, presentation,
requested data scopes, verification, and license/entitlement/reputation placeholders with
truthful built-in values. No ratings, sellers, or purchase UI appear anywhere. Σ is the neutral
synthesizer, not a persona. The one Blueprint ("Harvest Window Combine Reprice" v1.0.0) carries
the same marketplace-ready shape.

## Verification

- `pnpm check` — clean (0 errors).
- `pnpm exec vitest run client/src/demo` — 41/41 pass. (`pnpm test` runs the full suite; 122
  pre-existing server-test failures exist on the base branch with identical counts before this
  change — this change adds 41 passing tests and no new failures.)
- `pnpm build` — production build succeeds.
- Scripted Chromium walkthroughs (48 assertions): the complete loop above; early-hold-release
  cancels; keyboard-only navigation and triage; pointer swipe; command menu driving Board
  Synthesis; persona metadata; voice consent + unsupported fallback; reorder; refresh
  persistence; reset; landmarks/tablist semantics (1 `h1`, header/nav/main/footer, roving
  tabindex, `aria-selected`, tabpanel, polite live region, skip link); no horizontal overflow at
  390/768/1440 px; reduced-motion rendering; zero uncaught page errors.

## Known limitations

- Speech recognition depends on the browser (Chromium-family; often remote processing). The
  demo discloses this before first use and never requires voice.
- The failed-workflow example in Workspace is seeded history (labeled simulated) so the failure
  state is honestly visible; the live run cannot fail by design.
- "Generative" visual composition selects among fixture recipes; it does not synthesize novel
  layouts.
- Advisor's scrub writes to the shared Think parameter; with no Think open, Advisor shows
  perspectives without a scrub.
- Not production: no telemetry, no server state, single-scenario fixtures.
