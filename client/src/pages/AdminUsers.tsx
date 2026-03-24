import { useState, useMemo } from "react";
import FunnelView from "@/components/FunnelView";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Users, Activity, Eye, Clock, MessageSquare, Zap, ChevronRight,
  Search, Filter, ArrowLeft, Globe, Monitor, BarChart2, List,
  CheckCircle, AlertCircle, Mail, Calendar, TrendingUp, X
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
type AdminUser = {
  id: number;
  name: string | null;
  email: string | null;
  role: string;
  loginMethod: string | null;
  createdAt: Date | string;
  lastSignedIn: Date | string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "MMM d, yyyy");
}
function fmtRelative(d: Date | string | null | undefined) {
  if (!d) return "—";
  return formatDistanceToNow(new Date(d), { addSuffix: true });
}
function fmtTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "MMM d, h:mm a");
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ─── Activity Bar Chart ───────────────────────────────────────────────────────
function ActivityChart({ data }: { data: { date: string; count: number }[] }) {
  if (!data.length) return <p className="text-xs text-muted-foreground text-center py-8">No activity data yet</p>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-24 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className="w-full bg-emerald-400/70 rounded-sm transition-all group-hover:bg-emerald-400"
            style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }}
          />
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-popover border border-border text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
            {d.date}: {d.count}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Timeline Event ───────────────────────────────────────────────────────────
function TimelineEvent({ event }: { event: { type: string; label: string; createdAt: Date | string; metadata?: unknown } }) {
  const isFeature = event.type === "feature";
  const [feature, action] = isFeature ? (event.label as string).split(":") : ["", ""];
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isFeature ? "bg-emerald-400/10" : "bg-blue-400/10"}`}>
        {isFeature ? <Zap size={11} className="text-emerald-400" /> : <Eye size={11} className="text-blue-400" />}
      </div>
      <div className="flex-1 min-w-0">
        {isFeature ? (
          <p className="text-sm text-foreground">
            <span className="font-medium">{feature}</span>
            <span className="text-muted-foreground"> · {action}</span>
          </p>
        ) : (
          <p className="text-sm text-foreground truncate">{event.label}</p>
        )}
        <p className="text-xs text-muted-foreground">{fmtTime(event.createdAt)}</p>
      </div>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${isFeature ? "border-emerald-400/30 text-emerald-400" : "border-blue-400/30 text-blue-400"}`}>
        {isFeature ? "event" : "view"}
      </span>
    </div>
  );
}

