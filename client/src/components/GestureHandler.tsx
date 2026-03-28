import React, { useRef, useState, useCallback, ReactNode } from "react";

export interface SwipeHandlers {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  onTap?: () => void;
}

export interface GestureHandlerProps extends SwipeHandlers {
  children: ReactNode;
  threshold?: number; // Minimum distance to trigger swipe (default: 50px)
  className?: string;
}

/**
 * GestureHandler: Reusable component for detecting swipe gestures
 * - Swipe right: triggers onSwipeRight callback
 * - Swipe left: triggers onSwipeLeft callback
 * - Tap (no movement): triggers onTap callback
 * 
 * Usage:
 * <GestureHandler
 *   onSwipeRight={() => approve()}
 *   onSwipeLeft={() => dismiss()}
 *   onTap={() => openDetails()}
 * >
 *   <Card>Content</Card>
 * </GestureHandler>
 */
export const GestureHandler: React.FC<GestureHandlerProps> = ({
  children,
  onSwipeRight,
  onSwipeLeft,
  onTap,
  threshold = 50,
  className = "",
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setIsDragging(true);
    setDragOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;

    const currentX = e.touches[0].clientX;
    const offset = currentX - touchStart.x;

    // Only allow horizontal dragging (ignore vertical movement)
    setDragOffset(offset);

    // Apply visual feedback during drag
    if (ref.current) {
      ref.current.style.transform = `translateX(${offset * 0.3}px)`;
      ref.current.style.opacity = `${1 - Math.abs(offset) / 500}`;
    }
  }, [touchStart]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !ref.current) return;

    const currentX = ref.current.getBoundingClientRect().left;
    const startX = touchStart.x;
    const distance = currentX - startX;

    // Reset visual feedback
    ref.current.style.transform = "translateX(0)";
    ref.current.style.opacity = "1";

    // Determine swipe direction
    if (Math.abs(distance) > threshold) {
      if (distance > 0) {
        // Swiped right
        onSwipeRight?.();
      } else {
        // Swiped left
        onSwipeLeft?.();
      }
    } else if (distance === 0) {
      // No movement = tap
      onTap?.();
    }

    setTouchStart(null);
    setIsDragging(false);
    setDragOffset(0);
  }, [touchStart, threshold, onSwipeRight, onSwipeLeft, onTap]);

  const handleTouchCancel = useCallback(() => {
    if (ref.current) {
      ref.current.style.transform = "translateX(0)";
      ref.current.style.opacity = "1";
    }
    setTouchStart(null);
    setIsDragging(false);
    setDragOffset(0);
  }, []);

  return (
    <div
      ref={ref}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      className={`transition-all duration-200 ${isDragging ? "cursor-grabbing" : "cursor-grab"} ${className}`}
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {children}
    </div>
  );
};

export default GestureHandler;
