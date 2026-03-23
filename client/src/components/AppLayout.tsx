import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { ReactNode, useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Cpu, ShoppingBag, Users, Bot, Menu, X, LogOut,
  FileStack, Shield, BarChart3, Wifi, WifiOff, Plug, CheckSquare, History, CreditCard
} from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import { toast } from "sonner";

const navItems = [
  { href: "/mission-control", label: "Mission Control", icon: LayoutDashboard },
  { href: "/intent-engine", label: "Intent Engine", icon: Cpu },
  { href: "/ai-ceo", label: "AI CEO", icon: Bot },
  { href: "/blueprints", label: "Blueprints", icon: FileStack },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/creator-program", label: "Creators", icon: Users },
  { href: "/governance", label: "Governance", icon: Shield },
  { href: "/integration-hub", label: "Integrations", icon: Plug },
  { href: "/blueprint-dashboard", label: "Analytics", icon: BarChart3 },
  { href: "/compatibility", label: "Compatibility", icon: CheckSquare },
  { href: "/context-history", label: "Context History", icon: History },
  { href: "/payments", label: "Payments", icon: CreditCard },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const inboxQuery = trpc.inbox.list.useQuery(undefined, { enabled: isAuthenticated });
  const unreadCount = inboxQuery.data?.filter(i => i.status === "unread").length ?? 0;
  const { connected, notifications } = useSocket();
  const prevNotifCount = useRef(0);

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
          <a
            href={getLoginUrl()}
            className="btn-primary text-sm"
          >
            Sign In
          </a>
          <div className="accent-line mt-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-56 bg-[oklch(0.03_0_0)] border-r border-border flex flex-col transform transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        {/* Logo */}
        <div className="px-5 py-6">
          <Link href="/">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
                <span className="font-semibold text-black text-xs">OC</span>
              </div>
              <span className="font-semibold text-foreground text-sm tracking-tight">OpenCommand</span>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map(item => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                <div className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-all ${
                  isActive
                    ? "bg-white/[0.07] text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                }`}>
                  <item.icon size={15} strokeWidth={isActive ? 2 : 1.5} />
                  <span className="font-medium">{item.label}</span>
                  {item.label === "Mission Control" && unreadCount > 0 && (
                    <span className="ml-auto badge-accent text-[10px] px-1.5 py-0">{unreadCount}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-border">
          <div className="flex items-center gap-2.5 px-3 mb-2">
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-xs font-medium text-foreground">
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-foreground truncate">{user?.name ?? "User"}</div>
              <div className="text-[11px] text-muted-foreground truncate">{user?.email ?? ""}</div>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
          >
            <LogOut size={13} />
            <span className="text-[12px] font-medium">Sign Out</span>
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1 mt-1">
            {connected ? (
              <><Wifi size={11} className="text-emerald-500" /><span className="text-mono text-[10px] text-emerald-500">LIVE</span></>
            ) : (
              <><WifiOff size={11} className="text-zinc-600" /><span className="text-mono text-[10px] text-zinc-600">OFFLINE</span></>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-[oklch(0.03_0_0)]">
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
    </div>
  );
}
