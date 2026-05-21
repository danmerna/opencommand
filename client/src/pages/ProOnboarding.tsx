import { useState, useRef, useEffect } from "react";
import {
  ArrowRight, CheckCircle2, Plug, Database, MessageSquare, Sparkles,
  ChevronRight, Loader2, Send, Building2, Users, Brain,
  SkipForward, Calendar, Clock, CalendarDays, CalendarRange,
  BarChart3, Link2, ExternalLink, Zap, Eye, Lock,
  ThumbsUp, ThumbsDown, Download, Share2, Mail, Star, X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Streamdown } from "streamdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, Target, Bot, Layers, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = { role: "user" | "assistant"; content: string };
type BriefingFrequency = "daily" | "weekly" | "monthly" | "quarterly";
type OnboardingStep =
  | "landing"
  | "company-setup"
  | "briefing-frequency"
  | "creating-agents"
  | "integrations-ceo" | "onboarding-ceo"
  | "integrations-cto" | "onboarding-cto"
  | "integrations-cmo" | "onboarding-cmo"
  | "integrations-cfo" | "onboarding-cfo"
  | "sigma-calibration"
  | "generating-strategy"
  | "results"
  | "feedback"
  | "complete";

type SurveyQuestion = { id: string; text: string; type: string; options: string[]; placeholder: string };
type GuestSession = { token: string; name: string; email: string; userId: number; companyId?: number };

// ─── Static Data ──────────────────────────────────────────────────────────────

const EXEC_AGENTS = [
  {
    type: "ceo", name: "ARCH — AI CEO", roleTitle: "Chief Executive Officer",
    subtitle: "Strategy & Operations",
    description: "Aligns mission, operating priorities, and 90-day outcomes. Turns your vision into executable context.",
    capabilities: ["strategy", "orchestration", "okr-tracking", "decision-making"],
    tools: ["llm", "calendar", "analytics"],
    accent: "border-amber-400/30", badgeColor: "bg-amber-400/15 text-amber-200 border-amber-400/30",
    dotColor: "bg-amber-400", color: "text-amber-400", icon: "👑", skippable: false,
  },
  {
    type: "cto", name: "FORGE — CTO", roleTitle: "Chief Technology Officer",
    subtitle: "Technology & Systems",
    description: "Maps your stack, identifies automation leverage, and connects technical risks to agent workflows.",
    capabilities: ["market-research", "competitor-analysis", "data-synthesis", "code-review"],
    tools: ["github", "jira", "datadog"],
    accent: "border-blue-400/30", badgeColor: "bg-blue-400/15 text-blue-200 border-blue-400/30",
    dotColor: "bg-blue-400", color: "text-blue-400", icon: "⚡", skippable: true,
  },
  {
    type: "cmo", name: "SIGNAL — CMO", roleTitle: "Chief Marketing Officer",
    subtitle: "Growth & Positioning",
    description: "Clarifies your growth engine, audience, channels, and the proof points that build trust fastest.",
    capabilities: ["content-creation", "seo", "email-campaigns", "social-media"],
    tools: ["mailchimp", "analytics", "social-scheduler"],
    accent: "border-pink-400/30", badgeColor: "bg-pink-400/15 text-pink-200 border-pink-400/30",
    dotColor: "bg-pink-400", color: "text-pink-400", icon: "✦", skippable: true,
  },
  {
    type: "cfo", name: "LEDGER — CFO", roleTitle: "Chief Financial Officer",
    subtitle: "Finance & Guardrails",
    description: "Sets budget logic, unit economics, and investment thresholds so every recommendation stays grounded.",
    capabilities: ["financial-modeling", "budget-tracking", "revenue-analysis", "risk-assessment"],
    tools: ["stripe", "quickbooks", "analytics"],
    accent: "border-emerald-400/30", badgeColor: "bg-emerald-400/15 text-emerald-200 border-emerald-400/30",
    dotColor: "bg-emerald-400", color: "text-emerald-400", icon: "◈", skippable: true,
  },
] as const;

type ExecType = typeof EXEC_AGENTS[number]["type"];

const BRIEFING_OPTIONS: { value: BriefingFrequency; label: string; description: string; icon: React.ReactNode }[] = [
  { value: "daily", label: "Daily", description: "Morning briefings every day — best for fast-moving operators", icon: <Clock size={16} /> },
  { value: "weekly", label: "Weekly", description: "Monday strategy reviews — the most popular cadence", icon: <Calendar size={16} /> },
  { value: "monthly", label: "Monthly", description: "Deep-dive reviews once a month — ideal for steady-state operations", icon: <CalendarDays size={16} /> },
  { value: "quarterly", label: "Quarterly", description: "High-level strategic reviews — for long-horizon planning", icon: <CalendarRange size={16} /> },
];

const ROLE_INTEGRATIONS: Record<string, { slug: string; name: string; description: string; icon: string }[]> = {
  ceo: [
    { slug: "hubspot", name: "HubSpot", description: "CRM data — pipeline, contacts, and deal velocity", icon: "🟠" },
    { slug: "salesforce", name: "Salesforce", description: "CRM data — opportunities, forecasts, and accounts", icon: "☁️" },
    { slug: "ga4", name: "Google Analytics", description: "Website traffic, user behavior, and conversion data", icon: "📊" },
  ],
  cto: [
    { slug: "hubspot", name: "HubSpot", description: "Product usage data and customer feedback signals", icon: "🟠" },
    { slug: "salesforce", name: "Salesforce", description: "Technical requirements from deal data", icon: "☁️" },
  ],
  cmo: [
    { slug: "meta_ads", name: "Meta Ads", description: "Facebook & Instagram campaign performance and audience data", icon: "📘" },
    { slug: "google_ads", name: "Google Ads", description: "Search & display campaign metrics and keyword performance", icon: "🔍" },
    { slug: "ga4", name: "Google Analytics", description: "Traffic sources, conversion funnels, and user journeys", icon: "📊" },
    { slug: "mailchimp", name: "Mailchimp", description: "Email campaign performance and subscriber engagement", icon: "📧" },
  ],
  cfo: [
    { slug: "hubspot", name: "HubSpot", description: "Revenue pipeline and deal forecasting data", icon: "🟠" },
    { slug: "salesforce", name: "Salesforce", description: "Revenue data, closed deals, and financial forecasts", icon: "☁️" },
    { slug: "meta_ads", name: "Meta Ads", description: "Ad spend and ROAS data for budget allocation", icon: "📘" },
    { slug: "google_ads", name: "Google Ads", description: "Ad spend efficiency and cost-per-acquisition data", icon: "🔍" },
  ],
};

const ONBOARDING_ORDER: OnboardingStep[] = ["onboarding-ceo", "onboarding-cto", "onboarding-cmo", "onboarding-cfo"];
const INTEGRATION_ORDER: OnboardingStep[] = ["integrations-ceo", "integrations-cto", "integrations-cmo", "integrations-cfo"];
const STEP_TO_TYPE: Record<string, string> = {
  "onboarding-ceo": "ceo", "onboarding-cto": "cto", "onboarding-cmo": "cmo", "onboarding-cfo": "cfo",
  "integrations-ceo": "ceo", "integrations-cto": "cto", "integrations-cmo": "cmo", "integrations-cfo": "cfo",
};

// ─── Landing Section ──────────────────────────────────────────────────────────

