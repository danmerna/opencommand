import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { ArrowRight, Target, BarChart3, Bot, Cpu, Shield, Package, Check, Zap, Star, Menu, X, RefreshCw, Layers, Users, Globe, Lock } from "lucide-react";
import { ContextEngineHero } from "@/components/ContextEngineHero";
import { useEffect, useRef, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

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

/* ─── Typewriter Hook ─────────────────────────────────────────────────── */
function useTypewriter(text: string, speed = 45, startDelay = 0) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const delayTimer = setTimeout(() => setStarted(true), startDelay);
    return () => clearTimeout(delayTimer);
  }, [startDelay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    setDisplayed("");
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [started, text, speed]);

  return { displayed, done, started };
}

/* ─── Context Engine Demo ─────────────────────────────────────────────── */
function ContextEngineDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

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
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const typewriter = useTypewriter("I want more leads", 55, inView ? 400 : 99999);

  const steps = [
    { text: "Connecting to HubSpot...", delay: 1800 },
    { text: "Reading pipeline: 47 deals, $847K value", delay: 2600 },
    { text: "Analyzing closed deals: 80% manufacturing", delay: 3400 },
    { text: "Context assembled in 3.2s", delay: 4200 },
  ];

  const contextCardDelay = 5000;
  const responseDelay = 5800;

  return (
    <div ref={ref} className="max-w-3xl mx-auto">
      {/* Terminal-style container */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-black/40">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          <span className="ml-3 text-xs text-muted-foreground font-mono">intent-engine</span>
        </div>

        <div className="p-6 md:p-8 space-y-5">
          {/* Step 1: User input */}
          <div className="flex items-start gap-3">
            <span className="text-accent font-mono text-sm mt-0.5 shrink-0">&gt;_</span>
            <div className="font-mono text-sm text-foreground">
              {typewriter.displayed}
              {!typewriter.done && typewriter.started && (
                <span className="animate-blink text-accent">|</span>
              )}
            </div>
          </div>

          {/* Step 2: Status indicators */}
          {inView && steps.map((step, i) => (
            <StatusLine key={i} text={step.text} delay={step.delay} />
          ))}

          {/* Step 3: Context card */}
          {inView && <ContextCard delay={contextCardDelay} />}

          {/* Step 4: AI response */}
          {inView && <AIResponse delay={responseDelay} />}
        </div>
      </div>

      {/* Tagline below demo */}
      <p className="text-center mt-8 text-sm italic" style={{ color: "oklch(0.78 0.06 80)" }}>
        The intent engine doesn't ask you for context. It goes and gets it.
      </p>
    </div>
  );
}

