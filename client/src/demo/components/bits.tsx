import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SourceSystem, UpdateUrgency } from "../domain/types";
import { SOURCE_LABELS } from "../fixtures/evidence";

/** Uppercase micro-label for section headers. */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground", className)}>
      {children}
    </div>
  );
}

/** Exact values render in mono per the modality contract (text = precision). */
export function MonoValue({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-foreground", className)}>{children}</span>;
}

export function SourceChip({ source, active = true }: { source: SourceSystem; active?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px]",
        active ? "border-border text-secondary-foreground" : "border-border/50 text-muted-foreground line-through",
      )}
    >
      {SOURCE_LABELS[source] ?? source}
    </span>
  );
}

export function ConfidencePill({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span aria-hidden className="inline-block h-1 w-10 overflow-hidden rounded-full bg-muted align-middle">
        <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
      </span>
      <span className="font-mono">{pct}% conf</span>
    </span>
  );
}

const URGENCY_STYLES: Record<UpdateUrgency, { dot: string; label: string }> = {
  high: { dot: "bg-destructive", label: "High urgency" },
  medium: { dot: "bg-amber-400", label: "Medium urgency" },
  low: { dot: "bg-muted-foreground", label: "Low urgency" },
};

export function UrgencyDot({ urgency }: { urgency: UpdateUrgency }) {
  const s = URGENCY_STYLES[urgency];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: "border-border text-muted-foreground",
    accent: "border-accent/40 text-accent",
    success: "border-emerald-400/40 text-emerald-300",
    warning: "border-amber-400/40 text-amber-300",
    danger: "border-destructive/50 text-red-300",
  } as const;
  return (
    <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide", tones[tone])}>
      {children}
    </span>
  );
}

export function PanelCard({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-lg border border-border bg-card", className)} {...rest}>
      {children}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border p-6">
      <p className="text-sm text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {action}
    </div>
  );
}
