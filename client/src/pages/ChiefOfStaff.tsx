import { Link } from "wouter";
import { ArrowRight, Check, Brain, Layers, Zap, Clock, BarChart3, Globe, Shield, MessageSquare } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";

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

/* ─── Executive Persona Data ─────────────────────────────────────────── */
const EXECUTIVES = [
  {
    codename: "ARCH",
    role: "CEO",
    color: "#818CF8",
    horizon: "5-year",
    number: "5",
    domain: "Vision & Strategy",
    description: "Sets the strategic frame. Thinks about where your business is going, what markets to enter, what existential risks to watch.",
    example: "ARCH flagged a 5-year concern about electric equipment transition and identified 3 municipal RFPs requiring EV-capable equipment.",
  },
  {
    codename: "LEDGER",
    role: "CFO",
    color: "#34D399",
    horizon: "4-month",
    number: "4",
    domain: "Finance & Unit Economics",
    description: "Watches the numbers. Thinks about runway, margins, investment timing, and financial risk.",
    example: "LEDGER estimates a $200K retooling investment with 14-month payback, recommends phased rollout starting Q3.",
  },
  {
    codename: "SIGNAL",
    role: "CMO",
    color: "#FBBF24",
    horizon: "3-week",
    number: "3",
    domain: "Market & Competitive Intel",
    description: "Reads the market. Thinks about positioning, pipeline velocity, competitive moves, and customer signals.",
    example: "SIGNAL detected a competitor price change and recommends repositioning your mid-tier offering within 3 weeks.",
  },
  {
    codename: "FORGE",
    role: "CTO",
    color: "#F87171",
    horizon: "2-day",
    number: "2",
    domain: "Execution & Deployment",
    description: "Builds and ships. Thinks about technical feasibility, sprint capacity, and deployment risk.",
    example: "FORGE scoped a pilot program: 4 units, 2-day deployment window, $12K budget. Ready to execute on approval.",
  },
];

const SIGMA = {
  codename: "Σ",
  color: "#00D4AA",
  domain: "Highest-Leverage Move",
  description: "Synthesizes all four perspectives into one actionable recommendation — the single highest-leverage move you can make right now.",
};

