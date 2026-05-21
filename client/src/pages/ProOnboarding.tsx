import { useMemo, useState } from "react";
import { Menu, X, ArrowRight, CheckCircle2, MessageSquare, ShieldCheck, Sparkles, Cpu } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

const executiveTracks = [
  {
    role: "CMO",
    title: "Clarify your growth engine",
    accent: "text-pink-300",
    border: "border-pink-400/30",
    prompt: "Which customer segment is most urgent to win this quarter, and what proof would make them trust OpenCommand faster?",
    outcome: "Turns audience, positioning, channels, and feedback loops into launch-ready marketing context.",
  },
  {
    role: "CEO",
    title: "Align mission and operating priorities",
    accent: "text-amber-300",
    border: "border-amber-400/30",
    prompt: "What business outcome matters most in the next 90 days, and what tradeoffs are you willing to make to reach it?",
    outcome: "Captures vision, constraints, decision rules, and accountability expectations for executive planning.",
  },
  {
    role: "CTO",
    title: "Map technical leverage",
    accent: "text-blue-300",
    border: "border-blue-400/30",
    prompt: "Where is the current system slowing feedback down, and which integration would remove the most manual work?",
    outcome: "Connects stack, data sources, automation opportunities, and technical risks to the agent workflow.",
  },
  {
    role: "CFO",
    title: "Define financial guardrails",
    accent: "text-emerald-300",
    border: "border-emerald-400/30",
    prompt: "Which metric should the company protect first: runway, margin, cash conversion, or payback period?",
    outcome: "Sets budget logic, unit economics, reporting cadence, and investment thresholds for recommendations.",
  },
] as const;

const recommendedSubagents = [
  {
    name: "Revenue Ops Agent",
    mission: "Find pipeline gaps, stalled deals, and next-best actions across the revenue system.",
    tools: "CRM, email, calendar, call notes",
    guardrails: "Drafts customer-facing actions for approval before anything is sent.",
    autonomy: "Medium",
    accent: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  },
  {
    name: "Growth Intelligence Agent",
    mission: "Monitor acquisition performance and recommend practical budget, funnel, and creative moves.",
    tools: "Meta Ads, analytics, CRM, revenue data",
    guardrails: "Can recommend budget changes, but cannot alter spend without explicit approval.",
    autonomy: "Medium-high",
    accent: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
  },
  {
    name: "Customer Insight Agent",
    mission: "Surface churn risk, expansion signals, objections, and recurring customer language.",
    tools: "CRM, support tickets, NPS, transcripts",
    guardrails: "Every recommendation must cite source evidence from connected systems.",
    autonomy: "Medium",
    accent: "border-pink-300/30 bg-pink-300/10 text-pink-200",
  },
  {
    name: "Executive Briefing Agent",
    mission: "Turn scattered operating data into concise weekly decision memos for leadership.",
    tools: "All approved executive data sources",
    guardrails: "No unsupported claims; metrics must map back to the source system.",
    autonomy: "High for reporting",
    accent: "border-blue-300/30 bg-blue-300/10 text-blue-200",
  },
] as const;

const recommendedGoals = [
  {
    command: "/goals recover stalled pipeline",
    outcome: "Create an approved follow-up plan for every high-value inactive deal this week.",
    context: ["Project: Revenue pipeline recovery", "Systems: CRM, email, calendar, call notes", "Constraint: Do not send external messages without approval"],
    success: ["Identify high-value stalled opportunities", "Explain why each deal is stalled with source evidence", "Draft next-best actions and follow-up messages for approval"],
    finalDeliverable: "Prioritized pipeline recovery plan with drafts, owners, due dates, and evidence.",
  },
  {
    command: "/goals reduce wasted ad spend",
    outcome: "Identify underperforming campaigns and recommend budget reallocations.",
    context: ["Project: Paid acquisition efficiency", "Systems: Meta Ads, analytics, CRM, revenue data", "Constraint: Recommend changes; do not change live budgets without approval"],
    success: ["Flag poor CAC, ROAS, or conversion quality", "Separate creative, targeting, funnel, and offer problems", "Prepare an approval-ready budget action list"],
    finalDeliverable: "Paid growth optimization memo with recommended budget moves and rationale.",
  },
  {
    command: "/goals create weekly executive action plan",
    outcome: "Turn CRM, ads, analytics, customer, and revenue signals into this week’s operating plan.",
    context: ["Project: Weekly executive cadence", "Systems: CRM, ads, analytics, customer feedback, revenue dashboards", "Constraint: Tie every recommendation to measurable business outcomes"],
    success: ["Summarize the most important business signals", "Identify top risks, opportunities, and blockers", "Recommend concrete actions with owners and urgency"],
    finalDeliverable: "Weekly executive action plan ready for leadership review.",
  },
] as const;

