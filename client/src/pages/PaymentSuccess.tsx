import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PaymentSuccess() {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="max-w-md w-full text-center">
        <CheckCircle size={40} className="text-emerald-400 mx-auto mb-6" />
        <h1 className="text-3xl font-light text-foreground tracking-tight mb-3">Payment Confirmed</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Your purchase has been processed successfully. The agent or blueprint will be activated in your Mission Control within moments.
        </p>
        <div className="space-y-3">
          <Link href="/mission-control">
            <Button className="w-full h-11">Go to Mission Control</Button>
          </Link>
          <Link href="/marketplace">
            <Button variant="outline" className="w-full h-11 gap-2">
              <ArrowLeft size={14} /> Back to Marketplace
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
