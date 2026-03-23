import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Bot, CheckCircle2, Loader2, ArrowRight, Sparkles,
  Send, Building2, Users, Brain, ChevronRight, SkipForward,
  Calendar, Clock, CalendarDays, CalendarRange,
  BarChart3, Plug, Database, Eye,
} from "lucide-react";
import { Streamdown } from "streamdown";

type Message = { role: "user" | "assistant"; content: string };

type BriefingFrequency = "daily" | "weekly" | "monthly" | "quarterly";

type OnboardingStep =
  | "welcome"
  | "company-setup"
  | "briefing-frequency"
  | "creating-agents"
  | "onboarding-ceo"
  | "onboarding-cto"
  | "onboarding-cmo"
  | "onboarding-cfo"
  | "generating-strategy"
  | "strategy-reveal"
  | "complete";

const EXEC_AGENTS = [
  { type: "ceo", name: "Arch — AI CEO", roleTitle: "Chief Executive Officer", description: "Executive Core orchestrating all operations, OKR tracking, and strategic decision-making.", capabilities: ["strategy", "orchestration", "okr-tracking", "decision-making"], tools: ["llm", "calendar", "analytics"], color: "text-amber-400", icon: "👑", skippable: false },
  { type: "cto", name: "SAGE — CTO", roleTitle: "Chief Technology Officer", description: "Deep research and competitive intelligence agent.", capabilities: ["market-research", "competitor-analysis", "data-synthesis", "code-review"], tools: ["github", "jira", "datadog"], color: "text-blue-400", icon: "⚡", skippable: true },
  { type: "cmo", name: "NOVA — CMO", roleTitle: "Chief Marketing Officer", description: "Autonomous marketing agent handling content, campaigns, and lead generation.", capabilities: ["content-creation", "seo", "email-campaigns", "social-media"], tools: ["mailchimp", "analytics", "social-scheduler"], color: "text-purple-400", icon: "✦", skippable: true },
  { type: "cfo", name: "CFO", roleTitle: "Chief Financial Officer", description: "Financial intelligence agent managing budget, runway, and fiscal strategy.", capabilities: ["financial-modeling", "budget-tracking", "revenue-analysis", "risk-assessment"], tools: ["stripe", "quickbooks", "analytics"], color: "text-emerald-400", icon: "◈", skippable: true },
];

const BRIEFING_OPTIONS: { value: BriefingFrequency; label: string; description: string; icon: React.ReactNode }[] = [
  { value: "daily", label: "Daily", description: "Morning briefings every day — best for fast-moving operators", icon: <Clock size={16} /> },
  { value: "weekly", label: "Weekly", description: "Monday strategy reviews — the most popular cadence", icon: <Calendar size={16} /> },
  { value: "monthly", label: "Monthly", description: "Deep-dive reviews once a month — ideal for steady-state operations", icon: <CalendarDays size={16} /> },
  { value: "quarterly", label: "Quarterly", description: "High-level strategic reviews — for long-horizon planning", icon: <CalendarRange size={16} /> },
];

const ONBOARDING_ORDER: OnboardingStep[] = ["onboarding-ceo", "onboarding-cto", "onboarding-cmo", "onboarding-cfo"];
const STEP_TO_TYPE: Record<string, string> = {
  "onboarding-ceo": "ceo",
  "onboarding-cto": "cto",
  "onboarding-cmo": "cmo",
  "onboarding-cfo": "cfo",
};

