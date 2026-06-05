import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Copy, Check, Share2, ArrowRight, Zap, Users, RefreshCw } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Waitlist() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);

  const waitlistInfo = trpc.waitlist.info.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  // If user is approved, redirect to mission control
  useEffect(() => {
    if (waitlistInfo.data?.waitlistStatus === "approved") {
      setLocation("/mission-control");
    }
  }, [waitlistInfo.data?.waitlistStatus, setLocation]);

  // If not authenticated, redirect to home
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/");
    }
  }, [loading, isAuthenticated, setLocation]);

  const referralLink = waitlistInfo.data?.referralCode
    ? `${window.location.origin}/?ref=${waitlistInfo.data.referralCode}`
    : "";

  const handleCopy = useCallback(() => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  }, [referralLink]);

  const handleShare = useCallback(async () => {
    if (!referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "OpenCommand — The orchestration layer",
          text: "Deploy your agent fleet. Join me on OpenCommand.",
          url: referralLink,
        });
      } catch {}
    } else {
      handleCopy();
    }
  }, [referralLink, handleCopy]);

  if (loading || waitlistInfo.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const position = waitlistInfo.data?.waitlistPosition ?? 0;
  const totalWaiting = waitlistInfo.data?.totalWaitlist ?? 0;
  const referralCount = waitlistInfo.data?.referralCount ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.6s ease forwards; }
        .fade-up-1 { animation-delay: 0.1s; opacity: 0; }
        .fade-up-2 { animation-delay: 0.3s; opacity: 0; }
        .fade-up-3 { animation-delay: 0.5s; opacity: 0; }
        .fade-up-4 { animation-delay: 0.7s; opacity: 0; }
        .position-glow {
          text-shadow: 0 0 40px oklch(0.78 0.15 160 / 0.3);
        }
      `}</style>

      {/* Nav */}
      <nav className="px-6 md:px-8 py-5 max-w-7xl mx-auto flex items-center justify-between">
        <a href="/" className="font-semibold text-foreground text-xl tracking-tight hover:opacity-80 transition-opacity flex items-center gap-2">
          OpenCommand
          <span className="text-[9px] font-medium tracking-wider uppercase px-1.5 py-0.5 rounded-full border border-accent/40 text-accent">Beta</span>
        </a>
        <span className="text-xs text-muted-foreground">
          {user?.name || user?.email}
        </span>
      </nav>

      {/* Main content */}
      <div className="px-6 md:px-8 max-w-2xl mx-auto pt-16 pb-24">
        {/* Status badge */}
        <div className="fade-up fade-up-1 flex items-center gap-2 mb-8">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-medium text-accent uppercase tracking-wider">You're on the list</span>
        </div>

        {/* Position display */}
        <div className="fade-up fade-up-2 mb-12">
          <p className="text-sm text-muted-foreground mb-3">Your position</p>
          <div className="flex items-baseline gap-3">
            <span className="text-7xl md:text-8xl font-semibold text-foreground position-glow tabular-nums">
              #{position}
            </span>
            <span className="text-lg text-muted-foreground/60">
              of {totalWaiting} waiting
            </span>
          </div>
        </div>

        {/* Message */}
        <div className="fade-up fade-up-3 mb-12">
          <p className="text-muted-foreground text-body leading-relaxed max-w-lg">
            Your agent team is being assembled. We're onboarding users in order — share your referral link to move up in line. Each person who joins through your link moves you up one spot.
          </p>
        </div>

        {/* Referral section */}
        <div className="fade-up fade-up-4 border border-border rounded-xl p-6 md:p-8 bg-white/[0.02]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Zap size={18} className="text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Move up faster</h3>
              <p className="text-xs text-muted-foreground">Share your link. Each signup = +1 spot.</p>
            </div>
          </div>

          {/* Referral link */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex-1 px-4 py-3 rounded-lg bg-card border border-border text-sm text-foreground/80 font-mono truncate">
              {referralLink || "Loading..."}
            </div>
            <button
              onClick={handleCopy}
              className="shrink-0 p-3 rounded-lg border border-border hover:border-foreground/20 transition-colors"
              title="Copy link"
            >
              {copied ? <Check size={16} className="text-accent" /> : <Copy size={16} className="text-muted-foreground" />}
            </button>
            <button
              onClick={handleShare}
              className="shrink-0 p-3 rounded-lg border border-border hover:border-foreground/20 transition-colors"
              title="Share"
            >
              <Share2 size={16} className="text-muted-foreground" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="px-4 py-3 rounded-lg bg-card/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Users size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Referrals</span>
              </div>
              <span className="text-lg font-medium text-foreground tabular-nums">{referralCount}</span>
            </div>
            <div className="px-4 py-3 rounded-lg bg-card/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <ArrowRight size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Spots moved up</span>
              </div>
              <span className="text-lg font-medium text-foreground tabular-nums">{referralCount}</span>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground/40 mt-12">
          We'll email you at {user?.email} when it's your turn.
        </p>
      </div>
    </div>
  );
}
