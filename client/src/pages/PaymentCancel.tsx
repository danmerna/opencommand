import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PaymentCancel() {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="max-w-md w-full text-center">
        <XCircle size={40} className="text-muted-foreground mx-auto mb-6" />
        <h1 className="text-3xl font-light text-foreground tracking-tight mb-3">Payment Cancelled</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Your payment was not completed. No charges have been made to your account. You can try again or return to the marketplace.
        </p>
        <Link href="/marketplace">
          <Button variant="outline" className="w-full h-11 gap-2">
            <ArrowLeft size={14} /> Return to Marketplace
          </Button>
        </Link>
      </div>
    </div>
  );
}
