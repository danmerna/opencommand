"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function SigmaChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-start with morning briefing
  useEffect(() => {
    if (!started) {
      setStarted(true);
      sendMessage("Good morning. What should I know today?", true);
    }
  }, []);

  const sendMessage = async (text: string, isAutoStart = false) => {
    const userMsg: Message = { role: "user", content: text };
    const newMessages = isAutoStart ? [userMsg] : [...messages, userMsg];

    if (!isAutoStart) {
      setMessages((prev) => [...prev, userMsg]);
    } else {
      setMessages([userMsg]);
    }

    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠ ${data.error}\n\nTo enable Σ Chat, add your ANTHROPIC_API_KEY environment variable in Vercel project settings.`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Connection error. Please check your network and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    sendMessage(text);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[#1E2A35]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
          <span className="text-bg font-bold text-sm">Σ</span>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Σ Chat</h2>
          <p className="text-[11px] text-text-muted">
            Johnson Tractor Intelligence
          </p>
        </div>
        {loading && (
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-[11px] text-text-muted">thinking</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`animate-fade-in ${
              msg.role === "user" ? "flex justify-end" : ""
            }`}
          >
            {msg.role === "assistant" ? (
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-bg text-[10px] font-bold">Σ</span>
                </div>
                <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap max-w-[calc(100%-3rem)]">
                  <MarkdownContent content={msg.content} />
                </div>
              </div>
            ) : (
              <div className="bg-[#1E2A35] rounded-xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
                <p className="text-sm text-text-primary">{msg.content}</p>
              </div>
            )}
          </div>
        ))}
        {loading && messages.length > 0 && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center flex-shrink-0">
              <span className="text-bg text-[10px] font-bold">Σ</span>
            </div>
            <div className="flex gap-1 items-center py-2">
              <div
                className="w-2 h-2 rounded-full bg-text-muted animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-text-muted animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-text-muted animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-[#1E2A35]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Σ anything about your dealership..."
            className="flex-1 bg-[#1E2A35] text-text-primary text-sm rounded-lg px-4 py-2.5 placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-accent hover:bg-accent-dark disabled:opacity-40 text-bg font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown rendering - bold, headers, lists, code
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        // Headers
        if (line.startsWith("### "))
          return (
            <h4 key={i} className="font-semibold text-accent text-xs mt-3 mb-1 uppercase tracking-wide">
              {line.slice(4)}
            </h4>
          );
        if (line.startsWith("## "))
          return (
            <h3 key={i} className="font-semibold text-accent text-sm mt-3 mb-1">
              {line.slice(3)}
            </h3>
          );
        if (line.startsWith("# "))
          return (
            <h2 key={i} className="font-bold text-accent mt-2 mb-1">
              {line.slice(2)}
            </h2>
          );

        // Bullet points
        if (line.startsWith("- ") || line.startsWith("* "))
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-accent mt-0.5">•</span>
              <span>
                <InlineMarkdown text={line.slice(2)} />
              </span>
            </div>
          );

        // Numbered lists
        const numMatch = line.match(/^(\d+)\.\s/);
        if (numMatch)
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-text-muted font-mono text-xs mt-0.5">
                {numMatch[1]}.
              </span>
              <span>
                <InlineMarkdown text={line.slice(numMatch[0].length)} />
              </span>
            </div>
          );

        // Table rows
        if (line.startsWith("|")) {
          if (line.match(/^\|[\s-|]+$/)) return null; // separator
          const cells = line
            .split("|")
            .filter(Boolean)
            .map((c) => c.trim());
          return (
            <div key={i} className="flex gap-4 font-mono text-[11px] text-text-muted py-0.5">
              {cells.map((cell, j) => (
                <span key={j} className="min-w-[60px]">
                  {cell}
                </span>
              ))}
            </div>
          );
        }

        // Empty line
        if (!line.trim()) return <div key={i} className="h-2" />;

        // Regular paragraph
        return (
          <p key={i}>
            <InlineMarkdown text={line} />
          </p>
        );
      })}
    </div>
  );
}

function InlineMarkdown({ text }: { text: string }) {
  // Handle bold (**text**) and code (`text`)
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return (
            <strong key={i} className="font-semibold text-text-primary">
              {part.slice(2, -2)}
            </strong>
          );
        if (part.startsWith("`") && part.endsWith("`"))
          return (
            <code
              key={i}
              className="bg-[#1E2A35] px-1.5 py-0.5 rounded text-accent font-mono text-[12px]"
            >
              {part.slice(1, -1)}
            </code>
          );
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
