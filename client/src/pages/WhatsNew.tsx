import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, Zap, Wrench, Star, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  feature: {
    label: "New Feature",
    color: "bg-accent/10 text-accent border-accent/20",
    icon: <Star className="w-3 h-3" />,
  },
  improvement: {
    label: "Improvement",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: <Zap className="w-3 h-3" />,
  },
  fix: {
    label: "Bug Fix",
    color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    icon: <Wrench className="w-3 h-3" />,
  },
  announcement: {
    label: "Announcement",
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    icon: <Megaphone className="w-3 h-3" />,
  },
};

function ChangelogSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex gap-6">
          <div className="flex flex-col items-center">
            <Skeleton className="w-3 h-3 rounded-full mt-1.5" />
            <Skeleton className="w-px flex-1 mt-2" />
          </div>
          <div className="flex-1 pb-8 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WhatsNew() {
  const { data: entries, isLoading } = trpc.changelog.list.useQuery({ limit: 30 });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/mission-control">
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Mission Control
            </button>
          </Link>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-accent" />
            <h1 className="text-sm font-semibold">What's New</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-3 py-1 text-xs text-accent mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Beta — shipping fast
          </div>
          <h2 className="text-3xl font-light tracking-tight text-foreground mb-3">
            OpenCommand Changelog
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
            We ship every week. Here's what's new in the platform — features, improvements, and
            announcements as we build toward the full release.
          </p>
        </div>

        <Separator className="mb-12 opacity-30" />

        {/* Timeline */}
        {isLoading ? (
          <ChangelogSkeleton />
        ) : !entries || entries.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Megaphone className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No changelog entries yet.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {entries.map((entry, idx) => {
              const typeConfig = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.feature;
              const date = entry.publishedAt
                ? new Date(entry.publishedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : null;

              return (
                <div key={entry.id} className="flex gap-6 group">
                  {/* Timeline spine */}
                  <div className="flex flex-col items-center flex-shrink-0 w-4">
                    <div
                      className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 transition-all group-hover:scale-125 ${
                        idx === 0 ? "bg-accent shadow-[0_0_8px_2px_rgba(34,197,94,0.3)]" : "bg-border"
                      }`}
                    />
                    {idx < entries.length - 1 && (
                      <div className="w-px flex-1 bg-border/40 mt-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-10">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className={`text-xs px-2 py-0.5 flex items-center gap-1 ${typeConfig.color}`}
                      >
                        {typeConfig.icon}
                        {typeConfig.label}
                      </Badge>
                      {entry.version && (
                        <span className="text-xs text-muted-foreground font-mono">
                          v{entry.version}
                        </span>
                      )}
                      {date && (
                        <span className="text-xs text-muted-foreground">{date}</span>
                      )}
                    </div>

                    <h3 className="text-base font-medium text-foreground mb-2 leading-snug">
                      {entry.title}
                    </h3>

                    {entry.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {entry.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        <div className="mt-8 pt-8 border-t border-border/30 text-center">
          <p className="text-xs text-muted-foreground">
            OpenCommand is in active beta. Features ship weekly.{" "}
            <span className="text-accent">Use the feedback button to suggest what to build next.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
