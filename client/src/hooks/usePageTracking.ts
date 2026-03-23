import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { nanoid } from "nanoid";

// Persist a session ID for the browser tab lifetime
function getSessionId(): string {
  let id = sessionStorage.getItem("oc_session_id");
  if (!id) {
    id = nanoid(20);
    sessionStorage.setItem("oc_session_id", id);
  }
  return id;
}

export function usePageTracking() {
  const [location] = useLocation();
  const trackMutation = trpc.tracking.pageView.useMutation();
  const prevPath = useRef<string | null>(null);
  const enteredAt = useRef<number>(Date.now());

  useEffect(() => {
    const sessionId = getSessionId();
    const currentPath = location;
    const duration = prevPath.current !== null ? Date.now() - enteredAt.current : undefined;

    // Fire beacon for the new page (duration = time spent on previous page)
    trackMutation.mutate({
      path: currentPath,
      sessionId,
      referrer: prevPath.current ?? document.referrer ?? undefined,
      userAgent: navigator.userAgent,
      duration,
    });

    prevPath.current = currentPath;
    enteredAt.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);
}
