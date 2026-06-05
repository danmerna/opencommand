import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { ReactNode, useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import {
  Cpu, Menu, X, LogOut,
  FileStack, BarChart3, Wifi, WifiOff, CheckSquare,
  Activity, Settings, MessageSquare,
} from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import { toast } from "sonner";
import FeedbackWidget from "./FeedbackWidget";

// ─── Company Context (kept for compatibility with pages that use it) ──────────
interface CompanyContextValue {
  activeCompanyId: number | null;
  setActiveCompanyId: (id: number | null) => void;
}
const CompanyContext = createContext<CompanyContextValue>({ activeCompanyId: null, setActiveCompanyId: () => {} });
export function useActiveCompany() { return useContext(CompanyContext); }

// ─── Nav items (simplified — 5 primary + Settings) ───────────────────────────
const coreNavItems = [
  { href: "/dashboard",         label: "Home",              icon: MessageSquare },
  { href: "/intent-engine",     label: "Σ",                icon: Cpu },
  { href: "/blueprints",        label: "Blueprints",        icon: FileStack },
  { href: "/execution",         label: "Execution",         icon: CheckSquare },
  { href: "/analytics",         label: "Analytics",         icon: Activity },
  { href: "/model-performance", label: "Model Performance", icon: BarChart3 },
];

const settingsNavItem = { href: "/settings", label: "Settings", icon: Settings };

// ─── Swipe-to-close hook ─────────────────────────────────────────────────────
function useSwipeToClose(onClose: () => void, isOpen: boolean) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isOpen) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    // Swipe left at least 60px, and more horizontal than vertical
    if (deltaX < -60 && deltaY < 100) {
      onClose();
    }
  }, [isOpen, onClose]);

  return { handleTouchStart, handleTouchEnd };
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null);

  const { connected, notifications } = useSocket();
  const prevNotifCount = useRef(0);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const swipe = useSwipeToClose(closeMobile, mobileOpen);

  // Toast on new socket notification
  useEffect(() => {
    if (notifications.length > prevNotifCount.current && notifications.length > 0) {
      const latest = notifications[0];
      toast(latest.title, { description: latest.message, duration: 4000 });
    }
    prevNotifCount.current = notifications.length;
  }, [notifications]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="accent-line mb-10" />
          <h1 className="text-display text-4xl text-foreground mb-3">OpenCommand</h1>
          <p className="text-muted-foreground text-sm mb-10 text-body">Authentication required to access the platform.</p>
          <a href={getLoginUrl()} className="btn-primary text-sm">Sign In</a>
          <div className="accent-line mt-10" />
        </div>
      </div>
    );
  }

  // Waitlist gating: non-approved users get redirected to /waitlist
  // Admin users bypass the waitlist
  if (user?.role !== "admin" && (user as any)?.waitlistStatus !== "approved") {
    navigate("/waitlist");
    return null;
  }

  // Check if current location matches settings or any settings sub-paths
  const isSettingsActive = location === "/settings" || location.startsWith("/settings?") ||
    location === "/governance" || location === "/integration-hub" ||
    location === "/context-history" || location === "/payments" ||
    location === "/pricing" || location === "/whats-new" ||
    location === "/feedback-admin";

  return (
    <CompanyContext.Provider value={{ activeCompanyId, setActiveCompanyId }}>
      <div className="min-h-screen bg-background flex">

        {/* ── Far-left logo rail ─────────────────────────────────────────── */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-14 bg-[oklch(0.02_0_0)] border-r border-border flex-col items-center py-3 gap-1 transition-transform duration-200 hidden lg:flex lg:translate-x-0 ${mobileOpen ? "!flex translate-x-0" : ""}`}
          onTouchStart={swipe.handleTouchStart}
          onTouchEnd={swipe.handleTouchEnd}
        >
          {/* App logo mark */}
          <Link href="/">
            <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center mb-3 shrink-0">
              <span className="font-bold text-black text-[11px]">OC</span>
            </div>
          </Link>
        </aside>

        {/* ── Main sidebar ───────────────────────────────────────────────── */}
        <aside
          className={`fixed inset-y-0 left-14 z-40 w-52 bg-[oklch(0.03_0_0)] border-r border-border flex-col transition-transform duration-200 hidden lg:flex lg:translate-x-0 ${mobileOpen ? "!flex translate-x-0" : ""}`}
          onTouchStart={swipe.handleTouchStart}
          onTouchEnd={swipe.handleTouchEnd}
        >
          {/* App name header + mobile close button */}
          <div className="px-4 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-foreground truncate flex-1">OpenCommand</span>
              {/* Close button — mobile only */}
              <button
                onClick={closeMobile}
                className="lg:hidden w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-colors shrink-0"
                aria-label="Close menu"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto scrollbar-none">

            {/* Core nav — 5 primary items */}
            {coreNavItems.map(item => {
              const isActive = location === item.href || location.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} onClick={closeMobile}>
                  <div
                    data-tour={item.href === "/intent-engine" ? "intent-engine" : undefined}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] transition-all ${
                    isActive ? "bg-white/[0.07] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  }`}>
                    <item.icon size={13} strokeWidth={isActive ? 2 : 1.5} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })}

            {/* Settings nav item */}
            <Link href={settingsNavItem.href} onClick={closeMobile}>
              <div className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] transition-all ${
                isSettingsActive ? "bg-white/[0.07] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              }`}>
                <settingsNavItem.icon size={13} strokeWidth={isSettingsActive ? 2 : 1.5} />
                <span className="font-medium">{settingsNavItem.label}</span>
              </div>
            </Link>

          </nav>

          {/* User footer */}
          <div className="px-2 py-3 border-t border-border">
            <div className="flex items-center gap-2 px-3 mb-2">
              <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <span className="text-[10px] font-medium text-foreground">
                  {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-foreground truncate">{user?.name ?? "User"}</div>
                <div className="text-[10px] text-muted-foreground truncate">{user?.email ?? ""}</div>
              </div>
            </div>
            {/* Feedback link in footer */}
            <Link href="/feedback-admin" onClick={closeMobile}>
              <div className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors">
                <MessageSquare size={12} />
                <span className="text-[11px] font-medium">Feedback</span>
              </div>
            </Link>
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
            >
              <LogOut size={12} />
              <span className="text-[11px] font-medium">Sign Out</span>
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 mt-0.5">
              {connected ? (
                <><Wifi size={10} className="text-accent" /><span className="text-mono text-[10px] text-accent">LIVE</span></>
              ) : (
                <><WifiOff size={10} className="text-zinc-600" /><span className="text-mono text-[10px] text-zinc-600">OFFLINE</span></>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile overlay — tap or swipe to close */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/80 lg:hidden"
            onClick={closeMobile}
            onTouchStart={swipe.handleTouchStart}
            onTouchEnd={swipe.handleTouchEnd}
          />
        )}

        {/* Main content — no margin on mobile, offset on desktop */}
        <div className="flex-1 ml-0 lg:ml-[264px] flex flex-col min-h-screen">
          {/* Sticky mobile header */}
          <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-border bg-[oklch(0.03_0_0)]">
            <button onClick={() => setMobileOpen(true)} className="text-foreground p-1">
              <Menu size={18} />
            </button>
            <span className="font-semibold text-sm tracking-tight">OpenCommand</span>
            <div className="w-6" />
          </div>

          {user?.email === "demo@opencommand.co" && (
            <div className="flex items-center justify-center gap-2 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-400 sticky top-0 z-30">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Demo Mode — Meridian Software
              </span>
              <span className="text-amber-400/60">·</span>
              <span className="text-amber-400/70">You are viewing a simulated account with mock integration data.</span>
            </div>
          )}
          {/* ── Dashboard content-area menu ─────────────────────────── */}
          <div className="hidden lg:flex items-center gap-1 px-6 py-2 border-b border-border bg-[oklch(0.03_0_0)]">
            {coreNavItems.map(item => {
              const isActive = location === item.href || location.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href}>
                  <button className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                    isActive ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  }`}>
                    {item.label}
                  </button>
                </Link>
              );
            })}
            <div className="flex-1" />
            <Link href={settingsNavItem.href}>
              <button className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                isSettingsActive ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              }`}>
                <settingsNavItem.icon size={12} className="inline mr-1" />
                {settingsNavItem.label}
              </button>
            </Link>
          </div>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
        <FeedbackWidget />
      </div>
    </CompanyContext.Provider>
  );
}
