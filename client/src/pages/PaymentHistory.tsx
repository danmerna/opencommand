import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import {
  CreditCard, Clock, CheckCircle2, ArrowLeft, Receipt, Loader2,
} from "lucide-react";
import { Link } from "wouter";

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100);
};

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  paid: { color: "text-emerald-400", label: "Paid" },
  unpaid: { color: "text-amber-400", label: "Pending" },
  no_payment_required: { color: "text-muted-foreground", label: "Free" },
};

export default function PaymentHistory() {
  const { isAuthenticated } = useAuth();
  const historyQ = trpc.payments.history.useQuery(undefined, { enabled: isAuthenticated });
  const payments = historyQ.data ?? [];

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
        <CreditCard size={32} className="text-muted-foreground opacity-50" />
        <h1 className="text-2xl font-light text-foreground">Payment History</h1>
        <p className="text-muted-foreground text-sm">View your past purchases and subscriptions.</p>
        <a href={getLoginUrl()}><Button>Sign In</Button></a>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">OpenCommand</p>
        <h1 className="text-4xl font-light text-foreground tracking-tight">Payment History</h1>
        <p className="text-muted-foreground text-sm mt-2">Your past purchases, subscriptions, and invoices.</p>
      </div>

      {historyQ.isLoading ? (
        <div className="card-minimal p-16 text-center">
          <Loader2 size={20} className="text-foreground mx-auto mb-3 animate-spin" />
          <p className="text-muted-foreground text-sm">Loading payment history...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="card-minimal p-16 text-center">
          <Receipt size={28} className="text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-foreground text-sm mb-2">No Payments Yet</p>
          <p className="text-muted-foreground text-xs mb-6">Your completed purchases will appear here.</p>
          <Link href="/marketplace">
            <Button variant="outline" className="gap-2"><ArrowLeft size={14} /> Browse Marketplace</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs text-muted-foreground tracking-widest uppercase">
            <div className="col-span-4">Product</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Tier</div>
            <div className="col-span-2">Date</div>
          </div>
          <div className="h-px bg-border" />

          {payments.map((payment) => {
            const status = STATUS_STYLE[payment.status] ?? { color: "text-muted-foreground", label: payment.status };
            return (
              <div key={payment.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-secondary/30 rounded-md transition-colors">
                <div className="col-span-4">
                  <div className="flex items-center gap-3">
                    <CreditCard size={14} className="text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm text-foreground">{payment.productKey.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground font-mono">{payment.id.slice(0, 20)}...</p>
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-sm text-foreground font-mono">{formatCurrency(payment.amount, payment.currency)}</span>
                </div>
                <div className="col-span-2">
                  <span className={`text-xs flex items-center gap-1 ${status.color}`}>
                    <CheckCircle2 size={10} /> {status.label}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground border border-border px-1.5 py-0.5 rounded">{payment.tier}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={10} /> {new Date(payment.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
