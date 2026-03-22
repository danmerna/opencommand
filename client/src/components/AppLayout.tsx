import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { ReactNode, useState } from "react";
import {
  LayoutDashboard, Cpu, ShoppingBag, Users, Bot, Menu, X, LogOut, ChevronRight
} from "lucide-react";

const navItems = [
  { href: "/mission-control", label: "Mission Control", icon: LayoutDashboard, desc: "OKRs · Fleet · Inbox" },
  { href: "/intent-engine", label: "Intent Engine", icon: Cpu, desc: "Socratic · Execute" },
  { href: "/ai-ceo", label: "AI CEO", icon: Bot, desc: "ARIA · Strategy" },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag, desc: "Agents · Tiers" },
  { href: "/creator-program", label: "Creators", icon: Users, desc: "Floor + Flow" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const inboxQuery = trpc.inbox.list.useQuery(undefined, { enabled: isAuthenticated });
  const unreadCount = inboxQuery.data?.filter(i => i.status === "unread").length ?? 0;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="red-line mb-8" />
          <h1 className="text-display text-5xl text-foreground mb-4">ACCESS DENIED</h1>
          <p className="text-muted-foreground font-mono text-sm mb-8">Authentication required to access Mission Control.</p>
          <a
            href={getLoginUrl()}
            className="inline-block bg-foreground text-background font-condensed font-bold text-lg px-8 py-3 uppercase tracking-widest hover:bg-accent hover:text-foreground transition-colors"
          >
            AUTHENTICATE
          </a>
          <div className="red-line mt-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[oklch(0.07_0_0)] border-r border-border flex flex-col transform transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link href="/">
            <div className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-accent flex items-center justify-center">
                <span className="font-condensed font-black text-foreground text-sm">OC</span>
              </div>
              <div>
                <div className="font-condensed font-black text-foreground text-lg leading-none">OPENCOMMAND</div>
                <div className="section-label mt-0.5">MISSION CONTROL</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Red line accent */}
        <div className="red-line" />

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                <div className={`flex items-center gap-3 px-3 py-3 group transition-all ${isActive ? "bg-accent/10 border-l-2 border-accent" : "border-l-2 border-transparent hover:border-accent/40 hover:bg-white/5"}`}>
                  <item.icon size={16} className={isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground"} />
                  <div className="flex-1 min-w-0">
                    <div className={`font-condensed font-bold text-sm uppercase tracking-wide ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                      {item.label}
                      {item.label === "Mission Control" && unreadCount > 0 && (
                        <span className="ml-2 bg-accent text-foreground text-xs font-mono px-1.5 py-0.5">{unreadCount}</span>
                      )}
                    </div>
                    <div className="section-label text-[0.6rem]">{item.desc}</div>
                  </div>
                  {isActive && <ChevronRight size={12} className="text-accent" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-secondary border border-border flex items-center justify-center">
              <span className="font-condensed font-bold text-xs text-foreground">
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-condensed font-bold text-sm text-foreground truncate">{user?.name ?? "User"}</div>
              <div className="section-label text-[0.6rem] truncate">{user?.email ?? ""}</div>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <LogOut size={14} />
            <span className="font-condensed font-bold text-xs uppercase tracking-wide">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-[oklch(0.07_0_0)]">
          <button onClick={() => setMobileOpen(true)} className="text-foreground p-1">
            <Menu size={20} />
          </button>
          <span className="font-condensed font-black text-sm uppercase tracking-widest">OPENCOMMAND</span>
          <div className="w-6" />
        </div>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
