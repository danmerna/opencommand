import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Zap, DollarSign, Users, Package } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Creators() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <nav className="px-8 py-5 flex items-center justify-between max-w-7xl mx-auto border-b border-border">
        <Link href="/" className="font-semibold text-foreground text-xl tracking-tight hover:opacity-80 transition-opacity">OpenCommand</Link>
        <Link href="/" className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={13} /> Back to Home
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-8 pt-24 pb-20 max-w-4xl mx-auto text-center">
        <p className="text-label mb-5">Creator Program</p>
        <h1 className="text-display text-5xl lg:text-6xl text-foreground leading-none mb-6">
          Build once.<br />
          <span className="text-muted-foreground">Sell forever.</span>
        </h1>
        <p className="text-muted-foreground text-lg text-body max-w-xl mx-auto mb-10">
          Package your zero-human company setup as a Blueprint and sell it to founders worldwide. Earn revenue share on every deployment.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-full text-xs text-muted-foreground font-medium uppercase tracking-wider mb-12">
          <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
          Coming Soon — Waitlist Open
        </div>
      </section>

      <div className="accent-line" />

      {/* Benefits */}
      <section className="px-8 py-20 max-w-7xl mx-auto">
        <div className="mb-14 text-center">
          <p className="text-label mb-3">Why Create</p>
          <h2 className="text-heading text-2xl text-foreground">Everything you need to monetize your expertise.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Package, title: "Blueprint Builder", desc: "Package your entire agent setup — org chart, OKRs, workflows, and prompts — into a one-click Blueprint." },
            { icon: DollarSign, title: "Revenue Share", desc: "Earn a percentage of every deployment. The more your Blueprint gets used, the more you earn." },
            { icon: Zap, title: "Instant Deployment", desc: "Buyers deploy your Blueprint in one click. No setup friction. Your work scales without your time." },
            { icon: Users, title: "Creator Dashboard", desc: "Track installs, revenue, reviews, and performance across all your Blueprints from a single dashboard." },
          ].map((b, i) => (
            <div key={i} className="card-minimal">
              <b.icon size={20} className="text-muted-foreground mb-4" strokeWidth={1.5} />
              <h3 className="text-heading text-base text-foreground mb-2">{b.title}</h3>
              <p className="text-muted-foreground text-sm text-body">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="accent-line" />

      {/* Waitlist CTA */}
      <section className="px-8 py-24 text-center max-w-2xl mx-auto">
        <p className="text-label mb-4">Get Early Access</p>
        <h2 className="text-heading text-3xl text-foreground mb-5">Join the Creator waitlist.</h2>
        <p className="text-muted-foreground text-body mb-10 max-w-md mx-auto">
          Be first to know when the Creator Program launches. Early creators get priority placement and higher revenue share tiers.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {isAuthenticated ? (
            <Link href="/mission-control" className="btn-primary flex items-center gap-2 px-8 py-3">
              Go to Mission Control <ArrowRight size={16} />
            </Link>
          ) : (
            <a href={getLoginUrl()} className="btn-primary flex items-center gap-2 px-8 py-3">
              Join Waitlist <ArrowRight size={16} />
            </a>
          )}
          <Link href="/" className="btn-outline px-8 py-3">
            Back to Home
          </Link>
        </div>
      </section>

      {/* Footer */}
      <div className="accent-line" />
      <footer className="px-8 py-8 flex items-center justify-between max-w-7xl mx-auto">
        <span className="text-base text-foreground font-semibold tracking-tight">OpenCommand</span>
        <div className="text-label">IntelligenceOS · {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
