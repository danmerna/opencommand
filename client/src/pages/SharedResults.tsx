import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, CheckCircle2, Globe, Zap, ArrowRight, Copy, Share2 } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

export default function SharedResults() {
  const params = useParams<{ shareId: string }>();
  const shareId = params.shareId ?? "";

  const resultQ = trpc.onboarding.getSharedResult.useQuery(
    { shareId },
    { enabled: !!shareId }
  );

  const result = resultQ.data;

  const shareUrl = window.location.href;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${result?.companyName ?? "Company"} — AI Chief of Staff Recommendation`,
        text: `Check out this AI-generated highest-leverage recommendation`,
        url: shareUrl,
      }).catch(() => copyLink());
    } else {
      copyLink();
    }
  };

  if (resultQ.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={24} className="text-[#00D4AA] mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground text-sm">Loading recommendation...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Zap size={32} className="text-muted-foreground mx-auto mb-4 opacity-40" />
          <h1 className="text-2xl font-light text-foreground mb-2">Results Not Found</h1>
          <p className="text-muted-foreground text-sm mb-6">
            This recommendation link is invalid or has been removed.
          </p>
          <Link href="/chief-of-staff" className="inline-flex items-center gap-2 text-[#00D4AA] hover:underline text-sm">
            <ArrowRight size={14} className="rotate-180" /> Go to AI Chief of Staff
          </Link>
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
            <ArrowRight size={14} className="rotate-180" /> AI Chief of Staff
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              title="Copy link"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              title="Share"
            >
              <Share2 size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#00D4AA]/20 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-[#00D4AA]" />
            </div>
            <h1 className="text-2xl font-bold">Highest-Leverage Recommendation</h1>
            <p className="text-sm text-muted-foreground">
              AI Chief of Staff analysis for <span className="text-foreground font-medium">{result.companyName}</span>
            </p>
          </div>

          {/* Company info badges */}
          <div className="flex flex-wrap gap-3 justify-center">
            <div className="px-3 py-1.5 rounded-full bg-card border border-border text-xs flex items-center gap-1.5">
              <Globe size={12} className="text-muted-foreground" />
              <span className="text-foreground">{result.website}</span>
            </div>
            {result.industry && (
              <div className="px-3 py-1.5 rounded-full bg-card border border-border text-xs text-muted-foreground">
                {result.industry}
              </div>
            )}
            {result.seoScore !== null && (
              <div className="px-3 py-1.5 rounded-full bg-card border border-border text-xs flex items-center gap-1.5">
                <span className="text-muted-foreground">SEO:</span>
                <span className={`font-semibold ${result.seoScore >= 70 ? "text-green-400" : result.seoScore >= 40 ? "text-amber-400" : "text-red-400"}`}>
                  {result.seoScore}/100
                </span>
              </div>
            )}
          </div>

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

          {/* Audit summary if available */}
          {result.auditSummary && (
            <details className="bg-card border border-border rounded-xl p-4">
              <summary className="text-sm font-medium cursor-pointer hover:text-[#00D4AA] transition-colors flex items-center gap-2">
                <Globe size={14} />
                Website Audit Summary
              </summary>
              <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">
                {result.auditSummary}
              </div>
            </details>
          )}

          {/* CTA */}
          <div className="bg-gradient-to-r from-[#00D4AA]/10 to-transparent border border-[#00D4AA]/20 rounded-xl p-6 text-center space-y-4">
            <h3 className="text-lg font-semibold">Want your own AI Chief of Staff?</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Get personalized executive-level recommendations for your business. Full onboarding takes 5 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/quick-start"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#00D4AA] text-black font-medium rounded-lg hover:bg-[#00B894] transition-colors text-sm"
              >
                <Zap size={14} /> Try Quick Start (60s)
              </Link>
              <Link
                href="/onboarding/pro"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-border text-foreground font-medium rounded-lg hover:bg-card transition-colors text-sm"
              >
                Full Executive Onboarding <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Generated date */}
          {result.createdAt && (
            <p className="text-center text-xs text-muted-foreground">
              Generated {new Date(result.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
