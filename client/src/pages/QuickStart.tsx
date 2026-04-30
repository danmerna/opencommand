import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { ArrowRight, Globe, Zap, Loader2, CheckCircle2, AlertCircle, ExternalLink, Copy, Share2, Mail } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

type QuickStartStep = "input" | "analyzing" | "email-gate" | "results";

export default function QuickStart() {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<QuickStartStep>("input");
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [email, setEmail] = useState("");
  const [shareId, setShareId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    recommendation: string;
    auditStatus: string;
    auditSummary: string | null;
    seoScore: number | null;
    companyId: number;
  } | null>(null);

  const quickStartMutation = trpc.onboarding.quickStart.useMutation({
    onSuccess: (data) => {
      setResult({
        recommendation: data.recommendation,
        auditStatus: data.auditStatus ?? "pending",
        auditSummary: data.auditSummary ?? null,
        seoScore: data.seoScore ?? null,
        companyId: data.companyId,
      });
      setShareId(data.shareId);
      setStep("results");
    },
    onError: () => {
      setStep("input");
      toast.error("Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !website.trim()) return;
    // Show email gate before running analysis
    setStep("email-gate");
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runAnalysis();
  };

  const handleSkipEmail = () => {
    runAnalysis();
  };

  const runAnalysis = () => {
    setStep("analyzing");
    quickStartMutation.mutate({
      companyName: companyName.trim(),
      website: website.trim().startsWith("http") ? website.trim() : `https://${website.trim()}`,
      industry: industry.trim() || undefined,
      email: email.trim() || undefined,
    });
  };

  const shareUrl = shareId ? `${window.location.origin}/results/${shareId}` : "";

  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard");
  };

  const handleShare = () => {
    if (!shareUrl) return;
    if (navigator.share) {
      navigator.share({
        title: `${companyName} — AI Chief of Staff Recommendation`,
        text: `Check out this AI-generated highest-leverage recommendation for ${companyName}`,
        url: shareUrl,
      }).catch(() => copyLink());
    } else {
      copyLink();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#00D4AA]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#00D4AA]/10 flex items-center justify-center">
            <Zap className="w-8 h-8 text-[#00D4AA]" />
          </div>
          <h1 className="text-2xl font-bold">Quick Start</h1>
          <p className="text-muted-foreground">Sign in to get your instant AI Chief of Staff recommendation.</p>
          <a
            href={getLoginUrl("/quick-start")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#00D4AA] text-black font-medium rounded-lg hover:bg-[#00B894] transition-colors"
          >
            Sign In to Continue <ArrowRight size={16} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/chief-of-staff" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
            <ArrowRight size={14} className="rotate-180" /> Back to AI Chief of Staff
          </Link>
          <span className="text-xs text-[#00D4AA] font-medium tracking-wider uppercase">Quick Start</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-16">
        {step === "input" && (
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#00D4AA]/10 flex items-center justify-center">
                <Zap className="w-7 h-7 text-[#00D4AA]" />
              </div>
              <h1 className="text-3xl font-bold">Get Your First Recommendation</h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Enter your website and Σ will analyze your digital presence, then deliver your single highest-leverage move in under 60 seconds.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Company Name *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/40"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Website URL *</label>
                <div className="relative">
                  <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="e.g. acmecorp.com"
                    className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/40"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Industry <span className="text-muted-foreground/60">(optional)</span></label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. AI / SaaS"
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/40"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#00D4AA] text-black font-semibold rounded-lg hover:bg-[#00B894] transition-colors flex items-center justify-center gap-2"
              >
                <Zap size={16} />
                Analyze & Get Recommendation
              </button>

              <p className="text-center text-xs text-muted-foreground">
                Takes ~30-60 seconds. We'll scrape your site, analyze your SEO, tech stack, and content, then deliver your highest-leverage move.
              </p>
            </form>

            <div className="pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Want the full experience?{" "}
                <Link href="/onboarding/pro" className="text-[#00D4AA] hover:underline">
                  Start Executive Onboarding
                </Link>{" "}
                for a complete 4-executive interview + strategy generation.
              </p>
            </div>
          </div>
        )}

        {step === "email-gate" && (
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#00D4AA]/10 flex items-center justify-center">
                <Mail className="w-7 h-7 text-[#00D4AA]" />
              </div>
              <h1 className="text-2xl font-bold">Where should we send your results?</h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Enter your email to receive a shareable link to your recommendation. You can also share it with your team.
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/40"
                  />
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-[#00D4AA] mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <span className="text-foreground font-medium">Analyzing:</span> {companyName} ({website})
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-[#00D4AA] mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    You'll get a shareable link to forward your recommendation to teammates
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#00D4AA] text-black font-semibold rounded-lg hover:bg-[#00B894] transition-colors flex items-center justify-center gap-2"
              >
                <Zap size={16} />
                Generate My Recommendation
              </button>

              <button
                type="button"
                onClick={handleSkipEmail}
                className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip — I'll just view the results now
              </button>
            </form>
          </div>
        )}

        {step === "analyzing" && (
          <div className="text-center space-y-8 py-12">
            <div className="w-20 h-20 mx-auto rounded-full bg-[#00D4AA]/10 flex items-center justify-center animate-pulse">
              <Zap className="w-10 h-10 text-[#00D4AA]" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold">Σ is analyzing your business...</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Scraping your website, checking SEO, detecting tech stack, and synthesizing your highest-leverage recommendation.
              </p>
            </div>

            <div className="max-w-sm mx-auto space-y-3">
              {[
                { label: "Fetching website metadata", delay: "0s" },
                { label: "Running technical SEO audit", delay: "0.5s" },
                { label: "Detecting tech stack & integrations", delay: "1s" },
                { label: "Analyzing content & positioning", delay: "1.5s" },
                { label: "Σ synthesizing recommendation", delay: "2s" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-sm text-muted-foreground opacity-0 animate-[fadeIn_0.4s_ease_forwards]"
                  style={{ animationDelay: item.delay }}
                >
                  <Loader2 size={14} className="animate-spin text-[#00D4AA]" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(4px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </div>
        )}

        {step === "results" && result && (
          <div className="space-y-8">
            {/* Success header */}
            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#00D4AA]/20 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-[#00D4AA]" />
              </div>
              <h1 className="text-2xl font-bold">Your Highest-Leverage Move</h1>
              <p className="text-sm text-muted-foreground">
                Based on Σ's analysis of <span className="text-foreground font-medium">{website}</span>
              </p>
            </div>

            {/* Share bar */}
            {shareId && (
              <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg">
                <div className="flex-1 text-xs text-muted-foreground truncate font-mono">
                  {shareUrl}
                </div>
                <button
                  onClick={copyLink}
                  className="shrink-0 p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  title="Copy link"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={handleShare}
                  className="shrink-0 p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  title="Share"
                >
                  <Share2 size={14} />
                </button>
              </div>
            )}

            {/* Audit summary badges */}
            {(result.seoScore !== null || result.auditSummary) && (
              <div className="flex flex-wrap gap-3 justify-center">
                {result.seoScore !== null && (
                  <div className="px-3 py-1.5 rounded-full bg-card border border-border text-xs flex items-center gap-1.5">
                    <span className="text-muted-foreground">SEO Score:</span>
                    <span className={`font-semibold ${result.seoScore >= 70 ? "text-green-400" : result.seoScore >= 40 ? "text-amber-400" : "text-red-400"}`}>
                      {result.seoScore}/100
                    </span>
                  </div>
                )}
                {result.auditStatus === "complete" && (
                  <div className="px-3 py-1.5 rounded-full bg-card border border-border text-xs flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-[#00D4AA]" />
                    <span className="text-muted-foreground">Full audit complete</span>
                  </div>
                )}
                {result.auditStatus !== "complete" && (
                  <div className="px-3 py-1.5 rounded-full bg-card border border-border text-xs flex items-center gap-1.5">
                    <AlertCircle size={12} className="text-amber-400" />
                    <span className="text-muted-foreground">Audit in progress</span>
                  </div>
                )}
              </div>
            )}

            {/* Σ Recommendation */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#00D4AA]/20 flex items-center justify-center">
                  <span className="text-[#00D4AA] font-bold text-xs">Σ</span>
                </div>
                <span className="text-sm font-medium text-[#00D4AA]">Sigma — Highest-Leverage Synthesis</span>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <Streamdown>{result.recommendation}</Streamdown>
              </div>
            </div>

            {/* Next steps */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/onboarding/pro"
                className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-[#00D4AA]/40 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#00D4AA]/10 flex items-center justify-center shrink-0">
                  <ArrowRight size={16} className="text-[#00D4AA]" />
                </div>
                <div>
                  <div className="text-sm font-medium group-hover:text-[#00D4AA] transition-colors">Full Executive Onboarding</div>
                  <div className="text-xs text-muted-foreground">4 executive interviews + deeper strategy</div>
                </div>
              </Link>

              <Link
                href="/sigma-chat"
                className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-[#00D4AA]/40 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#00D4AA]/10 flex items-center justify-center shrink-0">
                  <Zap size={16} className="text-[#00D4AA]" />
                </div>
                <div>
                  <div className="text-sm font-medium group-hover:text-[#00D4AA] transition-colors">Chat with Σ</div>
                  <div className="text-xs text-muted-foreground">Continue the conversation with Sigma</div>
                </div>
              </Link>
            </div>

            {/* Audit summary if available */}
            {result.auditSummary && (
              <details className="bg-card border border-border rounded-xl p-4">
                <summary className="text-sm font-medium cursor-pointer hover:text-[#00D4AA] transition-colors flex items-center gap-2">
                  <ExternalLink size={14} />
                  View Full Website Audit Summary
                </summary>
                <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">
                  {result.auditSummary}
                </div>
              </details>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
