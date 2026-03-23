import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { ArrowRight, Target, BarChart3, Bot, Cpu, Shield, FileStack, Check, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

function useScrollReveal() {
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
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

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

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      `}</style>

      {/* Top nav */}
      <nav className="px-6 md:px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-semibold text-foreground text-xl tracking-tight hover:opacity-80 transition-opacity">OpenCommand</Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/creators" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Creators</Link>
            {isAuthenticated ? (
              <Link href="/mission-control" className="btn-primary text-[13px] px-5 py-2">
                Mission Control
              </Link>
            ) : (
              <a href={getLoginUrl()} className="btn-primary text-[13px] px-5 py-2">
                Sign In
              </a>
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

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu-enter md:hidden mt-4 pb-4 border-t border-border pt-4 flex flex-col gap-4">
            <Link
              href="/blueprints"
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Blueprints
            </Link>
            <Link
              href="/creators"
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Creators
            </Link>
            <div className="pt-2">
              {isAuthenticated ? (
                <Link
                  href="/mission-control"
                  className="btn-primary text-[13px] px-5 py-2 inline-block"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Mission Control
                </Link>
              ) : (
                <a href={getLoginUrl()} className="btn-primary text-[13px] px-5 py-2 inline-block">
                  Sign In
                </a>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="px-8 pt-28 pb-24 max-w-7xl mx-auto">
        <div className="max-w-3xl">
          <p className="hero-label text-label mb-6">Personal Intelligence Engine</p>
          <h1 className="hero-h1 text-display text-6xl lg:text-[5.5rem] text-foreground leading-none mb-8">
            Deploy your<br />
            <span className="text-muted-foreground">zero-human workforce.</span>
          </h1>
          <p className="hero-sub text-muted-foreground text-lg text-body max-w-xl mb-12">
            The bottleneck in modern work is no longer generating ideas or finding information — it is execution. For high-performance operators, the friction between intent and outcome is the only thing standing in the way of scale. Personal Intelligence Engine is built to eliminate that friction. It is not just another AI assistant that waits for your prompt; it is a personal orchestration system designed to execute complex workflows autonomously.
          </p>
          <div className="hero-cta flex items-center gap-4">
            {isAuthenticated ? (
              <Link href="/mission-control" className="btn-primary flex items-center gap-2 px-7 py-3">
                Enter Mission Control <ArrowRight size={16} />
              </Link>
            ) : (
              <a href={getLoginUrl()} className="btn-primary flex items-center gap-2 px-7 py-3">
                Hire Your AI CEO <ArrowRight size={16} />
              </a>
            )}
            <Link href="/intent-engine" className="btn-outline px-7 py-3">
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Metrics strip */}
      <div className="accent-line" />
      <section className="px-8 py-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "Value Created", value: "$48,240", sub: "+12.4% today" },
            { label: "Labor Hours Saved", value: "321.6", sub: "hours this week" },
            { label: "PoO Receipts", value: "1,847", sub: "+23 today" },
            { label: "Active Agents", value: "94", sub: "all online" },
          ].map((m, i) => (
            <div key={i}>
              <div className="text-3xl font-semibold text-foreground tracking-tight">{m.value}</div>
              <div className="text-label mt-1">{m.label}</div>
              <div className="text-muted-foreground text-xs mt-0.5">{m.sub}</div>
            </div>
          ))}
        </div>
      </section>
      <div className="accent-line" />

      {/* Features */}
      <section className="px-8 py-24 max-w-7xl mx-auto">
        <div className="mb-16">
          <p className="text-label mb-3">Core Systems</p>
          <h2 className="text-heading text-3xl text-foreground">Everything you need to command outcomes.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: BarChart3, title: "Mission Control", desc: "Real-time OKR tracking, agent fleet monitoring, human-in-the-loop inbox, and PoO ledger.", href: "/mission-control" },
            { icon: Cpu, title: "Intent Engine", desc: "Transforms vague requests into structured intent objects through guided AI questioning.", href: "/intent-engine" },
            { icon: Bot, title: "AI CEO — Arch", desc: "Executive Core, Orchestration Layer, and Memory Engine. Compounds intelligence over time.", href: "/ai-ceo" },
            { icon: Target, title: "Proof of Outcome", desc: "Every task generates a verifiable receipt documenting labor saved and dollar value created.", href: "/mission-control" },
            { icon: Shield, title: "Governance", desc: "Approval gates, audit logs, kill switches, and compliance reporting for full operational control.", href: "/governance" },
            { icon: FileStack, title: "Company Blueprints", desc: "Package and sell entire zero-human company setups. One-click deployment for buyers.", href: "/blueprints" },
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

      {/* How It Works */}
      <div className="accent-line" />
      <section className="px-8 py-24 max-w-7xl mx-auto">
        <div className="mb-16 text-center">
          <p className="text-label mb-3">How It Works</p>
          <h2 className="text-heading text-3xl text-foreground">Three steps to a running company.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          <HowItWorksStep
            step="01"
            title="State Your Intent"
            desc="Tell OpenCommand what you want to achieve. The Intent Engine asks focused questions to transform your goal into a structured, executable command."
            detail="No technical setup. No prompt engineering. Just describe the outcome."
            delay={0}
          />
          <HowItWorksStep
            step="02"
            title="Arch Orchestrates"
            desc="Your AI CEO deploys the right agents, assigns tasks, tracks OKRs, and makes decisions — all without human intervention."
            detail="CEO, CTO, CMO, CFO — your full executive suite running in parallel."
            delay={150}
          />
          <HowItWorksStep
            step="03"
            title="Proof of Outcome"
            desc="Every completed task generates a verified Proof of Outcome receipt documenting labor saved, dollar value created, and decisions made."
            detail="Immutable audit trail. Full accountability. Zero ambiguity."
            delay={300}
          />
        </div>
      </section>

      {/* Pricing */}
      <div className="accent-line" />
      <section className="px-8 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-label mb-3">Simple pricing</p>
          <h2 className="text-heading text-3xl text-foreground">Start executing today.</h2>
          <p className="text-muted-foreground text-body mt-3 max-w-md mx-auto">No seat fees. No enterprise contracts. Just autonomous execution at the speed of intent.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Starter */}
          <div className="border border-border rounded-xl p-7 bg-white/[0.02] flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-muted-foreground" />
                <span className="text-label text-xs">Starter</span>
              </div>
              <div className="flex items-end gap-1 mb-3">
                <span className="text-4xl font-light text-foreground">$1</span>
                <span className="text-muted-foreground text-sm mb-1">/ month</span>
              </div>
              <p className="text-muted-foreground text-xs">For individual operators getting started with autonomous AI execution.</p>
            </div>
            <ul className="space-y-2 flex-1">
              {["1 active agent", "Basic context engineering", "Intent-to-outcome workflows", "Standard execution speed", "Community support"].map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check size={11} className="text-emerald-400 shrink-0" />{f}
                </li>
              ))}
            </ul>
            <Link href="/pricing" className="btn-outline text-center text-sm py-2.5">Get Started</Link>
          </div>
          {/* Pro */}
          <div className="border border-foreground/20 rounded-xl p-7 bg-foreground/[0.03] flex flex-col gap-5 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-foreground text-background text-[10px] font-medium px-3 py-1 rounded-full tracking-wide">Most Popular</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Bot size={14} className="text-foreground" />
                <span className="text-label text-xs">Pro</span>
              </div>
              <div className="flex items-end gap-1 mb-3">
                <span className="text-4xl font-light text-foreground">$5</span>
                <span className="text-muted-foreground text-sm mb-1">/ month</span>
              </div>
              <p className="text-muted-foreground text-xs">For high-performance operators who need full orchestration power.</p>
            </div>
            <ul className="space-y-2 flex-1">
              {["Unlimited active agents", "Advanced context engineering", "Multi-step workflow orchestration", "Priority execution speed", "Proof of Outcome receipts", "Priority support"].map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check size={11} className="text-emerald-400 shrink-0" />{f}
                </li>
              ))}
            </ul>
            <Link href="/pricing" className="btn-primary text-center text-sm py-2.5">Go Pro <ArrowRight size={13} className="inline ml-1" /></Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="accent-line" />
      <section className="px-8 py-24 text-center max-w-3xl mx-auto">
        <p className="text-label mb-4">Ready to deploy</p>
        <h2 className="text-heading text-3xl text-foreground mb-5">Hire your AI CEO today.</h2>
        <p className="text-muted-foreground text-body mb-10 max-w-lg mx-auto">
          Stop managing tasks. Start commanding outcomes. Arch handles the execution while you focus on the vision.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {isAuthenticated ? (
            <Link href="/mission-control" className="btn-primary flex items-center gap-2 px-8 py-3">
              Enter Mission Control <ArrowRight size={16} />
            </Link>
          ) : (
            <a href={getLoginUrl()} className="btn-primary flex items-center gap-2 px-8 py-3">
              Hire Your AI CEO <ArrowRight size={16} />
            </a>
          )}
          <Link href="/intent-engine" className="btn-outline px-8 py-3">
            See How It Works
          </Link>
        </div>
      </section>

      {/* Footer */}
      <div className="accent-line" />
      <footer className="px-8 py-8 flex items-center justify-between max-w-7xl mx-auto">
        <span className="text-base text-foreground font-semibold tracking-tight">OpenCommand</span>
        <div className="text-label">Personal Intelligence Engine · {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
