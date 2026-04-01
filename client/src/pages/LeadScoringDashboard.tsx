import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { ChevronDown, TrendingUp, Users, Target, Zap } from "lucide-react";

export function LeadScoringDashboard() {
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null);
  const [selectedTier, setSelectedTier] = useState<"high" | "medium" | "low" | "all">("all");

  // Fetch lead scoring data
  const { data: scoredLeads = [], isLoading: leadsLoading } = trpc.templates.scoreLeads.useQuery();
  const { data: distribution = { high: 0, medium: 0, low: 0, average: 0 }, isLoading: distLoading } = trpc.templates.getScoreDistribution.useQuery();
  const { data: topLeads = [], isLoading: topLoading } = trpc.templates.getTopLeads.useQuery({ limit: 10 });

  // Filter leads by tier
  const filteredLeads = useMemo(() => {
    if (selectedTier === "all") return scoredLeads;
    return scoredLeads.filter((lead: any) => lead.tier === selectedTier);
  }, [scoredLeads, selectedTier]);

  // Prepare chart data
  const tierData = [
    { name: "High Priority", value: distribution.high, fill: "#10b981" },
    { name: "Medium Priority", value: distribution.medium, fill: "#f59e0b" },
    { name: "Low Priority", value: distribution.low, fill: "#ef4444" },
  ];

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "high":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "high":
        return <Zap className="w-4 h-4" />;
      case "medium":
        return <Target className="w-4 h-4" />;
      case "low":
        return <Users className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (leadsLoading || distLoading) {
    return <div className="p-8 text-center">Loading lead scores...</div>;
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Lead Scoring Dashboard</h1>
        <p className="text-gray-600">Prioritize high-value prospects with AI-powered lead scoring</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{distribution.average.toFixed(1)}</div>
            <p className="text-xs text-gray-500 mt-1">Out of 100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{distribution.high}</div>
            <p className="text-xs text-gray-500 mt-1">Ready to engage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Medium Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{distribution.medium}</div>
            <p className="text-xs text-gray-500 mt-1">Nurture needed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Low Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{distribution.low}</div>
            <p className="text-xs text-gray-500 mt-1">Follow up later</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Distribution by Tier</CardTitle>
            <CardDescription>Breakdown of leads by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tierData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tierData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Score Breakdown</CardTitle>
            <CardDescription>Scoring factors for high-priority leads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Equipment Type</span>
                  <span className="text-sm text-gray-600">+30 pts</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: "30%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Buyer History</span>
                  <span className="text-sm text-gray-600">+25 pts</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: "25%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Engagement Level</span>
                  <span className="text-sm text-gray-600">+25 pts</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: "25%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Response Urgency</span>
                  <span className="text-sm text-gray-600">+20 pts</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-600 h-2 rounded-full" style={{ width: "20%" }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Filter */}
      <div className="flex gap-2">
        <Button
          variant={selectedTier === "all" ? "default" : "outline"}
          onClick={() => setSelectedTier("all")}
        >
          All Leads
        </Button>
        <Button
          variant={selectedTier === "high" ? "default" : "outline"}
          onClick={() => setSelectedTier("high")}
          className="bg-green-100 text-green-800 hover:bg-green-200"
        >
          High Priority
        </Button>
        <Button
          variant={selectedTier === "medium" ? "default" : "outline"}
          onClick={() => setSelectedTier("medium")}
          className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
        >
          Medium Priority
        </Button>
        <Button
          variant={selectedTier === "low" ? "default" : "outline"}
          onClick={() => setSelectedTier("low")}
          className="bg-red-100 text-red-800 hover:bg-red-200"
        >
          Low Priority
        </Button>
      </div>

      {/* Lead List with Drill-Down */}
      <Card>
        <CardHeader>
          <CardTitle>Leads by Score</CardTitle>
          <CardDescription>Click to view scoring breakdown and adjust scores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredLeads.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No leads in this tier</p>
            ) : (
              filteredLeads.map((lead: any) => (
                <div key={lead.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedLeadId(expandedLeadId === lead.id ? null : lead.id)}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold">{lead.buyerName}</h3>
                          <p className="text-sm text-gray-600">{lead.equipmentType}</p>
                        </div>
                        <Badge className={getTierColor(lead.tier)}>
                          <span className="flex items-center gap-1">
                            {getTierIcon(lead.tier)}
                            {lead.tier.charAt(0).toUpperCase() + lead.tier.slice(1)}
                          </span>
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right mr-4">
                      <div className="text-2xl font-bold">{lead.score}</div>
                      <p className="text-xs text-gray-500">/ 100</p>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedLeadId === lead.id ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  {/* Expanded Details */}
                  {expandedLeadId === lead.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Equipment Type</p>
                          <p className="font-semibold">{lead.factors?.equipmentType || 0} pts</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Buyer History</p>
                          <p className="font-semibold">{lead.factors?.buyerHistory || 0} pts</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Engagement</p>
                          <p className="font-semibold">{lead.factors?.engagement || 0} pts</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Urgency</p>
                          <p className="font-semibold">{lead.factors?.urgency || 0} pts</p>
                        </div>
                      </div>

                      {lead.reasoning && (
                        <div className="bg-blue-50 p-3 rounded">
                          <p className="text-xs font-semibold text-blue-900 mb-2">Reasoning:</p>
                          <ul className="text-xs text-blue-800 space-y-1">
                            {lead.reasoning.map((reason: string, idx: number) => (
                              <li key={idx}>• {reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline">
                          Adjust Score
                        </Button>
                        <Button size="sm" variant="outline">
                          Send to Board
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
