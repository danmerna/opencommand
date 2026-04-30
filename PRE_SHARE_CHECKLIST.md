# Pre-Share Checklist — AI Chief of Staff

> Review this checklist before sharing `/chief-of-staff` or `/quick-start` with anyone. Items are prioritized by impact on first impressions and conversion.

---

## Critical (Must Fix Before Sharing)

These issues will immediately undermine credibility or break the user experience for first-time visitors.

| # | Issue | Impact | Fix Location |
|---|-------|--------|--------------|
| 1 | **Favicon is missing** — `client/index.html` references `/favicon.ico` and `/apple-touch-icon.png` but neither file exists in `client/public/`. Browsers show a broken icon in tabs and bookmarks. | Every visitor sees a broken tab icon | Upload via Settings → General, or add files to `client/public/` |
| 2 | **Social links are generic** — Footer links point to bare `https://twitter.com`, `https://linkedin.com`, `https://github.com` (platform homepages, not your profiles). | Anyone who clicks lands on the wrong page | `client/src/pages/Home.tsx` footer section |
| 3 | **ProOnboarding has no login gate** — If an unauthenticated user clicks "Start Executive Onboarding" from the Chief of Staff page, they see the welcome screen but all tRPC calls fail silently when they attempt to create a company (all mutations are `protectedProcedure`). Quick Start has a proper login gate; ProOnboarding does not. | Users hit a dead end with no error message | `client/src/pages/ProOnboarding.tsx` — add auth check before rendering |
| 4 | **OG meta tags show wrong product** — The global `<meta>` tags say "Deploy Your Zero-Human Company" (OpenCommand umbrella messaging). When someone shares `/chief-of-staff` on Slack or Twitter, the preview shows the wrong title and description. The `/chief-of-staff` page has no page-specific OG tags. | Social shares look unprofessional and confusing | `client/index.html` (global) + add `react-helmet` or `<title>` override in `ChiefOfStaff.tsx` |

---

## Important (Should Fix, Affects Credibility)

These won't break the app but will reduce trust and conversion for discerning visitors.

| # | Issue | Impact | Fix Location |
|---|-------|--------|--------------|
| 5 | **"How It Works" nav link misfires** — The hamburger menu item is an anchor link (`#how-it-works`) that scrolls on the home page, not the Chief of Staff page. Clicking it from `/chief-of-staff` navigates away. | Confusing navigation for visitors exploring the product page | `client/src/pages/ChiefOfStaff.tsx` — add `id="how-it-works"` to the relevant section, or change the nav link |
| 6 | **No loading/error recovery in Quick Start** — If the website audit or LLM call fails (timeout, unreachable site), the user may see a generic error or hang on the "analyzing" step with no recovery path. | Users abandon if they see an infinite spinner | `client/src/pages/QuickStart.tsx` — add error state with retry button |
| 7 | **Email capture is gated behind login** — Quick Start requires login before showing the form. This means you lose leads who aren't ready to create an account. Consider: let them fill out the form + email first, then gate only the *results* behind login. | Significant lead loss from visitors who bounce at login | `client/src/pages/QuickStart.tsx` — restructure auth gate to appear after email capture |
| 8 | **Mobile responsiveness on Chief of Staff page** — Only 10 responsive breakpoints across the entire page. The executive cards grid and cascade example may not render well on phones. | Poor experience for mobile visitors (likely 50%+ of traffic from shared links) | `client/src/pages/ChiefOfStaff.tsx` — test and add `sm:` / `md:` breakpoints |

---

## Nice to Have (Polish Before Wider Distribution)

These are quality-of-life improvements that elevate the product from "functional" to "crafted."

| # | Issue | Impact | Fix Location |
|---|-------|--------|--------------|
| 9 | **No page transition animations** — Navigating between pages is instant with no visual feedback. A simple fade or slide would feel more polished. | Feels less premium | App-level wrapper with `framer-motion` or CSS transitions |
| 10 | **"Mission Control" link requires login** — If a visitor clicks it from the home page, they get a blank/error state. Consider hiding for unauthenticated users or adding a login gate. | Dead end for curious visitors | `client/src/pages/Home.tsx` or `MissionControl.tsx` |
| 11 | **Stats in "Problem" section are unattributed** — "23hrs/week", "4.2 tools", "67% incomplete context" look like real statistics but have no source citation. | Credibility risk with sophisticated buyers | `client/src/pages/ChiefOfStaff.tsx` — add citations or reword as "operators report..." |
| 12 | **Pricing section says "Coming Soon" for Pro** — Fine for beta, but consider adding a "Notify me" email capture on the Pro card to gauge upgrade intent. | Missed opportunity to capture high-intent leads | `client/src/pages/ChiefOfStaff.tsx` pricing section |
| 13 | **Cascade example uses landscaping/construction** — If sharing with SaaS/tech founders, consider swapping the Denver market expansion example for something more relatable (launching a feature, entering a vertical). | May not resonate with your target audience | `client/src/pages/ChiefOfStaff.tsx` cascade example section |
| 14 | **No analytics on Chief of Staff page** — Verify that Vite analytics is tracking page views on `/chief-of-staff` and `/quick-start` so you can measure interest. | Can't measure demand validation | Check analytics provider configuration |

---

## Quick Wins (Settings UI, No Code Required)

These can be done directly from the Management UI without touching code:

- **Upload a favicon** — Settings → General → Favicon
- **Update social links** — Replace bare platform URLs with your actual profile URLs
- **Verify custom domain** — Confirm `opencommand.co` is resolving correctly via Settings → Domains
- **Set site title** — Update the global site title to "AI Chief of Staff" or keep "OpenCommand" depending on positioning

---

## Recommended Share Strategy

1. **Fix items 1-4** (30 minutes of work)
2. **Test the full Quick Start flow end-to-end** on mobile and desktop
3. **Share the `/chief-of-staff` URL** (not the home page) — it's the most focused, conversion-oriented entry point
4. **Monitor `/admin/leads`** for incoming Quick Start completions
5. **Follow up within 24 hours** with anyone who completes Quick Start — they've already seen Σ's value

---

*Last updated: April 30, 2026*
