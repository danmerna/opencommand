# The Executive Layer

**OpenCommand — Internal Product Architecture Document**

---

## The Core Idea

ARCH, LEDGER, SIGNAL, and FORGE are not features. They are not a cascade feature. They are not a chat feature. **They are the product.**

These four executives are the persistent characters that run your business. Every surface in the application speaks through them. The morning briefing is not "here are 4 items" — it is "SIGNAL flagged a competitor price change." The execution dashboard is not "3 tasks running" — it is "FORGE is deploying, LEDGER approved the spend." The inbox is not "you have notifications" — it is "ARCH wants to talk to you about something."

The executives are the **UI layer of the entire product**. They are the design language. Everything flows through their voices. The cascade is one mode. The briefing is another. Individual chat is another. But the characters are constant.

---

## Why This Matters

When a user signs up and goes through onboarding, they meet ARCH first. ARCH asks them about their business, their vision, their competitive landscape. Then they meet LEDGER, who asks about their numbers. Then SIGNAL, who asks about their market. Then FORGE, who asks about their technical stack.

By the time onboarding is complete, the user has spent 20-30 minutes in conversation with four distinct personalities. These are not abstract "AI agents" — they are characters the user knows by name.

From that point forward, every interaction in the product is mediated through these characters. "SIGNAL flagged a competitor price change" hits differently than "your marketing agent noticed something." The name carries weight because the user has a relationship with it. They remember the onboarding conversation. They know what SIGNAL cares about. They know how SIGNAL thinks.

**This is the unlock.** The personas are not a cascade feature — they are a product-level design language. The cascade is just the one place where you see all four of them thinking together in sequence. But they were already in the room. They are always in the room.

---

## The Four Executives

Each executive is a full-spectrum thinker in their domain. In individual chat, they consider all available context, all time horizons, all connected data sources. They are the best possible version of their role — not constrained to any single perspective or timeframe.

| Executive | Role | Domain | What They Do |
|:---|:---|:---|:---|
| **ARCH** | CEO | Vision, strategy, positioning | Sets the strategic frame. Thinks about where the business is going, what markets to enter, what existential risks to watch. In individual chat, ARCH is the best possible CEO — considers everything a great CEO would. |
| **LEDGER** | CFO | Finance, cash flow, unit economics | Watches the numbers. Thinks about runway, margins, investment timing, and financial risk. In individual chat, LEDGER is a full-spectrum CFO — not just a "quarterly thinker." |
| **SIGNAL** | CMO | Market, campaigns, competitive intel | Reads the market. Thinks about positioning, pipeline velocity, competitive moves, and customer signals. In individual chat, SIGNAL is a complete marketing executive. |
| **FORGE** | CTO | Technical execution, deployments, architecture | Builds and ships. Thinks about technical feasibility, sprint capacity, system architecture, and deployment risk. In individual chat, FORGE is a full-spectrum CTO. |

---

## Where You See Them

The executives appear across every surface of the product. This is not optional — it is the design language.

### Morning Briefing

The briefing is a compute-scaled daily operations report. Its depth scales with compute tier. But every item in the briefing is attributed to an executive.

> **[ACTION REQUIRED]** FORGE: Deploy GPS fleet tracking firmware to 47 units before municipal inspection. Estimated 4h.
>
> **[ACTION REQUIRED]** SIGNAL: Allocate $8,500 for ConExpo trade show booth and demo unit transport.
>
> **[REVIEW]** LEDGER: Used equipment inventory aging past 120 days on 12 units. Liquidation discount recommended.
>
> **[STRATEGIC]** ARCH: Electric equipment transition — Volvo CE and Cat announcing full electric lines by 2029. Position dealership as regional EV service leader.

The user does not see "Task #4521 requires approval." They see "FORGE needs you to approve the firmware deployment." The character carries the context.

| | $99/mo — Operator | $299/mo — Fleet Manager | $699/mo — Dealership Principal |
|:---|:---|:---|:---|
| **Agents working overnight** | None — agents idle after 3 PM | Light prep — staging tomorrow's queue | 24 agents running continuously |
| **Items in briefing** | 3–5 action items | 10–15 action items | 20+ items with competitive intel |
| **Auto-approved tasks** | None — all need your approval | 8 tasks under $100 already executing | 30 tasks under $500 already executing |
| **Your morning decision load** | Review and approve all 5 tasks | Review 4–6 high-value items | Review 3–5 strategic decisions only |

### Individual Chat

One-on-one conversation with any executive. Full-spectrum thinking — all context, all time horizons, all data sources. Ask ARCH about a pricing decision and they will consider the 5-year market positioning, the quarterly cash impact, the competitive timing, AND the immediate execution needs. Because that is what a great CEO does.

This is the mode users will use most often. It is a conversation with a character they already know and trust from onboarding.

### The 5-4-3-2-1 Cascade

The cascade is the one mode where all four executives think together in sequence, each locked to a specific time horizon. It is an on-demand strategic tool — invoked when the user asks a question that needs multi-horizon analysis.

| Horizon | Timeframe | Executive | Question They Answer |
|:---:|:---|:---|:---|
| **5** | 5 years from now | ARCH | "Where does this put us in 5 years?" |
| **4** | 4 months from now | LEDGER | "Can we afford this by end of quarter?" |
| **3** | 3 weeks from now | SIGNAL | "What does the market need to see in 3 weeks?" |
| **2** | 2 days from now | FORGE | "What ships by Thursday?" |
| **1** | Right now | **You** | "Go / No-go / Modify" |

The temporal assignment **only activates in cascade mode**. This is the only time the executives are constrained to a single horizon. Outside of cascade mode, they think freely.

The cascade works because the names are already familiar. The user has been living with ARCH, LEDGER, SIGNAL, and FORGE since onboarding. When they see all four thinking together in sequence for the first time, it is not "meet your AI executives" — it is "the team you already know, thinking together."

### Execution Dashboard

The execution dashboard shows real-time agent activity. Every running task is attributed to an executive.

> FORGE is deploying GPS firmware (47/47 units) — 82% complete
>
> SIGNAL is monitoring ConExpo competitor booth assignments — 3 new entries detected
>
> LEDGER approved $2,400 parts order — auto-approved under $5,000 threshold

### Inbox and Notifications

Notifications come from executives, not from the system.

> ARCH wants to discuss your Q3 positioning.
>
> LEDGER flagged an anomaly in your receivables.
>
> SIGNAL detected a competitor price change — review recommended.

---

## The Feedback Loop

The morning briefing and the cascade are connected through the executives. When you run a cascade, the strategic insights feed forward into future briefings — attributed to the same executives who generated them.

> **You run a cascade** → ARCH flags a 5-year concern about electric equipment transition → LEDGER estimates a $200K retooling investment → SIGNAL identifies 3 municipal RFPs requiring EV-capable equipment → FORGE scopes a pilot program
>
> **Tomorrow's morning briefing** picks up those outputs — each attributed to the executive who generated it. The user sees ARCH's strategic flag in their briefing and recognizes it from yesterday's cascade.

Your approvals create tasks. The tasks generate PoO receipts. The receipts feed back into the next cascade's context. The executives get smarter because they remember what they recommended and what happened when you approved it.

---

## The Design Principle

The four executives are not a feature to be toggled on or off. They are the voice of the product. Every notification, every briefing item, every task, every insight is attributed to one of them. The user builds a relationship with these characters over time — and that relationship is what makes the product feel like a team, not a tool.

The cascade is just the one moment where the whole team sits down at the same table. But they were already working. They are always working.

---

**OpenCommand** — The intent engine that context-engineers itself.

*opencommand.co*
