import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import {
  ArrowRight, Check, RefreshCw, Layers, Cpu, Shield,
  BarChart3, GitBranch, Users, Zap, Play, ChevronRight,
} from "lucide-react";
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
        <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
          <Check size={14} className="text-accent" />
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
          <>Get Access <ArrowRight size={14} /></>
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
      sessionStorage.setItem("oc_signup_email", data.email ?? "");
      toast.success("You're on the list.");
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
            placeholder="your@email.com"
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
            <>Get Access <ArrowRight size={16} /></>
          )}
        </button>
      </form>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      <p className="text-xs text-muted-foreground/50 mt-3">Free during beta. No credit card required.</p>
    </div>
  );
}

/* ─── Animated Deploy → HITL Loop Demo ───────────────────────────────── */
function DemoLoop() {
  const [step, setStep] = useState(0);
  const steps = [
    { label: "Blueprint deployed", icon: Play, color: "text-accent", bg: "bg-accent/10" },
    { label: "Agent running task", icon: Cpu, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "HITL checkpoint reached", icon: Users, color: "text-amber-400", bg: "bg-amber-400/10" },
    { label: "Approved — continuing", icon: Check, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Outcome verified", icon: Shield, color: "text-accent", bg: "bg-accent/10" },
  ];

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-3 max-w-sm w-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">Live execution</span>
      </div>
      {steps.map((s, i) => {
        const Icon = s.icon;
        const isActive = i === step;
        const isPast = i < step;
        return (
          <div
            key={i}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-500 ${
              isActive ? `${s.bg} border border-border` : "opacity-30"
            }`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isActive ? s.bg : "bg-muted"}`}>
              <Icon size={13} className={isActive ? s.color : "text-muted-foreground"} />
            </div>
            <span className={`text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
              {s.label}
            </span>
            {isPast && <Check size={11} className="text-green-400 ml-auto shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  HOME PAGE                                                             */
/* ═══════════════════════════════════════════════════════════════════════ */

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>{`
        .hero-label {
          opacity: 0;
          transform: translateY(8px);
          animation: heroFadeUp 0.4s ease 0.1s forwards;
        }
        .hero-h1 {
          opacity: 0;
          transform: translateY(12px);
          animation: heroFadeUp 0.5s ease 0.2s forwards;
        }
        .hero-sub {
          opacity: 0;
          transform: translateY(12px);
          animation: heroFadeUp 0.5s ease 0.35s forwards;
        }
        .hero-cta {
          opacity: 0;
          transform: translateY(8px);
          animation: heroFadeUp 0.4s ease 0.5s forwards;
        }
        .hero-demo {
          opacity: 0;
          transform: translateY(16px);
          animation: heroFadeUp 0.6s ease 0.65s forwards;
        }
        @keyframes heroFadeUp {
          to { opacity: 1; transform: translateY(0); }
        }
        .reveal-section {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      {/* ─── Navigation ─────────────────────────────────────────────── */}
      <nav className="px-6 md:px-8 py-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-semibold text-foreground text-lg tracking-tight hover:opacity-80 transition-opacity">
            OpenCommand
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/blueprints" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Blueprints
            </Link>
            {isAuthenticated ? (
              <Link href="/dashboard" className="btn-primary text-sm px-4 py-2">
                Dashboard →
              </Link>
            ) : (
              <>
                <a href={getLoginUrl("/dashboard")} className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                  Log in
                </a>
                <a
                  href={getLoginUrl("/dashboard")}
                  className="btn-primary text-sm px-4 py-2"
                >
                  Sign up free
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-8 pt-16 pb-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy + CTA */}
          <div>
            <p className="hero-label text-label mb-5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-accent border border-accent/30 bg-accent/5 px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse inline-block" />
                Beta · Free access
              </span>
            </p>
            <h1 className="hero-h1 text-4xl md:text-5xl lg:text-[3.25rem] font-semibold text-foreground leading-[1.1] tracking-tight mb-6">
              Deploy agents.<br />
              Set goals.<br />
              Verify outcomes.
            </h1>
            <p className="hero-sub text-muted-foreground text-lg leading-relaxed max-w-lg mb-10">
              OpenCommand orchestrates your AI agents across every function — routing tasks to the right model, enforcing human checkpoints, and proving what was done.
            </p>
            <div className="hero-cta space-y-4">
              {!isAuthenticated ? (
                <>
                  <a
                    href={getLoginUrl("/dashboard")}
                    className="btn-primary inline-flex items-center gap-2 px-8 py-4 text-base"
                  >
                    Start building free <ArrowRight size={16} />
                  </a>
                  <p className="text-xs text-muted-foreground/50">No credit card required. Free during beta.</p>
                </>
              ) : (
                <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2 px-8 py-4 text-base">
                  Go to dashboard <ArrowRight size={16} />
                </Link>
              )}
            </div>

            {/* Social proof row */}
            <div className="hero-cta mt-8 flex items-center gap-4 flex-wrap">
              {[
                "Visual blueprint builder",
                "11 LLM models",
                "Human-in-the-loop",
              ].map((tag) => (
                <span key={tag} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Check size={11} className="text-accent" />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right: animated demo loop */}
          <div className="hero-demo flex justify-center lg:justify-end">
            <DemoLoop />
          </div>
        </div>
      </section>

      {/* ─── Capabilities ─────────────────────────────────────────────── */}
      <div className="accent-line" />
      <section className="px-6 md:px-8 py-24 max-w-6xl mx-auto">
        <p className="text-label mb-4">What's inside</p>
        <h2 className="text-heading text-2xl md:text-3xl text-foreground mb-12">Everything you need to run agents at scale.</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-lg overflow-hidden border border-border">
          {[
            {
              icon: Layers,
              title: "Blueprint Engine",
              desc: "Visual workflow builder. Drag, connect, deploy. No code required.",
            },
            {
              icon: Cpu,
              title: "Dynamic Model Routing",
              desc: "11 models. Tasks route to the best one automatically based on cost, speed, and capability.",
            },
            {
              icon: Users,
              title: "Human-in-the-Loop",
              desc: "Approval gates at any step. Agents propose, humans decide — with a single swipe.",
            },
            {
              icon: BarChart3,
              title: "Model Performance",
              desc: "Track cost, latency, and quality across every model. Compare. Optimize.",
            },
            {
              icon: Shield,
              title: "Verification Layer",
              desc: "Every agent output is verified by a second model. Or a council of three. Your call.",
            },
            {
              icon: GitBranch,
              title: "Execution Engine",
              desc: "Parallel task execution with dependency resolution, retry logic, and full audit logs.",
            },
          ].map((f, i) => (
            <div key={i} className="bg-card p-8 group">
              <f.icon size={18} className="text-muted-foreground mb-5 group-hover:text-accent transition-colors" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────────────── */}
      <div className="accent-line" />
      <section className="px-6 md:px-8 py-24 max-w-4xl mx-auto">
        <p className="text-label mb-4">How it works</p>
        <h2 className="text-heading text-2xl md:text-3xl text-foreground mb-16">From intent to execution in three steps.</h2>
        <div className="space-y-12">
          {[
            {
              step: "01",
              title: "Describe your goal to Σ",
              desc: "The Σ Intent Engine interviews you, then generates a fully editable multi-agent blueprint — complete with workflows, verification layers, and human checkpoints.",
              cta: { label: "Open Σ", href: "/intent-engine" },
            },
            {
              step: "02",
              title: "Build your blueprint visually",
              desc: "Drag nodes onto the canvas. Assign models to each agent. Set verification requirements. Add HITL checkpoints where you want human oversight.",
              cta: { label: "Browse templates", href: "/blueprints" },
            },
            {
              step: "03",
              title: "Deploy, approve, verify",
              desc: "Agents run with real LLM calls. Every decision is logged. HITL checkpoints surface as swipe cards. You approve or dismiss in one tap.",
              cta: { label: "See execution", href: "/execution" },
            },
          ].map((s) => {
            const ref = useScrollReveal();
            return (
              <div key={s.step} ref={ref} className="reveal-section flex gap-6 sm:gap-10 items-start">
                <span className="text-3xl font-semibold text-border select-none shrink-0 w-10 sm:w-12">{s.step}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">{s.desc}</p>
                  {isAuthenticated && (
                    <Link href={s.cta.href} className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                      {s.cta.label} <ChevronRight size={11} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Beta Pricing Banner ──────────────────────────────────────── */}
      <div className="accent-line" />
      <section className="px-6 md:px-8 py-16 max-w-4xl mx-auto">
        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-accent" />
              <span className="text-xs font-semibold text-accent uppercase tracking-widest">Beta access</span>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-1">Free while we're in beta.</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Full platform access, all 11 models, unlimited blueprints. Pricing will be announced before general availability.
            </p>
          </div>
          {!isAuthenticated && (
            <a
              href={getLoginUrl("/dashboard")}
              className="btn-primary inline-flex items-center gap-2 px-6 py-3 whitespace-nowrap shrink-0"
            >
              Claim free access <ArrowRight size={14} />
            </a>
          )}
        </div>
      </section>

      {/* ─── Bottom CTA ───────────────────────────────────────────────── */}
      <div className="accent-line" />
      <section className="px-6 md:px-8 py-24 max-w-3xl mx-auto text-center">
        <h2 className="text-heading text-2xl md:text-3xl text-foreground mb-5">
          Ready to orchestrate?
        </h2>
        <p className="text-muted-foreground mb-10 max-w-lg mx-auto">
          Join operators using OpenCommand to deploy, monitor, and govern their AI agent fleet.
        </p>
        <div className="flex flex-col items-center gap-4 max-w-md mx-auto w-full">
          <EmailCapture source="bottom-cta" />
          <a href={getLoginUrl("/dashboard")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Already have an account? Sign in <ArrowRight size={10} className="inline ml-0.5" />
          </a>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <div className="accent-line" />
      <footer className="px-6 md:px-8 py-12 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-foreground font-semibold tracking-tight">OpenCommand</span>
          <div className="flex items-center gap-6">
            <Link href="/blueprints" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Blueprints</Link>
            <Link href="/creators" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Creators</Link>
            <a href="https://twitter.com/opencommand" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Twitter</a>
          </div>
          <span className="text-xs text-muted-foreground/50">&copy; {new Date().getFullYear()} Open Command</span>
        </div>
      </footer>
    </div>
  );
}
