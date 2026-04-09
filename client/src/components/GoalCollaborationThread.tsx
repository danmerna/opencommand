import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CollaborationMessage {
  id?: number;
  goalId: number;
  fromAgentId: string;
  toAgentId: string;
  messageType: string;
  message: string;
  timestamp: string;
  resolved: number;
}

interface Agent {
  agentId: string;
  agentName: string;
  role: string;
}

interface GoalCollaborationThreadProps {
  goalId: number;
  goalTitle: string;
  agents: Agent[];
  companyId: number;
}

export function GoalCollaborationThread({ goalId, goalTitle, agents, companyId }: GoalCollaborationThreadProps) {
  const [newMessage, setNewMessage] = useState("");
  const [fromAgent, setFromAgent] = useState("");
  const [toAgent, setToAgent] = useState("");
  const [messageType, setMessageType] = useState<"request" | "update" | "blocker" | "completion">("update");
  const [wsMessages, setWsMessages] = useState<CollaborationMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: collaborations, refetch } = trpc.goals.getCollaborations.useQuery({ goalId });
  const recordCollaboration = trpc.goals.recordCollaboration.useMutation({
    onSuccess: () => {
      refetch();
      setNewMessage("");
    },
  });

  // WebSocket for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws/tracking?userId=1&companyId=${companyId}`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "collaboration_message" && data.goalId === goalId) {
          setWsMessages((prev) => [
            ...prev,
            {
              goalId: data.goalId,
              fromAgentId: data.fromAgentId,
              toAgentId: data.toAgentId,
              messageType: data.messageType,
              message: data.message,
              timestamp: data.timestamp,
              resolved: 0,
            },
          ]);
        }
      };
    } catch (e) {
      console.warn("WebSocket connection failed:", e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [goalId, companyId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [collaborations, wsMessages]);

  const allMessages = [
    ...(collaborations || []),
    ...wsMessages.filter(
      (wsMsg) => !(collaborations || []).some((c: any) => c.timestamp === wsMsg.timestamp && c.message === wsMsg.message)
    ),
  ].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const getAgentName = (agentId: string) => {
    const agent = agents.find((a) => a.agentId === agentId);
    return agent?.agentName || agentId;
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case "request": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "update": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "blocker": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "handoff": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "review": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case "request": return "📩";
      case "update": return "📝";
      case "blocker": return "🚫";
      case "handoff": return "🤝";
      case "review": return "👀";
      default: return "💬";
    }
  };

  const handleSend = () => {
    if (!newMessage.trim() || !fromAgent || !toAgent) return;

    recordCollaboration.mutate({
      goalId,
      fromAgentId: fromAgent,
      toAgentId: toAgent,
      messageType,
      message: newMessage,
    });
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-xl">💬</span>
          Agent Collaboration — {goalTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Message Thread */}
        <div className="max-h-[400px] overflow-y-auto space-y-3 mb-4 p-3 rounded-lg bg-background/50 border border-border/30">
          {allMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-2xl mb-2">🤝</p>
              <p className="text-sm">No collaboration messages yet.</p>
              <p className="text-xs mt-1">Agents can communicate here to coordinate work on this goal.</p>
            </div>
          ) : (
            allMessages.map((msg: any, i: number) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-card/80 border border-border/20 hover:border-border/40 transition-colors">
                <div className="text-xl flex-shrink-0 mt-0.5">{getMessageTypeIcon(msg.messageType)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm">{getAgentName(msg.fromAgentId)}</span>
                    <span className="text-muted-foreground text-xs">→</span>
                    <span className="font-medium text-sm">{getAgentName(msg.toAgentId)}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getMessageTypeColor(msg.messageType)}`}>
                      {msg.messageType}
                    </Badge>
                    <span className="text-muted-foreground text-[10px] ml-auto">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90">{msg.message}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Compose Area */}
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Select value={fromAgent} onValueChange={setFromAgent}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="From Agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.agentId} value={agent.agentId}>
                    {agent.agentName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={toAgent} onValueChange={setToAgent}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="To Agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.agentId} value={agent.agentId}>
                    {agent.agentName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={messageType} onValueChange={(v) => setMessageType(v as "request" | "update" | "blocker" | "completion")}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="request">📩 Request</SelectItem>
                <SelectItem value="update">📝 Update</SelectItem>
                <SelectItem value="blocker">🚫 Blocker</SelectItem>
                <SelectItem value="completion">✅ Completion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a collaboration message..."
              className="flex-1 h-9 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!newMessage.trim() || !fromAgent || !toAgent || recordCollaboration.isPending}
              className="h-9 px-4"
            >
              {recordCollaboration.isPending ? "..." : "Send"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default GoalCollaborationThread;
