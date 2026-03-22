import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PaymentSuccess() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        <div className="w-20 h-20 mx-auto mb-8 rounded-full border-2 border-red-600 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="font-heading text-5xl font-black text-white uppercase tracking-tight mb-4">
          PAYMENT CONFIRMED
        </h1>
        <div className="w-full h-[2px] bg-red-600 mb-6" />
        <p className="text-zinc-400 font-mono text-sm mb-8">
          Your purchase has been processed successfully. The agent or blueprint will be activated in your Mission Control within moments.
        </p>
        <div className="space-y-3">
          <Link href="/mission-control">
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-heading uppercase tracking-wider h-12">
              Go to Mission Control
            </Button>
          </Link>
          <Link href="/marketplace">
            <Button variant="outline" className="w-full border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 font-heading uppercase tracking-wider h-12">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Marketplace
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
