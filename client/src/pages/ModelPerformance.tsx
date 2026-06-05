import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Cpu,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  TrendingUp,
  Zap,
  BarChart3,
} from "lucide-react";
import {
  MODEL_REGISTRY,
  getModelById,
  getTierColor,
  getProviderColor,
  type ModelDefinition,
} from "@shared/modelRegistry";

export default function ModelPerformance() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  // Fetch execution stats
  const { data: stats, isLoading } = trpc.models.getExecutionMetrics.useQuery(
    { timeRange },
    { enabled: !!user }
  );

  // The API returns { summary, recentLogs, timeRange }
  const modelStats = useMemo(() => {
    if (!stats?.summary?.length) return [];

    return stats.summary
      .map((s: any) => ({
        modelId: s.modelId,
        totalCalls: s.totalCalls || 0,
        totalCost: parseFloat(s.totalCostUsd || "0"),
        avgLatency: s.avgLatencyMs || 0,
        successRate: (s.successRate || 0).toFixed(1),
        avgCostPerCall: s.totalCalls > 0 ? parseFloat(s.totalCostUsd || "0") / s.totalCalls : 0,
        totalInputTokens: s.totalInputTokens || 0,
        totalOutputTokens: s.totalOutputTokens || 0,
        successes: s.successCount || 0,
        failures: (s.totalCalls || 0) - (s.successCount || 0),
        totalLatency: (s.avgLatencyMs || 0) * (s.totalCalls || 0),
      }))
      .sort((a: any, b: any) => b.totalCost - a.totalCost);
  }, [stats]);

  // Summary metrics
  const summary = useMemo(() => {
    if (!modelStats.length)
      return { totalCost: 0, totalCalls: 0, avgLatency: 0, avgSuccess: 0 };
    const totalCost = modelStats.reduce((s: number, m: any) => s + m.totalCost, 0);
    const totalCalls = modelStats.reduce((s: number, m: any) => s + m.totalCalls, 0);
    const totalLatency = modelStats.reduce((s: number, m: any) => s + m.totalLatency, 0);
    const totalSuccesses = modelStats.reduce((s: number, m: any) => s + m.successes, 0);
    return {
      totalCost,
      totalCalls,
      avgLatency: totalCalls > 0 ? totalLatency / totalCalls : 0,
      avgSuccess: totalCalls > 0 ? (totalSuccesses / totalCalls) * 100 : 0,
    };
  }, [modelStats]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-400" />
            Model Performance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track cost, latency, and success rate across all LLM models used by
            your agents.
          </p>
        </div>
        <Select
          value={timeRange}
          onValueChange={(v) => setTimeRange(v as "7d" | "30d" | "90d")}
        >
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d" className="text-xs">
              Last 7 days
            </SelectItem>
            <SelectItem value="30d" className="text-xs">
              Last 30 days
            </SelectItem>
            <SelectItem value="90d" className="text-xs">
              Last 90 days
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-4 h-4 text-accent" />
            <span className="text-xs font-medium">Total Cost</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            ${summary.totalCost.toFixed(4)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {timeRange === "7d"
              ? "past week"
              : timeRange === "30d"
                ? "past month"
                : "past quarter"}
          </p>
        </Card>
        <Card className="p-4 bg-card border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-medium">Total Calls</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {summary.totalCalls.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            across all models
          </p>
        </Card>
        <Card className="p-4 bg-card border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium">Avg Latency</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {summary.avgLatency.toFixed(0)}ms
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            per LLM call
          </p>
        </Card>
        <Card className="p-4 bg-card border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CheckCircle2 className="w-4 h-4 text-accent" />
            <span className="text-xs font-medium">Success Rate</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {summary.avgSuccess.toFixed(1)}%
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            across all executions
          </p>
        </Card>
      </div>

      {/* Model Breakdown Table */}
      <Card className="p-5 bg-card border-border/50">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-400" />
          Per-Model Breakdown
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : modelStats.length === 0 ? (
          <div className="text-center py-12">
            <Cpu className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No execution data yet. Run a blueprint to see model performance
              metrics.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30 text-muted-foreground">
                  <th className="text-left py-2 px-2 font-medium">Model</th>
                  <th className="text-left py-2 px-2 font-medium">Provider</th>
                  <th className="text-right py-2 px-2 font-medium">Calls</th>
                  <th className="text-right py-2 px-2 font-medium">
                    Total Cost
                  </th>
                  <th className="text-right py-2 px-2 font-medium">
                    Avg $/call
                  </th>
                  <th className="text-right py-2 px-2 font-medium">
                    Avg Latency
                  </th>
                  <th className="text-right py-2 px-2 font-medium">
                    Success
                  </th>
                  <th className="text-right py-2 px-2 font-medium">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {modelStats.map((ms) => {
                  const model = getModelById(ms.modelId);
                  return (
                    <tr
                      key={ms.modelId}
                      className="border-b border-border/10 hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: model
                                ? getProviderColor(model.provider)
                                : "#64748b",
                            }}
                          />
                          <span className="font-medium text-foreground">
                            {model?.name || ms.modelId}
                          </span>
                          {model && (
                            <Badge
                              variant="outline"
                              className={`text-[8px] px-1 py-0 h-3.5 ${getTierColor(model.tier)}`}
                            >
                              {model.tier}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-muted-foreground capitalize">
                        {model?.provider || "unknown"}
                      </td>
                      <td className="py-2.5 px-2 text-right text-foreground font-mono">
                        {ms.totalCalls.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-right text-accent font-mono">
                        ${ms.totalCost.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-muted-foreground font-mono">
                        ${ms.avgCostPerCall.toFixed(5)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-amber-400 font-mono">
                        {ms.avgLatency.toFixed(0)}ms
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <span
                          className={
                            parseFloat(ms.successRate) >= 95
                              ? "text-accent"
                              : parseFloat(ms.successRate) >= 80
                                ? "text-amber-400"
                                : "text-red-400"
                          }
                        >
                          {ms.successRate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-muted-foreground font-mono">
                        {(
                          (ms.totalInputTokens + ms.totalOutputTokens) /
                          1000
                        ).toFixed(1)}
                        K
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Model Catalog */}
      <Card className="p-5 bg-card border-border/50">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Available Models & Pricing
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODEL_REGISTRY.map((model) => (
            <div
              key={model.id}
              className="p-3 rounded-lg border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: getProviderColor(model.provider) }}
                  />
                  <span className="text-xs font-medium text-foreground">
                    {model.name}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[8px] px-1 py-0 h-3.5 ${getTierColor(model.tier)}`}
                >
                  {model.tier}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight mb-2">
                {model.strengths}
              </p>
              <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <DollarSign className="w-2.5 h-2.5" />${model.costPerMillionInput}/
                  {model.costPerMillionOutput}
                </span>
                <span>{(model.contextWindow / 1000).toFixed(0)}K ctx</span>
                {model.supportsVision && <span>Vision</span>}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {model.recommendedRoles.map((role) => (
                  <Badge
                    key={role}
                    variant="outline"
                    className="text-[8px] px-1 py-0 h-3 border-purple-500/20 text-purple-400"
                  >
                    {role.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
