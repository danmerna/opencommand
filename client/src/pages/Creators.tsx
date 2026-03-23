import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Zap, DollarSign, Users, Package, CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function Creators() {
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
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Please enter your email address."); return; }
    joinMutation.mutate({ email: email.trim(), source: "creators" });
  };

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

        {submitted ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full border border-border bg-background mb-2">
              <CheckCircle size={28} className="text-accent" strokeWidth={1.5} />
            </div>
            <p className="text-foreground font-medium text-lg">
              {alreadyJoined ? "You're already on the list." : "You're on the list."}
            </p>
            <p className="text-muted-foreground text-sm max-w-xs">
              {alreadyJoined
                ? "We already have your email. We'll reach out when the Creator Program launches."
                : "We'll reach out as soon as the Creator Program opens. Keep building."}
            </p>
            <Link href="/" className="mt-4 btn-outline px-8 py-3 inline-flex items-center gap-2">
              Back to Home <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
            <div className="flex w-full gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/30 transition-all"
                disabled={joinMutation.isPending}
                required
              />
              <button
                type="submit"
                disabled={joinMutation.isPending}
                className="btn-primary px-6 py-3 flex items-center gap-2 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {joinMutation.isPending ? (
                  <><Loader2 size={14} className="animate-spin" /> Joining…</>
                ) : (
                  <>Join Waitlist <ArrowRight size={14} /></>
                )}
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}
            <p className="text-xs text-muted-foreground/60">No spam. Unsubscribe anytime.</p>
          </form>
        )}
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
