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
 * BETA MODE: All signed-up users get full Pro features.
 * Pricing tiers are disabled until further notice.
 * When pricing is re-enabled, restore the payment history check.
 */
export function useSubscription(): SubscriptionState {
  const { isAuthenticated } = useAuth();

  // During beta, every authenticated user gets full Pro access
  if (isAuthenticated) {
    return {
      tier: "pro",
      isLoading: false,
      isPro: true,
      isStarter: false,
      isFree: false,
    };
  }

  return {
    tier: "free",
    isLoading: false,
    isPro: false,
    isStarter: false,
    isFree: true,
  };
}
