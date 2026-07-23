import { useCallback, useRef, useState } from "react";

export interface SwipeState {
  /** Live horizontal offset while dragging (px). */
  offsetX: number;
  dragging: boolean;
}

export interface SwipeHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}

/**
 * Pointer-based horizontal swipe (mouse, touch, pen). Crossing the
 * threshold on release fires the direction callback; releasing inside it
 * cancels. Vertical intent (scroll) aborts the gesture. Visible buttons
 * and keyboard shortcuts must invoke the same domain actions.
 */
export function useSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  threshold = 96,
): { swipe: SwipeState; handlers: SwipeHandlers; threshold: number } {
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  const aborted = useRef(false);

  const reset = useCallback(() => {
    origin.current = null;
    aborted.current = false;
    setOffsetX(0);
    setDragging(false);
  }, []);

  const handlers: SwipeHandlers = {
    onPointerDown: e => {
      /* Don't hijack interactive descendants (buttons, links, inputs). */
      if ((e.target as HTMLElement).closest("button, a, input, [role='slider']")) return;
      origin.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      aborted.current = false;
      setDragging(true);
    },
    onPointerMove: e => {
      const o = origin.current;
      if (!o || o.id !== e.pointerId || aborted.current) return;
      const dx = e.clientX - o.x;
      const dy = e.clientY - o.y;
      if (Math.abs(dy) > 48 && Math.abs(dy) > Math.abs(dx)) {
        aborted.current = true;
        setOffsetX(0);
        setDragging(false);
        return;
      }
      if (Math.abs(dx) > 8) (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      setOffsetX(dx);
    },
    onPointerUp: e => {
      const o = origin.current;
      if (!o || o.id !== e.pointerId) return;
      const dx = e.clientX - o.x;
      const crossed = !aborted.current && Math.abs(dx) >= threshold;
      reset();
      if (crossed) (dx < 0 ? onSwipeLeft : onSwipeRight)();
    },
    onPointerCancel: reset,
  };

  return { swipe: { offsetX, dragging }, handlers, threshold };
}
