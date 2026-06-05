import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import QuickOnboarding from "@/components/QuickOnboarding";
import {
  CheckCircle2, X, ChevronRight, Bell, Zap, FileStack,
  Activity, ArrowRight, Clock, AlertTriangle, Loader2,
  BarChart3, MessageSquare, Play, Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";

// ─── Types ────────────────────────────────────────────────────────────────────
interface HITLCard {
  id: string;
  type: "approval" | "review" | "alert";
  agent: string;
  title: string;
  body: string;
  urgency: "low" | "medium" | "high";
  blueprintTicker?: string;
  createdAt: string;
}

// ─── Swipe Card ───────────────────────────────────────────────────────────────
function SwipeCard({
  card,
  onApprove,
  onDismiss,
  isTop,
}: {
  card: HITLCard;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  isTop: boolean;
}) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [decided, setDecided] = useState<"approve" | "dismiss" | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);

  const urgencyColors: Record<string, string> = {
    high: "text-red-400 bg-red-400/10 border-red-400/30",
    medium: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    low: "text-accent bg-accent/10 border-accent/30",
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isTop) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontal.current = null;
    setIsDragging(true);
  }, [isTop]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTop || !isDragging) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = Math.abs(e.touches[0].clientY - startY.current);

    // Lock direction on first significant move
    if (isHorizontal.current === null && (Math.abs(dx) > 8 || dy > 8)) {
      isHorizontal.current = Math.abs(dx) > dy;
    }
    if (isHorizontal.current) {
      e.preventDefault();
      setDragX(dx);
    }
  }, [isTop, isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isTop) return;
    setIsDragging(false);
    if (dragX > 80) {
      setDecided("approve");
      setTimeout(() => onApprove(card.id), 300);
    } else if (dragX < -80) {
      setDecided("dismiss");
      setTimeout(() => onDismiss(card.id), 300);
    } else {
      setDragX(0);
    }
    isHorizontal.current = null;
  }, [isTop, dragX, card.id, onApprove, onDismiss]);

  const rotation = dragX / 18;
  const opacity = decided ? 0 : Math.max(0.3, 1 - Math.abs(dragX) / 300);
  const translateX = decided === "approve" ? 400 : decided === "dismiss" ? -400 : dragX;
  const approveHint = dragX > 30;
  const dismissHint = dragX < -30;

  return (
    <div
      className={`absolute inset-0 touch-pan-y select-none ${isTop ? "cursor-grab active:cursor-grabbing" : ""}`}
      style={{
        transform: `translateX(${translateX}px) rotate(${rotation}deg)`,
        opacity,
        transition: isDragging ? "none" : "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
        zIndex: isTop ? 10 : 5,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="h-full rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 shadow-xl">
        {/* Swipe hint overlays */}
        {approveHint && (
          <div className="absolute inset-0 rounded-2xl border-2 border-accent bg-accent/5 flex items-center justify-center pointer-events-none">
            <span className="text-accent font-bold text-xl tracking-wider rotate-[-12deg] border-2 border-accent px-3 py-1 rounded">APPROVE</span>
          </div>
        )}
        {dismissHint && (
          <div className="absolute inset-0 rounded-2xl border-2 border-red-400 bg-red-400/5 flex items-center justify-center pointer-events-none">
            <span className="text-red-400 font-bold text-xl tracking-wider rotate-[12deg] border-2 border-red-400 px-3 py-1 rounded">SKIP</span>
          </div>
        )}

        {/* Card header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Bell size={14} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{card.agent}</p>
              {card.blueprintTicker && (
                <p className="text-[10px] text-accent font-mono">{card.blueprintTicker}</p>
              )}
            </div>
          </div>
          <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${urgencyColors[card.urgency]}`}>
            {card.urgency}
          </span>
        </div>

        {/* Card body */}
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground leading-snug mb-2">{card.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{card.body}</p>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock size={11} />
          {new Date(card.createdAt).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => { setDecided("dismiss"); setTimeout(() => onDismiss(card.id), 300); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-muted-foreground text-sm hover:border-red-400/40 hover:text-red-400 transition-colors"
          >
            <X size={14} /> Skip
          </button>
          <button
            onClick={() => { setDecided("approve"); setTimeout(() => onApprove(card.id), 300); }}
            className="flex-2 flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors"
          >
            <CheckCircle2 size={14} /> Approve
          </button>
        </div>

        {/* Swipe hint */}
        {isTop && (
          <p className="text-center text-[10px] text-muted-foreground/50">
            Swipe right to approve · Swipe left to skip
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Quick Action Button ──────────────────────────────────────────────────────
function QuickAction({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:border-accent/40 hover:bg-accent/5 transition-all group"
    >
      <Icon size={20} className="text-muted-foreground group-hover:text-accent transition-colors" />
      <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">{label}</span>
    </button>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 rounded-xl border border-border bg-card">
      <span className={`text-xl font-semibold ${accent ? "text-accent" : "text-foreground"}`}>{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Redirect unauthenticated users
  useEffect(() => {
    if (isAuthenticated === false) {
      window.location.href = getLoginUrl("/dashboard");
    }
  }, [isAuthenticated]);

  // Show onboarding for new users who haven't completed it
  useEffect(() => {
    if (!user) return;
    const u = user as any;
    if (u.onboardingCompleted === false || u.onboardingCompleted === 0) {
      // Small delay so dashboard renders first
      const t = setTimeout(() => setShowOnboarding(true), 600);
      return () => clearTimeout(t);
    }
  }, [user]);

  // ── Data queries ──
  const blueprintsQ = trpc.blueprintEngine.listMyBlueprints.useQuery(undefined, { enabled: isAuthenticated });
  const blueprints = blueprintsQ.data ?? [];

  const briefingsQ = trpc.briefings.list.useQuery({}, { enabled: isAuthenticated });
  const latestBriefing = briefingsQ.data?.[0] ?? null;

  // ── HITL cards — real data from execution.getPendingHitl ──
  const hitlQ = trpc.execution.getPendingHitl.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });
  const resolveHitl = trpc.execution.resolveHitl.useMutation({
    onSuccess: () => hitlQ.refetch(),
    onError: (e) => toast.error(e.message),
  });

  // Local dismissed/approved for demo cards (no real run)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [approved, setApproved] = useState<Set<string>>(new Set());

  // Convert real HITL notifications to HITLCard format
  const realCards: HITLCard[] = (hitlQ.data ?? []).map((n: any) => ({
    id: `hitl-${n.id}`,
    type: n.mode === "ask_permission" ? "approval" : "review",
    agent: n.agentName ?? n.nodeLabel ?? "Agent",
    title: n.title,
    body: n.body ?? "",
    urgency: (n.urgency === "critical" ? "high" : n.urgency) as "low" | "medium" | "high",
    blueprintTicker: n.blueprintTicker ?? undefined,
    createdAt: new Date(n.createdAt).toISOString(),
    _realId: n.id,
  }));

  // No demo cards — only show real HITL notifications from actual blueprint runs
  const allCards = [...realCards];
  const visibleCards = allCards.filter(c => !dismissed.has(c.id) && !approved.has(c.id));

  const handleApprove = useCallback((id: string) => {
    const card = allCards.find(c => c.id === id) as any;
    if (card?._realId) {
      resolveHitl.mutate({ notificationId: card._realId, action: "approved" });
    }
    setApproved(prev => new Set(prev).add(id));
    toast.success("Approved — agent will proceed");
  }, [allCards]);

  const handleDismiss = useCallback((id: string) => {
    const card = allCards.find(c => c.id === id) as any;
    if (card?._realId) {
      resolveHitl.mutate({ notificationId: card._realId, action: "dismissed" });
    }
    setDismissed(prev => new Set(prev).add(id));
    toast.info("Skipped");
  }, [allCards]);

  // ── Greeting ──
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] ?? "there";

  if (isAuthenticated === undefined) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <QuickOnboarding open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* ── Greeting ── */}
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {greeting}, {firstName}.
          </h1>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-2">
          <StatPill label="Blueprints" value={blueprints.length} />
          <StatPill label="Awaiting" value={visibleCards.length} accent={visibleCards.length > 0} />
          <StatPill label="Approved today" value={approved.size} />
        </div>

        {/* ── HITL Swipe Deck ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" />
              <span className="text-sm font-medium text-foreground">Needs your attention</span>
            </div>
            <span className="text-[11px] text-muted-foreground">{visibleCards.length} pending</span>
          </div>

          {visibleCards.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <CheckCircle2 size={28} className="text-accent mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">All clear</p>
              <p className="text-xs text-muted-foreground">No pending approvals. Your agents are running autonomously.</p>
            </div>
          ) : (
            <div className="relative h-72">
              {/* Stack: show top 2 cards */}
              {visibleCards.slice(0, 2).map((card, idx) => (
                <SwipeCard
                  key={card.id}
                  card={card}
                  isTop={idx === 0}
                  onApprove={handleApprove}
                  onDismiss={handleDismiss}
                />
              ))}
              {/* Ghost card behind for depth */}
              {visibleCards.length > 2 && (
                <div
                  className="absolute inset-0 rounded-2xl border border-border bg-card"
                  style={{ transform: "scale(0.92) translateY(12px)", zIndex: 1, opacity: 0.4 }}
                />
              )}
            </div>
          )}
        </div>

        {/* ── Latest Briefing ── */}
        {latestBriefing && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Latest briefing</span>
              </div>
              <button
                onClick={() => navigate("/briefings")}
                className="text-[11px] text-accent hover:underline flex items-center gap-0.5"
              >
                View all <ChevronRight size={11} />
              </button>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{(latestBriefing as any).frequency} briefing</p>
              <h3 className="text-sm font-medium text-foreground mb-2 leading-snug">{(latestBriefing as any).title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{(latestBriefing as any).content}</p>
              <div className="flex items-center gap-1.5 mt-3 text-[11px] text-muted-foreground">
                <Clock size={10} />
                {new Date((latestBriefing as any).deliveredAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        )}

        {/* ── Quick Actions ── */}
        <div>
          <p className="text-sm font-medium text-foreground mb-3">Quick actions</p>
          <div className="grid grid-cols-4 gap-2">
            <QuickAction icon={Cpu} label="New Blueprint" onClick={() => navigate("/intent-engine")} />
            <QuickAction icon={FileStack} label="My Blueprints" onClick={() => navigate("/blueprints")} />
            <QuickAction icon={Activity} label="Execution" onClick={() => navigate("/execution")} />
            <QuickAction icon={BarChart3} label="Analytics" onClick={() => navigate("/analytics")} />
          </div>
        </div>

        {/* ── Active blueprints ── */}
        {blueprints.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Active blueprints</span>
              </div>
              <button
                onClick={() => navigate("/blueprints")}
                className="text-[11px] text-accent hover:underline flex items-center gap-0.5"
              >
                View all <ChevronRight size={11} />
              </button>
            </div>
            <div className="space-y-2">
              {blueprints.slice(0, 3).map((bp: any) => (
                <button
                  key={bp.id}
                  onClick={() => navigate(`/blueprints/${bp.id}/builder`)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:border-accent/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Play size={12} className="text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground leading-none mb-0.5">{bp.title}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{bp.ticker}</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Bottom padding ── */}
        <div className="h-6" />
      </div>
    </div>
  );
}
