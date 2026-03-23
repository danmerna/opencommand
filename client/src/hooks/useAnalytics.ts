import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useCallback } from "react";

/**
 * Hook for tracking feature usage events.
 * Only tracks when user is authenticated. Silently no-ops otherwise.
 */
export function useAnalytics() {
  const { isAuthenticated } = useAuth();
  const trackMutation = trpc.analytics.track.useMutation();

  const track = useCallback(
    (feature: string, action: string, metadata?: Record<string, unknown>) => {
      if (!isAuthenticated) return;
      trackMutation.mutate({ feature, action, metadata });
    },
    [isAuthenticated, trackMutation]
  );

  return { track };
}
