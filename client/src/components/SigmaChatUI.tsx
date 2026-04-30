import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, ArrowLeft, Zap, Brain, TrendingUp, Target } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useActiveCompany } from "@/components/AppLayout";
import { Streamdown } from "streamdown";
import { Link } from "wouter";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  hasBoardContext?: boolean;
  hasLiveContext?: boolean;
}

const QUICK_PROMPTS = [
  { icon: Target, label: "What's my highest-leverage move right now?", color: "text-[#00D4AA]" },
  { icon: TrendingUp, label: "Where should I focus this week?", color: "text-amber-400" },
  { icon: Brain, label: "What risk am I not seeing?", color: "text-rose-400" },
  { icon: Zap, label: "What would the board recommend?", color: "text-indigo-400" },
];

export function SigmaChatUI() {
  const { activeCompanyId } = useActiveCompany();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const standaloneChatMut = trpc.sigma.standaloneChat.useMutation();

  // Stable conversation history for the API
  const conversationHistory = useMemo(() => {
    return messages.slice(-10).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async (messageText?: string) => {
    const text = (messageText ?? input).trim();
    if (!text || !activeCompanyId) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await standaloneChatMut.mutateAsync({
        message: text,
        companyId: activeCompanyId,
        conversationHistory,
      });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
        hasBoardContext: response.hasBoardContext,
        hasLiveContext: response.hasLiveContext,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("[Sigma Standalone] Chat error:", error);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "I encountered an issue processing your request. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/executive-board">
            <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft size={16} className="text-muted-foreground" />
            </button>
          </Link>
          <div className="w-9 h-9 rounded-full bg-[#00D4AA]/10 border border-[#00D4AA]/40 flex items-center justify-center">
            <span className="text-base font-bold text-[#00D4AA]">Σ</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Σ Standalone Mode</h1>
            <p className="text-[11px] text-muted-foreground">Highest-leverage recommendations from cached board context</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] border-[#00D4AA]/30 text-[#00D4AA]">
            <Zap size={10} className="mr-1" />
            Instant
          </Badge>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-[#00D4AA]/10 border-2 border-[#00D4AA]/30 flex items-center justify-center mb-6">
              <span className="text-3xl font-bold text-[#00D4AA]">Σ</span>
            </div>
            <h2 className="text-lg font-light text-foreground mb-2">Talk directly to Σ</h2>
            <p className="text-xs text-muted-foreground max-w-sm mb-8">
              Skip the full cascade. Σ uses your cached executive board context to deliver instant highest-leverage recommendations.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md w-full">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt.label}
                  onClick={() => handleSend(prompt.label)}
                  className="text-left p-3 rounded-xl border border-border hover:border-[#00D4AA]/30 hover:bg-[#00D4AA]/5 transition-all group"
                >
                  <div className="flex items-start gap-2">
                    <prompt.icon size={14} className={`${prompt.color} mt-0.5 shrink-0`} />
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      {prompt.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] ${
                    message.role === "user"
                      ? "bg-foreground/10 rounded-2xl rounded-br-sm px-4 py-3"
                      : "rounded-2xl rounded-bl-sm"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#00D4AA]/10 border border-[#00D4AA]/40 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-[#00D4AA]">Σ</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground/90 leading-relaxed prose prose-invert prose-sm max-w-none">
                          <Streamdown>{message.content}</Streamdown>
                        </div>
                        {(message.hasBoardContext || message.hasLiveContext) && (
                          <div className="flex gap-1.5 mt-2">
                            {message.hasBoardContext && (
                              <Badge variant="outline" className="text-[9px] border-[#00D4AA]/20 text-[#00D4AA]/70">
                                Board context
                              </Badge>
                            )}
                            {message.hasLiveContext && (
                              <Badge variant="outline" className="text-[9px] border-blue-400/20 text-blue-400/70">
                                Live data
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground">{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#00D4AA]/10 border border-[#00D4AA]/40 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[#00D4AA]">Σ</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-xs">Synthesizing...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={activeCompanyId ? "Ask Σ anything..." : "Select a company first"}
              disabled={isLoading || !activeCompanyId}
              rows={1}
              className="w-full resize-none rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#00D4AA]/50 focus:border-[#00D4AA]/50 disabled:opacity-50"
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
          </div>
          <Button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim() || !activeCompanyId}
            size="icon"
            className="h-11 w-11 rounded-xl bg-[#00D4AA] hover:bg-[#00B894] text-black shrink-0"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
        {!activeCompanyId && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Select a company from the sidebar to start chatting with Σ
          </p>
        )}
      </div>
    </div>
  );
}