export default function ProOnboarding() {
  const [activeRole, setActiveRole] = useState<(typeof executiveTracks)[number]["role"]>("CMO");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [error, setError] = useState("");

  const activeTrack = useMemo(
    () => executiveTracks.find(track => track.role === activeRole) ?? executiveTracks[0],
    [activeRole]
  );

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
      setError("Enter an email address to start executive onboarding.");
      return;
    }
    waitlistMutation.mutate({ email: normalizedEmail, source: "executive-onboarding-pro" });
  };

  const loginUrl = typeof window !== "undefined" ? getLoginUrl() : "#";

  return (
    <main className="min-h-screen bg-[oklch(0.015_0_0)] text-white overflow-hidden">
      <div className="absolute inset-0 opacity-40 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.18),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.12),transparent_28%),radial-gradient(circle_at_50%_85%,rgba(16,185,129,0.10),transparent_32%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-black/25 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <a href="/" className="flex items-center gap-3" aria-label="OpenCommand home">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-xs font-black text-black">OC</div>
            <div>
              <p className="text-sm font-semibold tracking-wide">OpenCommand</p>
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">Executive Onboarding</p>
            </div>
          </a>

          <nav className="hidden items-center gap-7 text-sm text-white/65 md:flex">
            <a className="hover:text-white transition-colors" href="#demo">Demo</a>
            <a className="hover:text-white transition-colors" href="#workflow">Workflow</a>
            <a className="hover:text-white transition-colors" href="#agents">Agents</a>
            <a className="hover:text-white transition-colors" href="#goals">Goals</a>
            <a className="hover:text-white transition-colors" href="#start">Start</a>
            <a className="rounded-full border border-white/15 px-4 py-2 text-white hover:bg-white/10 transition-colors" href={loginUrl}>Login</a>
          </nav>

          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-white md:hidden"
            onClick={() => setMobileMenuOpen(open => !open)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="relative z-20 border-t border-white/10 bg-black/90 px-5 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-sm text-white/75">
              <a onClick={() => setMobileMenuOpen(false)} href="#demo">Demo</a>
              <a onClick={() => setMobileMenuOpen(false)} href="#workflow">Workflow</a>
              <a onClick={() => setMobileMenuOpen(false)} href="#agents">Agents</a>
              <a onClick={() => setMobileMenuOpen(false)} href="#goals">Goals</a>
              <a onClick={() => setMobileMenuOpen(false)} href="#start">Start</a>
              <a className="rounded-xl border border-white/15 px-4 py-3 text-center text-white" href={loginUrl}>Login</a>
            </div>
          </div>
        )}
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-12 px-5 py-16 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div className="flex flex-col justify-center">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-400/10 px-4 py-2 text-xs font-medium text-indigo-100">
            <Sparkles size={14} /> Public preview for feedback
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.055em] text-white md:text-7xl">
            Start executive onboarding before you build the org chart.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/62 md:text-lg">
            OpenCommand turns a short Socratic interview into practical context for AI executives. Share this page with prospects so they can understand the onboarding flow, choose the executive lens that fits their needs, and request access without hitting a protected app login.
          </p>

          <form id="start" onSubmit={handleSubmit} className="mt-9 max-w-xl rounded-3xl border border-white/10 bg-white/[0.055] p-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="email">Work email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter work email"
                className="min-h-12 flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-indigo-300/60"
              />
              <button
                type="submit"
                disabled={waitlistMutation.isPending}
                className="group inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {waitlistMutation.isPending ? "Starting..." : "Start Executive Onboarding"}
                <ArrowRight className="ml-2 transition group-hover:translate-x-0.5" size={16} />
              </button>
            </div>
            {submitted && (
              <p className="mt-3 flex items-center gap-2 px-2 text-sm text-emerald-300">
                <CheckCircle2 size={16} /> {alreadyJoined ? "You are already on the onboarding list." : "You are on the list. We will follow up with next steps."}
              </p>
            )}
            {error && <p className="mt-3 px-2 text-sm text-red-300">{error}</p>}
          </form>
        </div>

        <div id="demo" className="rounded-[2rem] border border-white/12 bg-white/[0.045] p-4 shadow-2xl shadow-indigo-950/20 backdrop-blur-xl">
          <div className="rounded-[1.5rem] border border-white/10 bg-black/55 p-5">
            <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-sm font-semibold text-white">Executive context demo</p>
                <p className="text-xs text-white/45">Choose an onboarding lens</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Live preview
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {executiveTracks.map(track => (
                <button
                  key={track.role}
                  onClick={() => setActiveRole(track.role)}
                  className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${activeTrack.role === track.role ? `${track.border} bg-white/10 text-white` : "border-white/10 bg-white/[0.03] text-white/45 hover:text-white"}`}
                >
                  {track.role}
                </button>
              ))}
            </div>

            <div className={`mt-5 rounded-3xl border ${activeTrack.border} bg-white/[0.04] p-5`}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <MessageSquare size={18} className={activeTrack.accent} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${activeTrack.accent}`}>{activeTrack.role} onboarding</p>
                  <h2 className="text-xl font-semibold text-white">{activeTrack.title}</h2>
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl bg-white/10 p-4 text-sm leading-7 text-white/80">
                  <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-white/35">Socratic prompt</span>
                  {activeTrack.prompt}
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/35 p-4 text-sm leading-7 text-white/60">
                  <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-white/35">Resulting context</span>
                  {activeTrack.outcome}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="relative z-10 mx-auto grid max-w-7xl gap-4 px-5 pb-16 md:grid-cols-3 md:px-8">
        <article className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
          <ShieldCheck className="mb-5 text-indigo-200" size={26} />
          <h3 className="text-lg font-semibold">Public and shareable</h3>
          <p className="mt-3 text-sm leading-7 text-white/58">The feedback page is no longer behind the authenticated agent interview route, so prospects can open it directly from mobile links.</p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
          <MessageSquare className="mb-5 text-pink-200" size={26} />
          <h3 className="text-lg font-semibold">Socratic context capture</h3>
          <p className="mt-3 text-sm leading-7 text-white/58">Each executive track frames the interview around a focused business decision instead of asking users to parse technical JSON.</p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
          <Cpu className="mb-5 text-emerald-200" size={26} />
          <h3 className="text-lg font-semibold">Integration-ready</h3>
          <p className="mt-3 text-sm leading-7 text-white/58">The onboarding promise includes follow-up data integrations so executive agents can move from answers to operational action.</p>
        </article>
      </section>

      <section id="agents" className="relative z-10 mx-auto max-w-7xl px-5 pb-16 md:px-8">
        <div className="mb-8 max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-medium text-white/62">
            <Cpu size={14} /> Recommended subagent team
          </div>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">Strategy becomes an operating system.</h2>
          <p className="mt-4 text-sm leading-7 text-white/58 md:text-base">
            After the executive interview, OpenCommand recommends specialized subagents with explicit tools, guardrails, and autonomy settings so prospects can see how the framework turns context into controlled execution.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {recommendedSubagents.map(agent => (
            <article key={agent.name} className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className={`mb-5 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${agent.accent}`}>{agent.autonomy} autonomy</div>
              <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
              <p className="mt-3 min-h-[5.25rem] text-sm leading-7 text-white/58">{agent.mission}</p>
              <div className="mt-5 space-y-3 border-t border-white/10 pt-4 text-xs leading-6 text-white/52">
                <p><span className="font-semibold text-white/78">Tools:</span> {agent.tools}</p>
                <p><span className="font-semibold text-white/78">Guardrail:</span> {agent.guardrails}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="goals" className="relative z-10 mx-auto max-w-7xl px-5 pb-24 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-7 backdrop-blur-xl lg:sticky lg:top-8 lg:h-fit">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-medium text-emerald-100">
              <Sparkles size={14} /> Autonomous goal briefs
            </div>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">Give the agent team an outcome, not a task list.</h2>
            <p className="mt-5 text-sm leading-7 text-white/58 md:text-base">
              The recommended `/goals` preview borrows the discipline of a mega prompt: clear context, measurable success criteria, operating rules, and final deliverables. It shows how a founder can set the goal, walk away, and return to evidence-backed work.
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/35 p-4 text-xs leading-6 text-white/52">
              <p className="font-semibold uppercase tracking-[0.22em] text-white/35">Operating rules</p>
              <p className="mt-2">Plan first. Work autonomously until blocked. Use approved tools. Self-verify. Escalate only when approvals, credentials, or strategic tradeoffs are required.</p>
            </div>
          </div>

          <div className="space-y-4">
            {recommendedGoals.map(goal => (
              <article key={goal.command} className="rounded-[2rem] border border-white/10 bg-black/35 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-6">
                <div className="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold text-emerald-200">{goal.command}</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{goal.outcome}</h3>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs text-white/50">approval-aware</div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/35">Context</p>
                    <ul className="space-y-2 text-sm leading-6 text-white/58">
                      {goal.context.map(item => <li key={item}>• {item}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/35">Success criteria</p>
                    <ol className="list-decimal space-y-2 pl-4 text-sm leading-6 text-white/58">
                      {goal.success.map(item => <li key={item}>{item}</li>)}
                    </ol>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4 text-sm leading-7 text-emerald-50/72">
                  <span className="font-semibold text-emerald-100">Final deliverable:</span> {goal.finalDeliverable}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
