import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: {
    leadCount?: number;
    actionType?: string;
    status?: string;
  };
}

interface SigmaChatUIProps {
  onLeadAction?: (action: { type: string; leadId?: number; response?: string }) => void;
}

export function SigmaChatUI({ onLeadAction }: SigmaChatUIProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hi! I'm Σ (Sigma), your conversational assistant. I can help you manage leads, review responses, and analyze performance. What would you like to do?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatMutation = trpc.sigma.chat.useMutation();

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await chatMutation.mutateAsync({
        message: input,
        companyId: 30001,
        conversationHistory: messages.slice(-5).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: typeof response.response === "string" ? response.response : (response.response[0] as any)?.text || "",
        timestamp: new Date(),
        metadata: response.data as any,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Handle suggested actions
      if (response.action) {
        onLeadAction?.({
          type: response.action,
          ...response.data,
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    setInput(action);
    // Trigger send after state update
    setTimeout(() => {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: action,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      handleSendMessage();
    }, 0);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
            Σ
          </div>
          Sigma Chat
        </h1>
        <p className="text-gray-600 mt-1">Your conversational intelligence assistant</p>
      </div>

      <Card className="h-96 flex flex-col">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base">Conversation</CardTitle>
          <CardDescription>Ask me anything about leads, responses, or performance</CardDescription>
        </CardHeader>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.role === "user"
                      ? "bg-blue-500 text-white rounded-br-none"
                      : "bg-gray-100 text-gray-900 rounded-bl-none"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <Streamdown>{message.content}</Streamdown>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}

                  {message.metadata && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {message.metadata.leadCount && (
                        <Badge variant="secondary" className="text-xs">
                          <Mail className="w-3 h-3 mr-1" />
                          {message.metadata.leadCount} leads
                        </Badge>
                      )}
                      {message.metadata.status && (
                        <Badge
                          variant={message.metadata.status === "success" ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {message.metadata.status}
                        </Badge>
                      )}
                    </div>
                  )}

                  <p className="text-xs mt-1 opacity-70">{message.timestamp.toLocaleTimeString()}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg rounded-bl-none">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <CardContent className="border-t pt-4 space-y-3">
          {/* Quick Actions */}
          {messages.length === 1 && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction("Show me pending leads")}
                className="text-xs"
              >
                <Mail className="w-3 h-3 mr-1" />
                Pending Leads
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction("What's my open rate today?")}
                className="text-xs"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Performance
              </Button>
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Ask Sigma..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isLoading}
              className="text-sm"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              size="sm"
              className="gap-1"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Example Prompts */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            Try These Prompts
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-1">
          <p>• "Show me pending leads"</p>
          <p>• "What's my open rate?"</p>
          <p>• "Draft a response for John Smith"</p>
          <p>• "Analyze performance trends"</p>
        </CardContent>
      </Card>
    </div>
  );
}
