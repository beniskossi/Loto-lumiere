import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

const THRESHOLD = 80;

export const usePullToRefresh = (enabled = true) => {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const queryClient = useQueryClient();
  const { triggerHaptic } = useHapticFeedback();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerHaptic("success");
    await queryClient.invalidateQueries();
    // Small delay for visual feedback
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
  }, [queryClient, triggerHaptic]);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        setPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pulling || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        setPullDistance(Math.min(delta * 0.5, THRESHOLD * 1.5));
        if (delta * 0.5 >= THRESHOLD) {
          triggerHaptic("light");
        }
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance >= THRESHOLD && !refreshing) {
        handleRefresh();
      }
      setPulling(false);
      setPullDistance(0);
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, pulling, pullDistance, refreshing, handleRefresh, triggerHaptic]);

  return { pullDistance, refreshing };
};
