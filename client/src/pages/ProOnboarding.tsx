import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
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
  BarChart3, Plug, Database, Eye, Link2, ExternalLink, Zap,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { useAnalytics } from "@/hooks/useAnalytics";
import { ContextAssemblyAnimation } from "@/components/ContextAssemblyAnimation";

type Message = { role: "user" | "assistant"; content: string };

type BriefingFrequency = "daily" | "weekly" | "monthly" | "quarterly";

type OnboardingStep =
  | "welcome"
  | "company-setup"
  | "briefing-frequency"
  | "creating-agents"
  | "integrations-ceo"
  | "onboarding-ceo"
  | "integrations-cto"
  | "onboarding-cto"
  | "integrations-cmo"
  | "onboarding-cmo"
  | "integrations-cfo"
  | "onboarding-cfo"
  | "generating-strategy"
  | "strategy-reveal"
  | "complete";

const EXEC_AGENTS = [
  { type: "ceo", name: "ARCH — AI CEO", roleTitle: "Chief Executive Officer", description: "Executive Core orchestrating all operations, OKR tracking, and strategic decision-making.", capabilities: ["strategy", "orchestration", "okr-tracking", "decision-making"], tools: ["llm", "calendar", "analytics"], color: "text-amber-400", icon: "👑", skippable: false },
  { type: "cto", name: "SAGE — CTO", roleTitle: "Chief Technology Officer", description: "Deep research and competitive intelligence agent.", capabilities: ["market-research", "competitor-analysis", "data-synthesis", "code-review"], tools: ["github", "jira", "datadog"], color: "text-blue-400", icon: "⚡", skippable: true },
  { type: "cmo", name: "NOVA — CMO", roleTitle: "Chief Marketing Officer", description: "Autonomous marketing agent handling content, campaigns, and lead generation.", capabilities: ["content-creation", "seo", "email-campaigns", "social-media"], tools: ["mailchimp", "analytics", "social-scheduler"], color: "text-purple-400", icon: "✦", skippable: true },
  { type: "cfo", name: "TED — AI CFO", roleTitle: "Chief Financial Officer", description: "Financial intelligence agent managing budget, runway, and fiscal strategy.", capabilities: ["financial-modeling", "budget-tracking", "revenue-analysis", "risk-assessment"], tools: ["stripe", "quickbooks", "analytics"], color: "text-emerald-400", icon: "◈", skippable: true },
];

const BRIEFING_OPTIONS: { value: BriefingFrequency; label: string; description: string; icon: React.ReactNode }[] = [
  { value: "daily", label: "Daily", description: "Morning briefings every day — best for fast-moving operators", icon: <Clock size={16} /> },
  { value: "weekly", label: "Weekly", description: "Monday strategy reviews — the most popular cadence", icon: <Calendar size={16} /> },
  { value: "monthly", label: "Monthly", description: "Deep-dive reviews once a month — ideal for steady-state operations", icon: <CalendarDays size={16} /> },
  { value: "quarterly", label: "Quarterly", description: "High-level strategic reviews — for long-horizon planning", icon: <CalendarRange size={16} /> },
];

