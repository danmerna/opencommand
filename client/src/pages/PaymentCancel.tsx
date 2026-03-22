import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PaymentCancel() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        <div className="w-20 h-20 mx-auto mb-8 rounded-full border-2 border-zinc-700 flex items-center justify-center">
          <XCircle className="w-10 h-10 text-zinc-500" />
        </div>
        <h1 className="font-heading text-5xl font-black text-white uppercase tracking-tight mb-4">
          PAYMENT CANCELLED
        </h1>
        <div className="w-full h-[2px] bg-zinc-700 mb-6" />
        <p className="text-zinc-400 font-mono text-sm mb-8">
          Your payment was not completed. No charges have been made to your account. You can try again or return to the marketplace.
        </p>
        <div className="space-y-3">
          <Link href="/marketplace">
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-heading uppercase tracking-wider h-12">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Marketplace
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
