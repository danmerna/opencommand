import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle2, Eye, Link2, AlertCircle, Zap } from "lucide-react";

interface EmailTrackingEvent {
  event: string;
  time: Date;
  icon: React.ReactNode;
  color: string;
}

interface EmailTrackingData {
  messageId: string;
  to: string;
  subject: string;
  sent: boolean;
  sentAt?: Date;
  delivered: boolean;
  deliveredAt?: Date;
  opened: boolean;
  openedAt?: Date;
  openCount: number;
  clicked: boolean;
  clickedAt?: Date;
  clickCount: number;
  bounced: boolean;
  bouncedAt?: Date;
  complained: boolean;
  complaintAt?: Date;
  engagement: "high" | "medium" | "low" | "none";
}

export function EmailTrackingVisualization({ tracking }: { tracking: EmailTrackingData }) {
  // Build timeline
  const timeline: EmailTrackingEvent[] = [];

  if (tracking.sentAt) {
    timeline.push({
      event: "Sent",
      time: tracking.sentAt,
      icon: <Mail className="w-4 h-4" />,
      color: "bg-blue-100 text-blue-700",
    });
  }

  if (tracking.deliveredAt) {
    timeline.push({
      event: "Delivered",
      time: tracking.deliveredAt,
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: "bg-green-100 text-green-700",
    });
  }

  if (tracking.openedAt) {
    timeline.push({
      event: `Opened (${tracking.openCount}x)`,
      time: tracking.openedAt,
      icon: <Eye className="w-4 h-4" />,
      color: "bg-purple-100 text-purple-700",
    });
  }

  if (tracking.clickedAt) {
    timeline.push({
      event: `Clicked (${tracking.clickCount}x)`,
      time: tracking.clickedAt,
      icon: <Link2 className="w-4 h-4" />,
      color: "bg-orange-100 text-orange-700",
    });
  }

  if (tracking.bouncedAt) {
    timeline.push({
      event: "Bounced",
      time: tracking.bouncedAt,
      icon: <AlertCircle className="w-4 h-4" />,
      color: "bg-red-100 text-red-700",
    });
  }

  if (tracking.complaintAt) {
    timeline.push({
      event: "Complained",
      time: tracking.complaintAt,
      icon: <AlertCircle className="w-4 h-4" />,
      color: "bg-red-100 text-red-700",
    });
  }

  // Sort timeline by time
  timeline.sort((a, b) => a.time.getTime() - b.time.getTime());

  const engagementColor = {
    high: "bg-green-500/10 text-green-700 border-green-200",
    medium: "bg-blue-500/10 text-blue-700 border-blue-200",
    low: "bg-gray-500/10 text-gray-700 border-gray-200",
    none: "bg-gray-500/10 text-gray-700 border-gray-200",
  };

  const engagementLabel = {
    high: "🔥 High Engagement",
    medium: "👍 Medium Engagement",
    low: "📬 Low Engagement",
    none: "⏳ No Engagement",
  };

  return (
    <Card className={`border-2 ${engagementColor[tracking.engagement]}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">{tracking.to}</CardTitle>
            <CardDescription className="mt-2 truncate max-w-xs">{tracking.subject}</CardDescription>
          </div>
          <Badge variant="outline" className={`whitespace-nowrap ${engagementColor[tracking.engagement]}`}>
            {engagementLabel[tracking.engagement]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Timeline */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Email Journey</h3>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 to-gray-200" />

            {/* Timeline events */}
            <div className="space-y-4">
              {timeline.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No events yet</div>
              ) : (
                timeline.map((item, idx) => (
                  <div key={idx} className="flex gap-4 relative">
                    {/* Icon circle */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${item.color} flex-shrink-0 relative z-10`}>
                      {item.icon}
                    </div>

                    {/* Event details */}
                    <div className="flex-1 pt-1">
                      <div className="font-medium text-sm">{item.event}</div>
                      <div className="text-xs text-gray-500">
                        {item.time.toLocaleTimeString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t">
          <div className="space-y-1">
            <div className="text-xs text-gray-600">Open Rate</div>
            <div className="text-lg font-semibold">{tracking.opened ? "100%" : "0%"}</div>
            {tracking.opened && <div className="text-xs text-gray-500">{tracking.openCount} opens</div>}
          </div>

          <div className="space-y-1">
            <div className="text-xs text-gray-600">Click Rate</div>
            <div className="text-lg font-semibold">{tracking.clicked ? "100%" : "0%"}</div>
            {tracking.clicked && <div className="text-xs text-gray-500">{tracking.clickCount} clicks</div>}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex gap-2 pt-2">
          {tracking.bounced && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="w-3 h-3" />
              Bounced
            </Badge>
          )}
          {tracking.complained && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="w-3 h-3" />
              Complained
            </Badge>
          )}
          {!tracking.bounced && !tracking.complained && tracking.clicked && (
            <Badge className="gap-1 bg-green-600">
              <Zap className="w-3 h-3" />
              Converted
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Example usage component showing multiple email tracking states
 */
export function EmailTrackingExamples() {
  const examples: EmailTrackingData[] = [
    {
      messageId: "msg_001",
      to: "john.smith@farm.com",
      subject: "Your Equipment Inquiry - John Deere 7530",
      sent: true,
      sentAt: new Date(Date.now() - 86400000 * 2), // 2 days ago
      delivered: true,
      deliveredAt: new Date(Date.now() - 86400000 * 2 + 300000), // 5 min later
      opened: true,
      openedAt: new Date(Date.now() - 86400000 * 2 + 3600000), // 1 hour later
      openCount: 3,
      clicked: true,
      clickedAt: new Date(Date.now() - 86400000 * 2 + 7200000), // 2 hours later
      clickCount: 2,
      bounced: false,
      complained: false,
      engagement: "high",
    },
    {
      messageId: "msg_002",
      to: "mary.johnson@agribusiness.com",
      subject: "Equipment Options for Your Operation",
      sent: true,
      sentAt: new Date(Date.now() - 86400000), // 1 day ago
      delivered: true,
      deliveredAt: new Date(Date.now() - 86400000 + 300000),
      opened: true,
      openedAt: new Date(Date.now() - 86400000 + 1800000), // 30 min later
      openCount: 1,
      clicked: false,
      clickCount: 0,
      bounced: false,
      complained: false,
      engagement: "medium",
    },
    {
      messageId: "msg_003",
      to: "bob.wilson@equipment.com",
      subject: "Financing Options Available",
      sent: true,
      sentAt: new Date(Date.now() - 43200000), // 12 hours ago
      delivered: true,
      deliveredAt: new Date(Date.now() - 43200000 + 300000),
      opened: false,
      openCount: 0,
      clicked: false,
      clickCount: 0,
      bounced: false,
      complained: false,
      engagement: "low",
    },
    {
      messageId: "msg_004",
      to: "invalid@example.invalid",
      subject: "Your Equipment Inquiry",
      sent: true,
      sentAt: new Date(Date.now() - 3600000), // 1 hour ago
      delivered: false,
      opened: false,
      openCount: 0,
      clicked: false,
      clickCount: 0,
      bounced: true,
      bouncedAt: new Date(Date.now() - 3600000 + 60000), // 1 min later
      complained: false,
      engagement: "none",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Email Tracking Examples</h2>
        <p className="text-gray-600 mt-2">Real-time tracking of lead response emails</p>
      </div>

      <div className="grid gap-4">
        {examples.map((example) => (
          <EmailTrackingVisualization key={example.messageId} tracking={example} />
        ))}
      </div>
    </div>
  );
}