/* ─── Animated Cascade Visualization ─────────────────────────────────── */
function CascadeVisualization() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % 6);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const nodes = [
    { label: "5", name: "ARCH", color: "#818CF8", sub: "5-year vision" },
    { label: "4", name: "LEDGER", color: "#34D399", sub: "4-month plan" },
    { label: "3", name: "SIGNAL", color: "#FBBF24", sub: "3-week sprint" },
    { label: "2", name: "FORGE", color: "#F87171", sub: "2-day ship" },
    { label: "1", name: "YOU", color: "#FFFFFF", sub: "Go / No-go" },
    { label: "Σ", name: "SIGMA", color: "#00D4AA", sub: "Highest leverage" },
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      {nodes.map((node, i) => (
        <div key={node.label} className="flex items-center gap-4">
          {/* Node */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold transition-all duration-500"
              style={{
                backgroundColor: activeIndex === i ? node.color : "transparent",
                border: `2px solid ${node.color}`,
                color: activeIndex === i ? "#000" : node.color,
                boxShadow: activeIndex === i ? `0 0 20px ${node.color}40` : "none",
                transform: activeIndex === i ? "scale(1.15)" : "scale(1)",
              }}
            >
              {node.label}
            </div>
            <div className="text-left">
              <div className="text-sm font-medium" style={{ color: node.color }}>{node.name}</div>
              <div className="text-xs text-muted-foreground">{node.sub}</div>
            </div>
          </div>
          {/* Arrow */}
          {i < nodes.length - 1 && (
            <div className="hidden" /> /* vertical spacing handled by gap */
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── How It Works Steps ─────────────────────────────────────────────── */
const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Connect your tools",
    description: "Link your CRM, analytics, ad platforms, and financials. We support HubSpot, Salesforce, Meta Ads, Google Analytics, Stripe, and more.",
    icon: Globe,
  },
  {
    step: "02",
    title: "Meet your executives",
    description: "Four AI executives interview you about your business — vision, finances, market, and operations. In 20 minutes, they know your context deeply.",
    icon: MessageSquare,
  },
  {
    step: "03",
    title: "Σ synthesizes everything",
    description: "Every perspective, every data source, every time horizon collapses into one recommendation — the single highest-leverage move you can make right now.",
    icon: Brain,
  },
  {
    step: "04",
    title: "Execute with receipts",
    description: "Approve the recommendation and your executives execute it. Every outcome generates a Proof of Outcome receipt — verifiable, auditable, real.",
    icon: Shield,
  },
];

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function ChiefOfStaff() {
  const { isAuthenticated } = useAuth();
  const howRef = useScrollReveal();
  const execRef = useScrollReveal();
  const cascadeRef = useScrollReveal();
  const pricingRef = useScrollReveal();
  const ctaRef = useScrollReveal();

  const handleGetStarted = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl("/onboarding/pro");
      return;
    }
    window.location.href = "/onboarding/pro";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-foreground rounded-sm flex items-center justify-center">
              <span className="text-background text-xs font-semibold">OC</span>
            </div>
            <span className="text-foreground text-sm font-medium tracking-wide">OpenCommand</span>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Home</Link>
          {isAuthenticated ? (
            <Link href="/mission-control"><Button size="sm">Mission Control</Button></Link>
          ) : (
            <a href={getLoginUrl("/onboarding/pro")}><Button size="sm">Sign In</Button></a>
          )}
        </div>
      </nav>

      {/* ─── Hero ──────────────────────────────────────────────────────── */}
      <section className="px-6 pt-24 pb-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-[10px] font-medium tracking-wider uppercase px-2.5 py-1 rounded-full border border-[#00D4AA]/40 text-[#00D4AA]">AI Chief of Staff</span>
              <span className="text-[10px] font-medium tracking-wider uppercase px-2.5 py-1 rounded-full border border-border text-muted-foreground">Beta</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-light text-foreground tracking-tight leading-[1.1] mb-6">
              Four executives.<br />
              <span className="text-muted-foreground">One highest-leverage move.</span>
            </h1>
            <p className="text-muted-foreground text-base max-w-lg mb-8 leading-relaxed">
              Your AI executive team analyzes every decision through four lenses — strategy, finance, market, and execution — then Σ synthesizes everything into the single most impactful action you can take right now.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Button size="lg" className="gap-2" onClick={handleGetStarted}>
                Meet Your Executives <ArrowRight size={16} />
              </Button>
              <a href="#how-it-works">
                <Button variant="outline" size="lg" className="gap-2">
                  See How It Works
                </Button>
              </a>
            </div>
            <p className="text-[11px] text-muted-foreground/50 mt-4">Free during beta. No credit card required. 20-minute setup.</p>
          </div>

          {/* Cascade Visualization */}
          <div className="flex justify-center">
            <div className="card-minimal p-8 rounded-2xl">
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-6 text-center">The 5-4-3-2-1-Σ Cascade</p>
              <CascadeVisualization />
            </div>
          </div>
        </div>
      </section>

      <div className="h-px bg-border" />

      {/* ─── The Problem ───────────────────────────────────────────────── */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">The Problem</p>
        <h2 className="text-4xl font-light text-foreground tracking-tight mb-6">
          You're the bottleneck.
        </h2>
        <p className="text-muted-foreground text-base max-w-3xl leading-relaxed mb-12">
          Every decision passes through you. Strategy, finances, marketing, operations — you context-switch between all of them, making each decision with incomplete information. Your CRM says one thing. Your analytics say another. Your gut says a third. By the time you decide, the window has moved.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { stat: "23", unit: "hrs/week", label: "Average time operators spend on strategic decisions", icon: Clock },
            { stat: "4.2", unit: "tools", label: "Average number of dashboards checked before each decision", icon: BarChart3 },
            { stat: "67%", unit: "", label: "Of decisions are made with incomplete cross-functional context", icon: Layers },
          ].map((item, i) => (
            <div key={i} className="card-minimal p-6">
              <item.icon size={18} className="text-muted-foreground mb-4" />
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-light text-foreground">{item.stat}</span>
                {item.unit && <span className="text-sm text-muted-foreground">{item.unit}</span>}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-border" />

      {/* ─── The Executives ────────────────────────────────────────────── */}
      <section ref={execRef} id="executives" className="px-6 py-20 max-w-6xl mx-auto reveal-section">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">Your Executive Team</p>
        <h2 className="text-4xl font-light text-foreground tracking-tight mb-4">
          Four minds. Four time horizons.
        </h2>
        <p className="text-muted-foreground text-base max-w-3xl mb-12 leading-relaxed">
          Each executive is a full-spectrum thinker in their domain. They interview you during onboarding, learn your context, connect to your tools, and then work continuously — analyzing, recommending, and executing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {EXECUTIVES.map((exec) => (
            <div key={exec.codename} className="card-minimal p-6 group hover:border-foreground/20 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: `${exec.color}20`, color: exec.color, border: `1.5px solid ${exec.color}40` }}
                >
                  {exec.number}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: exec.color }}>{exec.codename}</span>
                    <span className="text-xs text-muted-foreground">· {exec.role}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{exec.horizon} horizon · {exec.domain}</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{exec.description}</p>
              <div className="text-xs text-foreground/60 bg-white/[0.03] rounded-lg p-3 border border-border/50">
                <span className="text-[10px] tracking-widest uppercase text-muted-foreground/60">Example output</span>
                <p className="mt-1">{exec.example}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sigma Card */}
        <div className="card-minimal p-6 border-[#00D4AA]/20">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
              style={{ backgroundColor: "#00D4AA20", color: "#00D4AA", border: "1.5px solid #00D4AA40" }}
            >
              Σ
            </div>
            <div>
              <span className="text-sm font-medium text-[#00D4AA]">Σ — The Synthesis</span>
              <div className="text-xs text-muted-foreground">{SIGMA.domain}</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{SIGMA.description}</p>
        </div>
      </section>

      <div className="h-px bg-border" />

      {/* ─── The Cascade ───────────────────────────────────────────────── */}
      <section ref={cascadeRef} className="px-6 py-20 max-w-5xl mx-auto reveal-section">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">The 5-4-3-2-1-Σ Cascade</p>
        <h2 className="text-4xl font-light text-foreground tracking-tight mb-4">
          Every decision, every angle, one answer.
        </h2>
        <p className="text-muted-foreground text-base max-w-3xl mb-12 leading-relaxed">
          When you ask a question, all four executives think together in sequence — each locked to a specific time horizon. Then Σ collapses everything into one move.
        </p>

        <div className="card-minimal p-8 mb-8">
          <p className="text-xs text-muted-foreground tracking-widest uppercase mb-6">Example: "Should we expand into the Denver market?"</p>
          <div className="space-y-4">
            {[
              { num: "5", name: "ARCH", color: "#818CF8", response: "Denver aligns with our 5-year Western expansion thesis. Market size: $340M. Two incumbents, neither with our tech advantage." },
              { num: "4", name: "LEDGER", color: "#34D399", response: "We can fund a Denver pilot from Q3 reserves. $85K initial investment, breakeven at month 6 with 12 accounts." },
              { num: "3", name: "SIGNAL", color: "#FBBF24", response: "Denver construction permits up 23% YoY. Two competitors pulled back marketing spend. Window is 3 weeks before ConExpo." },
              { num: "2", name: "FORGE", color: "#F87171", response: "Denver office setup: 2-day timeline. CRM territory configured, local number ported, first 5 outbound sequences ready." },
              { num: "1", name: "YOU", color: "#FFFFFF", response: "Review all perspectives. Go / No-go / Modify." },
              { num: "Σ", name: "SIGMA", color: "#00D4AA", response: "Launch Denver pilot now. The market window, financial runway, and execution readiness all converge this week. Delay costs $40K in lost first-mover advantage." },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${step.color}20`, color: step.color, border: `1.5px solid ${step.color}40` }}
                >
                  {step.num}
                </div>
                <div>
                  <span className="text-xs font-medium" style={{ color: step.color }}>{step.name}</span>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{step.response}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-px bg-border" />

      {/* ─── How It Works ──────────────────────────────────────────────── */}
      <section ref={howRef} id="how-it-works" className="px-6 py-20 max-w-5xl mx-auto reveal-section">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">How It Works</p>
        <h2 className="text-4xl font-light text-foreground tracking-tight mb-12">
          20 minutes to your AI executive team.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.step} className="card-minimal p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center">
                  <step.icon size={16} className="text-muted-foreground" />
                </div>
                <span className="text-xs text-muted-foreground font-mono">{step.step}</span>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-border" />

      {/* ─── What You Get ──────────────────────────────────────────────── */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">Capabilities</p>
        <h2 className="text-4xl font-light text-foreground tracking-tight mb-12">
          Not another dashboard. A team.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: "Morning Briefings", desc: "Every morning, your executives brief you on what happened overnight. Items are attributed to the executive who flagged them — not a generic notification feed.", icon: Clock },
            { title: "Individual Chat", desc: "Talk one-on-one with any executive. Full-spectrum thinking — all context, all time horizons, all data sources. Like having a world-class advisor on speed dial.", icon: MessageSquare },
            { title: "The Cascade", desc: "On-demand multi-horizon analysis. All four executives think together in sequence, then Σ synthesizes the answer. For decisions that need every angle.", icon: Layers },
            { title: "Website Intelligence", desc: "We audit your website during onboarding — SEO, tech stack, social presence, content analysis — and feed it directly into your executives' context.", icon: Globe },
            { title: "Tool Integration", desc: "Connect HubSpot, Salesforce, Meta Ads, Google Analytics, Stripe, and more. Your executives pull live data from every connected tool.", icon: BarChart3 },
            { title: "Proof of Outcome", desc: "Every action generates a verifiable receipt. What was recommended, what was approved, what happened. Full audit trail.", icon: Shield },
          ].map((cap, i) => (
            <div key={i} className="card-minimal p-5">
              <cap.icon size={16} className="text-muted-foreground mb-3" />
              <h3 className="text-sm font-medium text-foreground mb-1.5">{cap.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{cap.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-border" />

      {/* ─── Pricing ───────────────────────────────────────────────────── */}
      <section ref={pricingRef} id="pricing" className="px-6 py-20 max-w-5xl mx-auto reveal-section">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">Pricing</p>
        <h2 className="text-4xl font-light text-foreground tracking-tight mb-4">
          Free during beta. Full access.
        </h2>
        <p className="text-muted-foreground text-base max-w-2xl mb-12 leading-relaxed">
          Every account gets unrestricted access to all four executives, Σ synthesis, tool integrations, and morning briefings. No credit card required.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
          {/* Free */}
          <div className="card-minimal p-8 border-[#00D4AA]/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-[#00D4AA] tracking-widest uppercase font-medium">Beta</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-light text-foreground">$0</span>
              <span className="text-sm text-muted-foreground">/mo</span>
            </div>
            <p className="text-xs text-muted-foreground mb-6">Full access during beta</p>
            <div className="space-y-2.5 mb-8">
              {[
                "All 4 executives + Σ synthesis",
                "Unlimited cascade runs",
                "Morning briefings",
                "Individual executive chat",
                "Tool integrations",
                "Website intelligence audit",
                "Proof of Outcome receipts",
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Check size={13} className="text-[#00D4AA] shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <Button className="w-full gap-2" onClick={handleGetStarted}>
              Get Started Free <ArrowRight size={14} />
            </Button>
          </div>

          {/* Future Pro */}
          <div className="card-minimal p-8 opacity-60">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase font-medium">Coming Soon</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-light text-foreground">Pro</span>
            </div>
            <p className="text-xs text-muted-foreground mb-6">For teams and power users</p>
            <div className="space-y-2.5 mb-8">
              {[
                "Everything in Free",
                "Priority compute (deeper briefings)",
                "Advanced integrations",
                "Team collaboration",
                "Custom executive personas",
                "API access",
                "Dedicated support",
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Check size={13} className="text-muted-foreground/40 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
          </div>
        </div>
      </section>

      <div className="h-px bg-border" />

      {/* ─── Final CTA ─────────────────────────────────────────────────── */}
      <section ref={ctaRef} className="px-6 py-24 text-center max-w-3xl mx-auto reveal-section">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6"
          style={{ backgroundColor: "#00D4AA20", color: "#00D4AA", border: "2px solid #00D4AA40" }}
        >
          Σ
        </div>
        <h2 className="text-4xl font-light text-foreground tracking-tight mb-4">
          Meet the team that never sleeps.
        </h2>
        <p className="text-muted-foreground text-base mb-8 leading-relaxed max-w-xl mx-auto">
          In 20 minutes, four AI executives will know your business, your numbers, your market, and your stack. From that point forward, every decision comes with the full picture.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
          <Button size="lg" className="gap-2" onClick={handleGetStarted}>
            Start Executive Onboarding <ArrowRight size={16} />
          </Button>
          <Link href="/quick-start">
            <Button size="lg" variant="outline" className="gap-2 border-[#00D4AA]/30 text-[#00D4AA] hover:bg-[#00D4AA]/10">
              <Zap size={14} /> Quick Start (60 seconds)
            </Button>
          </Link>
        </div>
        <p className="text-[11px] text-muted-foreground/50 mt-4">Free during beta · No credit card · Quick Start needs only your website URL</p>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────────── */}
      <div className="h-px bg-border" />
      <footer className="px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-foreground rounded-sm flex items-center justify-center">
            <span className="text-background text-[8px] font-semibold">OC</span>
          </div>
          <span className="text-xs text-muted-foreground">OpenCommand</span>
        </div>
        <div className="text-xs text-muted-foreground">AI Chief of Staff &middot; {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
