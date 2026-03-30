import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";
import { LeadResponseApprovalModal, LeadResponseApprovalQueue } from "@/components/LeadResponseApprovalModal";

interface LeadMetrics {
  pending: number;
  approved: number;
  sent: number;
  opened: number;
  replied: number;
}

export function LeadResponsePage() {
  const [metrics] = useState<LeadMetrics>({
    pending: 3,
    approved: 12,
    sent: 15,
    opened: 9,
    replied: 4,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="w-8 h-8" />
          Lead Response Management
        </h1>
        <p className="text-gray-600 mt-1">Review and approve personalized responses to buyer inquiries</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.pending}</div>
            <p className="text-xs text-gray-500 mt-1">awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.approved}</div>
            <p className="text-xs text-gray-500 mt-1">this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.sent}</div>
            <p className="text-xs text-gray-500 mt-1">total sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Opened</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{metrics.opened}</div>
            <p className="text-xs text-gray-500 mt-1">{Math.round((metrics.opened / metrics.sent) * 100)}% open rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Replied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{metrics.replied}</div>
            <p className="text-xs text-gray-500 mt-1">{Math.round((metrics.replied / metrics.opened) * 100)}% reply rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pending ({metrics.pending})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Approved ({metrics.approved})
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        {/* Pending Responses */}
        <TabsContent value="pending" className="mt-6">
          <LeadResponseApprovalQueue />
        </TabsContent>

        {/* Approved Responses */}
        <TabsContent value="approved" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recently Approved</CardTitle>
              <CardDescription>Responses sent in the last 7 days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  id: 1,
                  buyer: "John Smith",
                  equipment: "John Deere 7530",
                  approvedAt: "2 hours ago",
                  status: "opened",
                },
                {
                  id: 2,
                  buyer: "Mary Johnson",
                  equipment: "Equipment financing",
                  approvedAt: "5 hours ago",
                  status: "clicked",
                },
                {
                  id: 3,
                  buyer: "Robert Davis",
                  equipment: "Kubota L3901",
                  approvedAt: "1 day ago",
                  status: "replied",
                },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <p className="font-semibold">{item.buyer}</p>
                    <p className="text-sm text-gray-600">{item.equipment}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        item.status === "replied"
                          ? "default"
                          : item.status === "clicked"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {item.status === "replied"
                        ? "Replied"
                        : item.status === "clicked"
                          ? "Clicked"
                          : "Opened"}
                    </Badge>
                    <p className="text-xs text-gray-500 w-20 text-right">{item.approvedAt}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Response Quality</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Approval Rate</p>
                  <p className="text-2xl font-bold text-green-600">94%</p>
                  <p className="text-xs text-gray-500">of drafted responses approved</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Engagement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Avg Open Rate</p>
                  <p className="text-2xl font-bold text-blue-600">60%</p>
                  <p className="text-xs text-gray-500">industry avg: 45%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>Lead response to deal progression</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Responses Sent</span>
                  <span className="text-sm font-bold">15</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: "100%" }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Emails Opened</span>
                  <span className="text-sm font-bold">9 (60%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: "60%" }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Links Clicked</span>
                  <span className="text-sm font-bold">6 (40%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: "40%" }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Replies Received</span>
                  <span className="text-sm font-bold">4 (27%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: "27%" }}></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