// ─── User Detail Panel ────────────────────────────────────────────────────────
function UserDetail({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [tab, setTab] = useState<"timeline" | "pages" | "sessions" | "feedback">("timeline");

  const { data: kpis } = trpc.admin.userKpis.useQuery({ userId: user.id });
  const { data: timeline = [] } = trpc.admin.userTimeline.useQuery({ userId: user.id });
  const { data: topPages = [] } = trpc.admin.userTopPages.useQuery({ userId: user.id });
  const { data: sessions = [] } = trpc.admin.userSessions.useQuery({ userId: user.id });
  const { data: feedback = [] } = trpc.admin.userFeedback.useQuery({ userId: user.id });
  const { data: dailyActivity = [] } = trpc.admin.userDailyActivity.useQuery({ userId: user.id });

  const tabs = [
    { id: "timeline", label: "Activity", icon: Activity },
    { id: "pages", label: "Pages", icon: Globe },
    { id: "sessions", label: "Sessions", icon: Monitor },
    { id: "feedback", label: "Feedback", icon: MessageSquare },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className="w-full max-w-2xl bg-background border-l border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-emerald-400/10 flex items-center justify-center text-emerald-400 font-semibold text-sm">
                {(user.name || user.email || "?")[0].toUpperCase()}
              </div>
              <h2 className="text-lg font-semibold text-foreground">{user.name || "Unnamed User"}</h2>
              {user.role === "admin" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-emerald-400/40 text-emerald-400">Admin</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{user.email || "No email"}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar size={11} /> Joined {fmtDate(user.createdAt)}</span>
              <span className="flex items-center gap-1"><Clock size={11} /> Last seen {fmtRelative(user.lastSignedIn)}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* KPI Strip */}
        {kpis && (
          <div className="grid grid-cols-4 gap-0 border-b border-border shrink-0">
            {[
              { label: "Agents", value: kpis.agents, icon: Zap },
              { label: "Page Views", value: kpis.pageViews, icon: Eye },
              { label: "Sessions", value: kpis.sessions, icon: Monitor },
              { label: "Events", value: kpis.featureEvents, icon: Activity },
            ].map((k, i) => (
              <div key={i} className="p-4 text-center border-r border-border last:border-0">
                <p className="text-xl font-semibold text-foreground">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* 30-day Activity Chart */}
        {dailyActivity.length > 0 && (
          <div className="px-6 pt-4 pb-2 border-b border-border shrink-0">
            <p className="text-xs text-muted-foreground mb-3">Activity — last 30 days</p>
            <ActivityChart data={dailyActivity.map(d => ({ date: d.date, count: Number(d.count) }))} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm transition-colors border-b-2 ${tab === t.id ? "border-emerald-400 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "timeline" && (
            <div>
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No activity recorded yet</p>
              ) : (
                timeline.map((e, i) => <TimelineEvent key={i} event={e as { type: string; label: string; createdAt: Date | string; metadata?: unknown }} />)
              )}
            </div>
          )}

          {tab === "pages" && (
            <div className="space-y-2">
              {topPages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No page views recorded yet</p>
              ) : (
                topPages.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                    <span className="flex-1 text-sm text-foreground font-mono truncate">{p.path}</span>
                    <span className="text-sm font-semibold text-emerald-400">{Number(p.count)}</span>
                    <span className="text-xs text-muted-foreground">views</span>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "sessions" && (
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No sessions recorded yet</p>
              ) : (
                sessions.map((s, i) => (
                  <div key={i} className="border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">{fmtTime(s.startedAt)}</span>
                      <span className="text-xs text-muted-foreground">{s.pageCount} pages</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Entry: <span className="text-foreground font-mono">{s.entryPath || "—"}</span></span>
                      <span>Exit: <span className="text-foreground font-mono">{s.exitPath || "—"}</span></span>
                    </div>
                    {s.duration && s.duration > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">Duration: {Math.round(s.duration / 1000)}s</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "feedback" && (
            <div className="space-y-3">
              {feedback.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No feedback submitted</p>
              ) : (
                (feedback as Array<{ id: number; type: string; content: string; page?: string | null; status: string; createdAt: Date | string }>).map((f) => (
                  <div key={f.id} className="border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                        f.type === "bug" ? "border-red-400/40 text-red-400" :
                        f.type === "feature" ? "border-blue-400/40 text-blue-400" :
                        f.type === "praise" ? "border-emerald-400/40 text-emerald-400" :
                        "border-border text-muted-foreground"
                      }`}>{f.type}</span>
                      <span className="text-xs text-muted-foreground">{fmtTime(f.createdAt)}</span>
                      {f.page && <span className="text-xs font-mono text-muted-foreground ml-auto">{f.page}</span>}
                    </div>
                    <p className="text-sm text-foreground">{f.content}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
// ─── Waitlist Admin Panel ────────────────────────────────────────────────────
function WaitlistPanel() {
  const utils = trpc.useUtils();
  const { data: waitlistUsers = [], isLoading } = trpc.admin.waitlistUsers.useQuery();
  const approveMut = trpc.admin.approveUser.useMutation({
    onSuccess: () => {
      utils.admin.waitlistUsers.invalidate();
      utils.admin.users.invalidate();
    },
  });
  const rejectMut = trpc.admin.rejectUser.useMutation({
    onSuccess: () => {
      utils.admin.waitlistUsers.invalidate();
      utils.admin.users.invalidate();
    },
  });

  const pending = (waitlistUsers as any[]).filter((u: any) => u.waitlistStatus === "pending");
  const approved = (waitlistUsers as any[]).filter((u: any) => u.waitlistStatus === "approved");
  const rejected = (waitlistUsers as any[]).filter((u: any) => u.waitlistStatus === "rejected");

  return (
    <div className="space-y-6">
      {/* Waitlist KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Waitlist" value={waitlistUsers.length} icon={Users} color="bg-blue-400/10 text-blue-400" />
        <KpiCard label="Pending" value={pending.length} icon={Clock} color="bg-amber-400/10 text-amber-400" />
        <KpiCard label="Approved" value={approved.length} icon={CheckCircle} color="bg-emerald-400/10 text-emerald-400" />
        <KpiCard label="Rejected" value={rejected.length} icon={AlertCircle} color="bg-red-400/10 text-red-400" />
      </div>

      {/* Pending Users Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-muted/20 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Pending Approval ({pending.length})</h3>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading waitlist…</div>
        ) : pending.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No pending users</div>
        ) : (
          <div className="divide-y divide-border/50">
            {pending.map((u: any) => (
              <div key={u.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-muted/20 transition-colors">
                <div className="col-span-3 flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-foreground shrink-0">
                    {u.name ? u.name.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email || "—"}</p>
                  </div>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">{fmtDate(u.createdAt)}</div>
                <div className="col-span-2 text-xs text-muted-foreground">#{u.waitlistPosition ?? "—"}</div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users size={11} />
                    {u.referralCount ?? 0} referrals
                  </span>
                </div>
                <div className="col-span-3 flex items-center gap-2 justify-end">
                  <button
                    onClick={() => approveMut.mutate({ userId: u.id })}
                    disabled={approveMut.isPending}
                    className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => rejectMut.mutate({ userId: u.id })}
                    disabled={rejectMut.isPending}
                    className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Users */}
      {approved.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-muted/20 border-b border-border">
            <h3 className="text-sm font-medium text-foreground">Approved ({approved.length})</h3>
          </div>
          <div className="divide-y divide-border/50">
            {approved.map((u: any) => (
              <div key={u.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center">
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-medium text-emerald-400 shrink-0">
                    {u.name ? u.name.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email || "—"}</p>
                  </div>
                </div>
                <div className="col-span-3 text-xs text-muted-foreground">{fmtDate(u.createdAt)}</div>
                <div className="col-span-2 text-xs text-muted-foreground">{u.referralCount ?? 0} referrals</div>
                <div className="col-span-3 flex items-center justify-end">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md text-xs">
                    <CheckCircle size={11} /> Approved
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DemoLoginButton() {
  const { data } = trpc.admin.getDemoLoginUrl.useQuery(
    { origin: window.location.origin },
    { enabled: true }
  );
  return (
    <a
      href={data?.url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 bg-muted/40 hover:bg-muted/60 border border-border text-sm text-foreground px-4 py-2.5 rounded-xl transition-colors"
    >
      <Eye size={14} />
      Open Demo Session in New Tab
    </a>
  );
}

export default function AdminUsers() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [mainView, setMainView] = useState<"users" | "funnel" | "waitlist" | "demo">("users");
  const [demoSeedStatus, setDemoSeedStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [demoSeedMessage, setDemoSeedMessage] = useState("");

  const { data: demoInfo, refetch: refetchDemoInfo } = trpc.admin.getDemoUserInfo.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const seedDemoUserMutation = trpc.admin.seedDemoUser.useMutation({
    onSuccess: (result) => {
      setDemoSeedStatus("success");
      setDemoSeedMessage(result.message);
      refetchDemoInfo();
    },
    onError: (err) => {
      setDemoSeedStatus("error");
      setDemoSeedMessage(err.message);
    },
  });

  const { data: allUsers = [], isLoading } = trpc.admin.users.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return allUsers as AdminUser[];
    const q = search.toLowerCase();
    return (allUsers as AdminUser[]).filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  }, [allUsers, search]);

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle size={40} className="text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium">Access Denied</p>
            <p className="text-sm text-muted-foreground mt-1">This page is restricted to admin accounts.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <span>Admin</span>
            <ChevronRight size={12} />
            <span className="text-foreground">User Analytics</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1">User Analytics</h1>
              <p className="text-sm text-muted-foreground">Monitor individual user behavior, activity, and onboarding progress.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted/40 border border-border rounded-xl p-1">
                <button
                  onClick={() => setMainView("users")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    mainView === "users" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users size={12} />
                  Users
                </button>
                <button
                  onClick={() => setMainView("funnel")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    mainView === "funnel" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <TrendingUp size={12} />
                  Funnel
                </button>
                <button
                  onClick={() => setMainView("waitlist")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    mainView === "waitlist" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List size={12} />
                  Waitlist
                </button>
                <button
                  onClick={() => setMainView("demo")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    mainView === "demo" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Zap size={12} />
                  Demo
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2">
                <Users size={13} />
                <span>{allUsers.length} total users</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Total Users" value={allUsers.length} icon={Users} color="bg-emerald-400/10 text-emerald-400" />
          <KpiCard
            label="Signed Up Today"
            value={(allUsers as AdminUser[]).filter(u => {
              const d = new Date(u.createdAt);
              const today = new Date();
              return d.toDateString() === today.toDateString();
            }).length}
            icon={TrendingUp}
            color="bg-blue-400/10 text-blue-400"
          />
          <KpiCard
            label="Active Last 7 Days"
            value={(allUsers as AdminUser[]).filter(u => {
              const d = new Date(u.lastSignedIn);
              return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
            }).length}
            icon={Activity}
            color="bg-purple-400/10 text-purple-400"
          />
          <KpiCard
            label="Admins"
            value={(allUsers as AdminUser[]).filter(u => u.role === "admin").length}
            icon={CheckCircle}
            color="bg-amber-400/10 text-amber-400"
          />
        </div>

        {/* Funnel View */}
        {mainView === "funnel" && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <FunnelView />
          </div>
        )}

        {/* Waitlist View */}
        {mainView === "waitlist" && <WaitlistPanel />}

        {/* Demo User Panel */}
        {mainView === "demo" && (
          <div className="bg-card border border-border rounded-2xl p-6 max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center">
                <Zap size={18} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Demo User</h2>
                <p className="text-sm text-muted-foreground">Seed a test account with realistic mock data for all integrations</p>
              </div>
            </div>

            {/* Status */}
            <div className="bg-muted/30 border border-border rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">demo@opencommand.co</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Meridian Software — B2B SaaS demo account</p>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                  demoInfo?.exists ? "bg-emerald-400/10 text-emerald-400" : "bg-muted text-muted-foreground"
                }`}>
                  {demoInfo?.exists ? <><CheckCircle size={11} /> Active</> : <><AlertCircle size={11} /> Not seeded</>}
                </div>
              </div>
              {demoInfo?.exists && demoInfo.userId && (
                <p className="text-xs text-muted-foreground mt-2">User ID: {demoInfo.userId}</p>
              )}
            </div>

            {/* Mock data summary */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: "Salesforce", detail: "63 open opps · $847K pipeline", color: "text-blue-400" },
                { label: "HubSpot", detail: "47 open deals · $612K pipeline", color: "text-orange-400" },
                { label: "Meta Ads", detail: "4 campaigns · $11.3K spend/30d", color: "text-purple-400" },
                { label: "Google Ads", detail: "5 campaigns · $17.1K spend/30d", color: "text-yellow-400" },
                { label: "GA4", detail: "28.4K users · 2.72% conv rate", color: "text-emerald-400" },
              ].map(item => (
                <div key={item.label} className="bg-muted/20 border border-border rounded-lg p-3">
                  <p className={`text-xs font-semibold ${item.color} mb-0.5`}>{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>

            {/* Seed button */}
            {demoSeedStatus === "success" && (
              <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-4 py-3 mb-4">
                <CheckCircle size={15} />
                <span>{demoSeedMessage}</span>
              </div>
            )}
            {demoSeedStatus === "error" && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-4">
                <AlertCircle size={15} />
                <span>{demoSeedMessage}</span>
              </div>
            )}
            <button
              onClick={() => {
                setDemoSeedStatus("loading");
                setDemoSeedMessage("");
                seedDemoUserMutation.mutate();
              }}
              disabled={demoSeedStatus === "loading"}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-3 rounded-xl transition-colors"
            >
              <Zap size={15} />
              {demoSeedStatus === "loading" ? "Seeding…" : demoInfo?.exists ? "Reset Demo User" : "Seed Demo User"}
            </button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              This creates/resets the demo account with all mock connections.
            </p>

            {/* Quick login link */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-medium text-foreground mb-2">Quick Demo Access</p>
              <DemoLoginButton />
              <p className="text-xs text-muted-foreground text-center mt-2">
                Logs in as <span className="font-mono">demo@opencommand.co</span> — Meridian Software
              </p>
            </div>
          </div>
        )}

        {mainView === "users" && (
        <>{/* Search */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-400/50 transition-colors"
          />
        </div>

        {/* User Table */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-muted/20 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <div className="col-span-4">User</div>
            <div className="col-span-2">Joined</div>
            <div className="col-span-2">Last Seen</div>
            <div className="col-span-2">Login</div>
            <div className="col-span-1">Role</div>
            <div className="col-span-1" />
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading users…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No users found</div>
          ) : (
            filtered.map((u) => (
              <div
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className="grid grid-cols-12 gap-4 px-4 py-4 border-b border-border/50 last:border-0 hover:bg-muted/20 cursor-pointer transition-colors group"
              >
                {/* Name + Email */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-400/10 flex items-center justify-center text-emerald-400 font-semibold text-sm shrink-0">
                    {(u.name || u.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email || "—"}</p>
                  </div>
                </div>
                {/* Joined */}
                <div className="col-span-2 flex items-center text-sm text-muted-foreground">
                  {fmtDate(u.createdAt)}
                </div>
                {/* Last Seen */}
                <div className="col-span-2 flex items-center text-sm text-muted-foreground">
                  {fmtRelative(u.lastSignedIn)}
                </div>
                {/* Login Method */}
                <div className="col-span-2 flex items-center">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 border border-border text-muted-foreground capitalize">
                    {u.loginMethod || "unknown"}
                  </span>
                </div>
                {/* Role */}
                <div className="col-span-1 flex items-center">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${u.role === "admin" ? "border-emerald-400/40 text-emerald-400" : "border-border text-muted-foreground"}`}>
                    {u.role}
                  </span>
                </div>
                {/* Arrow */}
                <div className="col-span-1 flex items-center justify-end">
                  <ChevronRight size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>
        </>
        )}
      </div>

      {/* User Detail Slide-over */}
      {selectedUser && (
        <UserDetail user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </DashboardLayout>
  );
}
