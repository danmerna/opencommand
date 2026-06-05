import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from "recharts";
import { TrendingUp, DollarSign, Target, Zap, Calendar } from "lucide-react";

export function ROIAttribution() {
  const [selectedPeriod, setSelectedPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Fetch ROI data
  const { data: roiMetrics = { totalRevenueGenerated: 0, totalResponsesSent: 0, totalOpens: 0, totalClicks: 0, totalSalesGenerated: 0, openRate: 0, clickRate: 0, conversionRate: 0, roiPercentage: 0, revenuePerResponse: 0 }, isLoading: metricsLoading } = trpc.templates.getROIMetrics.useQuery();
  const { data: roiByPeriod = {}, isLoading: periodLoading } = trpc.templates.getROIByPeriod.useQuery({ period: selectedPeriod });
  const { data: roiByTemplate = {}, isLoading: templateLoading } = trpc.templates.getROIByTemplate.useQuery();
  const { data: roiBySegment = {}, isLoading: segmentLoading } = trpc.templates.getROIByBuyerSegment.useQuery();

  // Format period data for chart
  const periodChartData = Object.entries(roiByPeriod).map(([period, data]: any) => ({
    period,
    revenue: data.totalRevenueGenerated || 0,
    responses: data.totalResponsesSent || 0,
    conversions: data.totalSalesGenerated || 0,
  }));

  // Format template data for chart
  const templateChartData = Object.entries(roiByTemplate).map(([template, data]: any) => ({
    template: template.substring(0, 15) + "...",
    roi: data.roiPercentage || 0,
    revenue: data.totalRevenueGenerated || 0,
    conversions: data.totalSalesGenerated || 0,
  }));

  // Format segment data
  const segmentChartData = Object.entries(roiBySegment).map(([segment, data]: any) => ({
    segment,
    openRate: data.openRate || 0,
    clickRate: data.clickRate || 0,
    conversionRate: data.conversionRate || 0,
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (metricsLoading || periodLoading) {
    return <div className="p-8 text-center">Loading ROI data...</div>;
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">ROI Attribution</h1>
        <p className="text-gray-600">Track revenue impact of every response and optimize for maximum ROI</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(roiMetrics.totalRevenueGenerated || 0)}</div>
            <p className="text-xs text-gray-500 mt-1">From all responses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(roiMetrics.conversionRate || 0)}</div>
            <p className="text-xs text-gray-500 mt-1">{roiMetrics.totalSalesGenerated || 0} sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Open Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(roiMetrics.openRate || 0)}</div>
            <p className="text-xs text-gray-500 mt-1">{roiMetrics.totalOpens || 0} opens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              ROI %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatPercent(roiMetrics.roiPercentage || 0)}</div>
            <p className="text-xs text-gray-500 mt-1">Return on investment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Revenue/Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(roiMetrics.revenuePerResponse || 0)}</div>
            <p className="text-xs text-gray-500 mt-1">Average per response</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Revenue generated by period</CardDescription>
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                variant={selectedPeriod === "daily" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("daily")}
              >
                Daily
              </Button>
              <Button
                size="sm"
                variant={selectedPeriod === "weekly" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("weekly")}
              >
                Weekly
              </Button>
              <Button
                size="sm"
                variant={selectedPeriod === "monthly" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("monthly")}
              >
                Monthly
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={periodChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="oklch(0.72 0.12 250)" name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ROI by Template */}
        <Card>
          <CardHeader>
            <CardTitle>ROI by Template</CardTitle>
            <CardDescription>Performance of each email template</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={templateChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="template" />
                <YAxis />
                <Tooltip formatter={(value) => formatPercent(value as number)} />
                <Legend />
                <Bar dataKey="roi" fill="#3b82f6" name="ROI %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Engagement Metrics by Segment */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement by Buyer Segment</CardTitle>
            <CardDescription>Open, click, and conversion rates by segment</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={segmentChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="segment" />
                <YAxis />
                <Tooltip formatter={(value) => formatPercent(value as number)} />
                <Legend />
                <Bar dataKey="openRate" fill="oklch(0.72 0.12 250)" name="Open Rate %" />
                <Bar dataKey="clickRate" fill="#3b82f6" name="Click Rate %" />
                <Bar dataKey="conversionRate" fill="#f59e0b" name="Conversion Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Response to Revenue Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle>Response to Revenue Pipeline</CardTitle>
            <CardDescription>Funnel from responses to conversions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Responses Sent</span>
                  <span className="text-sm text-gray-600">{roiMetrics.totalResponsesSent || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-blue-600 h-3 rounded-full" style={{ width: "100%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Emails Opened</span>
                  <span className="text-sm text-gray-600">{roiMetrics.totalOpens || 0} ({formatPercent(roiMetrics.openRate || 0)})</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-green-600 h-3 rounded-full" style={{ width: `${roiMetrics.openRate || 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Links Clicked</span>
                  <span className="text-sm text-gray-600">{(roiMetrics as any).totalClicks || 0} ({formatPercent((roiMetrics as any).clickRate || 0)})</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-purple-600 h-3 rounded-full" style={{ width: `${(roiMetrics as any).clickRate || 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Sales Generated</span>
                  <span className="text-sm text-gray-600">{(roiMetrics as any).totalSalesGenerated || 0} ({formatPercent((roiMetrics as any).conversionRate || 0)})</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-orange-600 h-3 rounded-full" style={{ width: `${(roiMetrics as any).conversionRate || 0}%` }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deal Attribution Table */}
      <Card>
        <CardHeader>
          <CardTitle>Deal Attribution</CardTitle>
          <CardDescription>Recent deals attributed to Σ responses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Buyer</th>
                  <th className="text-left py-3 px-4 font-semibold">Template</th>
                  <th className="text-left py-3 px-4 font-semibold">Response Date</th>
                  <th className="text-left py-3 px-4 font-semibold">Deal Value</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Days to Close</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">John Smith</td>
                  <td className="py-3 px-4">John Deere Tractor</td>
                  <td className="py-3 px-4">Mar 28, 2026</td>
                  <td className="py-3 px-4 font-semibold">$45,000</td>
                  <td className="py-3 px-4">
                    <Badge className="bg-green-100 text-green-800">Closed</Badge>
                  </td>
                  <td className="py-3 px-4">3</td>
                </tr>
                <tr className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">Jane Doe</td>
                  <td className="py-3 px-4">Kubota Equipment</td>
                  <td className="py-3 px-4">Mar 25, 2026</td>
                  <td className="py-3 px-4 font-semibold">$32,500</td>
                  <td className="py-3 px-4">
                    <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
                  </td>
                  <td className="py-3 px-4">5</td>
                </tr>
                <tr className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">Bob Wilson</td>
                  <td className="py-3 px-4">Financing Options</td>
                  <td className="py-3 px-4">Mar 22, 2026</td>
                  <td className="py-3 px-4 font-semibold">$28,750</td>
                  <td className="py-3 px-4">
                    <Badge className="bg-green-100 text-green-800">Closed</Badge>
                  </td>
                  <td className="py-3 px-4">7</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