export default function ProOnboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [companyName, setCompanyName] = useState("");
  const [companyMission, setCompanyMission] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [briefingFrequency, setBriefingFrequency] = useState<BriefingFrequency>("weekly");
  const [createdAgents, setCreatedAgents] = useState<{ id: number; type: string }[]>([]);
  const [creatingProgress, setCreatingProgress] = useState<string[]>([]);
  const [skippedAgents, setSkippedAgents] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [onboardingId, setOnboardingId] = useState<number | null>(null);
  const [currentAgentId, setCurrentAgentId] = useState<number | null>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [strategy, setStrategy] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [ceoContext, setCeoContext] = useState<{ contextSummary: string; insights: string[]; connectedProviders: string[]; hasLiveData: boolean } | null>(null);
  const [ceoContextLoading, setCeoContextLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  // Queries for resume detection
  const companiesQ = trpc.companies.list.useQuery(undefined, { enabled: true });
  const agentsQ = trpc.agents.list.useQuery(undefined, { enabled: true });
  const onboardingStatusQ = trpc.onboarding.status.useQuery({ companyId: undefined }, { enabled: true });

  // Resume detection: on mount, check if user already has a company + agents and resume from correct step
  useEffect(() => {
    const companies = companiesQ.data;
    const agents = agentsQ.data;
    const onboardingStatus = onboardingStatusQ.data;
    if (!companies || !agents || !onboardingStatus || step !== "welcome") return;

    const existingCompany = companies[0];
    if (!existingCompany) return;

    const csuiteAgents = agents.filter((a: any) =>
      ["ceo", "cto", "cmo", "cfo"].includes(a.type) && a.companyId === existingCompany.id
    );
    if (csuiteAgents.length === 0) return;

    // Company + agents exist — restore state and resume
    setCompanyId(existingCompany.id);
    setCompanyName(existingCompany.name ?? "");
    setCompanyMission(existingCompany.mission ?? "");
    setCompanyIndustry(existingCompany.industry ?? "");
    if ((existingCompany as any).briefingFrequency) {
      setBriefingFrequency((existingCompany as any).briefingFrequency as BriefingFrequency);
    }
    const mapped = csuiteAgents.map((a: any) => ({ id: a.id, type: a.type }));
    setCreatedAgents(mapped);

    // Find the first agent not yet onboarded using the onboarding status query
    const typeToStep: Record<string, OnboardingStep> = {
      ceo: "onboarding-ceo",
      cto: "onboarding-cto",
      cmo: "onboarding-cmo",
      cfo: "onboarding-cfo",
    };
    const onboardedTypes = new Set(
      onboardingStatus.agents
        .filter((a: any) => a.isOnboarded)
        .map((a: any) => a.agentType)
    );
    const nextUnboarded = ["ceo", "cto", "cmo", "cfo"].find(t => !onboardedTypes.has(t));
    if (!nextUnboarded) {
      // All onboarded — go straight to strategy
      setStep("generating-strategy");
    } else {
      const resumeStep = typeToStep[nextUnboarded];
      if (resumeStep) {
        toast.info("Resuming your onboarding session", { description: `Continuing with ${nextUnboarded.toUpperCase()} interview.` });
        startAgentOnboarding(resumeStep, mapped);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companiesQ.data, agentsQ.data, onboardingStatusQ.data]);

  // Mutations
  const createCompanyMut = trpc.companies.create.useMutation();
  const updateCompanyMut = trpc.companies.update.useMutation();
  const createAgentMut = trpc.agents.create.useMutation();
  const startOnboardingMut = trpc.onboarding.start.useMutation();
  const respondMut = trpc.onboarding.respond.useMutation();
  const generateStrategyMut = trpc.onboarding.generateStrategy.useMutation();
  const liveContextualizeMut = trpc.context.liveContextualize.useMutation();

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleCompanySetup() {
    if (!companyName.trim()) {
      toast.error("Please enter a company name");
      return;
    }
    try {
      await createCompanyMut.mutateAsync({ name: companyName.trim(), mission: companyMission.trim() || undefined, industry: companyIndustry.trim() || undefined });
      await utils.companies.list.invalidate();
      const companies = await utils.companies.list.fetch();
      const company = companies[0];
      if (!company) throw new Error("Company not created");
      setCompanyId(company.id);
      // Move to briefing frequency selection before creating agents
      setStep("briefing-frequency");
    } catch (err: any) {
      toast.error("Failed to set up company", { description: err.message });
    }
  }

  async function handleBriefingFrequencyConfirm() {
    if (!companyId) return;
    try {
      // Save the briefing frequency to the company record
      await updateCompanyMut.mutateAsync({ id: companyId, briefingFrequency });
      setStep("creating-agents");
      await createAllAgents(companyId);
    } catch (err: any) {
      toast.error("Failed to save briefing preference", { description: err.message });
    }
  }

  async function createAllAgents(cId: number) {
    const created: { id: number; type: string }[] = [];
    for (const agent of EXEC_AGENTS) {
      setCreatingProgress(p => [...p, agent.type]);
      try {
        await createAgentMut.mutateAsync({
          name: agent.name,
          type: agent.type as any,
          roleTitle: agent.roleTitle,
          description: agent.description,
          capabilities: agent.capabilities,
          tools: agent.tools,
          companyId: cId,
        });
        // Fetch agents to get the new IDs
        await utils.agents.list.invalidate();
        const agents = await utils.agents.list.fetch();
        const found = agents.find((a: any) => a.type === agent.type && a.companyId === cId);
        if (found) created.push({ id: found.id, type: agent.type });
        await new Promise(r => setTimeout(r, 400)); // Stagger for visual effect
      } catch (err: any) {
        toast.error(`Failed to create ${agent.name}`, { description: err.message });
      }
    }
    setCreatedAgents(created);
    // Move to first onboarding step
    await new Promise(r => setTimeout(r, 800));
    await startAgentOnboarding("onboarding-ceo", created);
  }

  async function startAgentOnboarding(onboardStep: OnboardingStep, agents: { id: number; type: string }[]) {
    const agentType = STEP_TO_TYPE[onboardStep];
    const agent = agents.find(a => a.type === agentType);
    if (!agent) {
      toast.error(`Could not find ${agentType} agent`);
      return;
    }
    setCurrentAgentId(agent.id);
    setMessages([]);
    setOnboardingId(null);
    setIsOnboardingComplete(false);
    setStep(onboardStep);

    // For CEO interview, fetch live context from connected tools
    if (agentType === "ceo") {
      setCeoContext(null);
      setCeoContextLoading(true);
      try {
        const ctx = await liveContextualizeMut.mutateAsync({ requestText: `CEO onboarding for ${companyName || "the company"} in ${companyIndustry || "technology"}` });
        setCeoContext({
          contextSummary: ctx.contextSummary,
          insights: ctx.insights,
          connectedProviders: ctx.connectedProviders,
          hasLiveData: ctx.hasLiveData,
        });
      } catch {
        // Non-fatal — CEO interview works without live context
      } finally {
        setCeoContextLoading(false);
      }
    }

    try {
      const data = await startOnboardingMut.mutateAsync({ agentId: agent.id });
      setOnboardingId(data.onboardingId);
      if (data.firstQuestion) {
        setMessages([{ role: "assistant", content: data.firstQuestion }]);
      }
    } catch (err: any) {
      toast.error("Failed to start onboarding", { description: err.message });
    }
  }

  async function handleSend() {
    if (!input.trim() || !onboardingId || isSending) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsSending(true);
    try {
      const data = await respondMut.mutateAsync({ onboardingId, answer: userMsg });
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      if (data.isComplete) {
        setIsOnboardingComplete(true);
      }
    } catch (err: any) {
      toast.error("Failed to send response", { description: err.message });
    } finally {
      setIsSending(false);
    }
  }

  async function handleNextAgent() {
    const currentIdx = ONBOARDING_ORDER.indexOf(step);
    const nextStep = ONBOARDING_ORDER[currentIdx + 1];
    if (nextStep) {
      await startAgentOnboarding(nextStep, createdAgents);
    } else {
      // All agents onboarded — generate strategy
      await handleGenerateStrategy();
    }
  }

  async function handleSkipAgent() {
    const agentType = STEP_TO_TYPE[step];
    if (!agentType) return;

    // Mark this agent as skipped
    setSkippedAgents(prev => new Set(Array.from(prev).concat(agentType)));
    toast.info(`${agentType.toUpperCase()} interview skipped`, {
      description: "Strategy will be generated using available executive context.",
    });

    const currentIdx = ONBOARDING_ORDER.indexOf(step);
    const nextStep = ONBOARDING_ORDER[currentIdx + 1];
    if (nextStep) {
      await startAgentOnboarding(nextStep, createdAgents);
    } else {
      await handleGenerateStrategy();
    }
  }

  async function handleGenerateStrategy() {
    if (!companyId) return;
    setStep("generating-strategy");
    try {
      const data = await generateStrategyMut.mutateAsync({ companyId });
      setStrategy(data.strategy ?? "");
      setStep("strategy-reveal");
    } catch (err: any) {
      toast.error("Failed to generate strategy", { description: err.message });
      setStep("strategy-reveal");
    }
  }

  function handleLaunch() {
    setStep("complete");
    setTimeout(() => navigate("/mission-control"), 1200);
  }

  const currentExecIndex = ONBOARDING_ORDER.indexOf(step);
  const currentExec = EXEC_AGENTS[currentExecIndex] ?? null;

  // ── WELCOME ──────────────────────────────────────────────────────────────
  if (step === "welcome") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-xl w-full text-center">
          <div className="inline-flex items-center gap-2 border border-border rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-8">
            <Sparkles size={11} className="text-amber-400" />
            Pro Plan Activated
          </div>
          <h1 className="text-4xl font-light text-foreground tracking-tight mb-4">
            Welcome to<br /><span className="text-foreground font-normal">Personal Intelligence Engine</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-10 max-w-md mx-auto">
            You are about to build your executive team. We will create your C-suite agents, onboard each one with your company context, and generate your first combined strategic plan.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-10 max-w-sm mx-auto text-left">
            {EXEC_AGENTS.map(a => (
              <div key={a.type} className="flex items-center gap-2.5 border border-border rounded-lg p-3">
                <span className="text-base">{a.icon}</span>
                <div>
                  <p className={`text-xs font-medium ${a.color}`}>{a.roleTitle}</p>
                  <p className="text-[10px] text-muted-foreground">{a.name.split("—")[0].trim()}</p>
                </div>
              </div>
            ))}
          </div>
          <Button className="h-11 px-8 gap-2" onClick={() => setStep("company-setup")}>
            Begin Setup <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    );
  }

  // ── COMPANY SETUP ────────────────────────────────────────────────────────
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
              <Input
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="h-11"
                onKeyDown={e => e.key === "Enter" && handleCompanySetup()}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Mission / What problem are you solving?</label>
              <Textarea
                value={companyMission}
                onChange={e => setCompanyMission(e.target.value)}
                placeholder="e.g. We help operators automate complex workflows using AI orchestration..."
                className="resize-none min-h-[80px]"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Industry</label>
              <Input
                value={companyIndustry}
                onChange={e => setCompanyIndustry(e.target.value)}
                placeholder="e.g. AI / SaaS"
                className="h-11"
              />
            </div>
          </div>
          <Button
            className="w-full h-11 gap-2"
            onClick={handleCompanySetup}
            disabled={createCompanyMut.isPending || !companyName.trim()}
          >
            {createCompanyMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // ── BRIEFING FREQUENCY ───────────────────────────────────────────────────
  if (step === "briefing-frequency") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="flex items-center gap-2 mb-8">
            <Calendar size={16} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Strategy Briefings</span>
          </div>
          <h2 className="text-2xl font-light text-foreground tracking-tight mb-2">How often do you want strategy briefings?</h2>
          <p className="text-muted-foreground text-sm mb-8">
            Your executive team will deliver strategy updates on this cadence. You can change this at any time from your company settings.
          </p>
          <div className="space-y-3 mb-8">
            {BRIEFING_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setBriefingFrequency(opt.value)}
                className={`w-full flex items-start gap-4 border rounded-xl p-4 text-left transition-all ${
                  briefingFrequency === opt.value
                    ? "border-foreground bg-foreground/5"
                    : "border-border hover:border-foreground/40"
                }`}
              >
                <div className={`mt-0.5 shrink-0 ${briefingFrequency === opt.value ? "text-foreground" : "text-muted-foreground"}`}>
                  {opt.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${briefingFrequency === opt.value ? "text-foreground" : "text-foreground/80"}`}>
                      {opt.label}
                    </p>
                    {opt.value === "weekly" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-400 border-amber-400/30">
                        Most popular
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                  briefingFrequency === opt.value ? "border-foreground" : "border-border"
                }`}>
                  {briefingFrequency === opt.value && (
                    <div className="w-2 h-2 rounded-full bg-foreground" />
                  )}
                </div>
              </button>
            ))}
          </div>
          {/* Briefing preview card */}
          {(() => {
            const now = new Date();
            let nextDate: Date;
            if (briefingFrequency === "daily") {
              nextDate = new Date(now);
              nextDate.setDate(nextDate.getDate() + (now.getHours() >= 8 ? 1 : 0));
              nextDate.setHours(8, 0, 0, 0);
            } else if (briefingFrequency === "weekly") {
              // Next Monday
              const day = now.getDay(); // 0=Sun
              const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7 || 7;
              nextDate = new Date(now);
              nextDate.setDate(nextDate.getDate() + daysUntilMonday);
              nextDate.setHours(8, 0, 0, 0);
            } else if (briefingFrequency === "monthly") {
              // 1st of next month
              nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 8, 0, 0);
            } else {
              // Quarterly: next 1st of Jan/Apr/Jul/Oct
              const quarterStarts = [0, 3, 6, 9]; // month indices
              const currentMonth = now.getMonth();
              const nextQStart = quarterStarts.find(m => m > currentMonth) ?? 0;
              const nextYear = nextQStart === 0 ? now.getFullYear() + 1 : now.getFullYear();
              nextDate = new Date(nextYear, nextQStart, 1, 8, 0, 0);
            }
            const formatted = nextDate.toLocaleString(undefined, {
              weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
            });
            return (
              <div className="mb-6 rounded-xl border border-border bg-muted/5 px-4 py-3 flex items-start gap-3">
                <Clock size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your first briefing will arrive{" "}
                  <span className="text-foreground font-medium">{formatted}</span>.
                </p>
              </div>
            );
          })()}
          <Button
            className="w-full h-11 gap-2"
            onClick={handleBriefingFrequencyConfirm}
            disabled={updateCompanyMut.isPending}
          >
            {updateCompanyMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
            Create Executive Team
          </Button>
        </div>
      </div>
    );
  }

  // ── CREATING AGENTS ──────────────────────────────────────────────────────
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
                  {isDone
                    ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    : <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />
                  }
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── ONBOARDING INTERVIEWS ────────────────────────────────────────────────
  if (ONBOARDING_ORDER.includes(step) && currentExec) {
    const completedCount = ONBOARDING_ORDER.indexOf(step);
    const isSkippable = currentExec.skippable;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-lg">{currentExec.icon}</span>
            <div>
              <p className={`text-sm font-medium ${currentExec.color}`}>{currentExec.name}</p>
              <p className="text-xs text-muted-foreground">{currentExec.roleTitle} Onboarding</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Skip button for CTO and CFO */}
            {isSkippable && !isOnboardingComplete && messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8"
                onClick={handleSkipAgent}
              >
                <SkipForward size={12} />
                Skip interview
              </Button>
            )}
            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {EXEC_AGENTS.map((a, i) => (
                <div
                  key={a.type}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i < completedCount ? "bg-emerald-400" :
                    i === completedCount ? "bg-foreground scale-125" :
                    "bg-border"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4 max-w-2xl mx-auto w-full">
          {/* CEO Context Card — shows live data assembled from connected tools */}
          {step === "onboarding-ceo" && ceoContextLoading && (
            <div className="rounded-lg border border-blue-800/40 bg-blue-950/20 px-4 py-3 flex items-center gap-3">
              <Loader2 size={14} className="animate-spin text-blue-400" />
              <div>
                <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wide">Assembling context from your tools...</p>
                <p className="text-xs text-blue-200/60 mt-0.5">Reading pipeline data to inform the interview</p>
              </div>
            </div>
          )}
          {step === "onboarding-ceo" && ceoContext?.hasLiveData && (
            <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <BarChart3 size={14} className="text-emerald-400" />
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide">Live context assembled</span>
              </div>
              <p className="text-xs text-emerald-200/80 leading-relaxed mb-2">{ceoContext.contextSummary}</p>
              {ceoContext.insights.length > 0 && (
                <ul className="space-y-1 mb-2">
                  {ceoContext.insights.slice(0, 3).map((insight, i) => (
                    <li key={i} className="text-[11px] text-emerald-300/70 flex items-start gap-1.5">
                      <Eye size={10} className="mt-0.5 shrink-0 text-emerald-500" />
                      {insight}
                    </li>
                  ))}
                </ul>
              )}
              {ceoContext.connectedProviders.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {ceoContext.connectedProviders.map(p => (
                    <Badge key={p} variant="outline" className="border-emerald-800/50 text-emerald-500 text-[9px] px-1.5 py-0 capitalize">{p}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
          {step === "onboarding-ceo" && ceoContext && !ceoContext.hasLiveData && !ceoContextLoading && (
            <div className="rounded-lg border border-yellow-800/40 bg-yellow-950/15 px-4 py-3 flex items-center gap-3">
              <Plug size={14} className="text-yellow-500 shrink-0" />
              <p className="text-xs text-yellow-300/80">No connected tools detected. Arch will ask general questions — connect your CRM in the Integration Hub for data-informed onboarding.</p>
            </div>
          )}
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={18} className="animate-spin text-muted-foreground" />
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                msg.role === "assistant" ? "bg-foreground/10 border border-border" : "bg-foreground text-background"
              }`}>
                {msg.role === "assistant" ? currentExec.icon : "You"}
              </div>
              <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-card border border-border text-foreground"
                  : "bg-foreground text-background"
              }`}>
                {msg.role === "assistant"
                  ? <Streamdown>{msg.content}</Streamdown>
                  : msg.content
                }
              </div>
            </div>
          ))}
          {isOnboardingComplete && (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle2 size={28} className="text-emerald-400" />
              <p className="text-sm text-foreground font-medium">{currentExec.name} is fully onboarded.</p>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                {completedCount < EXEC_AGENTS.length - 1
                  ? `Moving on to ${EXEC_AGENTS[completedCount + 1]?.name}...`
                  : "All executives onboarded. Ready to generate your strategy."}
              </p>
              <Button className="gap-2 mt-2" onClick={handleNextAgent}>
                {completedCount < EXEC_AGENTS.length - 1
                  ? <>Next: {EXEC_AGENTS[completedCount + 1]?.name} <ChevronRight size={14} /></>
                  : <>Generate Strategy <Sparkles size={14} /></>
                }
              </Button>
            </div>
          )}
        </div>

        {/* Input */}
        {!isOnboardingComplete && (
          <div className="border-t border-border px-6 py-4 shrink-0">
            <div className="max-w-2xl mx-auto space-y-2">
              {/* Skip hint for skippable agents */}
              {isSkippable && messages.length > 0 && (
                <p className="text-[11px] text-muted-foreground text-center">
                  This interview is optional — you can{" "}
                  <button
                    className="underline underline-offset-2 hover:text-foreground transition-colors"
                    onClick={handleSkipAgent}
                  >
                    skip it
                  </button>
                  {" "}and strategy will still be generated.
                </p>
              )}
              <div className="flex gap-3">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={`Reply to ${currentExec.name.split("—")[0].trim()}...`}
                  className="h-11 flex-1"
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={isSending || messages.length === 0}
                />
                <Button
                  className="h-11 w-11 p-0 shrink-0"
                  onClick={handleSend}
                  disabled={!input.trim() || isSending || messages.length === 0}
                >
                  {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── GENERATING STRATEGY ──────────────────────────────────────────────────
  if (step === "generating-strategy") {
    const skippedCount = skippedAgents.size;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-sm w-full text-center">
          <Brain size={28} className="text-foreground mx-auto mb-6 animate-pulse" />
          <h2 className="text-xl font-light text-foreground mb-2">Synthesizing executive intelligence</h2>
          <p className="text-muted-foreground text-xs mb-2">
            Arch is combining insights from {EXEC_AGENTS.length - skippedCount} of {EXEC_AGENTS.length} executives to generate your combined strategic plan...
          </p>
          {skippedCount > 0 && (
            <p className="text-[11px] text-muted-foreground/60 mb-6">
              {skippedCount} interview{skippedCount > 1 ? "s" : ""} skipped — Arch will make informed assumptions for those domains.
            </p>
          )}
          {skippedCount === 0 && <div className="mb-6" />}
          <div className="space-y-2">
            {["Gathering executive context", "Identifying strategic priorities", "Aligning OKRs and resources", "Drafting combined strategy"].map((s) => (
              <div key={s} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 size={10} className="animate-spin shrink-0" />
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── STRATEGY REVEAL ──────────────────────────────────────────────────────
  if (step === "strategy-reveal") {
    const freqLabel = BRIEFING_OPTIONS.find(o => o.value === briefingFrequency)?.label ?? "Weekly";
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400" />
            <span className="text-sm text-foreground">Combined Strategy — {companyName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-muted-foreground border-border text-[10px] gap-1">
              <Calendar size={10} />
              {freqLabel} briefings
            </Badge>
            <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 text-[10px]">
              Generated by Personal Intelligence Engine
            </Badge>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-8 max-w-3xl mx-auto w-full">
          {strategy ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <Streamdown>{strategy}</Streamdown>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Strategy generation encountered an issue. You can generate it manually from Mission Control.</p>
          )}
        </div>
        <div className="border-t border-border px-6 py-4 shrink-0">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Your strategy is saved to Mission Control. Next briefing: {freqLabel.toLowerCase()}.</p>
            <Button className="gap-2 h-10" onClick={handleLaunch}>
              Launch Mission Control <ArrowRight size={13} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── COMPLETE ─────────────────────────────────────────────────────────────
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