function LandingSection({ onBegin, progress }: { onBegin: () => void; progress?: { completed: number; total: number } | null }) {
  const loginUrl = typeof window !== "undefined" ? getLoginUrl("/onboarding/pro") : "#";
  const [showStickyBar, setShowStickyBar] = useState(false);
  const headlineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );
    if (headlineRef.current) observer.observe(headlineRef.current);
    return () => observer.disconnect();
  }, []);

  const sigma = {
    code: "Σ", title: "Synthesis Engine", subtitle: "Highest-Leverage Move",
    description: "After all four interviews, Σ synthesizes every executive perspective into one immediate, highest-leverage action.",
    accent: "border-[#00D4AA]/30", badgeColor: "bg-[#00D4AA]/10 text-[#00D4AA] border-[#00D4AA]/30",
    dotColor: "bg-[#00D4AA]",
  };

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
          <a href={loginUrl} className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/8 transition-colors">
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
        <div className="text-center mb-12" ref={headlineRef}>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white md:text-6xl leading-[1.1]">
            Build Your<br />AI Executive Team
          </h1>
          <p className="mt-6 text-base leading-8 text-white/55 md:text-lg max-w-2xl mx-auto">
            OpenCommand's self-contextualizing engine connects to your existing tools, pulls real data, and uses it to personalize each executive agent. No copy-pasting. No manual setup. Your agents start informed.
          </p>
        </div>

        {/* 3-Step Flow */}
        <div className="space-y-3 mb-14">
          {[
            { number: "STEP 1", Icon: Plug, iconColor: "text-indigo-300", iconBg: "bg-indigo-500/20", title: "Connect Your Tools", description: "Link HubSpot, Salesforce, Meta Ads, Google Analytics — whatever you use." },
            { number: "STEP 2", Icon: Database, iconColor: "text-purple-300", iconBg: "bg-purple-500/20", title: "We Pull Your Context", description: "Pipeline data, ad spend, traffic — pulled and analyzed automatically in real time." },
            { number: "STEP 3", Icon: MessageSquare, iconColor: "text-amber-300", iconBg: "bg-amber-500/20", title: "Personalized Interviews", description: "Each executive asks data-informed questions — not generic templates." },
          ].map((s) => (
            <div key={s.number} className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.04] px-5 py-5 backdrop-blur-sm">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.iconBg}`}>
                <s.Icon size={18} className={s.iconColor} />
              </div>
              <div>
                <p className={`mb-1 text-xs font-semibold uppercase tracking-[0.2em] ${s.iconColor}`}>{s.number}</p>
                <h3 className="text-base font-semibold text-white">{s.title}</h3>
                <p className="mt-1 text-sm leading-6 text-white/55">{s.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Executive Agent Cards — 4 execs + Σ */}
        <div className="mb-12">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-white/35">Your Executive Team</p>
          <div className="grid grid-cols-2 gap-3">
            {EXEC_AGENTS.map((exec) => (
              <div key={exec.type} className={`rounded-2xl border ${exec.accent} bg-white/[0.04] p-4 backdrop-blur-sm`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${exec.badgeColor}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${exec.dotColor}`} />
                    {exec.name.split("—")[0].trim()}
                  </div>
                  <span className="text-[10px] text-white/30">3 questions</span>
                </div>
                <h3 className="text-sm font-semibold text-white leading-snug">{exec.roleTitle}</h3>
                <p className="mt-0.5 text-[11px] text-white/40 mb-2">{exec.subtitle}</p>
                <p className="text-xs leading-5 text-white/50">{exec.description}</p>
              </div>
            ))}
            {/* Σ card — spans full width */}
            <div className={`col-span-2 rounded-2xl border ${sigma.accent} bg-[#00D4AA]/[0.04] p-4 backdrop-blur-sm`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${sigma.badgeColor}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${sigma.dotColor}`} />
                  Σ
                </div>
                <span className="text-[10px] text-white/30">Final synthesis</span>
              </div>
              <h3 className="text-sm font-semibold text-white leading-snug">{sigma.title}</h3>
              <p className="mt-0.5 text-[11px] text-white/40 mb-2">{sigma.subtitle}</p>
              <p className="text-xs leading-5 text-white/50">{sigma.description}</p>
            </div>
          </div>
        </div>

        {/* Sample Question Teaser */}
        <div className="mb-12 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">👑</span>
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-widest">ARCH — First Question Preview</span>
          </div>
          <p className="text-sm text-white/80 leading-relaxed italic">
            "What's the single biggest constraint preventing your business from growing faster right now — is it capital, talent, distribution, or something else entirely?"
          </p>
          <p className="mt-3 text-[11px] text-white/35">
            Every question is Socratic and data-informed. ARCH won't ask generic questions — it already knows your pipeline, traffic, and ad spend before you start.
          </p>
        </div>

        {/* Progress indicator for returning users */}
        {progress && progress.completed > 0 && (
          <div className="mb-8 rounded-2xl border border-indigo-400/20 bg-indigo-400/[0.04] p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white">Your Progress</p>
              <span className="text-xs text-indigo-300">{progress.completed} of {progress.total} executives complete</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-indigo-400 transition-all" style={{ width: `${Math.round((progress.completed / progress.total) * 100)}%` }} />
            </div>
            <p className="mt-3 text-xs text-white/50">Pick up where you left off — your progress is saved.</p>
          </div>
        )}

        {/* CTA — no email gate */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl text-center">
          <h2 className="text-xl font-semibold text-white mb-1">Start Your Executive Interviews</h2>
          <p className="text-sm text-white/50 mb-6">
            Takes about 5 minutes. 3 Socratic questions per executive, with optional deep-dives.
          </p>
          <button
            onClick={onBegin}
            className="group inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-8 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            {progress && progress.completed > 0 ? "Resume Onboarding" : "Begin Onboarding"}
            <ArrowRight className="ml-2 transition group-hover:translate-x-0.5" size={15} />
          </button>
          <p className="mt-4 text-xs text-white/30">Free during beta. No credit card required.</p>
        </div>

        {/* Sticky Floating CTA Bar */}
      <div
        className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-300 ease-out ${
          showStickyBar ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-4 opacity-0 pointer-events-none"
        }`}
        style={{ width: "min(calc(100vw - 2rem), 480px)" }}
      >
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-black/80 px-5 py-3.5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">Build Your AI Executive Team</p>
            <p className="text-xs text-white/45 truncate">5 min · Free during beta</p>
          </div>
          <button
            onClick={onBegin}
            className="group flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-95"
          >
            {progress && progress.completed > 0 ? "Resume" : "Begin"}
            <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Footer */}
        <p className="mt-10 text-center text-xs text-white/25">
          OpenCommand — The OS for non-human labor.{" "}
          <a href="/" className="underline underline-offset-2 hover:text-white/50 transition-colors">Back to home</a>
        </p>
      </div>
    </main>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProOnboarding() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: false });
  const [step, setStep] = useState<OnboardingStep>("landing");

  // Company / agent state
  const [companyName, setCompanyName] = useState("");
  const [companyMission, setCompanyMission] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companySize, setCompanySize] = useState<string>("");
  const [websiteHint, setWebsiteHint] = useState("");
  const [enrichment, setEnrichment] = useState<{ title?: string; description?: string; h1?: string } | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [briefingFrequency, setBriefingFrequency] = useState<BriefingFrequency>("weekly");
  const [createdAgents, setCreatedAgents] = useState<{ id: number; type: string }[]>([]);
  const [creatingProgress, setCreatingProgress] = useState<string[]>([]);
  const [skippedAgents, setSkippedAgents] = useState<Set<string>>(new Set());

  // Interview state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [onboardingId, setOnboardingId] = useState<number | null>(null);
  const [currentAgentId, setCurrentAgentId] = useState<number | null>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isCoreComplete, setIsCoreComplete] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [coreOnlyMode, setCoreOnlyMode] = useState(false);
  const [suggestedIntegrations, setSuggestedIntegrations] = useState<{ slug: string; name: string; reason: string }[]>([]);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [agentContext, setAgentContext] = useState<{ contextSummary: string; insights: string[]; connectedProviders: string[]; hasLiveData: boolean } | null>(null);
  const [agentContextLoading, setAgentContextLoading] = useState(false);

  // Sigma + strategy + recommendations
  const [strategy, setStrategy] = useState("");
  const [sigmaSynthesis, setSigmaSynthesis] = useState("");
  const [sigmaLoading, setSigmaLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<{ subagents: any[]; goals: any[] } | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);

  // Feedback + survey state
  const [thumbs, setThumbs] = useState<"up" | "down" | null>(null);
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([]);
  const [surveyResponses, setSurveyResponses] = useState<Record<string, string>>({});
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [surveySubmitting, setSurveySubmitting] = useState(false);
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // Guest session state
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestEmailError, setGuestEmailError] = useState("");
  const [guestSession, setGuestSession] = useState<GuestSession | null>(() => {
    try {
      const stored = localStorage.getItem("oc_guest_session");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [guestSubmitting, setGuestSubmitting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // Queries
  const companiesQ = trpc.companies.list.useQuery(undefined, { enabled: !!user });
  const agentsQ = trpc.agents.list.useQuery(undefined, { enabled: !!user });
  const onboardingStatusQ = trpc.onboarding.status.useQuery({ companyId: undefined }, { enabled: !!user });
  const connectionsQ = trpc.hub.connections.useQuery(undefined, { enabled: !!user });

  // Mutations
  const createCompanyMut = trpc.companies.create.useMutation();
  const updateCompanyMut = trpc.companies.update.useMutation();
  const enrichWebsiteMut = trpc.companies.enrichWebsite.useMutation();
  const guestInitMut = trpc.guest.init.useMutation();
  const guestStartMut = trpc.guest.startInterview.useMutation();
  const guestRespondMut = trpc.guest.respond.useMutation();
  const guestSetupCompanyMut = trpc.guest.setupCompany.useMutation();
  const guestGenerateStrategyMut = trpc.guest.generateStrategy.useMutation();
  const guestGenerateRecsMut = trpc.guest.generateRecommendations.useMutation();
  const guestGenerateSurveyMut = trpc.guest.generateSurvey.useMutation();
  const guestSubmitSurveyMut = trpc.guest.submitSurvey.useMutation();
  const createAgentMut = trpc.agents.create.useMutation();
  const startOnboardingMut = trpc.onboarding.start.useMutation();
  const respondMut = trpc.onboarding.respond.useMutation();
  const generateStrategyMut = trpc.onboarding.generateStrategy.useMutation();
  const generateRecsMut = trpc.onboarding.generateRecommendations.useMutation();
  const generateSurveyMut = trpc.onboarding.generateSurvey.useMutation();
  const submitSurveyMut = trpc.onboarding.submitSurvey.useMutation();
  // sigmaCalibrate is handled via generateStrategy
  const liveContextualizeMut = trpc.context.liveContextualize.useMutation();

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Resume detection: once user is loaded and we're past landing, check if they have existing progress
  useEffect(() => {
    if (!user || step !== "company-setup") return;
    const companies = companiesQ.data;
    const agents = agentsQ.data;
    const onboardingStatus = onboardingStatusQ.data;
    if (!companies || !agents || !onboardingStatus) return;

    const existingCompany = companies[0];
    if (!existingCompany) return;

    const csuiteAgents = agents.filter((a: any) =>
      ["ceo", "cto", "cmo", "cfo"].includes(a.type) && a.companyId === existingCompany.id
    );
    if (csuiteAgents.length === 0) return;

    setCompanyId(existingCompany.id);
    setCompanyName(existingCompany.name ?? "");
    setCompanyMission(existingCompany.mission ?? "");
    setCompanyIndustry(existingCompany.industry ?? "");
    setCompanyWebsite((existingCompany as any).website ?? "");
    if ((existingCompany as any).briefingFrequency) {
      setBriefingFrequency((existingCompany as any).briefingFrequency as BriefingFrequency);
    }
    setCreatedAgents(csuiteAgents.map((a: any) => ({ id: a.id, type: a.type })));

    const onboardedTypes = new Set(
      onboardingStatus.agents.filter((a: any) => a.isOnboarded).map((a: any) => a.agentType)
    );
    const nextUnboarded = (["ceo", "cto", "cmo", "cfo"] as ExecType[]).find(t => !onboardedTypes.has(t));
    if (!nextUnboarded) {
      setStep("sigma-calibration");
      setSigmaLoading(true);
      generateStrategyMut.mutateAsync({ companyId: existingCompany.id })
        .then((d: { strategy: string }) => setSigmaSynthesis(d.strategy?.split("\n")[0] ?? ""))
        .catch(() => setSigmaSynthesis("Σ calibration encountered an issue. Proceeding to strategy generation."))
        .finally(() => setSigmaLoading(false));
    } else {
      toast.info("Resuming your onboarding session", { description: `Continuing with ${nextUnboarded.toUpperCase()} setup.` });
      setStep(`integrations-${nextUnboarded}` as OnboardingStep);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, companiesQ.data, agentsQ.data, onboardingStatusQ.data]);

  // Connected provider slugs
  const connectedSlugs = new Set(
    (connectionsQ.data ?? []).filter((c: any) => c.status === "connected").map((c: any) => c.providerSlug)
  );

  // ─── CTA handler: show email gate for guests, or proceed if logged in ────────

  function handleBegin() {
    if (user) {
      // Logged-in user: proceed directly
      setStep("company-setup");
      return;
    }
    if (guestSession) {
      // Returning guest: resume their session
      setCompanyId(guestSession.companyId ?? null);
      setStep("company-setup");
      return;
    }
    // If auth is still loading, treat as guest (don't block the button)
    // New guest: show email gate
    setShowEmailGate(true);
  }

  async function handleGuestSubmit() {
    if (!guestName.trim()) { setGuestEmailError("Please enter your name"); return; }
    if (!guestEmail.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(guestEmail)) {
      setGuestEmailError("Please enter a valid email address"); return;
    }
    setGuestEmailError("");
    setGuestSubmitting(true);
    try {
      // Generate a client-side token, then register with the server
      const token = crypto.randomUUID();
      const result = await guestInitMut.mutateAsync({ name: guestName.trim(), email: guestEmail.trim(), guestToken: token });
      const userId = (result as any).userId as number | undefined;
      const session: GuestSession = { token, name: guestName.trim(), email: guestEmail.trim(), userId: userId ?? 0 };
      localStorage.setItem("oc_guest_session", JSON.stringify(session));
      setGuestSession(session);
      setWaitlistEmail(guestEmail.trim());
      setShowEmailGate(false);
      setStep("company-setup");
    } catch (err: any) {
      setGuestEmailError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setGuestSubmitting(false);
    }
  }

  // ─── Company Setup ────────────────────────────────────────────────────────

  function normalizeUrl(raw: string): string {
    let url = raw.trim();
    if (!url) return "";
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    return url;
  }

  function validateWebsite(raw: string) {
    if (!raw.trim()) { setWebsiteHint(""); return; }
    const normalized = normalizeUrl(raw);
    try {
      new URL(normalized);
      setWebsiteHint("");
    } catch {
      setWebsiteHint("This doesn\u2019t look like a valid URL. We\u2019ll try to auto-fix it.");
    }
  }

  async function handleCompanySetup() {
    if (!companyName.trim()) { toast.error("Please enter a company name"); return; }
    const normalizedWebsite = normalizeUrl(companyWebsite);
    if (normalizedWebsite) setCompanyWebsite(normalizedWebsite);
    try {
      let cId: number;
      if (!user && guestSession) {
        // Guest flow: use guest.createCompany
        const result = await guestSetupCompanyMut.mutateAsync({
          guestToken: guestSession.token,
          companyName: companyName.trim(),
          mission: companyMission.trim() || undefined,
          industry: companyIndustry.trim() || undefined,
          website: normalizedWebsite || undefined,
        });
        cId = result.companyId;
        // Update stored guest session with companyId
        const updated = { ...guestSession, companyId: cId };
        localStorage.setItem("oc_guest_session", JSON.stringify(updated));
        setGuestSession(updated);
      } else {
        // Authenticated flow
        await createCompanyMut.mutateAsync({ name: companyName.trim(), mission: companyMission.trim() || undefined, industry: companyIndustry.trim() || undefined, website: normalizedWebsite || undefined, companySize: (companySize || undefined) as any });
        await utils.companies.list.invalidate();
        const companies = await utils.companies.list.fetch();
        const company = companies[0];
        if (!company) throw new Error("Company not created");
        cId = company.id;
      }
      setCompanyId(cId);
      // Auto-enrich from website in background (auth users only — guest enrichment skipped for simplicity)
      if (normalizedWebsite && user) {
        setEnriching(true);
        enrichWebsiteMut.mutateAsync({ companyId: cId, url: normalizedWebsite })
          .then(result => {
            if (result.success && result.enrichment) {
              setEnrichment(result.enrichment);
              if (!companyMission.trim() && result.enrichment.description) {
                setCompanyMission(result.enrichment.description);
              }
              toast.success("Website analyzed", { description: `Found: ${result.enrichment.title || result.enrichment.h1 || "metadata extracted"}` });
            }
          })
          .catch(() => { /* non-fatal */ })
          .finally(() => setEnriching(false));
      }
      // Skip briefing-frequency step — it's now collected in the post-results survey
      setStep("creating-agents");
      if (!user && guestSession) {
        // Guest flow: agents were already created by guest.setupCompany
        // Fetch them via guest.listAgents and show the animation
        setCreatingProgress([]);
        for (const agent of EXEC_AGENTS) {
          setCreatingProgress(p => [...p, agent.type]);
          await new Promise(r => setTimeout(r, 400));
        }
        // Fetch the created agents
        const guestAgents = await utils.guest.listAgents.fetch({ guestToken: guestSession.token });
        const created = guestAgents.map((a: any) => ({ id: a.id, type: a.type }));
        setCreatedAgents(created);
        await new Promise(r => setTimeout(r, 800));
        setStep("integrations-ceo");
      } else {
        await createAllAgents(cId);
      }
    } catch (err: any) {
      toast.error("Failed to set up company", { description: err.message });
    }
  }

  async function handleBriefingFrequencyConfirm() {
    // Briefing frequency is now collected in the post-results survey.
    // This function is kept for backwards compatibility but skips directly to creating agents.
    if (!companyId) return;
    setStep("creating-agents");
    if (!user && guestSession) {
      setCreatingProgress([]);
      for (const agent of EXEC_AGENTS) {
        setCreatingProgress(p => [...p, agent.type]);
        await new Promise(r => setTimeout(r, 400));
      }
      const guestAgents = await utils.guest.listAgents.fetch({ guestToken: guestSession.token });
      const created = guestAgents.map((a: any) => ({ id: a.id, type: a.type }));
      setCreatedAgents(created);
      await new Promise(r => setTimeout(r, 800));
      setStep("integrations-ceo");
    } else {
      await createAllAgents(companyId);
    }
  }

  async function createAllAgents(cId: number) {
    const created: { id: number; type: string }[] = [];
    for (const agent of EXEC_AGENTS) {
      setCreatingProgress(p => [...p, agent.type]);
      try {
        await createAgentMut.mutateAsync({
          name: agent.name, type: agent.type as any, roleTitle: agent.roleTitle,
          description: agent.description, capabilities: [...agent.capabilities],
          tools: [...agent.tools], companyId: cId,
        });
        await utils.agents.list.invalidate();
        const agents = await utils.agents.list.fetch();
        const found = agents.find((a: any) => a.type === agent.type && a.companyId === cId);
        if (found) created.push({ id: found.id, type: agent.type });
        await new Promise(r => setTimeout(r, 400));
      } catch (err: any) {
        toast.error(`Failed to create ${agent.name}`, { description: err.message });
      }
    }
    setCreatedAgents(created);
    await new Promise(r => setTimeout(r, 800));
    setStep("integrations-ceo");
  }

  // ─── Integration + Interview ──────────────────────────────────────────────

  async function handleConnectOAuth(providerSlug: string) {
    setConnectingProvider(providerSlug);
    const authUrl = `/api/integration/oauth/start?provider=${encodeURIComponent(providerSlug)}&userId=${user?.id ?? ""}&origin=${encodeURIComponent(window.location.origin)}`;
    window.open(authUrl, "_blank");
    toast.info(`Connecting to ${providerSlug}...`, { description: "Complete the authorization in the new tab, then return here." });
    const pollInterval = setInterval(async () => { await connectionsQ.refetch(); }, 3000);
    setTimeout(() => { clearInterval(pollInterval); setConnectingProvider(null); }, 120000);
  }

  async function startAgentOnboarding(onboardStep: OnboardingStep, agents: { id: number; type: string }[]) {
    const agentType = STEP_TO_TYPE[onboardStep];
    const agent = agents.find(a => a.type === agentType);
    if (!agent) { toast.error(`Could not find ${agentType} agent`); return; }
    setCurrentAgentId(agent.id);
    setMessages([]);
    setOnboardingId(null);
    setIsOnboardingComplete(false);
    setIsCoreComplete(false);
    setQuestionCount(0);
    setStep(onboardStep);
    setAgentContext(null);
    setAgentContextLoading(false);

    try {
      if (!user && guestSession) {
        // Guest flow: use guest.startInterview
        const data = await guestStartMut.mutateAsync({ guestToken: guestSession.token, agentType: agentType as "ceo" | "cto" | "cmo" | "cfo" });
        setOnboardingId(data.onboardingId);
        if (data.firstQuestion) setMessages([{ role: "assistant", content: data.firstQuestion }]);
      } else {
        // Authenticated flow
        let fetchedContext: typeof agentContext = null;
        setAgentContextLoading(true);
        try {
          const execAgent = EXEC_AGENTS.find(a => a.type === agentType);
          const ctx = await liveContextualizeMut.mutateAsync({
            requestText: `${execAgent?.roleTitle ?? agentType} onboarding for ${companyName || "the company"} in ${companyIndustry || "technology"}`,
          });
          fetchedContext = { contextSummary: ctx.contextSummary, insights: ctx.insights, connectedProviders: ctx.connectedProviders, hasLiveData: ctx.hasLiveData };
          setAgentContext(fetchedContext);
        } catch { /* non-fatal */ }
        finally { setAgentContextLoading(false); }
        let contextSummary: string | undefined;
        if (fetchedContext?.hasLiveData && fetchedContext.contextSummary) {
          contextSummary = fetchedContext.contextSummary;
          if (fetchedContext.insights.length > 0) contextSummary += "\n\nKey insights:\n" + fetchedContext.insights.map(i => `- ${i}`).join("\n");
        }
        const data = await startOnboardingMut.mutateAsync({ agentId: agent.id, contextSummary });
        setOnboardingId(data.onboardingId);
        if (data.resumed && (data as any).conversationHistory?.length) {
          const history = ((data as any).conversationHistory as { role: string; content: string }[]).map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
          setMessages(history);
          const userMsgCount = history.filter((m: any) => m.role === "user").length;
          setQuestionCount(userMsgCount);
          if (userMsgCount >= 3 && !coreOnlyMode) setIsCoreComplete(true);
        } else if (data.firstQuestion) {
          setMessages([{ role: "assistant", content: data.firstQuestion }]);
        }
      }
    } catch (err: any) {
      toast.error("Failed to start onboarding", { description: err.message });
    }
  }

  async function handleSend() {
    if (!input.trim() || !onboardingId || isSending) return;
    const userMsg = input.trim();
    setInput("");
    const newMessages = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(newMessages);
    setIsSending(true);
    const newUserAnswerCount = newMessages.filter(m => m.role === "user").length;
    setQuestionCount(newUserAnswerCount);
    try {
      let data: { reply: string; isComplete: boolean; suggestedIntegrations?: string[] };
      if (!user && guestSession) {
        data = await guestRespondMut.mutateAsync({ guestToken: guestSession.token, onboardingId, answer: userMsg });
      } else {
        data = await respondMut.mutateAsync({ onboardingId, answer: userMsg });
      }
      if (data.isComplete) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        setIsOnboardingComplete(true);
        if ((data as any).suggestedIntegrations?.length) setSuggestedIntegrations((data as any).suggestedIntegrations);
      } else if (newUserAnswerCount >= 3 && !coreOnlyMode) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        setIsCoreComplete(true);
      } else if (newUserAnswerCount >= 3 && coreOnlyMode) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        let finalData: { reply: string; isComplete: boolean };
        if (!user && guestSession) {
          finalData = await guestRespondMut.mutateAsync({ guestToken: guestSession.token, onboardingId, answer: "I've shared everything relevant — please conclude this interview." });
        } else {
          finalData = await respondMut.mutateAsync({ onboardingId, answer: "I've shared everything relevant — please conclude this interview." });
        }
        setIsOnboardingComplete(true);
        if ((finalData as any).suggestedIntegrations?.length) setSuggestedIntegrations((finalData as any).suggestedIntegrations);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch (err: any) {
      toast.error("Failed to send response", { description: err.message });
    } finally {
      setIsSending(false);
    }
  }

  async function handleContinueOptional() {
    if (!onboardingId) return;
    setIsCoreComplete(false);
    setIsSending(true);
    try {
      let data: { reply: string; isComplete: boolean; suggestedIntegrations?: string[] };
      if (!user && guestSession) {
        data = await guestRespondMut.mutateAsync({ guestToken: guestSession.token, onboardingId, answer: "I'd like to answer the optional questions to give you more context." });
      } else {
        data = await respondMut.mutateAsync({ onboardingId, answer: "I'd like to answer the optional questions to give you more context." });
      }
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      if (data.isComplete) { setIsOnboardingComplete(true); if ((data as any).suggestedIntegrations?.length) setSuggestedIntegrations((data as any).suggestedIntegrations); }
    } catch (err: any) { toast.error("Failed to continue", { description: err.message }); }
    finally { setIsSending(false); }
  }

  async function handleSkipOptional() {
    if (!onboardingId) return;
    setIsCoreComplete(false);
    setIsSending(true);
    try {
      let data: { reply: string; isComplete: boolean; suggestedIntegrations?: string[] };
      if (!user && guestSession) {
        data = await guestRespondMut.mutateAsync({ guestToken: guestSession.token, onboardingId, answer: "That's enough for now. Please finalize the onboarding with what you have." });
      } else {
        data = await respondMut.mutateAsync({ onboardingId, answer: "That's enough for now. Please finalize the onboarding with what you have." });
      }
      if (data.isComplete || (data as any).isCoreComplete) {
        setIsOnboardingComplete(true);
        if ((data as any).suggestedIntegrations?.length) setSuggestedIntegrations((data as any).suggestedIntegrations);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        setIsOnboardingComplete(true);
      }
    } catch (err: any) { toast.error("Failed to finalize", { description: err.message }); }
    finally { setIsSending(false); }
  }

  async function handleNextAgent() {
    const currentIdx = ONBOARDING_ORDER.indexOf(step);
    if (currentIdx < ONBOARDING_ORDER.length - 1) {
      const nextIntStep = INTEGRATION_ORDER[currentIdx + 1];
      if (nextIntStep) setStep(nextIntStep);
    } else {
      await handleSigmaCalibration();
    }
  }

  async function handleSkipAgent() {
    const agentType = STEP_TO_TYPE[step];
    if (!agentType) return;
    setSkippedAgents(prev => new Set(Array.from(prev).concat(agentType)));
    toast.info(`${agentType.toUpperCase()} interview skipped`, { description: "Strategy will be generated using available executive context." });
    const currentIdx = ONBOARDING_ORDER.indexOf(step);
    if (currentIdx < ONBOARDING_ORDER.length - 1) {
      const nextIntStep = INTEGRATION_ORDER[currentIdx + 1];
      if (nextIntStep) setStep(nextIntStep);
    } else {
      await handleSigmaCalibration();
    }
  }

  async function handleSigmaCalibration() {
    if (!companyId) return;
    setStep("sigma-calibration");
    setSigmaLoading(true);
    try {
      let data: { strategy?: string; sigmaSynthesis?: string };
      if (!user && guestSession) {
        data = await guestGenerateStrategyMut.mutateAsync({ guestToken: guestSession.token });
      } else {
        data = await generateStrategyMut.mutateAsync({ companyId });
      }
      setSigmaSynthesis((data as any).sigmaSynthesis ?? data.strategy?.split("\n")[0] ?? "");
    } catch { setSigmaSynthesis("Σ calibration encountered an issue. Proceeding to strategy generation."); }
    finally { setSigmaLoading(false); }
  }

  async function handleGenerateStrategy() {
    if (!companyId) return;
    setStep("generating-strategy");
    try {
      let data: { strategy?: string };
      if (!user && guestSession) {
        data = await guestGenerateStrategyMut.mutateAsync({ guestToken: guestSession.token });
      } else {
        data = await generateStrategyMut.mutateAsync({ companyId });
      }
      setStrategy((data as { strategy: string }).strategy ?? "");
      // Also generate personalized recommendations
      setRecsLoading(true);
      try {
        let recs: { subagents: any[]; goals: any[] };
        if (!user && guestSession) {
          recs = await guestGenerateRecsMut.mutateAsync({ guestToken: guestSession.token }) as { subagents: any[]; goals: any[] };
        } else {
          recs = await generateRecsMut.mutateAsync({ companyId }) as { subagents: any[]; goals: any[] };
        }
        setRecommendations(recs);
      } catch { /* non-fatal */ }
      finally { setRecsLoading(false); }
      setStep("results");
    } catch (err: any) {
      toast.error("Failed to generate strategy", { description: err.message });
      setStep("results");
    }
  }

  function handleLaunch() {
    setStep("feedback");
  }

  function handleDownloadSummary() {
    if (!strategy && !recommendations) return;
    const lines: string[] = [];
    lines.push(`# OpenCommand Executive Intelligence Report`);
    lines.push(`**Company:** ${companyName}`);
    lines.push(`**Generated:** ${new Date().toLocaleDateString()}`);
    lines.push("");
    if (strategy) {
      lines.push("## Strategy");
      lines.push(strategy);
      lines.push("");
    }
    if (recommendations?.subagents?.length) {
      lines.push("## Recommended Subagents");
      recommendations.subagents.forEach(a => {
        lines.push(`### ${a.name}`);
        lines.push(`**Mission:** ${a.mission}`);
        lines.push(`**Horizons:** ${a.horizons}`);
        lines.push(`**Tools:** ${a.tools}`);
        lines.push(`**Autonomy:** ${a.autonomy}`);
        lines.push(`**Guardrails:** ${a.guardrails}`);
        lines.push(`**Why:** ${a.rationale}`);
        lines.push("");
      });
    }
    if (recommendations?.goals?.length) {
      lines.push("## /goals — Formatted Prompts");
      recommendations.goals.forEach(g => {
        lines.push(`### ${g.command}`);
        lines.push(`**Horizon:** ${g.horizon}`);
        lines.push(`**Outcome:** ${g.outcome}`);
        lines.push(`**Context:**`);
        g.context.forEach((c: string) => lines.push(`  - ${c}`));
        lines.push(`**Success Criteria:**`);
        g.success.forEach((s: string) => lines.push(`  - ${s}`));
        lines.push(`**Final Deliverable:** ${g.finalDeliverable}`);
        lines.push("");
      });
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `opencommand-${companyName.toLowerCase().replace(/\s+/g, "-")}-report.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Summary downloaded");
  }

  function handleShareResults() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `${companyName} — OpenCommand Executive Intelligence`, text: `I just built my AI executive team with OpenCommand. Here's my personalized strategy.`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard", { description: "Share this link to show your results." });
    }
  }

  async function handleThumbsSelect(value: "up" | "down") {
    setThumbs(value);
    setSurveyLoading(true);
    try {
      let data: { questions: SurveyQuestion[] };
      if (!user && guestSession) {
        data = await guestGenerateSurveyMut.mutateAsync({ guestToken: guestSession.token, thumbs: value }) as { questions: SurveyQuestion[] };
      } else {
        if (!companyId) return;
        data = await generateSurveyMut.mutateAsync({ companyId, thumbs: value }) as { questions: SurveyQuestion[] };
      }
      setSurveyQuestions(data.questions);
    } catch {
      toast.error("Failed to generate survey questions");
    } finally {
      setSurveyLoading(false);
    }
  }

  async function handleSurveySubmit() {
    if (!thumbs) return;
    setSurveySubmitting(true);
    try {
      const responses = surveyQuestions.map(q => ({ questionId: q.id, answer: surveyResponses[q.id] ?? "" }));
      const bfQuestion = surveyQuestions.find(q => q.id === "q4" && thumbs === "up");
      const bfAnswer = bfQuestion ? (surveyResponses["q4"] ?? "") : undefined;
      const bfMap: Record<string, string> = { "Daily": "daily", "Weekly": "weekly", "Monthly": "monthly", "Quarterly": "quarterly" };
      const bfValue = bfAnswer ? (bfMap[bfAnswer] ?? bfAnswer.toLowerCase()) : briefingFrequency;
      if (!user && guestSession) {
        await guestSubmitSurveyMut.mutateAsync({
          guestToken: guestSession.token,
          thumbs,
          questions: surveyQuestions,
          responses,
          briefingFrequency: bfValue,
          email: waitlistEmail || undefined,
        });
      } else {
        if (!companyId) return;
        await submitSurveyMut.mutateAsync({
          companyId,
          thumbs,
          questions: surveyQuestions,
          responses,
          briefingFrequency: bfValue,
          email: waitlistEmail || undefined,
        });
      }
      setSurveySubmitted(true);
    } catch (err: any) {
      toast.error("Failed to submit survey", { description: err.message });
    } finally {
      setSurveySubmitting(false);
    }
  }

  function handleCopyGoal(goal: any) {
    const text = `${goal.command}\nHorizon: ${goal.horizon}\nOutcome: ${goal.outcome}\nContext:\n${goal.context.map((c: string) => `  - ${c}`).join("\n")}\nSuccess Criteria:\n${goal.success.map((s: string) => `  - ${s}`).join("\n")}\nFinal Deliverable: ${goal.finalDeliverable}`;
    navigator.clipboard.writeText(text);
    toast.success("Goal prompt copied to clipboard");
  }

  // ─── Derived ──────────────────────────────────────────────────────────────

  const currentExecIndex = ONBOARDING_ORDER.indexOf(step);
  const currentExec = EXEC_AGENTS[currentExecIndex] ?? null;
  const integrationExecIndex = INTEGRATION_ORDER.indexOf(step);
  const integrationExec = EXEC_AGENTS[integrationExecIndex] ?? null;

  // ─── Landing ──────────────────────────────────────────────────────────────

  // Compute progress for returning users
  const onboardingProgress = (() => {
    if (!user || !onboardingStatusQ.data) return null;
    const agents = onboardingStatusQ.data.agents ?? [];
    // Only count the 4 executive types (ceo, cto, cmo, cfo) — not Σ synthesis
    const execTypes = new Set(["ceo", "cto", "cmo", "cfo"]);
    const execAgents = agents.filter((a: any) => execTypes.has(a.type));
    const completed = Math.min(execAgents.filter((a: any) => a.isOnboarded).length, 4);
    return { completed, total: 4 };
  })();

  if (step === "landing") {
    return (
      <>
        <LandingSection onBegin={handleBegin} progress={onboardingProgress} />
        {/* Email Gate Modal for new guests */}
        {showEmailGate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#111] p-8 shadow-2xl">
              <button
                onClick={() => setShowEmailGate(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <h3 className="text-lg font-semibold text-white mb-1">Quick intro before we start</h3>
              <p className="text-sm text-white/50 mb-6">We'll use this to personalize your executive team.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Your Name *</label>
                  <Input
                    value={guestName}
                    onChange={e => { setGuestName(e.target.value); setGuestEmailError(""); }}
                    placeholder="e.g. Taylor Smith"
                    className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    onKeyDown={e => e.key === "Enter" && handleGuestSubmit()}
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Email *</label>
                  <Input
                    value={guestEmail}
                    onChange={e => { setGuestEmail(e.target.value); setGuestEmailError(""); }}
                    placeholder="you@company.com"
                    type="email"
                    className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    onKeyDown={e => e.key === "Enter" && handleGuestSubmit()}
                  />
                </div>
                {guestEmailError && <p className="text-xs text-red-400">{guestEmailError}</p>}
              </div>
              <Button
                onClick={handleGuestSubmit}
                disabled={guestSubmitting}
                className="w-full mt-6 h-11 bg-white text-black font-semibold hover:bg-white/90"
              >
                {guestSubmitting ? "Setting up..." : "Continue"}
                <ArrowRight size={14} className="ml-2" />
              </Button>
              <p className="mt-4 text-center text-xs text-white/30">No account needed. Free during beta.</p>
            </div>
          </div>
        )}
      </>
    );
  }

  // ─── Company Setup ────────────────────────────────────────────────────────

  if (step === "company-setup") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="flex items-center gap-2 mb-8">
            <Building2 size={16} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Company Setup</span>
          </div>
          <h2 className="text-2xl font-light text-foreground tracking-tight mb-2">Tell us about your company</h2>
          <p className="text-muted-foreground text-sm mb-8">Your executive agents will use this context to onboard and generate your strategy.</p>
          <div className="space-y-4 mb-8">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Company Name *</label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Acme Corp" className="h-11" onKeyDown={e => e.key === "Enter" && handleCompanySetup()} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Mission / What problem are you solving?</label>
              <Textarea value={companyMission} onChange={e => setCompanyMission(e.target.value)} placeholder="e.g. We help operators automate complex workflows using AI orchestration..." className="resize-none min-h-[80px]" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Industry</label>
              <Input value={companyIndustry} onChange={e => setCompanyIndustry(e.target.value)} placeholder="e.g. SaaS, E-commerce, Healthcare..." className="h-11" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Company Size</label>
              <Select value={companySize} onValueChange={setCompanySize}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select team size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1–10 people</SelectItem>
                  <SelectItem value="11-50">11–50 people</SelectItem>
                  <SelectItem value="51-200">51–200 people</SelectItem>
                  <SelectItem value="201-1000">201–1,000 people</SelectItem>
                  <SelectItem value="1000+">1,000+ people</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Company Website</label>
              <Input
                value={companyWebsite}
                onChange={e => { setCompanyWebsite(e.target.value); validateWebsite(e.target.value); }}
                onBlur={() => {
                  if (companyWebsite.trim() && !/^https?:\/\//i.test(companyWebsite.trim())) {
                    setCompanyWebsite(normalizeUrl(companyWebsite));
                    setWebsiteHint("");
                  }
                }}
                placeholder="e.g. https://acme.com"
                className="h-11"
              />
              {websiteHint && <p className="text-[11px] text-amber-500 mt-1.5">{websiteHint}</p>}
              {!websiteHint && companyWebsite.trim() && <p className="text-[11px] text-muted-foreground mt-1.5">We'll pull metadata from your site to pre-populate context for your executives.</p>}
            </div>
          </div>
          <Button className="w-full h-11 gap-2" onClick={handleCompanySetup} disabled={createCompanyMut.isPending}>
            {createCompanyMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // ─── Briefing Frequency ───────────────────────────────────────────────────

  if (step === "briefing-frequency") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="flex items-center gap-2 mb-8">
            <Calendar size={16} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Briefing Cadence</span>
          </div>
          <h2 className="text-2xl font-light text-foreground tracking-tight mb-2">How often should your executives brief you?</h2>
          <p className="text-muted-foreground text-sm mb-6">Your executive team will deliver strategic briefings on this schedule.</p>
          {enriching && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 mb-6">
              <Loader2 size={12} className="animate-spin text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground">Analyzing your website for context...</p>
            </div>
          )}
          {enrichment && !enriching && (
            <div className="rounded-lg border border-emerald-800/30 bg-emerald-950/10 px-4 py-3 mb-6">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={12} className="text-emerald-400" />
                <p className="text-[11px] font-medium text-emerald-300">Website context extracted</p>
              </div>
              {enrichment.title && <p className="text-xs text-foreground/80">{enrichment.title}</p>}
              {enrichment.description && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{enrichment.description}</p>}
            </div>
          )}
          <div className="space-y-3 mb-6">
            {BRIEFING_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setBriefingFrequency(opt.value)} className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${briefingFrequency === opt.value ? "border-foreground/50 bg-foreground/5" : "border-border hover:border-foreground/20"}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${briefingFrequency === opt.value ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>{opt.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    {opt.value === "weekly" && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-400 border-amber-400/30">Most popular</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${briefingFrequency === opt.value ? "border-foreground" : "border-border"}`}>
                  {briefingFrequency === opt.value && <div className="w-2 h-2 rounded-full bg-foreground" />}
                </div>
              </button>
            ))}
          </div>
          <Button className="w-full h-11 gap-2" onClick={handleBriefingFrequencyConfirm} disabled={updateCompanyMut.isPending}>
            {updateCompanyMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
            Create Executive Team
          </Button>
        </div>
      </div>
    );
  }

  // ─── Creating Agents ──────────────────────────────────────────────────────

  if (step === "creating-agents") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-sm w-full text-center">
          <Loader2 size={24} className="animate-spin text-muted-foreground mx-auto mb-6" />
          <h2 className="text-xl font-light text-foreground mb-2">Assembling your executive team</h2>
          <p className="text-muted-foreground text-xs mb-8">Creating and initializing each C-suite agent...</p>
          <div className="space-y-3">
            {EXEC_AGENTS.map(a => {
              const isDone = creatingProgress.includes(a.type);
              return (
                <div key={a.type} className="flex items-center gap-3 border border-border rounded-lg p-3 text-left">
                  <span className="text-base">{a.icon}</span>
                  <div className="flex-1">
                    <p className="text-xs text-foreground">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground">{a.roleTitle}</p>
                  </div>
                  {isDone ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> : <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── Integration Prompt ───────────────────────────────────────────────────

  if (INTEGRATION_ORDER.includes(step) && integrationExec) {
    const agentType = STEP_TO_TYPE[step];
    const suggestions = ROLE_INTEGRATIONS[agentType] ?? [];
    const completedIntIdx = INTEGRATION_ORDER.indexOf(step);
    const isSkippable = integrationExec.skippable;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-lg w-full">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <span className="text-lg">{integrationExec.icon}</span>
              <div>
                <p className={`text-sm font-medium ${integrationExec.color}`}>{integrationExec.name}</p>
                <p className="text-xs text-muted-foreground">Data Integrations</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {EXEC_AGENTS.map((a, i) => (
                <div key={a.type} className={`w-2 h-2 rounded-full transition-all ${i < completedIntIdx ? "bg-emerald-400" : i === completedIntIdx ? "bg-foreground scale-125" : "bg-border"}`} />
              ))}
            </div>
          </div>
          <h2 className="text-2xl font-light text-foreground tracking-tight mb-2">Power {integrationExec.roleTitle}'s Context Engine</h2>
          <p className="text-muted-foreground text-sm mb-6">Connected tools let us pull real data before the interview starts. Instead of generic questions, {integrationExec.name.split("—")[0].trim()} will reference your actual numbers.</p>
          <div className="space-y-3 mb-6">
            {suggestions.map(s => (
              <div key={s.slug} className="flex items-center gap-4 border border-border rounded-xl p-4 opacity-70">
                <span className="text-xl shrink-0">{s.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-amber-400 border-amber-400/30">Coming Soon</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                </div>
                <Lock size={14} className="text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            {isSkippable && (
              <Button variant="ghost" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={() => {
                setSkippedAgents(prev => new Set(Array.from(prev).concat(agentType)));
                toast.info(`${agentType.toUpperCase()} interview skipped`);
                const nextIntIdx = completedIntIdx + 1;
                if (nextIntIdx < INTEGRATION_ORDER.length) setStep(INTEGRATION_ORDER[nextIntIdx]);
                else handleGenerateStrategy();
              }}>
                <SkipForward size={12} />
                Skip {integrationExec.roleTitle}
              </Button>
            )}
            <Button className="flex-1 h-11 gap-2" onClick={() => startAgentOnboarding(`onboarding-${agentType}` as OnboardingStep, createdAgents)}>
              {connectedSlugs.size > 0 ? <>Start Interview with Live Data <ArrowRight size={14} /></> : <>Start Interview <ArrowRight size={14} /></>}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Interview ────────────────────────────────────────────────────────────

  if (ONBOARDING_ORDER.includes(step) && currentExec) {
    const completedCount = ONBOARDING_ORDER.indexOf(step);
    const isSkippable = currentExec.skippable;
    const maxQuestions = coreOnlyMode ? 3 : 5;
    const totalQuestions = 5;
    const userAnswerCount = messages.filter(m => m.role === "user").length;
    const displayQuestionCount = isCoreComplete ? 3 : isOnboardingComplete ? maxQuestions : Math.min(userAnswerCount, maxQuestions);
    const progressPercent = Math.round(((completedCount * maxQuestions + displayQuestionCount) / (EXEC_AGENTS.length * maxQuestions)) * 100);

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="border-b border-border shrink-0">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">{currentExec.icon}</span>
              <div>
                <p className={`text-sm font-medium ${currentExec.color}`}>{currentExec.name}</p>
                <p className="text-xs text-muted-foreground">
                  Question {displayQuestionCount} of {coreOnlyMode ? 3 : totalQuestions}
                  {coreOnlyMode ? " (speed mode)" : displayQuestionCount <= 3 ? " (required)" : " (optional)"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isOnboardingComplete && !isCoreComplete && (
                <Button variant={coreOnlyMode ? "secondary" : "ghost"} size="sm" className={`gap-1.5 text-xs h-8 ${coreOnlyMode ? "text-amber-400 border-amber-400/30" : "text-muted-foreground hover:text-foreground"}`} onClick={() => { setCoreOnlyMode(prev => !prev); toast.info(coreOnlyMode ? "Optional questions re-enabled" : "Speed mode: only required questions"); }}>
                  <Zap size={12} />
                  {coreOnlyMode ? "Speed Mode ON" : "Speed Mode"}
                </Button>
              )}
              {isSkippable && !isOnboardingComplete && !isCoreComplete && messages.length > 0 && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8" onClick={handleSkipAgent}>
                  <SkipForward size={12} />Skip
                </Button>
              )}
              <div className="flex items-center gap-1.5">
                {EXEC_AGENTS.map((a, i) => (
                  <div key={a.type} className={`w-2 h-2 rounded-full transition-all ${i < completedCount ? "bg-emerald-400" : i === completedCount ? "bg-foreground scale-125" : "bg-border"}`} />
                ))}
              </div>
            </div>
          </div>
          <div className="h-1 bg-border/30 w-full">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="px-6 py-2 flex items-center gap-1.5">
            {Array.from({ length: coreOnlyMode ? 3 : totalQuestions }).map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i < displayQuestionCount ? "bg-emerald-400 w-6" : i === displayQuestionCount && !isOnboardingComplete && !isCoreComplete ? "bg-foreground/60 w-4" : i < 3 ? "bg-border w-3" : "bg-border/40 w-3"}`} />
            ))}
            <span className="text-[10px] text-muted-foreground/50 ml-2">
              {coreOnlyMode ? `${Math.max(0, 3 - displayQuestionCount)} required left` : displayQuestionCount <= 3 ? `${3 - displayQuestionCount} required left` : `${totalQuestions - displayQuestionCount} optional left`}
            </span>
          </div>
        </div>

        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4 max-w-2xl mx-auto w-full">
          {agentContextLoading && currentExec && (
            <div className="rounded-lg border border-border bg-card/60 px-4 py-3 flex items-center gap-3">
              <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">Assembling live context for {currentExec.name.split("—")[0].trim()}...</p>
            </div>
          )}
          {agentContext?.hasLiveData && !agentContextLoading && (
            <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <BarChart3 size={14} className="text-emerald-400" />
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide">Live context assembled</span>
              </div>
              <p className="text-xs text-emerald-200/80 leading-relaxed mb-2">{agentContext.contextSummary}</p>
              {agentContext.insights.length > 0 && (
                <ul className="space-y-1 mb-2">
                  {agentContext.insights.slice(0, 3).map((insight, i) => (
                    <li key={i} className="text-[11px] text-emerald-300/70 flex items-start gap-1.5">
                      <Eye size={10} className="mt-0.5 shrink-0 text-emerald-500" />{insight}
                    </li>
                  ))}
                </ul>
              )}
              {agentContext.connectedProviders.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {agentContext.connectedProviders.map(p => <Badge key={p} variant="outline" className="border-emerald-800/50 text-emerald-500 text-[9px] px-1.5 py-0 capitalize">{p}</Badge>)}
                </div>
              )}
            </div>
          )}
          {messages.length === 0 && <div className="flex items-center justify-center h-32"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${msg.role === "assistant" ? "bg-foreground/10 border border-border" : "bg-foreground text-background"}`}>
                {msg.role === "assistant" ? currentExec.icon : "You"}
              </div>
              <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${msg.role === "assistant" ? "bg-card border border-border text-foreground" : "bg-foreground text-background"}`}>
                {msg.role === "assistant" ? <Streamdown>{msg.content}</Streamdown> : msg.content}
              </div>
            </div>
          ))}
          {/* Choice card after 3rd answer */}
          {isCoreComplete && !isOnboardingComplete && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-full max-w-md rounded-xl border border-border bg-card/60 p-5">
                <p className="text-sm font-medium text-foreground mb-1">{currentExec.name.split("—")[0].trim()} has sufficient context to proceed.</p>
                <p className="text-xs text-muted-foreground mb-5">Go deeper for a richer strategic foundation, or advance to the next executive.</p>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" className="flex-1 text-xs h-9" onClick={handleContinueOptional} disabled={isSending}>
                    {isSending ? <Loader2 size={12} className="animate-spin" /> : null}Go deeper
                  </Button>
                  <Button size="sm" className="flex-1 gap-1.5 text-xs h-9" onClick={handleSkipOptional} disabled={isSending}>
                    {completedCount < EXEC_AGENTS.length - 1 ? <>Advance to {EXEC_AGENTS[completedCount + 1]?.name.split("—")[0].trim()} <ChevronRight size={12} /></> : <>Generate Strategy <Sparkles size={12} /></>}
                  </Button>
                </div>
              </div>
            </div>
          )}
          {/* Completion */}
          {isOnboardingComplete && (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle2 size={28} className="text-emerald-400" />
              <p className="text-sm text-foreground font-medium">{currentExec.name} is fully onboarded.</p>
              {suggestedIntegrations.length > 0 && (
                <div className="w-full max-w-md mt-2">
                  <div className="flex items-center gap-2 mb-3 justify-center">
                    <Zap size={14} className="text-amber-400" />
                    <p className="text-xs font-medium text-amber-400">Data gaps detected — connect these to unlock deeper insights</p>
                  </div>
                  <div className="space-y-2">
                    {suggestedIntegrations.map(integration => (
                      <div key={integration.slug} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/50 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{integration.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{integration.reason}</p>
                        </div>
                        <Button size="sm" variant="outline" className="shrink-0 text-xs gap-1.5 h-8" onClick={() => {
                          if (!user?.id) return;
                          window.open(`/api/integration/oauth/start?provider=${integration.slug}&userId=${user.id}&returnUrl=${encodeURIComponent(window.location.href)}`, "_blank", "width=600,height=700");
                          toast.info(`Connecting ${integration.name}...`, { description: "Complete the authorization in the popup window." });
                        }}>
                          <ExternalLink size={12} /> Connect
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                {completedCount < EXEC_AGENTS.length - 1 ? `Moving on to ${EXEC_AGENTS[completedCount + 1]?.name}...` : "All executives onboarded. Ready to generate your strategy."}
              </p>
              <Button className="gap-2 mt-2" onClick={() => { setSuggestedIntegrations([]); handleNextAgent(); }}>
                {completedCount < EXEC_AGENTS.length - 1 ? <>Next: {EXEC_AGENTS[completedCount + 1]?.name} <ChevronRight size={14} /></> : <>Generate Strategy <Sparkles size={14} /></>}
              </Button>
            </div>
          )}
        </div>

        {/* Input */}
        {!isOnboardingComplete && !isCoreComplete && (
          <div className="border-t border-border px-6 py-4 shrink-0">
            <div className="max-w-2xl mx-auto space-y-2">
              {isSkippable && messages.length > 0 && (
                <p className="text-[11px] text-muted-foreground text-center">
                  This interview is optional —{" "}
                  <button className="underline underline-offset-2 hover:text-foreground transition-colors" onClick={handleSkipAgent}>skip it</button>
                  {" "}and strategy will still be generated.
                </p>
              )}
              <div className="flex gap-3">
                <Input value={input} onChange={e => setInput(e.target.value)} placeholder={`Reply to ${currentExec.name.split("—")[0].trim()}...`} className="h-11 flex-1"
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  disabled={isSending || messages.length === 0}
                />
                <Button className="h-11 w-11 p-0 shrink-0" onClick={handleSend} disabled={!input.trim() || isSending || messages.length === 0}>
                  {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Σ Calibration ────────────────────────────────────────────────────────

  if (step === "sigma-calibration") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-lg w-full text-center">
          <div className="w-16 h-16 rounded-full bg-[#00D4AA]/10 border-2 border-[#00D4AA]/40 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl font-bold text-[#00D4AA]">Σ</span>
          </div>
          {sigmaLoading ? (
            <>
              <h2 className="text-xl font-light text-foreground mb-2">Σ is synthesizing all perspectives</h2>
              <p className="text-muted-foreground text-xs mb-6">Combining insights from {EXEC_AGENTS.length - skippedAgents.size} executives into one highest-leverage recommendation...</p>
              <div className="space-y-2">
                {["Reading ARCH (CEO) context", "Reading FORGE (CTO) context", "Reading SIGNAL (CMO) context", "Reading LEDGER (CFO) context", "Synthesizing into one action"].map(s => (
                  <div key={s} className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                    <Loader2 size={10} className="animate-spin shrink-0" />{s}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-light text-foreground mb-2">Σ Calibration Complete</h2>
              <p className="text-muted-foreground text-xs mb-6">Here's Σ's first synthesis — combining all executive perspectives into one highest-leverage recommendation:</p>
              <div className="text-left border border-[#00D4AA]/30 rounded-xl bg-[#00D4AA]/5 p-5 mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-[#00D4AA]">Σ Highest-Leverage Move</span>
                </div>
                <div className="text-sm text-foreground/90 leading-relaxed prose prose-invert prose-sm max-w-none">
                  <Streamdown>{sigmaSynthesis}</Streamdown>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mb-6">This is what Σ will do every time you run the cascade — collapse all executive thinking into one move.</p>
              <Button className="gap-2 h-11" onClick={handleGenerateStrategy}>Continue to Strategy <ArrowRight size={13} /></Button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Generating Strategy ──────────────────────────────────────────────────

  if (step === "generating-strategy") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-sm w-full text-center">
          <Brain size={28} className="text-foreground mx-auto mb-6 animate-pulse" />
          <h2 className="text-xl font-light text-foreground mb-2">Synthesizing executive intelligence</h2>
          <p className="text-muted-foreground text-xs mb-6">ARCH is combining insights from {EXEC_AGENTS.length - skippedAgents.size} of {EXEC_AGENTS.length} executives to generate your combined strategic plan...</p>
          <div className="space-y-2">
            {["Gathering executive context", "Identifying strategic priorities", "Aligning OKRs and resources", "Drafting combined strategy"].map(s => (
              <div key={s} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 size={10} className="animate-spin shrink-0" />{s}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Tabbed Results (Strategy / Your Team / /goals) ────────────────────────

  if (step === "results") {
    const freqLabel = BRIEFING_OPTIONS.find(o => o.value === briefingFrequency)?.label ?? "Weekly";
    const HORIZON_COLORS: Record<string, string> = {
      "5": "bg-purple-500/15 text-purple-300 border-purple-400/30",
      "4": "bg-blue-500/15 text-blue-300 border-blue-400/30",
      "3": "bg-amber-500/15 text-amber-300 border-amber-400/30",
      "2": "bg-orange-500/15 text-orange-300 border-orange-400/30",
      "1": "bg-red-500/15 text-red-300 border-red-400/30",
    };
    const getHorizonColor = (horizon: string) => {
      const num = horizon.charAt(0);
      return HORIZON_COLORS[num] ?? "bg-muted text-muted-foreground border-border";
    };
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400" />
            <span className="text-sm text-foreground font-medium">Your Personalized Results — {companyName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-muted-foreground border-border text-[10px] gap-1"><Calendar size={10} />{freqLabel} briefings</Badge>
            <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 text-[10px]">Powered by OpenCommand</Badge>
          </div>
        </div>

        {/* 54321 Legend */}
        <div className="border-b border-border px-6 py-3 shrink-0">
          <div className="max-w-4xl mx-auto flex items-center gap-3 flex-wrap">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">54321 Framework:</span>
            {[
              { n: "5", label: "5-Year Vision" },
              { n: "4", label: "4-Month Initiative" },
              { n: "3", label: "3-Week Sprint" },
              { n: "2", label: "2-Day Action" },
              { n: "1", label: "1-Hour Execution" },
            ].map(h => (
              <Badge key={h.n} variant="outline" className={`text-[9px] ${HORIZON_COLORS[h.n]}`}>{h.n} = {h.label}</Badge>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="strategy" className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-border px-6 shrink-0">
            <TabsList className="bg-transparent border-0 h-auto p-0 gap-6">
              <TabsTrigger value="strategy" className="bg-transparent border-0 rounded-none border-b-2 border-transparent data-[state=active]:border-amber-400 data-[state=active]:text-foreground text-muted-foreground px-0 pb-3 pt-3 text-sm gap-2">
                <Sparkles size={13} />Strategy
              </TabsTrigger>
              <TabsTrigger value="team" className="bg-transparent border-0 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-400 data-[state=active]:text-foreground text-muted-foreground px-0 pb-3 pt-3 text-sm gap-2">
                <Bot size={13} />Your Team
              </TabsTrigger>
              <TabsTrigger value="goals" className="bg-transparent border-0 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-400 data-[state=active]:text-foreground text-muted-foreground px-0 pb-3 pt-3 text-sm gap-2">
                <Target size={13} />/goals
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Strategy Tab */}
          <TabsContent value="strategy" className="flex-1 overflow-y-auto px-6 py-8 m-0">
            <div className="max-w-3xl mx-auto w-full">
              {strategy ? (
                <div className="prose prose-invert prose-sm max-w-none"><Streamdown>{strategy}</Streamdown></div>
              ) : (
                <p className="text-muted-foreground text-sm">Strategy generation encountered an issue. You can generate it manually from Mission Control.</p>
              )}
            </div>
          </TabsContent>

          {/* Your Team Tab */}
          <TabsContent value="team" className="flex-1 overflow-y-auto px-6 py-8 m-0">
            <div className="max-w-4xl mx-auto w-full">
              {recsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <Loader2 size={24} className="animate-spin text-blue-400 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Generating personalized team recommendations...</p>
                  </div>
                </div>
              ) : recommendations?.subagents?.length ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-1">Recommended Subagents</h3>
                    <p className="text-xs text-muted-foreground mb-6">These specialized agents extend your core executive team based on your specific business needs.</p>
                  </div>
                  <div className="grid gap-4">
                    {recommendations.subagents.map((agent, i) => (
                      <div key={i} className="border border-border rounded-xl p-5 bg-card/50 hover:bg-card/80 transition-colors">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Bot size={14} className="text-blue-400" />
                              <h4 className="text-sm font-semibold text-foreground">{agent.name}</h4>
                            </div>
                            <p className="text-xs text-muted-foreground">{agent.mission}</p>
                          </div>
                          <Badge variant="outline" className={`text-[9px] shrink-0 ${getHorizonColor(agent.horizons)}`}>
                            <Layers size={9} className="mr-1" />{agent.horizons}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border/50">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Tools</span>
                            <p className="text-xs text-foreground/80 mt-0.5">{agent.tools}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Autonomy</span>
                            <p className="text-xs text-foreground/80 mt-0.5">{agent.autonomy}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Guardrails</span>
                            <p className="text-xs text-foreground/80 mt-0.5">{agent.guardrails}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Why this agent</span>
                          <p className="text-xs text-foreground/70 mt-0.5 italic">{agent.rationale}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <Bot size={24} className="text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Team recommendations will appear here after generation.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* /goals Tab */}
          <TabsContent value="goals" className="flex-1 overflow-y-auto px-6 py-8 m-0">
            <div className="max-w-4xl mx-auto w-full">
              {recsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <Loader2 size={24} className="animate-spin text-emerald-400 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Generating personalized goal prompts...</p>
                  </div>
                </div>
              ) : recommendations?.goals?.length ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-1">/goals — Formatted Prompts</h3>
                    <p className="text-xs text-muted-foreground mb-6">These are ready-to-use goal prompts for the OpenCommand /goals system. Copy any goal to use it directly.</p>
                  </div>
                  <div className="grid gap-4">
                    {recommendations.goals.map((goal, i) => (
                      <div key={i} className="border border-border rounded-xl p-5 bg-card/50 relative group">
                        <button
                          onClick={() => handleCopyGoal(goal)}
                          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-muted"
                          title="Copy goal prompt"
                        >
                          <Copy size={13} className="text-muted-foreground" />
                        </button>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className={`text-[9px] ${getHorizonColor(goal.horizon)}`}>{goal.horizon}</Badge>
                          <code className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">{goal.command}</code>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Outcome</span>
                            <p className="text-sm text-foreground/90 mt-0.5">{goal.outcome}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Context</span>
                            <ul className="mt-1 space-y-0.5">
                              {goal.context.map((c: string, j: number) => (
                                <li key={j} className="text-xs text-foreground/70 flex items-start gap-1.5">
                                  <span className="text-muted-foreground mt-0.5">•</span>{c}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Success Criteria</span>
                            <ul className="mt-1 space-y-0.5">
                              {goal.success.map((s: string, j: number) => (
                                <li key={j} className="text-xs text-foreground/70 flex items-start gap-1.5">
                                  <CheckCircle2 size={10} className="text-emerald-400 mt-0.5 shrink-0" />{s}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Final Deliverable</span>
                            <p className="text-xs text-foreground/80 mt-0.5">{goal.finalDeliverable}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <Target size={24} className="text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Goal prompts will appear here after generation.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 shrink-0">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">Your results are saved. Powered by OpenCommand.</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" onClick={handleDownloadSummary}>
                <Download size={12} />Download Summary
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" onClick={handleShareResults}>
                <Share2 size={12} />Share Results
              </Button>
              <Button size="sm" className="gap-1.5 h-9 text-xs" onClick={handleLaunch}>
                Share Feedback &amp; Join Waitlist <ArrowRight size={12} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Feedback + Waitlist ─────────────────────────────────────────────────

  if (step === "feedback") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-lg w-full">
          {!surveySubmitted ? (
            <>
              {/* Header */}
              <div className="text-center mb-10">
                <div className="w-12 h-12 rounded-full bg-foreground/5 border border-border flex items-center justify-center mx-auto mb-4">
                  <Star size={20} className="text-amber-400" />
                </div>
                <h2 className="text-2xl font-light text-foreground tracking-tight mb-2">How was your experience?</h2>
                <p className="text-muted-foreground text-sm">Your feedback shapes the future of OpenCommand.</p>
              </div>

              {/* Thumbs */}
              {!thumbs && (
                <div className="flex gap-4 justify-center mb-8">
                  <button
                    onClick={() => handleThumbsSelect("up")}
                    className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card/50 hover:border-emerald-400/50 hover:bg-emerald-950/20 transition-all p-8 w-44"
                  >
                    <ThumbsUp size={32} className="text-emerald-400" />
                    <span className="text-sm font-medium text-foreground">Found value</span>
                    <span className="text-xs text-muted-foreground text-center">The insights were relevant and useful</span>
                  </button>
                  <button
                    onClick={() => handleThumbsSelect("down")}
                    className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card/50 hover:border-red-400/50 hover:bg-red-950/20 transition-all p-8 w-44"
                  >
                    <ThumbsDown size={32} className="text-red-400" />
                    <span className="text-sm font-medium text-foreground">Didn't find value</span>
                    <span className="text-xs text-muted-foreground text-center">The experience missed the mark</span>
                  </button>
                </div>
              )}

              {/* Selected thumbs indicator */}
              {thumbs && (
                <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 mb-6 ${
                  thumbs === "up" ? "border-emerald-800/40 bg-emerald-950/10" : "border-red-800/40 bg-red-950/10"
                }`}>
                  {thumbs === "up" ? <ThumbsUp size={14} className="text-emerald-400" /> : <ThumbsDown size={14} className="text-red-400" />}
                  <span className="text-sm text-foreground">{thumbs === "up" ? "You found value" : "You didn't find value"}</span>
                  <button onClick={() => { setThumbs(null); setSurveyQuestions([]); setSurveyResponses({}); }} className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">Change</button>
                </div>
              )}

              {/* Survey loading */}
              {surveyLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 size={20} className="animate-spin text-muted-foreground mx-auto mb-3" />
                    <p className="text-xs text-muted-foreground">Generating personalized questions...</p>
                  </div>
                </div>
              )}

              {/* Survey questions */}
              {!surveyLoading && surveyQuestions.length > 0 && (
                <div className="space-y-6 mb-8">
                  {surveyQuestions.map((q, i) => (
                    <div key={q.id}>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        <span className="text-muted-foreground text-xs mr-2">{i + 1}.</span>{q.text}
                      </label>
                      {q.type === "text" && (
                        <Textarea
                          value={surveyResponses[q.id] ?? ""}
                          onChange={e => setSurveyResponses(prev => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder={q.placeholder || "Your answer..."}
                          className="resize-none min-h-[80px] text-sm"
                        />
                      )}
                      {q.type === "select" && (
                        <div className="space-y-2">
                          {q.options.map(opt => (
                            <button
                              key={opt}
                              onClick={() => setSurveyResponses(prev => ({ ...prev, [q.id]: opt }))}
                              className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-all ${
                                surveyResponses[q.id] === opt
                                  ? "border-foreground/50 bg-foreground/5 text-foreground"
                                  : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                      {q.type === "rating" && (
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map(n => (
                            <button
                              key={n}
                              onClick={() => setSurveyResponses(prev => ({ ...prev, [q.id]: String(n) }))}
                              className={`w-10 h-10 rounded-lg border text-sm font-medium transition-all ${
                                surveyResponses[q.id] === String(n)
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-border text-muted-foreground hover:border-foreground/30"
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Submit survey */}
              {!surveyLoading && surveyQuestions.length > 0 && (
                <Button
                  className="w-full h-11 gap-2"
                  onClick={handleSurveySubmit}
                  disabled={surveySubmitting}
                >
                  {surveySubmitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  Submit Feedback
                </Button>
              )}
            </>
          ) : (
            /* Post-submit: Waitlist CTA */
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-400/10 border-2 border-emerald-400/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-light text-foreground tracking-tight mb-2">Thank you for your feedback</h2>
              <p className="text-muted-foreground text-sm mb-8">Your insights help us build the best AI executive platform for founders and operators.</p>

              {/* Waitlist */}
              <div className="rounded-2xl border border-border bg-card/50 p-6 mb-6">
                <div className="flex items-center gap-2 justify-center mb-1">
                  <Sparkles size={14} className="text-amber-400" />
                  <span className="text-sm font-semibold text-foreground">Get Early Access to OpenCommand</span>
                </div>
                <p className="text-xs text-muted-foreground mb-5">Be first to know when full platform access opens. No spam — just the launch announcement.</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      value={waitlistEmail}
                      onChange={e => setWaitlistEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="h-10 px-4 gap-1.5 shrink-0"
                    onClick={async () => {
                      if (!waitlistEmail.trim()) return;
                      try {
                        await submitSurveyMut.mutateAsync({
                          companyId: companyId!,
                          thumbs: thumbs!,
                          questions: surveyQuestions,
                          responses: surveyQuestions.map(q => ({ questionId: q.id, answer: surveyResponses[q.id] ?? "" })),
                          email: waitlistEmail,
                        });
                        toast.success("You're on the waitlist!", { description: "We'll reach out when access opens." });
                        setWaitlistEmail("");
                      } catch { toast.error("Failed to join waitlist"); }
                    }}
                    disabled={!waitlistEmail.trim()}
                  >
                    Join Waitlist <ArrowRight size={12} />
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" onClick={() => setStep("results")}>
                  Back to Results
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" onClick={handleShareResults}>
                  <Share2 size={12} />Share Results
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Complete ─────────────────────────────────────────────────────────────

  if (step === "complete") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center">
          <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-light text-foreground mb-2">Launching Mission Control...</h2>
          <p className="text-xs text-muted-foreground">Your executive team is ready.</p>
        </div>
      </div>
    );
  }

  return null;
}
