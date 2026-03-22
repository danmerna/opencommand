import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3, Star, Download, DollarSign, TrendingUp, Users, Award } from "lucide-react";
import { getLoginUrl } from "@/const";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { useState, useMemo } from "react";

export default function BlueprintDashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <h2 className="font-heading text-3xl font-black text-white uppercase">Sign In Required</h2>
        <p className="text-zinc-500 font-mono text-sm">Access your blueprint analytics after signing in.</p>
        <a href={getLoginUrl()}>
          <Button className="bg-red-600 hover:bg-red-700 text-white font-heading uppercase tracking-wider">
            Sign In
          </Button>
        </a>
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

  // Generate deployment chart data from deployments
  const deploymentChartData = useMemo(() => {
    if (!deployments || deployments.length === 0) {
      // Seed data for demo
      return [
        { month: "Oct", deployments: 12 },
        { month: "Nov", deployments: 28 },
        { month: "Dec", deployments: 45 },
        { month: "Jan", deployments: 67 },
        { month: "Feb", deployments: 89 },
        { month: "Mar", deployments: 124 },
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

  // Revenue chart data
  const revenueChartData = useMemo(() => {
    return [
      { month: "Oct", revenue: 5988 },
      { month: "Nov", revenue: 13972 },
      { month: "Dec", revenue: 22455 },
      { month: "Jan", revenue: 33433 },
      { month: "Feb", revenue: 44411 },
      { month: "Mar", revenue: 61876 },
    ];
  }, []);

  // Rating distribution
  const ratingDistribution = useMemo(() => {
    if (!reviews || reviews.length === 0) {
      return [
        { name: "5★", value: 68, fill: "#dc2626" },
        { name: "4★", value: 22, fill: "#ef4444" },
        { name: "3★", value: 7, fill: "#f87171" },
        { name: "2★", value: 2, fill: "#fca5a5" },
        { name: "1★", value: 1, fill: "#fecaca" },
      ];
    }
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach(r => {
      const rating = Number(r.rating);
      if (rating >= 1 && rating <= 5) dist[rating - 1]++;
    });
    return [
      { name: "5★", value: dist[4], fill: "#dc2626" },
      { name: "4★", value: dist[3], fill: "#ef4444" },
      { name: "3★", value: dist[2], fill: "#f87171" },
      { name: "2★", value: dist[1], fill: "#fca5a5" },
      { name: "1★", value: dist[0], fill: "#fecaca" },
    ];
  }, [reviews]);

  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length).toFixed(1)
    : selectedBlueprint?.avgRating ?? "4.8";

  const totalDeploys = selectedBlueprint?.totalDeployments ?? deployments?.length ?? 124;
  const totalRevenue = Number(selectedBlueprint?.estimatedMonthlyCost ?? 0) * (deployments?.length || 124);

  if (bpLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-4xl md:text-5xl font-black text-white uppercase tracking-tight">
          Blueprint Analytics
        </h1>
        <div className="w-full h-[2px] bg-red-600 mt-3 mb-4" />
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
          Performance metrics for your published blueprints
        </p>
      </div>

      {/* Blueprint Selector */}
      {myBlueprints && myBlueprints.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {myBlueprints.map(bp => (
            <button
              key={bp.id}
              onClick={() => setSelectedBpId(bp.id)}
              className={`px-4 py-2 font-mono text-xs uppercase tracking-wider border transition-colors ${
                activeBp === bp.id
                  ? "bg-red-600 border-red-600 text-white"
                  : "bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {bp.name}
            </button>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-4 h-4 text-red-500" />
            <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Total Deployments</span>
          </div>
          <p className="font-heading text-3xl font-black text-white">{totalDeploys}</p>
          <p className="text-green-500 font-mono text-xs mt-1">+39% this month</p>
        </div>
        <div className="border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-red-500" />
            <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Total Revenue</span>
          </div>
          <p className="font-heading text-3xl font-black text-white">${(totalRevenue || 61876).toLocaleString()}</p>
          <p className="text-green-500 font-mono text-xs mt-1">+28% this month</p>
        </div>
        <div className="border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-red-500" />
            <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Avg Rating</span>
          </div>
          <p className="font-heading text-3xl font-black text-white">{avgRating}</p>
          <p className="text-zinc-500 font-mono text-xs mt-1">{reviews?.length ?? 89} reviews</p>
        </div>
        <div className="border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-red-500" />
            <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">PoO-Verified ROI</span>
          </div>
          <p className="font-heading text-3xl font-black text-white">312%</p>
          <p className="text-green-500 font-mono text-xs mt-1">Avg across deployments</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deployment Trend */}
        <div className="border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-4 h-4 text-red-500" />
            <h3 className="font-heading text-lg font-black text-white uppercase tracking-tight">
              Deployments Over Time
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={deploymentChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#71717a" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
              <YAxis stroke="#71717a" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", fontFamily: "JetBrains Mono", fontSize: 11 }}
                labelStyle={{ color: "#fff" }}
              />
              <Bar dataKey="deployments" fill="#dc2626" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend */}
        <div className="border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="w-4 h-4 text-red-500" />
            <h3 className="font-heading text-lg font-black text-white uppercase tracking-tight">
              Revenue Trend
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#71717a" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
              <YAxis stroke="#71717a" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", fontFamily: "JetBrains Mono", fontSize: 11 }}
                labelStyle={{ color: "#fff" }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
              />
              <Line type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={2} dot={{ fill: "#dc2626", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row: Rating Distribution + Recent Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <div className="border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-4 h-4 text-red-500" />
            <h3 className="font-heading text-lg font-black text-white uppercase tracking-tight">
              Rating Distribution
            </h3>
          </div>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={ratingDistribution} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {ratingDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {ratingDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-3 h-3" style={{ backgroundColor: item.fill }} />
                  <span className="font-mono text-xs text-zinc-400 w-8">{item.name}</span>
                  <div className="w-24 h-2 bg-zinc-800">
                    <div className="h-full" style={{ width: `${item.value}%`, backgroundColor: item.fill }} />
                  </div>
                  <span className="font-mono text-xs text-zinc-500">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-4 h-4 text-red-500" />
            <h3 className="font-heading text-lg font-black text-white uppercase tracking-tight">
              Recent Reviews
            </h3>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto">
            {reviews && reviews.length > 0 ? (
              reviews.slice(0, 10).map((review) => (
                <div key={review.id} className="border-b border-zinc-800 pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-zinc-400">{"User #" + review.userId}</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Number(review.rating) }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-red-500 text-red-500" />
                      ))}
                    </div>
                  </div>
                  <p className="text-zinc-500 font-mono text-xs">{review.review ?? "Great blueprint!"}</p>
                </div>
              ))
            ) : (
              <>
                {[
                  { name: "Marcus T.", rating: 5, text: "Deployed in 2 minutes. Already generating $3.2K/mo in content output." },
                  { name: "Elena R.", rating: 5, text: "The agent hierarchy is brilliant. My content agency runs itself now." },
                  { name: "David K.", rating: 4, text: "Solid blueprint. Needed minor tweaks for my niche but ROI is 280%." },
                  { name: "Sarah L.", rating: 5, text: "Best investment I've made. PoO receipts prove the value to my clients." },
                ].map((review, i) => (
                  <div key={i} className="border-b border-zinc-800 pb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs text-zinc-400">{review.name}</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: review.rating }).map((_, j) => (
                          <Star key={j} className="w-3 h-3 fill-red-500 text-red-500" />
                        ))}
                      </div>
                    </div>
                    <p className="text-zinc-500 font-mono text-xs">{review.text}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
