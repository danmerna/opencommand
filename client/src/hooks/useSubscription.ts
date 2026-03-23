import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export type SubscriptionTier = "free" | "starter" | "pro";

export interface SubscriptionState {
  tier: SubscriptionTier;
  isLoading: boolean;
  isPro: boolean;
  isStarter: boolean;
  isFree: boolean;
}

/**
 * Detects the user's current subscription tier from their payment history.
 * Returns the highest active tier found (pro > starter > free).
 */
export function useSubscription(): SubscriptionState {
  const { isAuthenticated } = useAuth();

  const historyQ = trpc.payments.history.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000, // cache for 1 minute
  });

  if (!isAuthenticated || historyQ.isLoading) {
    return { tier: "free", isLoading: !!historyQ.isLoading, isPro: false, isStarter: false, isFree: true };
  }

  const payments = historyQ.data ?? [];

  // Determine highest tier from paid sessions
  const tiers = payments
    .filter((p) => p.status === "paid" || p.status === "no_payment_required")
    .map((p) => p.tier as string);

  let tier: SubscriptionTier = "free";
  if (tiers.includes("pro")) tier = "pro";
  else if (tiers.includes("starter")) tier = "starter";

  return {
    tier,
    isLoading: false,
    isPro: tier === "pro",
    isStarter: tier === "starter",
    isFree: tier === "free",
  };
}
