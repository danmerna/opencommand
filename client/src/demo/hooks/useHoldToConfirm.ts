import { useCallback, useEffect, useRef, useState } from "react";

export interface HoldState {
  /** 0..1 fill progress. */
  progress: number;
  holding: boolean;
}

export interface HoldHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onKeyUp: (e: React.KeyboardEvent) => void;
}

/**
 * Deliberate press-and-hold confirmation. Pointer down/up/cancel and
 * keyboard Space/Enter down/up drive the same timer. Releasing before the
 * threshold cancels with no side effects; completing invokes onConfirm once.
 */
export function useHoldToConfirm(
  onConfirm: () => void,
  onCancelEarly?: () => void,
  durationMs = 1500,
): { hold: HoldState; handlers: HoldHandlers } {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const raf = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const confirmed = useRef(false);

  const stopTicking = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    startedAt.current = null;
  }, []);

  const begin = useCallback(() => {
    if (startedAt.current !== null) return;
    confirmed.current = false;
    startedAt.current = performance.now();
    setHolding(true);
    const tick = () => {
      if (startedAt.current === null) return;
      const elapsed = performance.now() - startedAt.current;
      const p = Math.min(1, elapsed / durationMs);
      setProgress(p);
      if (p >= 1) {
        if (!confirmed.current) {
          confirmed.current = true;
          stopTicking();
          setHolding(false);
          setProgress(0);
          onConfirm();
        }
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [durationMs, onConfirm, stopTicking]);

  const release = useCallback(() => {
    if (startedAt.current === null) return;
    const wasConfirmed = confirmed.current;
    stopTicking();
    setHolding(false);
    setProgress(0);
    if (!wasConfirmed) onCancelEarly?.();
  }, [onCancelEarly, stopTicking]);

  useEffect(() => stopTicking, [stopTicking]);

  const handlers: HoldHandlers = {
    onPointerDown: e => {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      begin();
    },
    onPointerUp: release,
    onPointerLeave: release,
    onPointerCancel: release,
    onKeyDown: e => {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        e.preventDefault();
        begin();
      }
    },
    onKeyUp: e => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        release();
      }
    },
  };

  return { hold: { progress, holding }, handlers };
}
