import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

/**
 * Polite live-region announcements for listening, triage, undo, hold,
 * execution, and receipt states. One region, throttled by replacement —
 * screen readers hear the latest state without a flood.
 */

const AnnouncerContext = createContext<(message: string) => void>(() => {});

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((next: string) => {
    setMessage("");
    /* Re-set on the next frame so identical messages re-announce. */
    requestAnimationFrame(() => setMessage(next));
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setMessage(""), 6000);
  }, []);

  return (
    <AnnouncerContext.Provider value={announce}>
      {children}
      <div aria-live="polite" role="status" className="sr-only">
        {message}
      </div>
    </AnnouncerContext.Provider>
  );
}

export function useAnnounce(): (message: string) => void {
  return useContext(AnnouncerContext);
}
