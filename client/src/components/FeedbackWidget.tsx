import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { MessageSquarePlus, X, Bug, Lightbulb, MessageCircle, Heart, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const TYPES = [
  { value: "bug" as const, label: "Bug", icon: Bug, color: "text-red-400" },
  { value: "feature" as const, label: "Feature", icon: Lightbulb, color: "text-amber-400" },
  { value: "general" as const, label: "General", icon: MessageCircle, color: "text-blue-400" },
  { value: "praise" as const, label: "Praise", icon: Heart, color: "text-pink-400" },
];

export default function FeedbackWidget() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"bug" | "feature" | "general" | "praise">("general");
  const [content, setContent] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setContent("");
        setType("general");
      }, 1500);
    },
    onError: () => {
      toast.error("Failed to send feedback. Please try again.");
    },
  });

  if (!isAuthenticated) return null;

  const handleSubmit = () => {
    if (!content.trim()) return;
    submitMutation.mutate({
      type,
      content: content.trim(),
      page: window.location.pathname,
    });
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-5 right-5 z-50 w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg ${
          open
            ? "bg-muted text-foreground rotate-0"
            : "bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105"
        }`}
        aria-label="Send feedback"
      >
        {open ? <X size={16} /> : <MessageSquarePlus size={16} />}
      </button>

      {/* Feedback panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-80 bg-popover text-popover-foreground border border-border rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {submitted ? (
            <div className="p-8 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-3">
                <Check size={18} className="text-emerald-400" />
              </div>
              <p className="text-sm font-medium">Thanks for your feedback!</p>
              <p className="text-xs text-muted-foreground mt-1">We read every submission.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-medium">Send Feedback</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Help us improve OpenCommand</p>
              </div>

              <div className="p-4 space-y-3">
                {/* Type selector */}
                <div className="flex gap-1.5">
                  {TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setType(t.value)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] transition-colors ${
                        type === t.value
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50"
                      }`}
                    >
                      <t.icon size={14} className={type === t.value ? t.color : ""} />
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    type === "bug"
                      ? "Describe the bug..."
                      : type === "feature"
                      ? "What feature would help you?"
                      : type === "praise"
                      ? "What do you love about OpenCommand?"
                      : "Share your thoughts..."
                  }
                  className="w-full h-24 bg-muted/30 border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  maxLength={2000}
                />

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/50">{content.length}/2000</span>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!content.trim() || submitMutation.isPending}
                    className="gap-1.5"
                  >
                    {submitMutation.isPending ? "Sending..." : "Send"}
                    <Send size={12} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
