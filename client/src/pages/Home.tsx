import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { ArrowRight, Target, BarChart3, Bot, Cpu, Shield, Package, Check, Zap, Menu, X, RefreshCw, Layers, Users, Globe, Lock } from "lucide-react";
import { ContextEngineHero } from "@/components/ContextEngineHero";
import { useEffect, useRef, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";

/* ─── Scroll Reveal Hook ─────────────────────────────────────────────── */
function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("reveal-visible");
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return ref;
}



/* ─── Socratic Intent Engine Demo Data ───────────────────────────────── */
const AGENT_DEMOS = {
  ceo: {
    label: "Sales",
    name: "Sales Agent",
    color: "text-emerald-400",
    badge: { sources: 4, time: "3.4s" },
    title: "Full sales intelligence cross-reference",
    userRequest: "Close more deals this quarter",
    dataSources: [
      {
        color: "bg-orange-400",
        source: "HubSpot CRM",
        metrics: [
          ["Open deals", "34 · $612K"],
          ["Won Q1", "9 · $187K"],
          ["Lost Q1", "14 · $294K"],
          ["Stalled >14d", "11 · $196K"],
        ],
      },
      {
        color: "bg-red-400",
        source: "Gmail",
        metrics: [
          ["Threads (30d)", "67"],
          ["Ghosted >7d", "18"],
          ["Follow-ups sent", "23 of 67"],
          ["Proposals opened", "8 of 12"],
        ],
      },
      {
        color: "bg-blue-400",
        source: "Calendly",
        metrics: [
          ["Meetings Q1", "41"],
          ["No-shows", "7 (17%)"],
          ["Meeting → deal", "56%"],
          ["Avg to close", "2.3 meetings"],
        ],
      },
      {
        color: "bg-purple-400",
        source: "Stripe",
        metrics: [
          ["Q1 revenue", "$187K"],
          ["Avg payment", "$20,780"],
          ["Failed payments", "2 · $38K"],
          ["Unpaid closed", "3 · $64K"],
        ],
      },
    ],
    insights: [
      '<b>Win rate 39%</b> — but 2+ meeting deals close at <b>68%</b> vs 22% for single-meeting. 19 open deals have only 1 meeting.',
      '<b>8 of 11 stalled deals</b> have zero Gmail activity in 10 days — going cold with no follow-up.',
      '<b>$64K in closed deals sitting unpaid</b> in Stripe — all past the 11-day payment average.',
      '5 of 7 <b>Calendly no-shows</b> had no confirmation email in the 24h before the meeting.',
    ],
    insightColors: ["border-emerald-500", "border-amber-500", "border-red-500", "border-blue-500"],
    socraticIntro: "Your Q1 close rate was 39% on $481K in pipeline activity. Four levers for Q2:",
    socraticQuestions: [
      'Deals with a <b>second meeting close at 68%</b> vs 22% for single-meeting. 19 of 34 open deals have had only one. Should we prioritize second meetings — shifting $340K from 22% to 68% probability?',
      '<b>8 deals worth $196K going cold</b> — stalled in CRM with zero email in 10 days. Should I build a re-engagement sequence for stalled deals and a follow-up cadence for the 44 untouched threads?',
      '<b>$64K in closed deals sitting unpaid</b> in Stripe. Should I draft payment reminders? That\'s revenue earned but not collected.',
      '<b>$140K–$210K in recoverable revenue</b> from deals already in your system — before a single new lead. Pipeline recovery before lead gen?',
    ],
  },
  cmo: {
    label: "Marketing",
    name: "Marketing Agent",
    color: "text-purple-400",
    badge: { sources: 4, time: "3.6s" },
    title: "Outbound sales optimization",
    userRequest: "Build me an outbound campaign for Q2",
    dataSources: [
      {
        color: "bg-orange-400",
        source: "HubSpot CRM",
        metrics: [
          ["Contacts (non-customer)", "2,340"],
          ["Engaged last 90d", "187"],
          ["Top source (closed-won)", "LinkedIn (42%)"],
          ["Avg deal cycle", "38 days"],
        ],
      },
      {
        color: "bg-red-400",
        source: "Gmail",
        metrics: [
          ["Cold emails sent Q1", "420"],
          ["Open rate", "34%"],
          ["Reply rate", "4.2%"],
          ["Best subject line type", "Question format (47% open)"],
        ],
      },
      {
        color: "bg-blue-400",
        source: "LinkedIn Sales Nav",
        metrics: [
          ["Saved leads", "890"],
          ["Connection requests sent Q1", "210"],
          ["Accept rate", "31%"],
          ["InMail response rate", "8.7%"],
        ],
      },
      {
        color: "bg-cyan-400",
        source: "Calendly",
        metrics: [
          ["Discovery calls Q1", "28"],
          ["Source: LinkedIn", "16 (57%)"],
          ["Source: Cold email", "8 (29%)"],
          ["Call → deal rate", "43%"],
        ],
      },
    ],
    insights: [
      '<b>LinkedIn produces 57% of discovery calls</b> and 42% of closed deals — but you only sent 210 connection requests in Q1. That\'s ~3/day. The channel is underinvested relative to its conversion rate.',
      'Cold email reply rate is <b>4.2% overall</b>, but question-format subject lines hit <b>47% open rate</b> — 38% higher than declarative subjects. The format of the email matters more than the volume.',
      'You have <b>187 contacts who engaged in the last 90 days</b> but are NOT customers and NOT in an active deal. These are warm leads sitting in your CRM with zero outbound sequencing.',
      'Your <b>call → deal rate is 43%</b> — nearly 1 in 2 calls convert. The bottleneck isn\'t closing, it\'s generating enough calls. At current rate you need 23 more discovery calls to hit a $100K Q2 target.',
    ],
    insightColors: ["border-emerald-500", "border-amber-500", "border-purple-500", "border-blue-500"],
    socraticIntro: "Your Q1 outbound data shows a clear pattern: high conversion rates but low volume. Here's where to focus for Q2:",
    socraticQuestions: [
      'LinkedIn drives <b>57% of your discovery calls with a 43% close rate</b>, but you\'re only sending 3 connection requests/day. Should we 3x that to 10/day with an ICP-filtered target list? At current rates, that alone adds ~8 discovery calls/month.',
      'You have <b>187 warm contacts who engaged in 90 days</b> but aren\'t in a deal or sequence. Should I build a re-engagement email campaign for those? At your 4.2% reply rate, that\'s ~8 replies. At 43% call → deal, that\'s 3-4 new deals from contacts you already have.',
      'Question-format subject lines get <b>47% open rate vs ~34% overall</b>. Should we A/B test switching ALL cold outreach to question-format subjects and measure the impact over 4 weeks?',
      'At <b>43% call → deal conversion, you need 23 more discovery calls</b> in Q2 to hit $100K. With LinkedIn + warm re-engagement + optimized cold email, the math says we can generate 30-35. Should I build the full multichannel sequence?',
    ],
  },
  cto: {
    label: "Engineering",
    name: "Engineering Agent",
    color: "text-cyan-400",
    badge: { sources: 4, time: "4.1s" },
    title: "Engineering velocity & reliability audit",
    userRequest: "Why is our release velocity slowing down?",
    dataSources: [
      {
        color: "bg-gray-400",
        source: "GitHub",
        metrics: [
          ["PRs merged (30d)", "47"],
          ["Avg review time", "18.4 hours"],
          ["PRs with 0 reviewers >24h", "12"],
          ["Revert commits (30d)", "6"],
        ],
      },
      {
        color: "bg-purple-400",
        source: "Datadog",
        metrics: [
          ["P95 latency", "340ms (SLA: 200ms)"],
          ["Error rate (7d)", "0.8% → 2.1%"],
          ["Active alerts", "3 (payments svc)"],
          ["Deploy rollbacks (30d)", "4"],
        ],
      },
      {
        color: "bg-blue-400",
        source: "Jira",
        metrics: [
          ["Sprint velocity", "42 → 31 pts (last 3)"],
          ["Carryover tickets", "8 per sprint avg"],
          ["Bug tickets (30d)", "23 (up 64%)"],
          ["Blocked tickets", "5 (waiting: infra)"],
        ],
      },
      {
        color: "bg-orange-400",
        source: "PagerDuty",
        metrics: [
          ["Incidents (30d)", "11"],
          ["MTTR", "47 min → 1.8 hrs"],
          ["After-hours pages", "6"],
          ["Repeat incidents", "3 (same root cause)"],
        ],
      },
    ],
    insights: [
      '<b>Sprint velocity dropped 26%</b> (42 → 31 pts) over 3 sprints, and carryover tickets doubled. The team isn\'t slowing down — they\'re being pulled into unplanned work.',
      '<b>6 revert commits and 4 deploy rollbacks</b> in 30 days. That\'s 10 failed deployments — each one burns 2-4 hours of engineering time on cleanup instead of features.',
      '<b>3 PagerDuty incidents share the same root cause</b> (connection pooling in payments service). Each incident takes 1.8 hours MTTR. That\'s 5.4 hours of repeat firefighting that a single fix would eliminate.',
      '<b>12 PRs sat with zero reviewers for 24+ hours</b>. Average review time is 18.4 hours. The bottleneck isn\'t writing code — it\'s getting code reviewed and shipped.',
    ],
    insightColors: ["border-amber-500", "border-red-500", "border-red-500", "border-blue-500"],
    socraticIntro: "Your release velocity isn't a capacity problem — it's a quality and review bottleneck. Three root causes, four fixes:",
    socraticQuestions: [
      '<b>3 repeat incidents from the same connection pooling bug</b> are consuming 5.4 hours of MTTR and triggering after-hours pages. Should I prioritize a hotfix sprint this week? One fix eliminates 27% of your monthly incidents.',
      '<b>12 PRs blocked on review for 24+ hours</b> — that\'s 25% of all PRs. Should we implement a review SLA (4-hour first response) and auto-assign reviewers based on code ownership? The 18.4-hour average is killing your deploy frequency.',
      '<b>10 failed deployments in 30 days</b> (6 reverts + 4 rollbacks). Should we gate deploys with a staging canary that catches the error rate spike before production? Your error rate tripled from 0.8% to 2.1% this month.',
      'Bug tickets are <b>up 64% with 5 blocked on infra</b>. The team is spending sprint capacity on bug fixes instead of features. Should we dedicate 20% of next sprint to tech debt — specifically the infra blockers — to stop the bleed?',
    ],
  },
  cfo: {
    label: "Finance",
    name: "Finance Agent",
    color: "text-amber-400",
    badge: { sources: 4, time: "3.8s" },
    title: "Cash flow & unit economics analysis",
    userRequest: "Are we on track to hit profitability this year?",
    dataSources: [
      {
        color: "bg-purple-400",
        source: "Stripe",
        metrics: [
          ["MRR", "$204K"],
          ["MoM growth", "12%"],
          ["Net retention", "94.2%"],
          ["Failed charges (30d)", "$18K (7 accounts)"],
        ],
      },
      {
        color: "bg-green-400",
        source: "QuickBooks",
        metrics: [
          ["Monthly burn", "$167K"],
          ["Runway", "18 months"],
          ["Engineering % of spend", "62%"],
          ["G&A % of spend", "24%"],
        ],
      },
      {
        color: "bg-orange-400",
        source: "HubSpot CRM",
        metrics: [
          ["Pipeline (weighted)", "$1.2M"],
          ["Expected close Q1", "$340K"],
          ["Avg deal size", "$24K"],
          ["Sales cycle", "34 days"],
        ],
      },
      {
        color: "bg-blue-400",
        source: "Gusto",
        metrics: [
          ["Headcount", "23"],
          ["Payroll (monthly)", "$98K"],
          ["Open roles", "4"],
          ["Projected payroll +4", "$115K"],
        ],
      },
    ],
    insights: [
      'At <b>$204K MRR with 12% MoM growth</b>, you\'ll cross $300K MRR by month 5. But burn is $167K/mo — breakeven requires $167K in gross margin, which at 78% margin means <b>$214K MRR to break even</b>. You\'re $10K/mo away.',
      '<b>Engineering is 62% of total spend</b> ($103K/mo) — well above the 45-50% benchmark for your stage. The 4 open roles would push payroll from $98K to $115K, adding $17K/mo to burn and shortening runway to 14 months.',
      '<b>$18K in failed Stripe charges</b> from 7 accounts in the last 30 days. At $204K MRR, that\'s 8.8% of monthly revenue at risk from involuntary churn. Industry average is 2-3%.',
      '<b>Net retention at 94.2%</b> means you\'re losing 5.8% of revenue annually to contraction/churn. Each 1% improvement in retention adds ~$24K ARR — equivalent to closing one new deal.',
    ],
    insightColors: ["border-emerald-500", "border-amber-500", "border-red-500", "border-blue-500"],
    socraticIntro: "You're $10K MRR from breakeven with 18 months of runway. Here's how the numbers break down:",
    socraticQuestions: [
      'You\'re <b>$10K MRR from breakeven</b> at current margins. At 12% MoM growth, you\'ll cross it in ~6 weeks. But the 4 open roles add $17K/mo to burn, pushing breakeven to $231K MRR. Should we phase the hires — 2 now, 2 after breakeven — to protect the timeline?',
      '<b>$18K in failed charges (8.8% of MRR)</b> vs the 2-3% industry benchmark. Should I set up a dunning sequence with automated retry logic? Recovering even half would add $9K/mo — nearly closing the breakeven gap alone.',
      '<b>Net retention at 94.2%</b> is costing you ~$24K ARR per point. Should we analyze the 5.8% contraction to find the root cause? If it\'s usage-based downgrades, a customer success intervention could recover $50-100K ARR.',
      'Engineering at <b>62% of spend vs 45-50% benchmark</b>. Before hiring 4 more, should I model the ROI of each role against revenue impact? Two of the four roles may not be needed if we fix the deployment bottleneck SAGE identified.',
    ],
  },
} as const;

