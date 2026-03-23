import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { ReactNode, useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import {
  LayoutDashboard, Cpu, ShoppingBag, Users, Bot, Menu, X, LogOut,
  FileStack, Shield, BarChart3, Wifi, WifiOff, Plug, CheckSquare, History,
  CreditCard, FolderOpen, Plus, Building2, ChevronRight,
} from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import { toast } from "sonner";
import FeedbackWidget from "./FeedbackWidget";

// ─── Company Context ──────────────────────────────────────────────────────────
interface CompanyContextValue {
  activeCompanyId: number | null;
  setActiveCompanyId: (id: number | null) => void;
}
const CompanyContext = createContext<CompanyContextValue>({ activeCompanyId: null, setActiveCompanyId: () => {} });
export function useActiveCompany() { return useContext(CompanyContext); }

// ─── Nav items (company-scoped) ───────────────────────────────────────────────
const coreNavItems = [
  { href: "/mission-control", label: "Mission Control", icon: LayoutDashboard },
  { href: "/intent-engine",   label: "Intent Engine",   icon: Cpu },
  { href: "/ai-ceo",          label: "AI CEO",           icon: Bot },
  { href: "/blueprints",      label: "Blueprints",       icon: FileStack },
  // Marketplace & Creators hidden — will be re-added later
  { href: "/governance",      label: "Governance",       icon: Shield },
  { href: "/integration-hub", label: "Integrations",     icon: Plug },
  // Blueprint Dashboard & Compatibility hidden — will be re-added later
  { href: "/context-history", label: "Context History",  icon: History },
  { href: "/payments",        label: "Payments",         icon: CreditCard },
];

const pricingNavItem = { href: "/pricing", label: "Pricing", icon: BarChart3 };

// ─── Colour palette for company avatars ──────────────────────────────────────
const COMPANY_COLORS = [
  "bg-indigo-600", "bg-violet-600", "bg-emerald-600", "bg-amber-600",
  "bg-rose-600",   "bg-cyan-600",   "bg-fuchsia-600", "bg-teal-600",
];

function companyColor(index: number) { return COMPANY_COLORS[index % COMPANY_COLORS.length]; }
function companyInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

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

  const companiesQuery = trpc.companies.list.useQuery(undefined, { enabled: isAuthenticated });
  const companies = companiesQuery.data ?? [];

  const inboxQuery = trpc.inbox.list.useQuery(undefined, { enabled: isAuthenticated });
  const unreadCount = inboxQuery.data?.filter(i => i.status === "unread").length ?? 0;

  // Projects for the active company (or all user projects if no company selected)
  const projectsQuery = trpc.projects.list.useQuery(undefined, { enabled: isAuthenticated });
  const allProjects = projectsQuery.data ?? [];
  const visibleProjects = activeCompanyId
    ? allProjects.filter(p => p.companyId === activeCompanyId)
    : allProjects;

  // Agents for the active company
  const agentsQuery = activeCompanyId
    ? trpc.agents.listByCompany.useQuery({ companyId: activeCompanyId }, { enabled: isAuthenticated && activeCompanyId !== null })
    : trpc.agents.list.useQuery(undefined, { enabled: isAuthenticated });
  const visibleAgents = agentsQuery.data ?? [];

  const { connected, notifications } = useSocket();
  const prevNotifCount = useRef(0);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const swipe = useSwipeToClose(closeMobile, mobileOpen);

  // Auto-select first company on load
  useEffect(() => {
    if (companies.length > 0 && activeCompanyId === null) {
      setActiveCompanyId(companies[0].id);
    }
  }, [companies, activeCompanyId]);

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

  const activeCompany = companies.find(c => c.id === activeCompanyId);

  return (
    <CompanyContext.Provider value={{ activeCompanyId, setActiveCompanyId }}>
      <div className="min-h-screen bg-background flex">

        {/* ── Far-left company-switcher rail ─────────────────────────────── */}
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

          {/* Company avatars */}
          <div className="flex-1 flex flex-col items-center gap-1.5 overflow-y-auto w-full px-2 scrollbar-none">
            {companies.map((company, idx) => {
              const isActive = company.id === activeCompanyId;
              return (
                <button
                  key={company.id}
                  onClick={() => setActiveCompanyId(company.id)}
                  title={company.name}
                  className={`relative w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold text-white transition-all shrink-0 ${companyColor(idx)} ${isActive ? "ring-2 ring-white/50 scale-105" : "opacity-60 hover:opacity-90"}`}
                >
                  {companyInitials(company.name)}
                  {isActive && (
                    <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Add company button */}
          <button
            onClick={() => { navigate("/mission-control"); closeMobile(); }}
            title="Add Company"
            className="w-9 h-9 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-white/40 hover:text-white/70 hover:border-white/40 transition-all shrink-0 mt-1"
          >
            <Plus size={14} />
          </button>
        </aside>

        {/* ── Main sidebar ───────────────────────────────────────────────── */}
        <aside
          className={`fixed inset-y-0 left-14 z-40 w-52 bg-[oklch(0.03_0_0)] border-r border-border flex-col transition-transform duration-200 hidden lg:flex lg:translate-x-0 ${mobileOpen ? "!flex translate-x-0" : ""}`}
          onTouchStart={swipe.handleTouchStart}
          onTouchEnd={swipe.handleTouchEnd}
        >

          {/* Company header + mobile close button */}
          <div className="px-4 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Building2 size={13} className="text-muted-foreground shrink-0" />
              <span className="text-[12px] font-semibold text-foreground truncate flex-1">
                {activeCompany?.name ?? "OpenCommand"}
              </span>
              {/* Close button — mobile only */}
              <button
                onClick={closeMobile}
                className="lg:hidden w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-colors shrink-0"
                aria-label="Close menu"
              >
                <X size={14} />
              </button>
            </div>
            {activeCompany?.mission && (
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{activeCompany.mission}</p>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto scrollbar-none">

            {/* Core nav */}
            {coreNavItems.map(item => {
              const isActive = location === item.href || location.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} onClick={closeMobile}>
                  <div className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] transition-all ${
                    isActive ? "bg-white/[0.07] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  }`}>
                    <item.icon size={13} strokeWidth={isActive ? 2 : 1.5} />
                    <span className="font-medium">{item.label}</span>
                    {item.label === "Mission Control" && unreadCount > 0 && (
                      <span className="ml-auto badge-accent text-[10px] px-1.5 py-0">{unreadCount}</span>
                    )}
                  </div>
                </Link>
              );
            })}

            {/* Pricing nav item */}
            {(() => {
              const isPricingActive = location === pricingNavItem.href;
              return (
                <Link href={pricingNavItem.href} onClick={closeMobile}>
                  <div className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] transition-all ${
                    isPricingActive ? "bg-white/[0.07] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  }`}>
                    <pricingNavItem.icon size={13} strokeWidth={isPricingActive ? 2 : 1.5} />
                    <span className="font-medium">{pricingNavItem.label}</span>
                  </div>
                </Link>
              );
            })()}

            {/* Agents section */}
            <div className="pt-3 pb-1">
              <div className="flex items-center justify-between px-3 mb-1">
                <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Agents</span>
                <Link href="/mission-control" onClick={closeMobile}>
                  <button
                    title="Manage agents"
                    className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus size={11} />
                  </button>
                </Link>
              </div>

              {visibleAgents.length === 0 ? (
                <Link href="/mission-control" onClick={closeMobile}>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer">
                    <Bot size={11} />
                    <span>No agents yet</span>
                  </div>
                </Link>
              ) : (
                visibleAgents.slice(0, 8).map(agent => {
                  const statusColor = agent.status === "active" ? "#22c55e" : agent.status === "error" ? "#ef4444" : "#6b7280";
                  const isAgentActive = location === `/agents/${agent.id}`;
                  return (
                    <Link key={agent.id} href={`/agents/${agent.id}`} onClick={closeMobile}>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] transition-all ${
                        isAgentActive ? "bg-white/[0.07] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                      }`}>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: statusColor }}
                        />
                        <span className="truncate font-medium">{agent.name}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground/50 uppercase tracking-wide shrink-0">{agent.type}</span>
                      </div>
                    </Link>
                  );
                })
              )}

              {visibleAgents.length > 8 && (
                <Link href="/mission-control" onClick={closeMobile}>
                  <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                    <ChevronRight size={10} />
                    <span>{visibleAgents.length - 8} more</span>
                  </div>
                </Link>
              )}
            </div>

            {/* Projects section */}
            <div className="pt-3 pb-1">
              <div className="flex items-center justify-between px-3 mb-1">
                <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Projects</span>
                <Link href="/projects" onClick={closeMobile}>
                  <button
                    title="New project"
                    className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus size={11} />
                  </button>
                </Link>
              </div>

              {visibleProjects.length === 0 ? (
                <Link href="/projects" onClick={closeMobile}>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer">
                    <FolderOpen size={11} />
                    <span>No projects yet</span>
                  </div>
                </Link>
              ) : (
                visibleProjects.slice(0, 8).map(project => {
                  const isActive = location === `/projects/${project.id}` || location.startsWith(`/projects/${project.id}/`);
                  return (
                    <Link key={project.id} href={`/projects/${project.id}`} onClick={closeMobile}>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] transition-all ${
                        isActive ? "bg-white/[0.07] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                      }`}>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: project.color ?? "#6366f1" }}
                        />
                        <span className="truncate font-medium">{project.name}</span>
                      </div>
                    </Link>
                  );
                })
              )}

              {visibleProjects.length > 8 && (
                <Link href="/projects" onClick={closeMobile}>
                  <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                    <ChevronRight size={10} />
                    <span>{visibleProjects.length - 8} more</span>
                  </div>
                </Link>
              )}
            </div>
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
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
            >
              <LogOut size={12} />
              <span className="text-[11px] font-medium">Sign Out</span>
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 mt-0.5">
              {connected ? (
                <><Wifi size={10} className="text-emerald-500" /><span className="text-mono text-[10px] text-emerald-500">LIVE</span></>
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

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
        <FeedbackWidget />
      </div>
    </CompanyContext.Provider>
  );
}
