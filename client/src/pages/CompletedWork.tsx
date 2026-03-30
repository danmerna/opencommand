import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Mail, MessageSquare, DollarSign, Eye } from "lucide-react";

interface CompletedAction {
  id: number;
  recipient: string;
  subject: string;
  sentAt: string;
  status: "delivered" | "bounced" | "failed";
  opened: boolean;
  replied: boolean;
  revenue?: number;
  dealValue?: number;
}

interface ROIMetrics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalReplied: number;
  openRate: number;
  replyRate: number;
  estimatedRevenue: number;
  roi: number;
}

export function CompletedWork() {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "quarter">("month");

  // Mock data
  const completedActions: CompletedAction[] = [
    {
      id: 1,
      recipient: "john.smith@farm.com",
      subject: "Your Equipment Inquiry - John Deere 7530",
      sentAt: "2026-03-30T10:30:00Z",
      status: "delivered",
      opened: true,
      replied: true,
      revenue: 75000,
      dealValue: 75000,
    },
    {
      id: 2,
      recipient: "mary.johnson@agribusiness.com",
      subject: "Equipment Options for Your Operation",
      sentAt: "2026-03-29T14:15:00Z",
      status: "delivered",
      opened: true,
      replied: false,
      dealValue: 0,
    },
    {
      id: 3,
      recipient: "bob.wilson@equipment.com",
      subject: "Financing Options Available",
      sentAt: "2026-03-28T09:45:00Z",
      status: "delivered",
      opened: false,
      replied: false,
      dealValue: 0,
    },
    {
      id: 4,
      recipient: "sarah.davis@farm.com",
      subject: "Your Equipment Inquiry - Case IH",
      sentAt: "2026-03-27T16:20:00Z",
      status: "delivered",
      opened: true,
      replied: true,
      revenue: 45000,
      dealValue: 45000,
    },
    {
      id: 5,
      recipient: "tom.miller@agri.com",
      subject: "Seasonal Equipment Specials",
      sentAt: "2026-03-26T11:00:00Z",
      status: "delivered",
      opened: true,
      replied: false,
      dealValue: 0,
    },
  ];

  // Calculate metrics
  const metrics: ROIMetrics = {
    totalSent: completedActions.length,
    totalDelivered: completedActions.filter((a) => a.status === "delivered").length,
    totalOpened: completedActions.filter((a) => a.opened).length,
    totalReplied: completedActions.filter((a) => a.replied).length,
    openRate: (completedActions.filter((a) => a.opened).length / completedActions.length) * 100,
    replyRate: (completedActions.filter((a) => a.replied).length / completedActions.length) * 100,
    estimatedRevenue: completedActions.reduce((sum, a) => sum + (a.revenue || 0), 0),
    roi: 450, // 450% ROI
  };

  // Chart data - daily performance
  const dailyData = [
    { date: "Mar 26", sent: 1, opened: 1, replied: 1 },
    { date: "Mar 27", sent: 1, opened: 1, replied: 0 },
    { date: "Mar 28", sent: 1, opened: 0, replied: 0 },
    { date: "Mar 29", sent: 1, opened: 1, replied: 0 },
    { date: "Mar 30", sent: 1, opened: 1, replied: 1 },
  ];

  // Status distribution
  const statusData = [
    { name: "Opened", value: metrics.totalOpened, fill: "#3b82f6" },
    { name: "Not Opened", value: metrics.totalSent - metrics.totalOpened, fill: "#e5e7eb" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Completed Work</h1>
        <p className="text-gray-600 mt-2">Track ROI and performance of executed lead responses</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold">{metrics.totalSent}</div>
                <p className="text-xs text-gray-500 mt-1">{metrics.totalDelivered} delivered</p>
              </div>
              <Mail className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Open Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold">{metrics.openRate.toFixed(0)}%</div>
                <p className="text-xs text-gray-500 mt-1">{metrics.totalOpened} opened</p>
              </div>
              <Eye className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Reply Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold">{metrics.replyRate.toFixed(0)}%</div>
                <p className="text-xs text-gray-500 mt-1">{metrics.totalReplied} replied</p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold">${(metrics.estimatedRevenue / 1000).toFixed(0)}K</div>
                <p className="text-xs text-gray-500 mt-1">ROI: {metrics.roi}%</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Performance</CardTitle>
            <CardDescription>Sent, opened, and replied emails over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sent" fill="#3b82f6" name="Sent" />
                <Bar dataKey="opened" fill="#10b981" name="Opened" />
                <Bar dataKey="replied" fill="#f59e0b" name="Replied" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Open Rate Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Email Status</CardTitle>
            <CardDescription>Opened vs not opened</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Completed Actions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Completed Actions</CardTitle>
          <CardDescription>All executed lead responses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 px-2">Recipient</th>
                  <th className="text-left py-2 px-2">Subject</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-center py-2 px-2">Opened</th>
                  <th className="text-center py-2 px-2">Replied</th>
                  <th className="text-right py-2 px-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {completedActions.map((action) => (
                  <tr key={action.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">{action.recipient}</td>
                    <td className="py-3 px-2 text-gray-600 truncate max-w-xs">{action.subject}</td>
                    <td className="py-3 px-2">
                      <Badge variant={action.status === "delivered" ? "default" : "destructive"}>
                        {action.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-center">{action.opened ? "✅" : "❌"}</td>
                    <td className="py-3 px-2 text-center">{action.replied ? "✅" : "❌"}</td>
                    <td className="py-3 px-2 text-right font-medium">
                      {action.revenue ? `$${action.revenue.toLocaleString()}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
