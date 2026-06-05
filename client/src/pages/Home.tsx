import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { ArrowRight, Check, RefreshCw, Layers, Cpu, Shield, BarChart3, GitBranch, Users } from "lucide-react";
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

/* ═══════════════════════════════════════════════════════════════════════ */
/*  HOME PAGE                                                             */
/* ═══════════════════════════════════════════════════════════════════════ */

export default function Home() {
  const { isAuthenticated } = useAuth();
  const companiesQ = trpc.companies.list.useQuery(undefined, { enabled: isAuthenticated });
  const hasCompany = (companiesQ.data?.length ?? 0) > 0;

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
        @keyframes heroFadeUp {
          to { opacity: 1; transform: translateY(0); }
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
      <section className="px-6 md:px-8 pt-24 pb-20 max-w-3xl mx-auto">
        <p className="hero-label text-label mb-6">The orchestration layer</p>
        <h1 className="hero-h1 text-display text-4xl md:text-5xl lg:text-6xl text-foreground mb-8">
          Deploy agents.<br />
          Set goals.<br />
          Verify outcomes.
        </h1>
        <p className="hero-sub text-muted-foreground text-lg text-body max-w-xl mb-12">
          OpenCommand orchestrates your AI agents across every function — routing tasks to the right model, enforcing human checkpoints, and proving what was done.
        </p>
        <div className="hero-cta w-full max-w-xl space-y-4">
          {!isAuthenticated && (
            <a
              href={getLoginUrl("/dashboard")}
              className="btn-primary inline-flex items-center gap-2 px-8 py-4 text-base"
            >
              Start for free <ArrowRight size={16} />
            </a>
          )}
          <p className="text-xs text-muted-foreground/50">
            Free during beta. No credit card required.
          </p>
          <div className="pt-2">
            <p className="text-xs text-muted-foreground mb-3">Or join the waitlist for early access</p>
            <EmailCapture source="hero" />
          </div>
        </div>
      </section>

      {/* ─── Capabilities ─────────────────────────────────────────────── */}
      <div className="accent-line" />
      <section className="px-6 md:px-8 py-24 max-w-6xl mx-auto">
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
              desc: "Approval gates at any step. Agents propose, humans decide.",
            },
            {
              icon: BarChart3,
              title: "Model Performance",
              desc: "Track cost, latency, and quality across every model. Compare. Optimize.",
            },
            {
              icon: Shield,
              title: "Governance",
              desc: "Audit logs. Kill switches. Budget limits. Full operational control.",
            },
            {
              icon: GitBranch,
              title: "Execution Engine",
              desc: "Parallel task execution with dependency resolution and retry logic.",
            },
          ].map((f, i) => (
            <div key={i} className="bg-card p-8 group">
              <f.icon size={18} className="text-muted-foreground mb-5 group-hover:text-accent transition-colors" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground text-body leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────────────── */}
      <div className="accent-line" />
      <section className="px-6 md:px-8 py-24 max-w-4xl mx-auto">
        <p className="text-label mb-4">How it works</p>
        <h2 className="text-heading text-2xl md:text-3xl text-foreground mb-16">Three steps. That's it.</h2>
        <div className="space-y-16">
          {[
            { step: "01", title: "Connect your tools", desc: "Link your CRM, ad platforms, analytics, and data sources. Context flows in automatically." },
            { step: "02", title: "Build a blueprint", desc: "Define your workflow visually. Set which models handle which tasks. Add human checkpoints where you want control." },
            { step: "03", title: "Execute and verify", desc: "Agents run. Every action is logged. Every outcome is verified. You see exactly what happened and what it cost." },
          ].map((s) => {
            const ref = useScrollReveal();
            return (
              <div key={s.step} ref={ref} className="reveal-section flex gap-8 items-start">
                <span className="text-3xl font-semibold text-border select-none shrink-0 w-12">{s.step}</span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                  <p className="text-muted-foreground text-body">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Bottom CTA ───────────────────────────────────────────────── */}
      <div className="accent-line" />
      <section className="px-6 md:px-8 py-24 max-w-3xl mx-auto text-center">
        <h2 className="text-heading text-2xl md:text-3xl text-foreground mb-5">
          Ready to orchestrate?
        </h2>
        <p className="text-muted-foreground text-body mb-10 max-w-lg mx-auto">
          Join the teams using OpenCommand to deploy, monitor, and govern their AI agent fleet.
        </p>
        <div className="flex flex-col items-center gap-4 max-w-md mx-auto w-full">
          <EmailCapture source="bottom-cta" />
          <a href={getLoginUrl("/blueprints/chat")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
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
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Twitter</a>
          </div>
          <span className="text-xs text-muted-foreground/50">&copy; {new Date().getFullYear()} Open Command</span>
        </div>
      </footer>
    </div>
  );
}
