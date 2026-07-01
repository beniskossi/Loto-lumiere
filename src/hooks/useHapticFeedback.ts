import { useCallback } from "react";

type HapticStyle = "light" | "medium" | "heavy" | "success" | "warning" | "error";

export const useHapticFeedback = () => {
  const triggerHaptic = useCallback((style: HapticStyle = "medium") => {
    // Check if the device supports haptic feedback
    if (!("vibrate" in navigator)) return;

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 50, 10], // Double tap
      warning: [15, 30, 15, 30, 15],
      error: [50, 100, 50],
    };

    try {
      navigator.vibrate(patterns[style]);
    } catch (error) {
      console.warn("Haptic feedback not supported:", error);
    }
  }, []);

  return { triggerHaptic };
};
