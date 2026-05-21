import { useState } from "react";
import { ArrowRight, CheckCircle2, Plug, Database, MessageSquare, Sparkles, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

const steps = [
  {
    number: "STEP 1",
    icon: Plug,
    iconColor: "text-indigo-300",
    iconBg: "bg-indigo-500/20",
    title: "Connect Your Tools",
    description: "Link HubSpot, Salesforce, Meta Ads, Google Analytics — whatever you use.",
  },
  {
    number: "STEP 2",
    icon: Database,
    iconColor: "text-purple-300",
    iconBg: "bg-purple-500/20",
    title: "We Pull Your Context",
    description: "Pipeline data, ad spend, traffic — pulled and analyzed automatically in real time.",
  },
  {
    number: "STEP 3",
    icon: MessageSquare,
    iconColor: "text-amber-300",
    iconBg: "bg-amber-500/20",
    title: "Personalized Interviews",
    description: "Each executive asks data-informed questions — not generic templates.",
  },
] as const;

const executives = [
  {
    code: "ARCH",
    title: "Chief Executive Officer",
    subtitle: "Strategy & Operations",
    description: "Aligns mission, operating priorities, and 90-day outcomes. Turns your vision into executable context.",
    accent: "border-amber-400/30",
    badgeColor: "bg-amber-400/15 text-amber-200 border-amber-400/30",
    dotColor: "bg-amber-400",
    questions: 3,
  },
  {
    code: "FORGE",
    title: "Chief Technology Officer",
    subtitle: "Technology & Systems",
    description: "Maps your stack, identifies automation leverage, and connects technical risks to agent workflows.",
    accent: "border-blue-400/30",
    badgeColor: "bg-blue-400/15 text-blue-200 border-blue-400/30",
    dotColor: "bg-blue-400",
    questions: 3,
  },
  {
    code: "SIGNAL",
    title: "Chief Marketing Officer",
    subtitle: "Growth & Positioning",
    description: "Clarifies your growth engine, audience, channels, and the proof points that build trust fastest.",
    accent: "border-pink-400/30",
    badgeColor: "bg-pink-400/15 text-pink-200 border-pink-400/30",
    dotColor: "bg-pink-400",
    questions: 3,
  },
  {
    code: "LEDGER",
    title: "Chief Financial Officer",
    subtitle: "Finance & Guardrails",
    description: "Sets budget logic, unit economics, and investment thresholds so every recommendation stays grounded.",
    accent: "border-emerald-400/30",
    badgeColor: "bg-emerald-400/15 text-emerald-200 border-emerald-400/30",
    dotColor: "bg-emerald-400",
    questions: 3,
  },
] as const;

export default function ProOnboarding() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [error, setError] = useState("");

  const waitlistMutation = trpc.waitlist.join.useMutation({
    onSuccess: (data) => {
      setSubmitted(true);
      setAlreadyJoined(Boolean(data.alreadyJoined));
      setError("");
      setEmail("");
    },
    onError: (err) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Enter your email to start executive onboarding.");
      return;
    }
    waitlistMutation.mutate({ email: normalizedEmail, source: "executive-onboarding-pro" });
  };

  const loginUrl = typeof window !== "undefined" ? getLoginUrl() : "#";

  return (
    <main className="min-h-screen bg-[oklch(0.015_0_0)] text-white overflow-x-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.15),transparent_60%),radial-gradient(ellipse_at_80%_50%,rgba(236,72,153,0.08),transparent_50%),radial-gradient(ellipse_at_20%_80%,rgba(16,185,129,0.08),transparent_50%)]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/8 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <a href="/" className="flex items-center gap-2.5" aria-label="OpenCommand home">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[10px] font-black text-black">OC</div>
            <span className="text-sm font-semibold tracking-wide text-white">OpenCommand</span>
          </a>
          <a
            href={loginUrl}
            className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/8 transition-colors"
          >
            Login
          </a>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-16">

        {/* Beta Access Banner */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-2 text-sm font-medium text-emerald-200">
            <Sparkles size={14} className="text-emerald-300" />
            Beta Access — Full Features Unlocked
          </div>
        </div>

        {/* Main Headline */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white md:text-6xl leading-[1.1]">
            Build Your<br />
            AI Executive Team
          </h1>
          <p className="mt-6 text-base leading-8 text-white/55 md:text-lg max-w-2xl mx-auto">
            OpenCommand's self-contextualizing engine connects to your existing tools, pulls real data, and uses it to personalize each executive agent. No copy-pasting. No manual setup. Your agents start informed.
          </p>
        </div>

        {/* 3-Step Flow */}
        <div className="space-y-3 mb-14">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.04] px-5 py-5 backdrop-blur-sm"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${step.iconBg}`}>
                  <Icon size={18} className={step.iconColor} />
                </div>
                <div>
                  <p className={`mb-1 text-xs font-semibold uppercase tracking-[0.2em] ${step.iconColor}`}>
                    {step.number}
                  </p>
                  <h3 className="text-base font-semibold text-white">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-white/55">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Executive Agent Cards */}
        <div className="mb-12">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
            Your Executive Team
          </p>
          <div className="grid grid-cols-2 gap-3">
            {executives.map((exec) => (
              <div
                key={exec.code}
                className={`rounded-2xl border ${exec.accent} bg-white/[0.04] p-4 backdrop-blur-sm`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${exec.badgeColor}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${exec.dotColor}`} />
                    {exec.code}
                  </div>
                  <span className="text-[10px] text-white/30">{exec.questions} questions</span>
                </div>
                <h3 className="text-sm font-semibold text-white leading-snug">{exec.title}</h3>
                <p className="mt-0.5 text-[11px] text-white/40 mb-2">{exec.subtitle}</p>
                <p className="text-xs leading-5 text-white/50">{exec.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA / Email Form */}
        {!submitted ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-white mb-1">Start Your Executive Interviews</h2>
            <p className="text-sm text-white/50 mb-5">
              Enter your email and we'll walk you through each executive onboarding session.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="email-input">Work email</label>
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@company.com"
                className="min-h-12 flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-indigo-300/50"
              />
              <button
                type="submit"
                disabled={waitlistMutation.isPending}
                className="group inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-6 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70 whitespace-nowrap"
              >
                {waitlistMutation.isPending ? "Starting..." : "Begin Onboarding"}
                <ArrowRight className="ml-2 transition group-hover:translate-x-0.5" size={15} />
              </button>
            </form>
            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
            <p className="mt-4 text-xs text-white/30 text-center">Free during beta. No credit card required.</p>
          </div>
        ) : (
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.07] p-8 text-center backdrop-blur-xl">
            <CheckCircle2 className="mx-auto mb-4 text-emerald-300" size={36} />
            <h2 className="text-xl font-semibold text-white mb-2">
              {alreadyJoined ? "You're already on the list." : "You're in."}
            </h2>
            <p className="text-sm text-white/55">
              {alreadyJoined
                ? "We already have your email. We'll reach out with next steps soon."
                : "We'll follow up with your executive onboarding sessions. Each executive agent will interview you with data-informed questions tailored to your business."}
            </p>
            <a
              href={loginUrl}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-white/90 transition-colors"
            >
              Sign in to OpenCommand <ChevronRight size={15} />
            </a>
          </div>
        )}

        {/* Footer note */}
        <p className="mt-10 text-center text-xs text-white/25">
          OpenCommand — The OS for non-human labor.{" "}
          <a href="/" className="underline underline-offset-2 hover:text-white/50 transition-colors">
            Back to home
          </a>
        </p>
      </div>
    </main>
  );
}
