import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, Clock, DollarSign, Timer, Zap, Shield,
  ArrowLeft, Loader2, XCircle, Copy, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

const formatCurrency = (val: string | null) => {
  const n = parseFloat(val ?? "0");
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  verified: { icon: CheckCircle2, color: "text-emerald-400", label: "Verified" },
  pending: { icon: Clock, color: "text-amber-400", label: "Pending Verification" },
  disputed: { icon: XCircle, color: "text-red-400", label: "Disputed" },
};

export default function ReceiptViewer() {
  const params = useParams<{ receiptNumber: string }>();
  const receiptNumber = params.receiptNumber ?? "";

  const receiptQ = trpc.poo.getByNumber.useQuery(
    { receiptNumber },
    { enabled: !!receiptNumber }
  );

  const receipt = receiptQ.data;

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  if (receiptQ.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={24} className="text-foreground mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground text-sm">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Shield size={32} className="text-muted-foreground mx-auto mb-4 opacity-40" />
          <h1 className="text-2xl font-light text-foreground mb-2">Receipt Not Found</h1>
          <p className="text-muted-foreground text-sm mb-6">
            The receipt number <span className="font-mono text-foreground">{receiptNumber}</span> does not exist or has been removed.
          </p>
          <Link href="/">
            <Button variant="outline" className="gap-2"><ArrowLeft size={14} /> Back to OpenCommand</Button>
          </Link>
        </div>
      </div>
    );
  }

  const status = STATUS_CONFIG[receipt.verificationStatus] ?? STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const laborHours = parseFloat(receipt.laborHoursSaved ?? "0");
  const dollarValue = parseFloat(receipt.dollarValueCreated ?? "0");
  const cost = parseFloat(receipt.costIncurred ?? "0");
  const roi = cost > 0 ? ((dollarValue - cost) / cost * 100).toFixed(0) : "∞";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <span className="text-sm text-foreground tracking-tight cursor-pointer hover:opacity-70 transition-opacity">OpenCommand</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-xs text-muted-foreground">Proof of Outcome</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-1.5 text-xs">
              <Copy size={12} /> Copy Link
            </Button>
          </div>
        </div>
      </div>

      {/* Receipt Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-6">
          <StatusIcon size={14} className={status.color} />
          <span className={`text-xs ${status.color}`}>{status.label}</span>
          <span className="text-muted-foreground text-xs">·</span>
          <span className="text-xs text-muted-foreground font-mono">{receipt.receiptNumber}</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-light text-foreground tracking-tight mb-2">{receipt.taskTitle}</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Generated {new Date(receipt.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="h-px bg-border mb-8" />

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <DollarSign size={12} /> Value Created
            </div>
            <div className="text-2xl font-light text-foreground">{formatCurrency(receipt.dollarValueCreated)}</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <Timer size={12} /> Hours Saved
            </div>
            <div className="text-2xl font-light text-foreground">{laborHours.toFixed(1)}h</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <Zap size={12} /> Execution Cost
            </div>
            <div className="text-2xl font-light text-foreground">{formatCurrency(receipt.costIncurred)}</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <ExternalLink size={12} /> ROI
            </div>
            <div className="text-2xl font-light text-emerald-400">{roi}%</div>
          </div>
        </div>

        <div className="h-px bg-border mb-8" />

        {/* Outcome */}
        <div className="mb-10">
          <h2 className="text-xs text-muted-foreground tracking-widest uppercase mb-4">Outcome</h2>
          <div className="card-minimal p-6">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{receipt.outcome}</p>
          </div>
        </div>

        {/* Benchmark */}
        <div className="mb-10">
          <h2 className="text-xs text-muted-foreground tracking-widest uppercase mb-4">Value Calculation</h2>
          <div className="card-minimal p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Hourly Rate Benchmark</span>
                <p className="text-foreground mt-1">{formatCurrency(receipt.hourlyRateBenchmark)}/hr</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Labor Equivalent</span>
                <p className="text-foreground mt-1">{laborHours.toFixed(1)} hours × {formatCurrency(receipt.hourlyRateBenchmark)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Net Value</span>
                <p className="text-emerald-400 mt-1">{formatCurrency(String(dollarValue - cost))}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground mb-4">
            This Proof of Outcome receipt was generated and verified by OpenCommand — IntelligenceOS.
          </p>
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <ArrowLeft size={12} /> Learn More About OpenCommand
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
