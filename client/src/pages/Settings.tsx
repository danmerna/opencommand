import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useState, useEffect, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import {
  Settings as SettingsIcon, Plug, Shield, History, Megaphone,
  CreditCard, BarChart3, ChevronRight,
} from "lucide-react";

// Lazy-load the embedded page contents
import IntegrationHub from "./IntegrationHub";
import Governance from "./Governance";
import ContextHistory from "./ContextHistory";
import WhatsNew from "./WhatsNew";
import PaymentHistory from "./PaymentHistory";
import Pricing from "./Pricing";

// ─── Tab definitions ────────────────────────────────────────────────────────

type SettingsTab = "connections" | "governance" | "history" | "account" | "about";

const TABS: { id: SettingsTab; label: string; icon: typeof Plug }[] = [
  { id: "connections", label: "Connections",  icon: Plug },
  { id: "governance",  label: "Governance",   icon: Shield },
  { id: "history",     label: "Context History", icon: History },
  { id: "account",     label: "Account",      icon: CreditCard },
  { id: "about",       label: "What's New",   icon: Megaphone },
];

// ─── Settings Page ──────────────────────────────────────────────────────────

export default function Settings() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  
  // Support deep-linking via ?tab=connections etc.
  const searchString = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const initialTab = (searchParams.get("tab") as SettingsTab) || "connections";
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Sync tab with URL param changes
  useEffect(() => {
    const tabParam = searchParams.get("tab") as SettingsTab;
    if (tabParam && TABS.some(t => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="text-center">
          <SettingsIcon size={32} className="mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Sign in required</h2>
          <p className="text-sm text-muted-foreground mb-4">Access settings after signing in.</p>
          <a href={getLoginUrl()} className="btn-primary text-sm">Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-black/20 px-6 pt-6 pb-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-border flex items-center justify-center">
              <SettingsIcon size={15} className="text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">Settings</h1>
              <p className="text-[11px] text-muted-foreground">Configuration, integrations, and account management</p>
            </div>
          </div>

          {/* Tab bar */}
          <nav className="flex gap-0 -mb-px overflow-x-auto scrollbar-none">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <tab.icon size={13} strokeWidth={isActive ? 2 : 1.5} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-6xl mx-auto">
        {activeTab === "connections" && (
          <div className="settings-embed">
            <IntegrationHub />
          </div>
        )}
        {activeTab === "governance" && (
          <div className="settings-embed">
            <Governance />
          </div>
        )}
        {activeTab === "history" && (
          <div className="settings-embed">
            <ContextHistory />
          </div>
        )}
        {activeTab === "account" && (
          <div className="settings-embed">
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-1">Plan & Billing</h2>
                <p className="text-[11px] text-muted-foreground mb-4">Manage your subscription and view payment history.</p>
              </div>
              <Pricing />
              <div className="border-t border-border pt-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">Payment History</h3>
                <PaymentHistory />
              </div>
            </div>
          </div>
        )}
        {activeTab === "about" && (
          <div className="settings-embed">
            <WhatsNew />
          </div>
        )}
      </div>
    </div>
  );
}