type AgentKey = keyof typeof AGENT_DEMOS;

/* ─── Socratic Intent Engine Demo ────────────────────────────────────── */
function ContextEngineDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentKey>("ceo");
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const switchAgent = useCallback((key: AgentKey) => {
    setActiveAgent(key);
    setAnimKey(k => k + 1);
    setInView(true);
  }, []);

  const demo = AGENT_DEMOS[activeAgent];

  return (
    <div ref={ref} className="max-w-4xl mx-auto">
      {/* Agent toggle tabs */}
      <div className="flex justify-center gap-2 mb-6">
        {(Object.keys(AGENT_DEMOS) as AgentKey[]).map((key) => {
          const d = AGENT_DEMOS[key];
          const isActive = key === activeAgent;
          return (
            <button
              key={key}
              onClick={() => switchAgent(key)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
                isActive
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-card/50 text-muted-foreground hover:text-foreground hover:border-foreground/20"
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {/* Main card */}
      <div key={animKey} className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-black/40">
          <div className="flex items-center gap-3">
            <span className="text-accent font-mono text-sm font-bold">&gt;_</span>
            <span className="text-[12px] text-foreground font-mono font-medium">OPEN COMMAND</span>
            <span className="text-[11px] text-muted-foreground font-mono">| Self-contextualizing intent engine</span>
          </div>
        </div>

        <div className="p-5 md:p-6">
          {/* Badge + title row */}
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-mono font-medium">
              {demo.badge.sources} sources · {demo.badge.time}
            </span>
            <span className="text-sm font-semibold text-foreground">{demo.title}</span>
          </div>

          {/* User request */}
          <div className="mb-5">
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-2">User Request</p>
            <div className="rounded-lg border border-border bg-black/20 px-4 py-3">
              <p className="text-sm text-foreground font-medium">"{demo.userRequest}"</p>
            </div>
          </div>

          {/* Live data pulled */}
          {inView && <SocraticDataGrid key={`dg-${animKey}`} sources={demo.dataSources} delay={300} />}

          {/* Cross-source insights */}
          {inView && <SocraticInsights key={`ins-${animKey}`} insights={demo.insights} colors={demo.insightColors} delay={800} />}

          {/* Socratic engine response */}
          {inView && <SocraticResponse key={`sr-${animKey}`} demo={demo} delay={1400} />}
        </div>

        {/* Footer bar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-black/20">
          <span className="text-[10px] text-muted-foreground/50 font-mono">Context: CTX-2026-{String(Math.floor(Math.random() * 9000) + 1000)}</span>
          <span className="text-[10px] text-muted-foreground/50 font-mono">
            Sources: {demo.dataSources.map(s => s.source).join(' + ')}
          </span>
          <span className="text-[10px] text-muted-foreground/50 font-mono">opencommand.co</span>
        </div>
      </div>

      <p className="text-center mt-6 text-xs italic" style={{ color: "oklch(0.78 0.06 80)" }}>
        Multiple data sources. One unified context. Zero manual setup.
      </p>
    </div>
  );
}

/* ─── Socratic Demo Sub-Components ───────────────────────────────────── */
function SocraticDataGrid({ sources, delay }: { sources: readonly { color: string; source: string; metrics: readonly (readonly [string, string])[] }[]; delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  if (!visible) return null;
  return (
    <div className="mb-5 animate-fade-in">
      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-3">Live Data Pulled</p>
      <div className="grid grid-cols-2 gap-2.5">
        {sources.map((src, i) => (
          <div key={i} className="rounded-lg border border-border bg-black/30 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={`w-2 h-2 rounded-full ${src.color}`} />
              <span className="text-[11px] font-semibold text-foreground">{src.source}</span>
            </div>
            <div className="space-y-0.5">
              {src.metrics.map(([label, value], j) => (
                <div key={j} className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono leading-tight">{label}</span>
                  <span className="text-[10px] text-foreground font-mono font-medium leading-tight whitespace-nowrap">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SocraticInsights({ insights, colors, delay }: { insights: readonly string[]; colors: readonly string[]; delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  if (!visible) return null;
  return (
    <div className="mb-5 animate-fade-in">
      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-3">Cross-Source Insights</p>
      <div className="space-y-2.5">
        {insights.map((html, i) => (
          <div key={i} className={`border-l-2 ${colors[i] || 'border-muted'} pl-4 py-1`}>
            <p className="text-[12px] text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SocraticResponse({ demo, delay }: { demo: typeof AGENT_DEMOS[AgentKey]; delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  if (!visible) return null;
  return (
    <div className="animate-fade-in rounded-lg border-l-2 border-emerald-500 bg-emerald-500/5 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-accent font-mono text-xs font-bold">&gt;_</span>
        <span className="text-[11px] text-foreground font-mono font-medium">OPEN COMMAND</span>
        <span className="text-[11px] text-muted-foreground font-mono">· Socratic intent engine · {demo.badge.sources} tools · {demo.socraticQuestions.length} insights</span>
      </div>
      <p className="text-[12px] text-foreground/80 mb-4 leading-relaxed">{demo.socraticIntro}</p>
      <div className="space-y-3">
        {demo.socraticQuestions.map((html, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-emerald-400 text-[12px] font-bold font-mono shrink-0 mt-0.5">{i + 1}.</span>
            <p className="text-[12px] text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Integration Logo Bar ────────────────────────────────────────────── */
const integrationLogos = [
  { name: "HubSpot", color: "#FF7A59" },
  { name: "Salesforce", color: "#00A1E0" },
  { name: "Stripe", color: "#635BFF" },
  { name: "Gmail", color: "#EA4335" },
  { name: "Slack", color: "#E01E5A" },
  { name: "Notion", color: "#FFFFFF" },
  { name: "Google Analytics", color: "#F9AB00" },
  { name: "Mailchimp", color: "#FFE01B" },
  { name: "Asana", color: "#F06A6A" },
  { name: "Meta Ads", color: "#1877F2" },
  { name: "Google Ads", color: "#4285F4" },
  { name: "TikTok Ads", color: "#00F2EA" },
  { name: "Shopify", color: "#96BF48" },
  { name: "QuickBooks", color: "#2CA01C" },
  { name: "Linear", color: "#5E6AD2" },
  { name: "Pipedrive", color: "#25292C" },
  { name: "ConvertKit", color: "#FB6970" },
];

function LogoPill({ name, color }: { name: string; color: string }) {
  return (
    <div
      className="group flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card/50 hover:border-foreground/20 transition-all duration-300 shrink-0 cursor-default"
    >
      <div
        className="w-2 h-2 rounded-full transition-all duration-300 opacity-40 group-hover:opacity-100"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300 whitespace-nowrap">
        {name}
      </span>
    </div>
  );
}

/* ─── How It Works Step ───────────────────────────────────────────────── */
function HowItWorksStep({ step, title, desc, detail, delay }: { step: string; title: string; desc: string; detail: string; delay: number }) {
  const ref = useScrollReveal();
  return (
    <div
      ref={ref}
      className="reveal-step relative px-8 py-10 border-l border-border first:border-l-0 md:border-l"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="text-[3.5rem] font-semibold text-border leading-none mb-6 select-none">{step}</div>
      <h3 className="text-heading text-xl text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground text-body text-sm mb-4">{desc}</p>
      <p className="text-xs text-muted-foreground/60 font-medium uppercase tracking-wider">{detail}</p>
    </div>
  );
}

/* ─── Blueprint Differentiator Card ──────────────────────────────────── */
function BlueprintDiffCard({ icon: Icon, theirs, ours, label }: { icon: typeof Layers; theirs: string; ours: string; label: string }) {
  const ref = useScrollReveal();
  return (
    <div ref={ref} className="reveal-step card-minimal group">
      <Icon size={18} className="text-muted-foreground mb-4 group-hover:text-accent transition-colors" strokeWidth={1.5} />
      <p className="text-label text-[10px] mb-3">{label}</p>
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <X size={12} className="text-red-400/60 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground/70 line-through decoration-muted-foreground/30">{theirs}</p>
        </div>
        <div className="flex items-start gap-2">
          <Check size={12} className="text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-xs text-foreground/90">{ours}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Email Capture Form ──────────────────────────────────────────────── */
function EmailCapture({ source = "homepage" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [error, setError] = useState("");

  const joinMutation = trpc.waitlist.join.useMutation({
    onSuccess: (data) => {
      setAlreadyJoined(data.alreadyJoined);
      setSubmitted(true);
      setError("");
    },
    onError: (err) => {
      setError(err.message || "Something went wrong.");
    },
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Please enter your email."); return; }
    joinMutation.mutate({ email: email.trim(), source });
  }, [email, source, joinMutation]);

  if (submitted) {
    return (
      <div className="flex items-center gap-3 animate-fade-in">
        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <Check size={14} className="text-emerald-400" />
        </div>
        <span className="text-sm text-foreground">
          {alreadyJoined ? "You're already on the list." : "You're in. We'll be in touch."}
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="flex-1 px-4 py-3 rounded-lg bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
      />
      <button
        type="submit"
        disabled={joinMutation.isPending}
        className="btn-primary flex items-center justify-center gap-2 px-6 py-3 whitespace-nowrap disabled:opacity-60"
      >
        {joinMutation.isPending ? (
          <RefreshCw size={14} className="animate-spin" />
        ) : (
          <>Join the Beta <ArrowRight size={14} /></>
        )}
      </button>
      {error && <p className="text-xs text-destructive mt-1 sm:hidden">{error}</p>}
    </form>
  );
}

/* ─── Hero Email Input (Primary CTA) ─────────────────────────────────── */
function HeroEmailInput() {
  const [email, setEmail] = useState("");
  const [, setLocation] = useLocation();
  const [error, setError] = useState("");

  const emailSignup = trpc.waitlist.emailSignup.useMutation({
    onSuccess: (data) => {
      // Store email in sessionStorage so OAuth callback can link accounts
      sessionStorage.setItem("oc_signup_email", data.email ?? "");
      // Always send to waitlist page — onboarding will be enabled closer to launch
      toast.success("You're on the list!");
      setLocation("/waitlist");
    },
    onError: (err) => {
      setError(err.message || "Something went wrong. Try again.");
    },
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = email.trim();
    if (!trimmed) { setError("Enter your email to get started."); return; }
    // Capture referral code from URL if present
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || undefined;
    emailSignup.mutate({ email: trimmed, referralCode: ref });
  }, [email, emailSignup]);

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full">
        <div className="flex-1 relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="What's your email?"
            className="w-full px-5 py-4 rounded-lg bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent transition-colors"
            autoComplete="email"
          />
        </div>
        <button
          type="submit"
          disabled={emailSignup.isPending}
          className="btn-primary flex items-center justify-center gap-2 px-7 py-4 whitespace-nowrap disabled:opacity-60 shrink-0"
        >
          {emailSignup.isPending ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <>Join Waitlist <ArrowRight size={16} /></>
          )}
        </button>
      </form>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      <p className="text-xs text-muted-foreground/50 mt-3">Free during beta. No credit card required.</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  HOME PAGE                                                             */
/* ═══════════════════════════════════════════════════════════════════════ */

export default function Home() {
  const { isAuthenticated } = useAuth();
  const companiesQ = trpc.companies.list.useQuery(undefined, { enabled: isAuthenticated });
  const hasCompany = (companiesQ.data?.length ?? 0) > 0;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>{`
        .reveal-step {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .reveal-step.reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .hero-label {
          opacity: 0;
          transform: translateY(12px);
          animation: heroFadeUp 0.5s ease 0.1s forwards;
        }
        .hero-h1 {
          opacity: 0;
          transform: translateY(16px);
          animation: heroFadeUp 0.6s ease 0.25s forwards;
        }
        .hero-sub {
          opacity: 0;
          transform: translateY(16px);
          animation: heroFadeUp 0.6s ease 0.45s forwards;
        }
        .hero-cta {
          opacity: 0;
          transform: translateY(12px);
          animation: heroFadeUp 0.5s ease 0.65s forwards;
        }
        @keyframes heroFadeUp {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mobileMenuSlide {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mobile-menu-enter {
          animation: mobileMenuSlide 0.2s ease forwards;
        }
        .logo-scroll {
          display: flex;
          gap: 0.75rem;
          animation: logoScroll 40s linear infinite;
        }
        .logo-scroll:hover {
          animation-play-state: paused;
        }
        @keyframes logoScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .pricing-highlight {
          background: linear-gradient(135deg, oklch(0.78 0.06 80 / 0.06), oklch(0.78 0.06 80 / 0.02));
          border-color: oklch(0.78 0.06 80 / 0.3);
        }
      `}</style>

      {/* ─── Section 1: Navigation ─────────────────────────────────── */}
      <nav className="px-6 md:px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-semibold text-foreground text-xl tracking-tight hover:opacity-80 transition-opacity flex items-center gap-2">
            OpenCommand
            <span className="text-[9px] font-medium tracking-wider uppercase px-1.5 py-0.5 rounded-full border border-emerald-400/40 text-emerald-400">Beta</span>
          </Link>

          {/* Hamburger menu button — all screen sizes */}
          <button
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Dropdown menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu-enter mt-4 pb-4 border-t border-border pt-4 flex flex-col gap-4">
            <button onClick={() => scrollToSection("how-it-works")} className="text-[13px] text-muted-foreground hover:text-foreground transition-colors text-left">
              How It Works
            </button>
            <Link href="/blueprints" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
              Blueprints
            </Link>
            <Link href="/creators" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
              Creators
            </Link>

            <div className="pt-2 border-t border-border">
              {isAuthenticated ? (
                hasCompany ? (
                  <Link href="/mission-control" className="btn-primary text-[13px] px-5 py-2 inline-block" onClick={() => setMobileMenuOpen(false)}>
                    Mission Control
                  </Link>
                ) : (
                  <Link href="/waitlist" className="btn-primary text-[13px] px-5 py-2 inline-block" onClick={() => setMobileMenuOpen(false)}>
                    Join Waitlist
                  </Link>
                )
              ) : (
                <a href={getLoginUrl()} className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                  Login
                </a>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ─── Section 2: Hero ───────────────────────────────────────── */}
      <section className="px-8 pt-28 pb-20 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left: Copy */}
          <div>
            <p className="hero-label text-label mb-6">Agent Operating System</p>
            <h1 className="hero-h1 text-display text-5xl lg:text-[4.5rem] text-foreground leading-none mb-8">
              The OS for<br />
              <span className="text-muted-foreground">deploying AI agents.</span>
            </h1>
            <p className="hero-sub text-muted-foreground text-lg text-body max-w-xl mb-12">
              OpenCommand is the operating system companies use to deploy, orchestrate, and govern AI agents at scale — connecting to your tools, setting goals, and delivering verified outcomes across every function.
            </p>
            <div className="hero-cta w-full max-w-xl">
              <HeroEmailInput />
            </div>
          </div>

          {/* Right: Animated Context Engine Illustration */}
          <div className="hidden lg:block">
            <ContextEngineHero />
          </div>
        </div>
      </section>

      {/* ─── Section 2.5: BYOA — Works with your favorite AI agents ────── */}
      <div className="accent-line" />
      <section className="px-8 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-heading text-3xl md:text-4xl text-foreground mb-4">
            Works with your favorite AI agents
          </h2>
          <p className="text-muted-foreground text-lg text-body max-w-2xl mx-auto">
            Bring your own API keys from any major provider
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Or use <a href="https://okcomputer.cloud" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-semibold">Sigma Agent Builder</a> to discover the perfect agent for your workflow, then deploy it here.
          </p>
        </div>

        {/* Provider Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {[
            { name: "Claude Code", logo: "🌟", color: "from-orange-500 to-orange-600" },
            { name: "Codex", logo: "⚙️", color: "from-gray-700 to-gray-900" },
            { name: "OpenCode", logo: "→", color: "from-blue-400 to-blue-600" },
            { name: "Pi Agent", logo: "☁️", color: "from-indigo-400 to-indigo-600" },
            { name: "Hermes", logo: "⚡", color: "from-purple-500 to-purple-700" },
            { name: "OpenClaw", logo: "🦞", color: "from-red-500 to-red-600" },
          ].map((provider, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center p-6 rounded-lg border border-border bg-gradient-to-br hover:border-foreground/40 transition-all duration-300 cursor-default group overflow-hidden"
              style={{
                backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)`
              }}
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 text-xl font-bold text-white">
                {provider.logo}
              </div>
              <p className="text-sm font-medium text-foreground text-center">{provider.name}</p>
            </div>
          ))}
        </div>

        {/* Subtitle */}
        <p className="text-center text-muted-foreground text-sm text-body">
          And yes — you can use your existing Claude Code or Codex subscription. Hermes runs locally with zero API cost.
        </p>
      </section>

      {/* ─── Section 3: Context Engine Demo ────────────────────────── */}
      <div className="accent-line" />
      <section className="px-8 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-label mb-3">Introducing Self-Contextualization</p>
          <h2 className="text-heading text-2xl md:text-3xl text-foreground">
            Your agents pull their own context. From every tool you use.
          </h2>
        </div>
        <ContextEngineDemo />
      </section>

      {/* ─── Section 4: Integration Logo Bar ───────────────────────── */}
      <div className="accent-line" />
      <section className="py-14 overflow-hidden">
        <div className="text-center mb-8 px-8">
          <p className="text-label">Connects to 100+ tools. Context-engineers itself from your stack.</p>
        </div>
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          {/* Scrolling logos */}
          <div className="logo-scroll">
            {[...integrationLogos, ...integrationLogos].map((logo, i) => (
              <LogoPill key={`${logo.name}-${i}`} name={logo.name} color={logo.color} />
            ))}
            <div className="flex items-center px-4 py-2 rounded-full border border-border bg-card/50 shrink-0">
              <span className="text-xs font-medium text-muted-foreground">+90 more</span>
            </div>
            {/* Duplicate for seamless loop */}
            {[...integrationLogos, ...integrationLogos].map((logo, i) => (
              <LogoPill key={`dup-${logo.name}-${i}`} name={logo.name} color={logo.color} />
            ))}
            <div className="flex items-center px-4 py-2 rounded-full border border-border bg-card/50 shrink-0">
              <span className="text-xs font-medium text-muted-foreground">+90 more</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 5: Core Systems (Features Grid) ───────────────── */}
      <div className="accent-line" />
      <section className="px-8 py-24 max-w-7xl mx-auto">
        <div className="mb-16">
          <p className="text-label mb-3">Core Systems</p>
          <h2 className="text-heading text-3xl text-foreground">Everything you need to run an agent-powered company.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: Bot,
              title: "Agent Fleet",
              desc: "Deploy, configure, and monitor any AI agent — from OpenAI to Anthropic to your own custom APIs. One dashboard for your entire workforce.",
              href: "/mission-control",
            },
            {
              icon: Cpu,
              title: "Intent Engine",
              desc: "Connects to your CRM, ad platforms, and analytics. Pulls live data before asking its first question. Every command starts with full context.",
              href: "/intent-engine",
            },
            {
              icon: Target,
              title: "Workplace Goals",
              desc: "Set multi-agent OKRs across your entire operation. Agents coordinate autonomously to hit targets — you track progress in real time.",
              href: "/mission-control",
            },
            {
              icon: BarChart3,
              title: "Proof of Outcome",
              desc: "Every completed task generates a verified receipt documenting what was done, what it cost, and what value it created.",
              href: "/mission-control",
            },
            {
              icon: Shield,
              title: "Governance",
              desc: "Approval gates, audit logs, kill switches, and compliance reporting. Full operational control over every agent action.",
              href: "/governance",
            },
            {
              icon: Package,
              title: "Company Blueprints",
              desc: "Not single agents — full company operating systems. Org charts, budgets, OKRs, and execution playbooks. Deploy an entire business in one click.",
              href: "/blueprints",
            },
          ].map((f, i) => (
            <Link key={i} href={f.href}>
              <div className="card-minimal group h-full">
                <f.icon size={20} className="text-muted-foreground mb-4 group-hover:text-accent transition-colors" strokeWidth={1.5} />
                <h3 className="text-heading text-base text-foreground mb-2 group-hover:text-accent transition-colors">{f.title}</h3>
                <p className="text-muted-foreground text-sm text-body">{f.desc}</p>
                <div className="mt-5 flex items-center gap-1.5 text-muted-foreground group-hover:text-accent transition-colors">
                  <span className="text-xs font-medium">Explore</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Section 6: How It Works ───────────────────────────────── */}
      <div className="accent-line" />
      <section id="how-it-works" className="px-8 py-24 max-w-7xl mx-auto">
        <div className="mb-16 text-center">
          <p className="text-label mb-3">How It Works</p>
          <h2 className="text-heading text-3xl text-foreground">Four steps to deploying your agent workforce.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0">
          <HowItWorksStep
            step="01"
            title="Connect your tools"
            desc="Link your CRM, ad platforms, analytics, and data sources. OpenCommand pulls live context automatically — no manual data entry."
            detail="HubSpot, Salesforce, Meta Ads, Google Ads, GA4, and more."
            delay={0}
          />
          <HowItWorksStep
            step="02"
            title="Deploy your agents"
            desc="Choose from pre-built agent templates or configure your own. One click deploys a fully-wired agent with context, tools, and goals."
            detail="Sales, marketing, engineering, finance, and custom agents."
            delay={150}
          />
          <HowItWorksStep
            step="03"
            title="Set workplace goals"
            desc="Define OKRs across your agent fleet. Agents coordinate autonomously to hit targets — assigning tasks, managing budgets, and escalating when needed."
            detail="Multi-agent goal coordination with human-in-the-loop controls."
            delay={300}
          />
          <HowItWorksStep
            step="04"
            title="Receive verified outcomes"
            desc="Every completed task generates a verified receipt documenting what was done, what it cost, and what value it created."
            detail="Immutable audit trail. Full accountability. Zero ambiguity."
            delay={450}
          />
        </div>
      </section>

      {/* ─── Section 7: Blueprints — Not a Marketplace ─────────────── */}
      <div className="accent-line" />
      <section id="blueprints-section" className="px-8 py-24 max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <p className="text-label">Company Blueprints</p>
            <span className="text-[10px] font-medium tracking-wider uppercase px-2.5 py-0.5 rounded-full border border-accent/40 text-accent">Coming Soon</span>
          </div>
          <h2 className="text-heading text-3xl md:text-4xl text-foreground mb-5">Not agents. Entire companies.</h2>
          <p className="text-muted-foreground text-body max-w-2xl text-base">
            Every AI marketplace sells the same thing: single-task agents that do one job in isolation. Open Command sells something fundamentally different — <span className="text-foreground">complete company operating systems</span> you deploy in one click.
          </p>
        </div>

        {/* The core differentiator explanation */}
        <div className="card-minimal my-12 p-8 md:p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <p className="text-label text-[10px] mb-4">What others sell</p>
              <h3 className="text-heading text-lg text-muted-foreground/70 mb-3">Single agents, single tasks</h3>
              <p className="text-sm text-muted-foreground/60 text-body leading-relaxed">
                A chatbot that writes emails. A bot that posts to social media. An assistant that summarizes meetings. Each works alone, knows nothing about the others, and requires you to be the orchestrator connecting them all.
              </p>
            </div>
            <div>
              <p className="text-label text-[10px] mb-4">What Blueprints are</p>
              <h3 className="text-heading text-lg text-foreground mb-3">Full company operating systems</h3>
              <p className="text-sm text-muted-foreground text-body leading-relaxed">
                A Blueprint includes the complete agent org chart (CEO, CTO, CMO, CFO), pre-configured OKRs, budget allocations, execution playbooks, and governance rules. Deploy one and you get an entire autonomous operation — not a tool, but a <span className="text-foreground">workforce</span>.
              </p>
            </div>
          </div>
        </div>

        {/* 4-card differentiator grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          <BlueprintDiffCard
            icon={Layers}
            label="Scope"
            theirs="One agent, one task"
            ours="Full agent fleet with specialized roles working in parallel"
          />
          <BlueprintDiffCard
            icon={Globe}
            label="Context"
            theirs="Starts cold every session"
            ours="Self-contextualizes from your connected tools on deploy"
          />
          <BlueprintDiffCard
            icon={Users}
            label="Coordination"
            theirs="You connect the dots between agents"
            ours="Built-in orchestration layer coordinates all agents autonomously"
          />
          <BlueprintDiffCard
            icon={Lock}
            label="Accountability"
            theirs="No proof it worked"
            ours="Every task generates a verified Proof of Outcome receipt"
          />
        </div>

        {/* Example blueprint preview */}
        <div className="border border-border rounded-xl p-8 bg-white/[0.02] mb-10">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <p className="text-label text-[10px] mb-1">Example Blueprint</p>
              <h4 className="text-heading text-lg text-foreground">The Growth Machine</h4>
            </div>
            <span className="text-[10px] font-medium tracking-wider uppercase px-2.5 py-0.5 rounded-full border border-accent/40 text-accent">Preview</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { role: "CMO Agent", tasks: "Lead gen, content strategy, ad spend optimization" },
              { role: "SDR Agent", tasks: "Outbound sequences, pipeline qualification, follow-ups" },
              { role: "Analytics Agent", tasks: "Attribution modeling, funnel analysis, weekly reports" },
              { role: "CFO Agent", tasks: "Budget tracking, ROI calculations, spend approvals" },
            ].map((agent) => (
              <div key={agent.role} className="border-l border-border pl-4">
                <p className="text-xs font-medium text-foreground mb-1">{agent.role}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{agent.tasks}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-5 border-t border-border flex items-center gap-6 flex-wrap text-xs text-muted-foreground">
            <span>4 agents</span>
            <span>12 pre-configured OKRs</span>
            <span>Budget: $2,400/mo estimated</span>
            <span>Deploys in &lt;60 seconds</span>
          </div>
        </div>

        <div className="flex items-center gap-6 flex-wrap">
          <EmailCapture source="blueprints" />
          <Link href="/creators" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Build Blueprints as a Creator <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ─── Section 8: Free During Beta ─────────────────────────── */}
      <div className="accent-line" />
      <section className="px-8 py-24 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <p className="text-label">Pricing</p>
            <span className="text-[10px] font-medium tracking-wider uppercase px-2.5 py-0.5 rounded-full border border-emerald-400/40 text-emerald-400">Beta</span>
          </div>
          <h2 className="text-heading text-3xl md:text-4xl text-foreground mb-5">Free during beta. Full access.</h2>
          <p className="text-muted-foreground text-body mt-3 max-w-lg mx-auto">
            Every account gets full access to every feature — unlimited agents, full context engineering, Proof of Outcome receipts, and the complete self-contextualizing engine. No credit card. No tiers. No limits.
          </p>
        </div>

        <div className="border border-border rounded-xl p-8 md:p-10 bg-white/[0.02] max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-400/10 flex items-center justify-center">
              <Zap size={18} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-heading text-lg text-foreground">Full Access</h3>
              <p className="text-xs text-muted-foreground">Everything included. No restrictions.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {[
              "Unlimited commands",
              "Unlimited connected tools",
              "Unlimited agents",
              "Self-contextualizing engine",
              "Full PoO receipts",
              "All workspaces",
              "Company Blueprints (when live)",
              "No credit card required",
            ].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check size={13} className="text-emerald-400 shrink-0" />{f}
              </div>
            ))}
          </div>
          <div className="max-w-md mx-auto">
            <HeroEmailInput />
          </div>
          <p className="text-center text-xs text-muted-foreground/60 mt-4">
            Paid plans will be introduced later. Early users will be grandfathered.
          </p>
        </div>
      </section>

      {/* ─── Section 9: Bottom CTA ─────────────────────────────────── */}
      <div className="accent-line" />
      <section id="bottom-cta" className="px-8 py-24 text-center max-w-3xl mx-auto">
        <p className="text-label mb-4">Agent Operating System</p>
        <h2 className="text-heading text-3xl md:text-4xl text-foreground mb-5">Your company runs on agents. OpenCommand runs your agents.</h2>
        <p className="text-muted-foreground text-body mb-10 max-w-lg mx-auto">
          Connect your tools. Deploy your fleet. Set goals. Every outcome is verified, every action is audited, every dollar is accounted for.
        </p>
        <div className="flex flex-col items-center gap-4 max-w-md mx-auto w-full">
          <HeroEmailInput />
          <a href={getLoginUrl()} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Already have an account? Sign in <ArrowRight size={10} className="inline ml-0.5" />
          </a>
        </div>
      </section>

      {/* ─── Section 10: Footer ────────────────────────────────────── */}
      <div className="accent-line" />
      <footer className="px-8 py-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <span className="text-base text-foreground font-semibold tracking-tight">OpenCommand</span>
            <p className="text-xs text-muted-foreground mt-2">Agent Operating System</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Deploy, orchestrate, and govern AI agents at scale.</p>
          </div>

          {/* Product */}
          <div>
            <p className="text-label text-xs mb-4">Product</p>
            <div className="flex flex-col gap-2.5">
              <Link href="/intent-engine" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Intent Engine</Link>
              <Link href="/blueprints" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Blueprints</Link>
              <Link href="/integration-hub" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Integrations</Link>
              <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            </div>
          </div>

          {/* Company */}
          <div>
            <p className="text-label text-xs mb-4">Company</p>
            <div className="flex flex-col gap-2.5">
              <Link href="/creators" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Creators</Link>
              <span className="text-xs text-muted-foreground/40 cursor-default">About</span>
              <span className="text-xs text-muted-foreground/40 cursor-default">Blog</span>
            </div>
          </div>

          {/* Connect */}
          <div>
            <p className="text-label text-xs mb-4">Connect</p>
            <div className="flex flex-col gap-2.5">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Twitter / X</a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">LinkedIn</a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground/50">&copy; {new Date().getFullYear()} Open Command. All rights reserved.</span>
          <span className="text-xs text-muted-foreground/50">opencommand.co</span>
        </div>
      </footer>
    </div>
  );
}
