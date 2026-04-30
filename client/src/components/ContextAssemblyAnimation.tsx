import { useState, useEffect, useRef } from "react";
import { Database, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

type DataStream = {
  provider: string;
  icon: string;
  color: string;
  dataPoints: string[];
};

const PROVIDER_STREAMS: Record<string, DataStream> = {
  hubspot: {
    provider: "HubSpot",
    icon: "🟠",
    color: "text-orange-400 border-orange-400/30 bg-orange-400/5",
    dataPoints: ["Reading pipeline deals...", "Pulling contact records...", "Analyzing deal velocity...", "Extracting conversion rates..."],
  },
  salesforce: {
    provider: "Salesforce",
    icon: "☁️",
    color: "text-blue-400 border-blue-400/30 bg-blue-400/5",
    dataPoints: ["Fetching opportunities...", "Reading account data...", "Pulling forecast pipeline...", "Analyzing win rates..."],
  },
  ga4: {
    provider: "Google Analytics",
    icon: "📊",
    color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
    dataPoints: ["Reading traffic sources...", "Pulling conversion funnels...", "Analyzing user behavior...", "Extracting session data..."],
  },
  meta_ads: {
    provider: "Meta Ads",
    icon: "📘",
    color: "text-blue-500 border-blue-500/30 bg-blue-500/5",
    dataPoints: ["Fetching campaign metrics...", "Reading ad spend data...", "Pulling audience insights...", "Analyzing ROAS..."],
  },
  google_ads: {
    provider: "Google Ads",
    icon: "🔵",
    color: "text-sky-400 border-sky-400/30 bg-sky-400/5",
    dataPoints: ["Reading campaign performance...", "Pulling keyword data...", "Analyzing cost-per-click...", "Extracting conversion data..."],
  },
  tiktok_ads: {
    provider: "TikTok Ads",
    icon: "🎵",
    color: "text-pink-400 border-pink-400/30 bg-pink-400/5",
    dataPoints: ["Fetching ad groups...", "Reading engagement metrics...", "Pulling video performance...", "Analyzing audience reach..."],
  },
  stripe: {
    provider: "Stripe",
    icon: "💳",
    color: "text-purple-400 border-purple-400/30 bg-purple-400/5",
    dataPoints: ["Reading revenue data...", "Pulling subscription metrics...", "Analyzing MRR trends...", "Extracting churn data..."],
  },
  gmail: {
    provider: "Gmail",
    icon: "✉️",
    color: "text-red-400 border-red-400/30 bg-red-400/5",
    dataPoints: ["Scanning recent threads...", "Extracting key conversations...", "Reading response patterns...", "Pulling contact activity..."],
  },
  website_audit: {
    provider: "Website Audit",
    icon: "🌐",
    color: "text-teal-400 border-teal-400/30 bg-teal-400/5",
    dataPoints: ["Scraping website metadata...", "Checking technical SEO...", "Detecting tech stack...", "Analyzing content with AI...", "Generating executive summary..."],
  },
};

const FALLBACK_STREAM: DataStream = {
  provider: "Context Engine",
  icon: "🧠",
  color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5",
  dataPoints: ["Initializing context engine...", "Preparing interview framework...", "Loading role parameters...", "Building personalization model..."],
};

type StreamLine = {
  provider: string;
  icon: string;
  color: string;
  text: string;
  status: "streaming" | "done";
};

interface ContextAssemblyAnimationProps {
  connectedProviders: string[];
  agentName: string;
  agentIcon: string;
  isComplete: boolean;
}

export function ContextAssemblyAnimation({ connectedProviders, agentName, agentIcon, isComplete }: ContextAssemblyAnimationProps) {
  const [lines, setLines] = useState<StreamLine[]>([]);
  const [assemblyProgress, setAssemblyProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Build the queue of data points to stream
    const streams = connectedProviders.length > 0
      ? connectedProviders.map(p => PROVIDER_STREAMS[p] ?? FALLBACK_STREAM)
      : [FALLBACK_STREAM];

    const queue: { provider: string; icon: string; color: string; text: string }[] = [];
    for (const stream of streams) {
      for (const dp of stream.dataPoints) {
        queue.push({ provider: stream.provider, icon: stream.icon, color: stream.color, text: dp });
      }
    }

    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= queue.length) {
        clearInterval(interval);
        return;
      }

      const item = queue[idx];
      // Mark previous line as done, add new streaming line
      setLines(prev => {
        const updated = prev.map(l => ({ ...l, status: "done" as const }));
        return [...updated, { ...item, status: "streaming" as const }];
      });
      setAssemblyProgress(Math.round(((idx + 1) / queue.length) * 100));
      idx++;
    }, 800);

    return () => clearInterval(interval);
  }, [connectedProviders]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // Mark all done when complete
  useEffect(() => {
    if (isComplete) {
      setLines(prev => prev.map(l => ({ ...l, status: "done" as const })));
      setAssemblyProgress(100);
    }
  }, [isComplete]);

  return (
    <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Database size={13} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">Context Assembly</p>
            <p className="text-[10px] text-muted-foreground">
              {isComplete ? "Context ready" : `Pulling data for ${agentName}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isComplete && <Loader2 size={12} className="animate-spin text-blue-400" />}
          {isComplete && <CheckCircle2 size={12} className="text-emerald-400" />}
          <span className="text-[10px] text-muted-foreground font-mono">{assemblyProgress}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-border">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500 ease-out"
          style={{ width: `${assemblyProgress}%` }}
        />
      </div>

      {/* Stream log */}
      <div ref={scrollRef} className="max-h-48 overflow-y-auto px-4 py-3 space-y-1.5">
        {lines.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 size={10} className="animate-spin" />
            Connecting to data sources...
          </div>
        )}
        {lines.map((line, i) => (
          <div key={i} className="flex items-center gap-2 animate-fade-in">
            <span className="text-xs shrink-0">{line.icon}</span>
            <span className="text-[11px] text-muted-foreground flex-1">{line.text}</span>
            {line.status === "streaming" ? (
              <Loader2 size={10} className="animate-spin text-blue-400 shrink-0" />
            ) : (
              <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Connected providers footer */}
      {connectedProviders.length > 0 && (
        <div className="px-4 py-2 border-t border-border flex items-center gap-2 flex-wrap">
          <span className="text-[9px] text-muted-foreground/60 uppercase tracking-widest">Sources:</span>
          {connectedProviders.map(p => {
            const stream = PROVIDER_STREAMS[p];
            return stream ? (
              <span key={p} className={`text-[9px] px-1.5 py-0.5 rounded-full border ${stream.color}`}>
                {stream.icon} {stream.provider}
              </span>
            ) : null;
          })}
          <ArrowRight size={8} className="text-muted-foreground/40" />
          <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-amber-400/30 bg-amber-400/5 text-amber-400">
            {agentIcon} {agentName}
          </span>
        </div>
      )}
    </div>
  );
}