function StatusLine({ text, delay }: { text: string; delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  if (!visible) return null;
  return (
    <div className="flex items-center gap-2 pl-7 animate-fade-in">
      <span className="text-emerald-400 text-xs">→</span>
      <span className="font-mono text-xs text-muted-foreground">{text}</span>
    </div>
  );
}

function ContextCard({ delay }: { delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  if (!visible) return null;
  return (
    <div className="ml-7 animate-fade-in rounded-lg border border-border bg-black/30 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span className="text-xs font-medium text-foreground">Context from HubSpot</span>
      </div>
      <p className="text-xs text-muted-foreground font-mono">
        142 contacts · 47 deals · $847K pipeline · 12 closed last month
      </p>
    </div>
  );
}

function AIResponse({ delay }: { delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  if (!visible) return null;
  return (
    <div className="ml-7 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <Bot size={14} className="text-accent" />
        <span className="text-xs font-medium text-accent">Arch</span>
      </div>
      <p className="text-sm text-foreground/90 leading-relaxed">
        Your pipeline is <span className="text-foreground font-medium">$847K across 47 deals</span>. 80% of your closed deals last month came from manufacturing at $18K avg. Should we <span className="text-foreground font-medium">double down on that segment</span>, or are you looking to diversify?
      </p>
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

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection("how-it-works")} className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </button>
            <Link href="/blueprints" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              Blueprints
            </Link>
            <Link href="/creators" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              Creators
            </Link>
            {isAuthenticated ? (
              hasCompany ? (
                <Link href="/mission-control" className="btn-primary text-[13px] px-5 py-2">
                  Mission Control
                </Link>
              ) : (
                <Link href="/onboarding/pro" className="btn-primary text-[13px] px-5 py-2">
                  Build Your Team
                </Link>
              )
            ) : (
              <button onClick={() => scrollToSection("bottom-cta")} className="btn-primary text-[13px] px-5 py-2">
                Start Free
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="mobile-menu-enter md:hidden mt-4 pb-4 border-t border-border pt-4 flex flex-col gap-4">
            <button onClick={() => scrollToSection("how-it-works")} className="text-[13px] text-muted-foreground hover:text-foreground transition-colors text-left">
              How It Works
            </button>
            <Link href="/blueprints" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
              Blueprints
            </Link>
            <Link href="/creators" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
              Creators
            </Link>
            <div className="pt-2">
              {isAuthenticated ? (
                hasCompany ? (
                  <Link href="/mission-control" className="btn-primary text-[13px] px-5 py-2 inline-block" onClick={() => setMobileMenuOpen(false)}>
                    Mission Control
                  </Link>
                ) : (
                  <Link href="/onboarding/pro" className="btn-primary text-[13px] px-5 py-2 inline-block" onClick={() => setMobileMenuOpen(false)}>
                    Build Your Team
                  </Link>
                )
              ) : (
                <button onClick={() => scrollToSection("bottom-cta")} className="btn-primary text-[13px] px-5 py-2">
                  Start Free
                </button>
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
            <p className="hero-label text-label mb-6">Personal Intelligence Engine</p>
            <h1 className="hero-h1 text-display text-5xl lg:text-[4.5rem] text-foreground leading-none mb-8">
              Deploy your<br />
              <span className="text-muted-foreground">zero-human workforce.</span>
            </h1>
            <p className="hero-sub text-muted-foreground text-lg text-body max-w-xl mb-12">
              Open Command connects to your tools, builds its own context, and executes work autonomously — delivering a verified receipt for every outcome. The intent engine that context-engineers itself.
            </p>
            <div className="hero-cta flex items-center gap-4 flex-wrap">
              {isAuthenticated ? (
                hasCompany ? (
                  <Link href="/mission-control" className="btn-primary flex items-center gap-2 px-7 py-3">
                    Enter Mission Control <ArrowRight size={16} />
                  </Link>
                ) : (
                  <Link href="/onboarding/pro" className="btn-primary flex items-center gap-2 px-7 py-3">
                    Start Executive Onboarding <ArrowRight size={16} />
                  </Link>
                )
              ) : (
                <button onClick={() => scrollToSection("bottom-cta")} className="btn-primary flex items-center gap-2 px-7 py-3">
                  Start Free — Build Your Executive Team <ArrowRight size={16} />
                </button>
              )}
              <button onClick={() => scrollToSection("how-it-works")} className="btn-outline px-7 py-3">
                See How It Works
              </button>
            </div>
          </div>

          {/* Right: Animated Context Engine Illustration */}
          <div className="hidden lg:block">
            <ContextEngineHero />
          </div>
        </div>
      </section>

      {/* ─── Section 3: Context Engine Demo ────────────────────────── */}
      <div className="accent-line" />
      <section className="px-8 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-label mb-3">The Magic Moment</p>
          <h2 className="text-heading text-2xl md:text-3xl text-foreground">
            Other AI tools start cold. Open Command starts informed.
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
          <h2 className="text-heading text-3xl text-foreground">Everything you need to command outcomes.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: Cpu,
              title: "Intent Engine",
              desc: "Connects to your CRM, ad platforms, and analytics. Pulls live data before asking its first question. Every command starts with full context.",
              href: "/intent-engine",
            },
            {
              icon: Bot,
              title: "AI CEO — Arch",
              desc: "Your AI CEO deploys agents, tracks OKRs, and makes decisions. Compounds intelligence over time as it learns your business.",
              href: "/ai-ceo",
            },
            {
              icon: BarChart3,
              title: "Mission Control",
              desc: "Real-time OKR tracking, agent fleet monitoring, human-in-the-loop inbox, and PoO ledger.",
              href: "/mission-control",
            },
            {
              icon: Target,
              title: "Proof of Outcome",
              desc: "Every task generates a verifiable receipt documenting labor saved and dollar value created.",
              href: "/mission-control",
            },
            {
              icon: Shield,
              title: "Governance",
              desc: "Approval gates, audit logs, kill switches, and compliance reporting for full operational control.",
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
          <h2 className="text-heading text-3xl text-foreground">Four steps to autonomous execution.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0">
          <HowItWorksStep
            step="01"
            title="State your intent"
            desc="Tell Open Command what you want to achieve. No prompt engineering required — just describe the outcome."
            detail="The intent engine asks focused questions to structure your goal."
            delay={0}
          />
          <HowItWorksStep
            step="02"
            title="We pull your context"
            desc="The intent engine connects to your tools and builds its own context. No copy-pasting. No manual data entry. Real data, real time."
            detail="Pipeline, ad spend, analytics — pulled and analyzed automatically."
            delay={150}
          />
          <HowItWorksStep
            step="03"
            title="Your workforce executes"
            desc="Arch, your AI CEO, deploys the right agents, assigns tasks, and orchestrates execution across your entire operation."
            detail="CEO, CTO, CMO, CFO — your full executive suite running in parallel."
            delay={300}
          />
          <HowItWorksStep
            step="04"
            title="Proof of Outcome"
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
            ours="Full org chart with executive agents working in parallel"
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
            ours="Arch (AI CEO) orchestrates all agents autonomously"
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
          <button onClick={() => scrollToSection("bottom-cta")} className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm">
            Join the Waitlist <ArrowRight size={14} />
          </button>
          <Link href="/creators" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Build Blueprints as a Creator <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ─── Section 8: Social Proof ──────────────────────────────── */}
      <div className="accent-line" />
      <section className="px-8 py-24 max-w-7xl mx-auto">
        <div className="mb-16 text-center">
          <p className="text-label mb-3">Early Adopters</p>
          <h2 className="text-heading text-3xl text-foreground">What beta users are saying.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              quote: "I connected HubSpot and within 60 seconds, the CMO agent knew more about my pipeline than my last marketing hire did after two weeks. The self-contextualization is the real differentiator here.",
              name: "Marcus Chen",
              role: "Founder & CEO",
              company: "Meridian Growth",
              metric: "3x pipeline visibility in first session",
            },
            {
              quote: "We were spending $4K/month on a fractional CFO who mostly just asked us for spreadsheets. The CFO agent pulled everything from Stripe and QuickBooks on its own and gave us a clearer financial picture on day one.",
              name: "Sarah Okonkwo",
              role: "Co-founder",
              company: "Luma Commerce",
              metric: "Replaced $4K/mo fractional CFO",
            },
            {
              quote: "The Proof of Outcome receipts changed how I think about AI tools. Every other platform is a black box — Open Command shows me exactly what happened, what it cost, and what value it created. That's accountability.",
              name: "David Reeves",
              role: "Head of Operations",
              company: "Northline Logistics",
              metric: "Full audit trail from day one",
            },
          ].map((t, i) => {
            const ref = useScrollReveal();
            return (
              <div
                key={i}
                ref={ref}
                className="reveal-step card-minimal flex flex-col justify-between"
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div>
                  <div className="flex gap-1 mb-5">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} size={13} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground/90 text-body leading-relaxed mb-6">
                    "{t.quote}"
                  </p>
                </div>
                <div>
                  <div className="border-t border-border pt-5 mb-3">
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}, {t.company}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-emerald-400 font-medium">{t.metric}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Section 9: Free During Beta ─────────────────────────── */}
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
          <button onClick={() => scrollToSection("bottom-cta")} className="btn-primary text-center text-sm py-3 w-full">
            Get Started — It's Free <ArrowRight size={14} className="inline ml-1" />
          </button>
          <p className="text-center text-xs text-muted-foreground/60 mt-4">
            Paid plans will be introduced later. Early users will be grandfathered.
          </p>
        </div>
      </section>

      {/* ─── Section 9: Bottom CTA ─────────────────────────────────── */}
      <div className="accent-line" />
      <section id="bottom-cta" className="px-8 py-24 text-center max-w-3xl mx-auto">
        <p className="text-label mb-4">Personal Intelligence Engine</p>
        <h2 className="text-heading text-3xl md:text-4xl text-foreground mb-5">Deploy your zero-human workforce.</h2>
        <p className="text-muted-foreground text-body mb-10 max-w-lg mx-auto">
          Connect your tools. State your intent. Arch handles execution. You get a receipt proving what it accomplished.
        </p>
        <div className="flex flex-col items-center gap-4">
          <EmailCapture source="homepage-bottom" />
          <p className="text-xs text-muted-foreground">
            Free during beta. Full access. No credit card required.
          </p>
          {isAuthenticated ? (
            hasCompany ? (
              <Link href="/mission-control" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Go to Mission Control <ArrowRight size={10} className="inline ml-0.5" />
              </Link>
            ) : (
              <Link href="/onboarding/pro" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Start Executive Onboarding <ArrowRight size={10} className="inline ml-0.5" />
              </Link>
            )
          ) : (
            <a href={getLoginUrl()} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Already have an account? Sign in <ArrowRight size={10} className="inline ml-0.5" />
            </a>
          )}
        </div>
      </section>

      {/* ─── Section 10: Footer ────────────────────────────────────── */}
      <div className="accent-line" />
      <footer className="px-8 py-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <span className="text-base text-foreground font-semibold tracking-tight">OpenCommand</span>
            <p className="text-xs text-muted-foreground mt-2">Personal Intelligence Engine</p>
            <p className="text-xs text-muted-foreground/60 mt-1">From idea to verified outcome.</p>
          </div>

          {/* Product */}
          <div>
            <p className="text-label text-xs mb-4">Product</p>
            <div className="flex flex-col gap-2.5">
              <Link href="/intent-engine" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Intent Engine</Link>
              <Link href="/blueprints" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Blueprints</Link>
              <Link href="/blueprints" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Blueprints</Link>
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
