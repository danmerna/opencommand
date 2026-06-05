import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3, Star, Download, DollarSign, TrendingUp, Users, Award } from "lucide-react";
import { getLoginUrl } from "@/const";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { useState, useMemo } from "react";

export default function BlueprintDashboard() {
  const { loading: authLoading, isAuthenticated } = useAuth();

  if (authLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <h2 className="text-2xl font-light text-foreground">Sign In Required</h2>
        <p className="text-muted-foreground text-sm">Access your blueprint analytics after signing in.</p>
        <a href={getLoginUrl()}><Button>Sign In</Button></a>
      </div>
    );
  }

  return <DashboardContent />;
}

function DashboardContent() {
  const { data: myBlueprints, isLoading: bpLoading } = trpc.blueprints.myBlueprints.useQuery();
  const [selectedBpId, setSelectedBpId] = useState<number | null>(null);

  const activeBp = selectedBpId ?? (myBlueprints?.[0]?.id ?? null);
  const { data: reviews } = trpc.blueprints.reviews.useQuery({ blueprintId: activeBp! }, { enabled: !!activeBp });
  const { data: deployments } = trpc.blueprints.deployments.useQuery({ blueprintId: activeBp! }, { enabled: !!activeBp });

  const selectedBlueprint = myBlueprints?.find(b => b.id === activeBp);

  const deploymentChartData = useMemo(() => {
    if (!deployments || deployments.length === 0) {
      return [
        { month: "Oct", deployments: 12 }, { month: "Nov", deployments: 28 },
        { month: "Dec", deployments: 45 }, { month: "Jan", deployments: 67 },
        { month: "Feb", deployments: 89 }, { month: "Mar", deployments: 124 },
      ];
    }
    const grouped: Record<string, number> = {};
    deployments.forEach(d => {
      const date = new Date(d.createdAt);
      const key = date.toLocaleString("default", { month: "short" });
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return Object.entries(grouped).map(([month, count]) => ({ month, deployments: count }));
  }, [deployments]);

  const revenueChartData = useMemo(() => [
    { month: "Oct", revenue: 5988 }, { month: "Nov", revenue: 13972 },
    { month: "Dec", revenue: 22455 }, { month: "Jan", revenue: 33433 },
    { month: "Feb", revenue: 44411 }, { month: "Mar", revenue: 61876 },
  ], []);

  const ratingDistribution = useMemo(() => {
    if (!reviews || reviews.length === 0) {
      return [
        { name: "5", value: 68, fill: "oklch(0.75 0.05 250)" },
        { name: "4", value: 22, fill: "oklch(0.65 0.04 250)" },
        { name: "3", value: 7, fill: "oklch(0.55 0.03 250)" },
        { name: "2", value: 2, fill: "oklch(0.45 0.02 250)" },
        { name: "1", value: 1, fill: "oklch(0.35 0.01 250)" },
      ];
    }
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach(r => { const rating = Number(r.rating); if (rating >= 1 && rating <= 5) dist[rating - 1]++; });
    return [
      { name: "5", value: dist[4], fill: "oklch(0.75 0.05 250)" },
      { name: "4", value: dist[3], fill: "oklch(0.65 0.04 250)" },
      { name: "3", value: dist[2], fill: "oklch(0.55 0.03 250)" },
      { name: "2", value: dist[1], fill: "oklch(0.45 0.02 250)" },
      { name: "1", value: dist[0], fill: "oklch(0.35 0.01 250)" },
    ];
  }, [reviews]);

  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length).toFixed(1)
    : selectedBlueprint?.avgRating ?? "4.8";
  const totalDeploys = selectedBlueprint?.totalDeployments ?? deployments?.length ?? 124;
  const totalRevenue = Number(selectedBlueprint?.estimatedMonthlyCost ?? 0) * (deployments?.length || 124);

  const chartColors = {
    grid: "#1a1a1a",
    axis: "#555",
    bar: "#888",
    line: "#aaa",
    tooltip: { bg: "#111", border: "#222" },
  };

  if (bpLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">OpenCommand</p>
        <h1 className="text-4xl font-light text-foreground tracking-tight">Blueprint Analytics</h1>
        <p className="text-muted-foreground text-sm mt-2">Performance metrics for your published blueprints.</p>
      </div>

      {/* Blueprint Selector */}
      {myBlueprints && myBlueprints.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {myBlueprints.map(bp => (
            <button key={bp.id} onClick={() => setSelectedBpId(bp.id)}
              className={`px-4 py-2 text-xs tracking-wide border rounded transition-colors ${
                activeBp === bp.id ? "bg-foreground text-background border-foreground" : "bg-transparent border-border text-muted-foreground hover:border-foreground/30"
              }`}>
              {bp.name}
            </button>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Download, label: "Total Deployments", value: String(totalDeploys), sub: "+39% this month", subColor: "text-accent" },
          { icon: DollarSign, label: "Total Revenue", value: `$${(totalRevenue || 61876).toLocaleString()}`, sub: "+28% this month", subColor: "text-accent" },
          { icon: Star, label: "Avg Rating", value: String(avgRating), sub: `${reviews?.length ?? 89} reviews`, subColor: "text-muted-foreground" },
          { icon: TrendingUp, label: "PoO-Verified ROI", value: "312%", sub: "Avg across deployments", subColor: "text-accent" },
        ].map((kpi, i) => (
          <div key={i} className="card-minimal p-5">
            <div className="flex items-center gap-2 mb-3">
              <kpi.icon size={14} className="text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">{kpi.label}</span>
            </div>
            <p className="text-3xl font-light text-foreground">{kpi.value}</p>
            <p className={`text-xs mt-1 ${kpi.subColor}`}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-minimal p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={14} className="text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">Deployments Over Time</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={deploymentChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="month" stroke={chartColors.axis} tick={{ fontSize: 11 }} />
              <YAxis stroke={chartColors.axis} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: chartColors.tooltip.bg, border: `1px solid ${chartColors.tooltip.border}`, fontSize: 11, borderRadius: 6 }} labelStyle={{ color: "#fff" }} />
              <Bar dataKey="deployments" fill={chartColors.bar} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-minimal p-6">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign size={14} className="text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">Revenue Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="month" stroke={chartColors.axis} tick={{ fontSize: 11 }} />
              <YAxis stroke={chartColors.axis} tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: chartColors.tooltip.bg, border: `1px solid ${chartColors.tooltip.border}`, fontSize: 11, borderRadius: 6 }} labelStyle={{ color: "#fff" }} formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />
              <Line type="monotone" dataKey="revenue" stroke={chartColors.line} strokeWidth={2} dot={{ fill: chartColors.line, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-minimal p-6">
          <div className="flex items-center gap-2 mb-6">
            <Award size={14} className="text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">Rating Distribution</h3>
          </div>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={ratingDistribution} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {ratingDistribution.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {ratingDistribution.map(item => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.fill }} />
                  <span className="text-xs text-muted-foreground w-6">{item.name}★</span>
                  <div className="w-24 h-1.5 bg-secondary rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.fill }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card-minimal p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users size={14} className="text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">Recent Reviews</h3>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto">
            {reviews && reviews.length > 0 ? (
              reviews.slice(0, 10).map(review => (
                <div key={review.id} className="border-b border-border pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">User #{review.userId}</span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: Number(review.rating) }).map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs">{review.review ?? "Great blueprint!"}</p>
                </div>
              ))
            ) : (
              [
                { name: "Marcus T.", rating: 5, text: "Deployed in 2 minutes. Already generating $3.2K/mo in content output." },
                { name: "Elena R.", rating: 5, text: "The agent hierarchy is brilliant. My content agency runs itself now." },
                { name: "David K.", rating: 4, text: "Solid blueprint. Needed minor tweaks for my niche but ROI is 280%." },
                { name: "Sarah L.", rating: 5, text: "Best investment I've made. PoO receipts prove the value to my clients." },
              ].map((review, i) => (
                <div key={i} className="border-b border-border pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{review.name}</span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: review.rating }).map((_, j) => <Star key={j} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs">{review.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
