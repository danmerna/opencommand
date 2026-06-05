import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Send,
  Loader2,
  Sparkles,
  ArrowRight,
  Bot,
  User,
  Zap,
} from "lucide-react";

export default function BlueprintChat() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<
    { role: string; content: string; timestamp: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [completionPercent, setCompletionPercent] = useState(0);
  const [isReadyToGenerate, setIsReadyToGenerate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startSession = trpc.blueprintEngine.startSession.useMutation();
  const sendMessage = trpc.blueprintEngine.sendMessage.useMutation();
  const generateBlueprint = trpc.blueprintEngine.generateBlueprint.useMutation();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start session on mount
  useEffect(() => {
    if (!sessionId && user) {
      startSession.mutateAsync({}).then((res) => {
        setSessionId(res.sessionId);
        setMessages(res.messages as { role: string; content: string; timestamp: string }[]);
      });
    }
  }, [user]);

  const handleSend = async () => {
    if (!input.trim() || !sessionId || isLoading) return;

    const userMsg = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await sendMessage.mutateAsync({
        sessionId,
        message: input.trim(),
      });

      const assistantMsg = res.message as { role: string; content: string; timestamp: string };
      setMessages((prev) => [...prev, assistantMsg]);
      setCompletionPercent(res.completionPercent);
      setIsReadyToGenerate(res.isReadyToGenerate);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I encountered an error processing your response. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!sessionId) return;
    setIsGenerating(true);

    try {
      const res = await generateBlueprint.mutateAsync({ sessionId });
      // Navigate to the visual builder with the new blueprint
      navigate(`/blueprints/${res.blueprintId}/builder`);
    } catch (err) {
      setIsGenerating(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Blueprint generation failed. Let me ask a few more questions to clarify your requirements.",
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsReadyToGenerate(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground font-mono">
              Σ INTENT ENGINE
            </h1>
            <p className="text-xs text-muted-foreground">
              Blueprint Generator
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-3">
          {completionPercent > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {completionPercent}%
              </span>
            </div>
          )}

          {isReadyToGenerate && !isGenerating && (
            <Button
              onClick={handleGenerate}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white gap-2"
              size="sm"
            >
              <Zap className="w-3.5 h-3.5" />
              Generate Blueprint
            </Button>
          )}

          {isGenerating && (
            <Button disabled size="sm" className="gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating...
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-400/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-blue-400" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-muted/50 border border-border/50 text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-foreground/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-foreground/70" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-400/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="bg-muted/50 border border-border/50 rounded-xl px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-blue-400/60 rounded-full animate-bounce [animation-delay:0ms]" />
                <div className="w-2 h-2 bg-blue-400/60 rounded-full animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 bg-blue-400/60 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Generation CTA (when ready) */}
      {isReadyToGenerate && !isGenerating && (
        <div className="px-4 pb-2">
          <Card className="p-4 border-blue-500/30 bg-blue-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Blueprint ready to generate
                  </p>
                  <p className="text-xs text-muted-foreground">
                    I have enough context to build your autonomous execution
                    plan.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleGenerate}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white gap-2"
              >
                Generate
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm p-4">
        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              messages.length <= 1
                ? "Describe what you want to accomplish..."
                : "Answer Σ's question..."
            }
            className="min-h-[44px] max-h-[120px] resize-none bg-muted/30 border-border/50 focus:border-blue-500/50"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="bg-blue-600 hover:bg-blue-700 text-white h-[44px] w-[44px] flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
