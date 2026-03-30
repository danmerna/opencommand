import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Mail, Eye, MousePointer, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface EmailMetrics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  openRate: number;
  clickRate: number;
  timestamp: string;
}

interface DashboardMetrics {
  dailyMetrics: Array<{
    date: string;
    sent: number;
    opened: number;
    clicked: number;
    revenue: number;
  }>;
  currentMetrics: EmailMetrics;
}

export function CompletedWorkWithWebSocket() {
  const { data: user } = trpc.auth.me.useQuery();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">(
    "disconnected"
  );

  useEffect(() => {
    if (!user || !user.id) return;

    // Connect to WebSocket
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const companyId = 30001; // Default company ID
    const wsUrl = `${protocol}//${window.location.host}/api/ws/tracking?userId=${user.id}&companyId=${companyId}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[WebSocket] Connected to tracking server");
      setConnectionStatus("connected");
      setIsConnected(true);

      // Subscribe to dashboard updates
      ws.send(
        JSON.stringify({
          type: "subscribe",
              actionItemId: 0 // Subscribe to all dashboard updates
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "dashboard_update") {
          console.log("[WebSocket] Dashboard update received:", message.metrics);
          setMetrics(message.metrics);
        } else if (message.type === "email_update") {
          console.log("[WebSocket] Email update:", message.event);
          // Update specific email metrics
          if (metrics) {
            const updated = { ...metrics };
            if (message.event === "email.opened") {
              updated.currentMetrics.totalOpened += 1;
              updated.currentMetrics.openRate = (updated.currentMetrics.totalOpened / updated.currentMetrics.totalSent) * 100;
            } else if (message.event === "email.clicked") {
              updated.currentMetrics.totalClicked += 1;
              updated.currentMetrics.clickRate = (updated.currentMetrics.totalClicked / updated.currentMetrics.totalOpened) * 100;
            }
            setMetrics(updated);
          }
        }
      } catch (error) {
        console.error("[WebSocket] Failed to parse message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("[WebSocket] Error:", error);
      setConnectionStatus("disconnected");
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log("[WebSocket] Disconnected");
      setConnectionStatus("disconnected");
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user]);

  if (!metrics) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Completed Work</h1>
          <Badge variant={isConnected ? "default" : "destructive"} className="gap-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
            {connectionStatus}
          </Badge>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">Loading metrics...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { dailyMetrics, currentMetrics } = metrics;

  return (
    <div className="space-y-6">
      {/* Header with Connection Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Completed Work</h1>
          <p className="text-gray-600 mt-1">Real-time email tracking and ROI metrics</p>
        </div>
        <Badge variant={isConnected ? "default" : "destructive"} className="gap-1">
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
          {connectionStatus}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMetrics.totalSent}</div>
            <p className="text-xs text-gray-500 mt-1">emails sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Opened
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMetrics.totalOpened}</div>
            <p className="text-xs text-green-600 font-semibold mt-1">{currentMetrics.openRate.toFixed(1)}% open rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <MousePointer className="w-4 h-4" />
              Clicked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMetrics.totalClicked}</div>
            <p className="text-xs text-blue-600 font-semibold mt-1">{currentMetrics.clickRate.toFixed(1)}% click rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Revenue Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,450</div>
            <p className="text-xs text-gray-500 mt-1">estimated pipeline</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Performance</CardTitle>
          <CardDescription>Email sends, opens, and clicks over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sent" stroke="#3b82f6" name="Sent" />
              <Line type="monotone" dataKey="opened" stroke="#10b981" name="Opened" />
              <Line type="monotone" dataKey="clicked" stroke="#8b5cf6" name="Clicked" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue Impact Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Impact</CardTitle>
          <CardDescription>Estimated deal value by day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Bar dataKey="revenue" fill="#f59e0b" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Real-Time Status */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            Real-Time Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700">
          <p>
            This dashboard is connected to real-time email tracking via WebSocket. Metrics update automatically as emails
            are sent, opened, and clicked. Last update: {currentMetrics.timestamp}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