// Role-specific integration suggestions
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
    { slug: "tiktok_ads", name: "TikTok Ads", description: "Video ad campaign performance and engagement metrics", icon: "🎵" },
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
  "onboarding-ceo": "ceo",
  "onboarding-cto": "cto",
  "onboarding-cmo": "cmo",
  "onboarding-cfo": "cfo",
  "integrations-ceo": "ceo",
  "integrations-cto": "cto",
  "integrations-cmo": "cmo",
  "integrations-cfo": "cfo",
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
  const [isCoreComplete, setIsCoreComplete] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [strategy, setStrategy] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [agentContext, setAgentContext] = useState<{ contextSummary: string; insights: string[]; connectedProviders: string[]; hasLiveData: boolean } | null>(null);
  const [agentContextLoading, setAgentContextLoading] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [suggestedIntegrations, setSuggestedIntegrations] = useState<{ slug: string; name: string; reason: string }[]>([]);
  const [coreOnlyMode, setCoreOnlyMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { track } = useAnalytics();
  const utils = trpc.useUtils();

  // Queries for resume detection
  const companiesQ = trpc.companies.list.useQuery(undefined, { enabled: true });
  const agentsQ = trpc.agents.list.useQuery(undefined, { enabled: true });
  const onboardingStatusQ = trpc.onboarding.status.useQuery({ companyId: undefined }, { enabled: true });
  const connectionsQ = trpc.hub.connections.useQuery(undefined, { enabled: true });

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
    const typeToIntegrationStep: Record<string, OnboardingStep> = {
      ceo: "integrations-ceo",
      cto: "integrations-cto",
      cmo: "integrations-cmo",
      cfo: "integrations-cfo",
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
      const resumeStep = typeToIntegrationStep[nextUnboarded];
      if (resumeStep) {
        toast.info("Resuming your onboarding session", { description: `Continuing with ${nextUnboarded.toUpperCase()} setup.` });
        setStep(resumeStep);
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

  // Connected provider slugs for quick lookup
  const connectedSlugs = new Set(
    (connectionsQ.data ?? [])
      .filter((c: any) => c.status === "connected")
      .map((c: any) => c.providerSlug)
  );

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
      setStep("briefing-frequency");
    } catch (err: any) {
      toast.error("Failed to set up company", { description: err.message });
    }
  }

  async function handleBriefingFrequencyConfirm() {
    if (!companyId) return;
    try {
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
    // Go to first integration step instead of directly to interview
    setStep("integrations-ceo");
  }

  async function handleConnectOAuth(providerSlug: string) {
    setConnectingProvider(providerSlug);
    try {
      // OAuth is an Express redirect route, not a tRPC procedure
      const authUrl = `/api/integration/oauth/start?provider=${encodeURIComponent(providerSlug)}&userId=${user?.id ?? ""}&origin=${encodeURIComponent(window.location.origin)}`;
      window.open(authUrl, "_blank");
      toast.info(`Connecting to ${providerSlug}...`, {
        description: "Complete the authorization in the new tab, then return here.",
      });
      // Poll for connection status
      const pollInterval = setInterval(async () => {
        await connectionsQ.refetch();
      }, 3000);
      setTimeout(() => clearInterval(pollInterval), 120000); // Stop after 2 min
    } catch (err: any) {
      toast.error(`Failed to start ${providerSlug} connection`, { description: err.message });
    } finally {
      setConnectingProvider(null);
    }
  }

  function handleIntegrationsContinue(agentType: string) {
    const onboardingStep = `onboarding-${agentType}` as OnboardingStep;
    startAgentOnboarding(onboardingStep, createdAgents);
  }

  function handleIntegrationsSkipToInterview(agentType: string) {
    const onboardingStep = `onboarding-${agentType}` as OnboardingStep;
    startAgentOnboarding(onboardingStep, createdAgents);
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
    setIsCoreComplete(false);
    setQuestionCount(0);
    setStep(onboardStep);

    // Fetch live context from connected tools for all agents
    setAgentContext(null);
    setAgentContextLoading(true);
    let fetchedContext: { contextSummary: string; insights: string[]; connectedProviders: string[]; hasLiveData: boolean } | null = null;
    try {
      const roleLabel = EXEC_AGENTS.find(a => a.type === agentType)?.roleTitle ?? agentType;
      const ctx = await liveContextualizeMut.mutateAsync({
        requestText: `${roleLabel} onboarding for ${companyName || "the company"} in ${companyIndustry || "technology"}`,
      });
      fetchedContext = {
        contextSummary: ctx.contextSummary,
        insights: ctx.insights,
        connectedProviders: ctx.connectedProviders,
        hasLiveData: ctx.hasLiveData,
      };
      setAgentContext(fetchedContext);
    } catch {
      // Non-fatal — interview works without live context
    } finally {
      setAgentContextLoading(false);
    }

    try {
      // Use the fetched context directly (not state, which may not be updated yet)
      let contextSummary: string | undefined;
      if (fetchedContext?.hasLiveData && fetchedContext.contextSummary) {
        contextSummary = fetchedContext.contextSummary;
        if (fetchedContext.insights.length > 0) {
          contextSummary += "\n\nKey insights:\n" + fetchedContext.insights.map(i => `- ${i}`).join("\n");
        }
      }
      const data = await startOnboardingMut.mutateAsync({ agentId: agent.id, contextSummary });
      setOnboardingId(data.onboardingId);
      if (data.resumed && (data as any).conversationHistory?.length) {
        // Resume existing conversation
        const history = ((data as any).conversationHistory as { role: string; content: string }[]).map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
        setMessages(history);
        // Count user messages to set question count
        const userMsgCount = history.filter((m: any) => m.role === "user").length;
        setQuestionCount(userMsgCount);
      } else if (data.firstQuestion) {
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
    const newMessages = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(newMessages);
    setIsSending(true);
    const newUserAnswerCount = newMessages.filter(m => m.role === "user").length;
    setQuestionCount(newUserAnswerCount);
    try {
      const data = await respondMut.mutateAsync({ onboardingId, answer: userMsg });
      if (data.isComplete) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        setIsOnboardingComplete(true);
        setQuestionCount(newUserAnswerCount);
        if ((data as any).suggestedIntegrations?.length) {
          setSuggestedIntegrations((data as any).suggestedIntegrations);
        }
      } else if (newUserAnswerCount >= 3 && !coreOnlyMode) {
        // After 3rd answer: show the agent reply, then surface the choice card
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        setIsCoreComplete(true);
      } else if (newUserAnswerCount >= 3 && coreOnlyMode) {
        // Core-only mode: auto-finalize after 3rd answer
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        const finalData = await respondMut.mutateAsync({
          onboardingId,
          answer: "I've shared everything relevant — please conclude this interview.",
        });
        setIsOnboardingComplete(true);
        if ((finalData as any).suggestedIntegrations?.length) {
          setSuggestedIntegrations((finalData as any).suggestedIntegrations);
        }
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch (err: any) {
      toast.error("Failed to send response", { description: err.message });
    } finally {
      setIsSending(false);
    }
  }

  // When user opts to continue with optional questions after core_complete
  async function handleContinueOptional() {
    if (!onboardingId) return;
    setIsCoreComplete(false);
    setIsSending(true);
    try {
      // Send a system message telling the LLM the user wants to continue
      const data = await respondMut.mutateAsync({
        onboardingId,
        answer: "I'd like to answer the optional questions to give you more context.",
      });
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      if (data.isComplete) {
        setIsOnboardingComplete(true);
        if ((data as any).suggestedIntegrations?.length) {
          setSuggestedIntegrations((data as any).suggestedIntegrations);
        }
      }
    } catch (err: any) {
      toast.error("Failed to continue", { description: err.message });
    } finally {
      setIsSending(false);
    }
  }

  // When user opts to skip optional questions and finalize after core_complete
  async function handleSkipOptional() {
    if (!onboardingId) return;
    setIsCoreComplete(false);
    setIsSending(true);
    try {
      // Tell the LLM to finalize with what we have
      const data = await respondMut.mutateAsync({
        onboardingId,
        answer: "That's enough for now. Please finalize the onboarding with what you have.",
      });
      if (data.isComplete || (data as any).isCoreComplete) {
        setIsOnboardingComplete(true);
        if ((data as any).suggestedIntegrations?.length) {
          setSuggestedIntegrations((data as any).suggestedIntegrations);
        }
      } else {
        // LLM didn't finalize — force it
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        setIsOnboardingComplete(true);
      }
    } catch (err: any) {
      toast.error("Failed to finalize", { description: err.message });
    } finally {
      setIsSending(false);
    }
  }

  async function handleNextAgent() {
    const currentIdx = ONBOARDING_ORDER.indexOf(step);
    if (currentIdx < ONBOARDING_ORDER.length - 1) {
      // Go to the next agent's integration step
      const nextIntStep = INTEGRATION_ORDER[currentIdx + 1];
      if (nextIntStep) {
        setStep(nextIntStep);
      }
    } else {
      // All agents onboarded — generate strategy
      await handleGenerateStrategy();
    }
  }

  async function handleSkipAgent() {
    const agentType = STEP_TO_TYPE[step];
    if (!agentType) return;

    setSkippedAgents(prev => new Set(Array.from(prev).concat(agentType)));
    toast.info(`${agentType.toUpperCase()} interview skipped`, {
      description: "Strategy will be generated using available executive context.",
    });

    const currentIdx = ONBOARDING_ORDER.indexOf(step);
    if (currentIdx < ONBOARDING_ORDER.length - 1) {
      const nextIntStep = INTEGRATION_ORDER[currentIdx + 1];
      if (nextIntStep) {
        setStep(nextIntStep);
      }
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
    track("onboarding", "completed", { companyId, agentCount: createdAgents.length, skippedCount: skippedAgents.size });
    setStep("complete");
    setTimeout(() => navigate("/waitlist"), 1200);
  }

  const currentExecIndex = ONBOARDING_ORDER.indexOf(step);
  const currentExec = EXEC_AGENTS[currentExecIndex] ?? null;

  // Also resolve exec for integration steps
  const integrationExecIndex = INTEGRATION_ORDER.indexOf(step);
  const integrationExec = EXEC_AGENTS[integrationExecIndex] ?? null;

  // ── WELCOME ──────────────────────────────────────────────────────────────
  if (step === "welcome") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center">
          <div className="inline-flex items-center gap-2 border border-emerald-500/30 rounded-full px-4 py-1.5 text-xs text-emerald-400 mb-8">
            <Sparkles size={11} />
            Beta Access — Full Features Unlocked
          </div>
          <h1 className="text-4xl font-light text-foreground tracking-tight mb-4">
            Build Your<br /><span className="text-foreground font-normal">AI Executive Team</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-10 max-w-lg mx-auto">
            OpenCommand's self-contextualizing engine connects to your existing tools, pulls real data, and uses it to personalize each executive agent. No copy-pasting. No manual setup. Your agents start informed.
          </p>

          {/* How Self-Contextualization Works — 3-step visual */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 max-w-xl mx-auto text-left">
            <div className="border border-border rounded-xl p-4 relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                  <Plug size={11} className="text-blue-400" />
                </div>
                <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Step 1</span>
              </div>
              <p className="text-xs font-medium text-foreground mb-1">Connect Your Tools</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Link HubSpot, Salesforce, Meta Ads, Google Analytics — whatever you use.</p>
              <ArrowRight size={12} className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
            </div>
            <div className="border border-border rounded-xl p-4 relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                  <Database size={11} className="text-purple-400" />
                </div>
                <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Step 2</span>
              </div>
              <p className="text-xs font-medium text-foreground mb-1">We Pull Your Context</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Pipeline data, ad spend, traffic — pulled and analyzed automatically in real time.</p>
              <ArrowRight size={12} className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
            </div>
            <div className="border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Brain size={11} className="text-amber-400" />
                </div>
                <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Step 3</span>
              </div>
              <p className="text-xs font-medium text-foreground mb-1">Personalized Interviews</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Each executive asks data-informed questions — not generic templates.</p>
            </div>
          </div>

          {/* Executive team preview */}
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3">Your Executive Team</p>
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
          <p className="text-[11px] text-muted-foreground mt-4">Takes about 5 minutes. 3 quick questions per executive, with optional deep-dives.</p>
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
              const day = now.getDay();
              const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7 || 7;
              nextDate = new Date(now);
              nextDate.setDate(nextDate.getDate() + daysUntilMonday);
              nextDate.setHours(8, 0, 0, 0);
            } else if (briefingFrequency === "monthly") {
              nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 8, 0, 0);
            } else {
              const quarterStarts = [0, 3, 6, 9];
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

  // ── INTEGRATION PROMPT STEP ──────────────────────────────────────────────
  if (INTEGRATION_ORDER.includes(step) && integrationExec) {
    const agentType = STEP_TO_TYPE[step];
    const suggestions = ROLE_INTEGRATIONS[agentType] ?? [];
    const completedIntIdx = INTEGRATION_ORDER.indexOf(step);
    const isSkippable = integrationExec.skippable;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-lg w-full">
          {/* Header with progress */}
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
                <div
                  key={a.type}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i < completedIntIdx ? "bg-emerald-400" :
                    i === completedIntIdx ? "bg-foreground scale-125" :
                    "bg-border"
                  }`}
                />
              ))}
            </div>
          </div>

          <h2 className="text-2xl font-light text-foreground tracking-tight mb-2">
            Power {integrationExec.roleTitle}'s Context Engine
          </h2>
          <p className="text-muted-foreground text-sm mb-3">
            Connected tools let us pull real data <span className="text-foreground font-medium">before the interview starts</span>. Instead of asking generic questions, {integrationExec.name.split("\u2014")[0].trim()} will reference your actual numbers.
          </p>
          <div className="rounded-lg border border-dashed border-muted-foreground/20 bg-muted/5 px-4 py-3 mb-6">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2">What we'll pull for this interview</p>
            <div className="flex flex-wrap gap-2">
              {agentType === "ceo" && ["Pipeline velocity", "Deal count", "Revenue trends", "Conversion rates", "Traffic sources"].map(d => (
                <span key={d} className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{d}</span>
              ))}
              {agentType === "cto" && ["Product usage", "Customer feedback", "Technical requirements", "Feature requests"].map(d => (
                <span key={d} className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{d}</span>
              ))}
              {agentType === "cmo" && ["Ad spend & ROAS", "Campaign performance", "Audience data", "Traffic funnels", "Email engagement"].map(d => (
                <span key={d} className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{d}</span>
              ))}
              {agentType === "cfo" && ["Revenue pipeline", "Ad spend efficiency", "Deal forecasts", "Cost per acquisition", "Budget allocation"].map(d => (
                <span key={d} className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{d}</span>
              ))}
            </div>
          </div>

          {/* Integration suggestions */}
          <div className="space-y-3 mb-8">
            {suggestions.map(s => {
              const isConnected = connectedSlugs.has(s.slug);
              const isConnecting = connectingProvider === s.slug;
              return (
                <div
                  key={s.slug}
                  className={`flex items-center gap-4 border rounded-xl p-4 transition-all ${
                    isConnected
                      ? "border-emerald-800/40 bg-emerald-950/10"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  <span className="text-xl shrink-0">{s.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{s.name}</p>
                      {isConnected && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-emerald-400 border-emerald-400/30">
                          Connected
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                  </div>
                  {isConnected ? (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8 shrink-0"
                      onClick={() => handleConnectOAuth(s.slug)}
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Link2 size={12} />
                      )}
                      Connect
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Info note */}
          <div className="rounded-xl border border-border bg-muted/5 px-4 py-3 flex items-start gap-3 mb-6">
            <Database size={14} className="text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connected tools are shared across all executives. You can add more integrations later from the Integration Hub.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {isSkippable && (
              <Button
                variant="ghost"
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSkippedAgents(prev => new Set(Array.from(prev).concat(agentType)));
                  toast.info(`${agentType.toUpperCase()} interview skipped`);
                  const nextIntIdx = completedIntIdx + 1;
                  if (nextIntIdx < INTEGRATION_ORDER.length) {
                    setStep(INTEGRATION_ORDER[nextIntIdx]);
                  } else {
                    handleGenerateStrategy();
                  }
                }}
              >
                <SkipForward size={12} />
                Skip {integrationExec.roleTitle}
              </Button>
            )}
            <Button
              className="flex-1 h-11 gap-2"
              onClick={() => handleIntegrationsContinue(agentType)}
            >
              {connectedSlugs.size > 0 ? (
                <>Start Interview with Live Data <ArrowRight size={14} /></>
              ) : (
                <>Continue Without Integrations <ArrowRight size={14} /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── ONBOARDING INTERVIEWS ────────────────────────────────────────────────────────
  if (ONBOARDING_ORDER.includes(step) && currentExec) {
    const completedCount = ONBOARDING_ORDER.indexOf(step);
    const isSkippable = currentExec.skippable;
    const maxQuestions = coreOnlyMode ? 3 : 5;
    const totalQuestions = 5; // always show 5 dots
    const userAnswerCount = messages.filter(m => m.role === "user").length;
    const displayQuestionCount = isCoreComplete ? 3 : isOnboardingComplete ? maxQuestions : Math.min(userAnswerCount, maxQuestions);
    const progressPercent = Math.round(((completedCount * maxQuestions + displayQuestionCount) / (EXEC_AGENTS.length * maxQuestions)) * 100);

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header with progress bar */}
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
                <Button
                  variant={coreOnlyMode ? "secondary" : "ghost"}
                  size="sm"
                  className={`gap-1.5 text-xs h-8 ${coreOnlyMode ? "text-amber-400 border-amber-400/30" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => {
                    setCoreOnlyMode(prev => !prev);
                    toast.info(coreOnlyMode ? "Optional questions re-enabled" : "Speed mode: only required questions", {
                      description: coreOnlyMode ? "You'll be asked about optional deep-dives after each executive." : "Each executive will auto-complete after 3 core questions.",
                    });
                  }}
                >
                  <Zap size={12} />
                  {coreOnlyMode ? "Speed Mode ON" : "Speed Mode"}
                </Button>
              )}
              {isSkippable && !isOnboardingComplete && !isCoreComplete && messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8"
                  onClick={handleSkipAgent}
                >
                  <SkipForward size={12} />
                  Skip
                </Button>
              )}
              {/* Executive dots */}
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
          {/* Progress bar */}
          <div className="h-1 bg-border/30 w-full">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Question dots for current executive */}
          <div className="px-6 py-2 flex items-center gap-1.5">
            {Array.from({ length: coreOnlyMode ? 3 : totalQuestions }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i < displayQuestionCount
                    ? "bg-emerald-400 w-6"
                    : i === displayQuestionCount && !isOnboardingComplete && !isCoreComplete
                      ? "bg-foreground/60 w-4"
                      : i < 3
                        ? "bg-border w-3"
                        : "bg-border/40 w-3"
                }`}
              />
            ))}
            <span className="text-[10px] text-muted-foreground/50 ml-2">
              {coreOnlyMode
                ? `${Math.max(0, 3 - displayQuestionCount)} required left`
                : displayQuestionCount <= 3
                  ? `${3 - displayQuestionCount} required left`
                  : `${totalQuestions - displayQuestionCount} optional left`
              }
            </span>
          </div>
        </div>

        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4 max-w-2xl mx-auto w-full">
          {/* Context Assembly Animation — shows data flowing from connected tools */}
          {agentContextLoading && currentExec && (
            <ContextAssemblyAnimation
              connectedProviders={agentContext?.connectedProviders ?? (connectionsQ.data?.filter((c: any) => c.status === "connected").map((c: any) => c.provider) ?? [])}
              agentName={currentExec.name.split("\u2014")[0].trim()}
              agentIcon={currentExec.icon}
              isComplete={false}
            />
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
                      <Eye size={10} className="mt-0.5 shrink-0 text-emerald-500" />
                      {insight}
                    </li>
                  ))}
                </ul>
              )}
              {agentContext.connectedProviders.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {agentContext.connectedProviders.map(p => (
                    <Badge key={p} variant="outline" className="border-emerald-800/50 text-emerald-500 text-[9px] px-1.5 py-0 capitalize">{p}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
          {agentContext && !agentContext.hasLiveData && !agentContextLoading && (
            <div className="rounded-lg border border-yellow-800/40 bg-yellow-950/15 px-4 py-3 flex items-center gap-3">
              <Plug size={14} className="text-yellow-500 shrink-0" />
              <p className="text-xs text-yellow-300/80">No connected tools detected. {currentExec.name.split("—")[0].trim()} will ask general questions — connect tools in the Integration Hub for data-informed interviews.</p>
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
          {/* Choice card — shown after 3rd user answer */}
          {isCoreComplete && !isOnboardingComplete && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-full max-w-md rounded-xl border border-border bg-card/60 p-5">
                <p className="text-sm font-medium text-foreground mb-1">
                  {currentExec.name.split("—")[0].trim()} has sufficient context to proceed.
                </p>
                <p className="text-xs text-muted-foreground mb-5">
                  Go deeper for a richer strategic foundation, or advance to the next executive.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-9"
                    onClick={handleContinueOptional}
                    disabled={isSending}
                  >
                    {isSending ? <Loader2 size={12} className="animate-spin" /> : null}
                    Go deeper
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 text-xs h-9"
                    onClick={() => { handleSkipOptional(); }}
                    disabled={isSending}
                  >
                    {completedCount < EXEC_AGENTS.length - 1
                      ? <>Advance to {EXEC_AGENTS[completedCount + 1]?.name.split("—")[0].trim()} <ChevronRight size={12} /></>
                      : <>Generate Strategy <Sparkles size={12} /></>
                    }
                  </Button>
                </div>
              </div>
            </div>
          )}
          {isOnboardingComplete && (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle2 size={28} className="text-emerald-400" />
              <p className="text-sm text-foreground font-medium">{currentExec.name} is fully onboarded.</p>

              {/* Suggested integrations based on detected data gaps */}
              {suggestedIntegrations.length > 0 && (
                <div className="w-full max-w-md mt-2">
                  <div className="flex items-center gap-2 mb-3 justify-center">
                    <Zap size={14} className="text-amber-400" />
                    <p className="text-xs font-medium text-amber-400">Data gaps detected — connect these to unlock deeper insights</p>
                  </div>
                  <div className="space-y-2">
                    {suggestedIntegrations.map((integration) => (
                      <div
                        key={integration.slug}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/50 px-4 py-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{integration.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{integration.reason}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 text-xs gap-1.5 h-8"
                          onClick={() => {
                            if (!user?.id) return;
                            const returnUrl = window.location.href;
                            window.open(
                              `/api/integration/oauth/start?provider=${integration.slug}&userId=${user.id}&returnUrl=${encodeURIComponent(returnUrl)}`,
                              "_blank",
                              "width=600,height=700"
                            );
                            toast.info(`Connecting ${integration.name}...`, { description: "Complete the authorization in the popup window." });
                          }}
                        >
                          <ExternalLink size={12} /> Connect
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center mt-2">
                    You can also connect these later from the Integration Hub.
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center max-w-xs">
                {completedCount < EXEC_AGENTS.length - 1
                  ? `Moving on to ${EXEC_AGENTS[completedCount + 1]?.name}...`
                  : "All executives onboarded. Ready to generate your strategy."}
              </p>
              <Button className="gap-2 mt-2" onClick={() => { setSuggestedIntegrations([]); handleNextAgent(); }}>
                {completedCount < EXEC_AGENTS.length - 1
                  ? <>Next: {EXEC_AGENTS[completedCount + 1]?.name} <ChevronRight size={14} /></>
                  : <>Generate Strategy <Sparkles size={14} /></>
                }
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
            ARCH is combining insights from {EXEC_AGENTS.length - skippedCount} of {EXEC_AGENTS.length} executives to generate your combined strategic plan...
          </p>
          {skippedCount > 0 && (
            <p className="text-[11px] text-muted-foreground/60 mb-6">
              {skippedCount} interview{skippedCount > 1 ? "s" : ""} skipped — ARCH will make informed assumptions for those domains.
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
