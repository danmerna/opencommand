# OpenCommand — Brand System v2.0

## First Principles

The brand is rebuilt from three irreducible truths:

1. **OpenCommand is infrastructure.** It orchestrates AI agents — it is not an agent itself.
2. **The user is the operator.** The product amplifies human judgment, not replaces it.
3. **Complexity should be invisible.** 11 models, HITL checkpoints, cost tracking — all hidden behind calm surfaces.

Everything that does not serve these truths is removed.

---

## Brand Essence

| Attribute | Definition |
|-----------|-----------|
| **Position** | The orchestration layer for AI work |
| **Tone** | Quiet confidence. Never shouts. |
| **Feeling** | Like a well-made instrument — precise, responsive, disappears in use |
| **Promise** | You command. Agents execute. Outcomes verified. |

---

## Color System

A single accent against near-black. No gradients. No multi-color palettes.

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `oklch(0.09 0 0)` | Page canvas — not pure black, reduces eye strain |
| `--surface` | `oklch(0.12 0 0)` | Cards, panels, elevated elements |
| `--surface-2` | `oklch(0.15 0 0)` | Hover states, active surfaces |
| `--border` | `oklch(0.18 0 0)` | Hairline borders — subtle separation |
| `--foreground` | `oklch(0.93 0 0)` | Primary text — slightly dimmed white |
| `--muted` | `oklch(0.45 0 0)` | Secondary text, labels |
| `--accent` | `oklch(0.72 0.12 250)` | Single accent — a restrained slate-blue |
| `--accent-muted` | `oklch(0.72 0.12 250 / 0.15)` | Accent backgrounds, subtle highlights |
| `--destructive` | `oklch(0.55 0.18 25)` | Errors only |
| `--success` | `oklch(0.72 0.14 150)` | Confirmations only |

**Rationale:** The current emerald green reads as "startup growth" — it signals Robinhood, not infrastructure. Slate-blue signals intelligence, depth, and calm authority. It is the color of deep water, not neon signs.

---

## Typography

Two typefaces. No more.

| Role | Typeface | Weight | Usage |
|------|----------|--------|-------|
| **Primary** | Inter | 400, 500, 600 | All UI text, headings, body |
| **Mono** | JetBrains Mono | 400, 500 | Model names, metrics, code, tickers |

**Hierarchy through size and opacity, not weight:**

| Level | Size | Weight | Opacity | Letter-spacing |
|-------|------|--------|---------|----------------|
| Display | 3.5rem | 600 | 1.0 | -0.035em |
| Heading | 1.5rem | 600 | 1.0 | -0.025em |
| Body | 0.875rem | 400 | 0.85 | -0.01em |
| Label | 0.6875rem | 500 | 0.45 | 0.06em (uppercase) |
| Mono | 0.8125rem | 400 | 0.55 | -0.02em |

---

## Spacing & Layout

An 8px base grid. Every measurement is a multiple of 4 or 8.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Tight gaps, icon padding |
| `--space-sm` | 8px | Between related elements |
| `--space-md` | 16px | Section padding, card padding |
| `--space-lg` | 32px | Between sections |
| `--space-xl` | 64px | Page-level spacing |
| `--radius` | 8px | All corners — one radius for everything |

---

## Logo & Wordmark

**Wordmark:** "OpenCommand" in Inter 600, letter-spacing -0.03em. No logo mark needed — the name is the mark.

**Monogram (favicon/avatar):** "OC" in Inter 700, white on the accent color square with 8px radius. Simple. Scalable. Works at 16px.

**Rules:**
- Never pair the wordmark with an icon or illustration
- Never use the wordmark in color — always white or foreground
- Minimum clear space: 1x the height of the "O" on all sides

---

## Voice & Messaging

**Principles:**
- Short sentences. Active voice. No filler.
- State what the product does, not what it "empowers" or "enables"
- Technical precision over marketing enthusiasm
- Never use: "revolutionary", "game-changing", "cutting-edge", "leverage", "synergy"

**Tagline options (ranked by restraint):**

1. `OpenCommand` — (no tagline; the name speaks)
2. `The orchestration layer.` — (what it is)
3. `Command your agents.` — (what you do)

**Messaging hierarchy:**

| Level | Content | Example |
|-------|---------|---------|
| **L1 — What** | One sentence, what it does | "Deploy AI agents. Set goals. Verify outcomes." |
| **L2 — How** | The mechanism | "Visual blueprints. Dynamic model routing. Human checkpoints." |
| **L3 — Why** | The belief | "Agents should be orchestrated, not autonomous." |

---

## Component Language

| Component | Treatment |
|-----------|-----------|
| **Cards** | `surface` background, 1px `border`, `radius` corners. No shadows. |
| **Buttons (primary)** | White text on accent. No gradients. |
| **Buttons (secondary)** | Ghost — border only, transparent fill. |
| **Inputs** | `surface` background, 1px border. No inner shadows. |
| **Badges** | Pill shape, accent-muted background, accent text. |
| **Dividers** | 1px solid border color. No gradient lines. |
| **Icons** | Lucide, 16px default, 1.5 stroke. Never filled. |

---

## What Changes

| Before (v1) | After (v2) |
|-------------|-----------|
| Emerald green accent | Slate-blue accent |
| "The OS for non-human labor" | No tagline (or "The orchestration layer.") |
| "Automate mundane. Elevate human." | Removed — too philosophical |
| Gradient accent lines | Solid 1px borders |
| ContextEngineHero animation | Removed — product screenshots instead |
| Multi-color integration dots | Monochrome with single accent |
| "Beta" badge | Removed — signals uncertainty |
| Company-switcher rail | Already removed |
| Multiple nav sections | Already simplified |
| `oklch(0.78 0.06 80)` gold accent | `oklch(0.72 0.12 250)` slate-blue |

---

## Implementation Priority

1. Update `index.css` — new color tokens, remove gradient utilities, update accent
2. Update `index.html` — new meta descriptions, remove old taglines
3. Rewrite `Home.tsx` — minimal hero, no animation, product-focused
4. Update `AppLayout.tsx` — apply new surface colors
5. Update all badge/card/button utilities to use new system
6. Remove `ContextEngineHero.tsx` — replace with static or nothing

---

*This document is the single source of truth for all brand decisions.*
