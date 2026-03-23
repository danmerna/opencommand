import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, Zap, Clock, ArrowRight, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

type TimeRange = "all" | "7d" | "30d";

function filterByTime<T extends { createdAt: Date | string }>(items: T[], range: TimeRange): T[] {
  if (range === "all") return items;
  const now = Date.now();
  const ms = range === "7d" ? 7 * 86400000 : 30 * 86400000;
  return items.filter((i) => new Date(i.createdAt).getTime() > now - ms);
}

export default function Analytics() {
  const { isAuthenticated, user } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const { data: summary, isLoading: summaryLoading } = trpc.analytics.summary.useQuery(undefined, { enabled: isAuthenticated });
  const { data: events, isLoading: eventsLoading } = trpc.analytics.events.useQuery(undefined, { enabled: isAuthenticated });

  const filteredEvents = useMemo(() => filterByTime(events ?? [], timeRange), [events, timeRange]);

  const totalEvents = filteredEvents.length;
  const uniqueFeatures = useMemo(() => new Set(filteredEvents.map((e) => e.feature)).size, [filteredEvents]);
  const uniqueUsers = useMemo(() => new Set(filteredEvents.map((e) => e.userId)).size, [filteredEvents]);

  // Group events by feature for the bar chart
  const featureBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    filteredEvents.forEach((e) => map.set(e.feature, (map.get(e.feature) || 0) + 1));
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [filteredEvents]);

  const maxCount = featureBreakdown.length > 0 ? featureBreakdown[0][1] : 1;

  // Daily activity for sparkline
  const dailyActivity = useMemo(() => {
    const map = new Map<string, number>();
    filteredEvents.forEach((e) => {
      const day = new Date(e.createdAt).toISOString().slice(0, 10);
      map.set(day, (map.get(day) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-30);
  }, [filteredEvents]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-full p-10">
        <div className="text-center max-w-sm">
          <BarChart3 size={32} className="text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-medium mb-2">Sign in to view analytics</h2>
          <p className="text-sm text-muted-foreground mb-6">Track which features your team uses most.</p>
          <Button onClick={() => (window.location.href = getLoginUrl())}>
            Sign in <ArrowRight size={14} className="ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  const isLoading = summaryLoading || eventsLoading;

  return (
    <div className="min-h-full p-6 md:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={18} className="text-muted-foreground" />
            <h1 className="text-2xl font-light tracking-tight">Usage Analytics</h1>
          </div>
          <p className="text-sm text-muted-foreground">Track feature engagement across your workspace.</p>
        </div>
        <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
          {(["7d", "30d", "all"] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                timeRange === r ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="border border-border rounded-xl p-5 bg-white/[0.02]">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <Zap size={14} />
            <span className="text-xs uppercase tracking-wider">Total Events</span>
          </div>
          <p className="text-3xl font-light">{isLoading ? "..." : totalEvents.toLocaleString()}</p>
        </div>
        <div className="border border-border rounded-xl p-5 bg-white/[0.02]">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <TrendingUp size={14} />
            <span className="text-xs uppercase tracking-wider">Features Used</span>
          </div>
          <p className="text-3xl font-light">{isLoading ? "..." : uniqueFeatures}</p>
        </div>
        <div className="border border-border rounded-xl p-5 bg-white/[0.02]">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <Users size={14} />
            <span className="text-xs uppercase tracking-wider">Active Users</span>
          </div>
          <p className="text-3xl font-light">{isLoading ? "..." : uniqueUsers}</p>
        </div>
      </div>

      {/* Daily Activity Sparkline */}
      {dailyActivity.length > 0 && (
        <div className="border border-border rounded-xl p-5 bg-white/[0.02] mb-8">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <Clock size={14} />
            <span className="text-xs uppercase tracking-wider">Daily Activity</span>
          </div>
          <div className="flex items-end gap-[2px] h-20">
            {dailyActivity.map(([day, count]) => {
              const maxDaily = Math.max(...dailyActivity.map((d) => d[1]));
              const height = maxDaily > 0 ? (count / maxDaily) * 100 : 0;
              return (
                <div key={day} className="flex-1 group relative">
                  <div
                    className="bg-emerald-400/60 rounded-t-sm transition-colors group-hover:bg-emerald-400"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                    {day}: {count} events
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feature Breakdown */}
      <div className="border border-border rounded-xl p-5 bg-white/[0.02] mb-8">
        <div className="flex items-center gap-2 text-muted-foreground mb-4">
          <BarChart3 size={14} />
          <span className="text-xs uppercase tracking-wider">Feature Breakdown</span>
        </div>
        {featureBreakdown.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-muted-foreground">No feature events recorded yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Events will appear here as users interact with the platform.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {featureBreakdown.map(([feature, count]) => (
              <div key={feature} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-36 truncate shrink-0">{feature}</span>
                <div className="flex-1 bg-muted/20 rounded-full h-5 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400/40 rounded-full transition-all"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right shrink-0">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Table (from aggregated server data) */}
      {summary && summary.length > 0 && (
        <div className="border border-border rounded-xl p-5 bg-white/[0.02]">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <TrendingUp size={14} />
            <span className="text-xs uppercase tracking-wider">All-Time Summary</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-4">Feature</th>
                  <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-4">Action</th>
                  <th className="text-right text-xs text-muted-foreground font-medium py-2 pr-4">Count</th>
                  <th className="text-right text-xs text-muted-foreground font-medium py-2 pr-4">Users</th>
                  <th className="text-right text-xs text-muted-foreground font-medium py-2">Last Used</th>
                </tr>
              </thead>
              <tbody>
                {summary.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-4 text-foreground">{row.feature}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{row.action}</td>
                    <td className="py-2 pr-4 text-right text-foreground">{Number(row.count).toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right text-muted-foreground">{Number(row.uniqueUsers)}</td>
                    <td className="py-2 text-right text-muted-foreground text-xs">
                      {row.lastUsed ? new Date(row.lastUsed).toLocaleDateString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
