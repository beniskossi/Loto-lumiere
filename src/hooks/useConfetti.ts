import { useCallback } from "react";
import confetti from "canvas-confetti";

export const useConfetti = () => {
  const celebrate = useCallback((intensity: "low" | "medium" | "high" = "medium") => {
    const configs = {
      low: {
        particleCount: 50,
        spread: 60,
      },
      medium: {
        particleCount: 100,
        spread: 80,
      },
      high: {
        particleCount: 200,
        spread: 100,
      },
    };

    const config = configs[intensity];

    confetti({
      ...config,
      origin: { y: 0.6 },
      colors: ["#1e3a5f", "#d4af37", "#4ade80", "#60a5fa", "#f59e0b"],
    });
  }, []);

  const perfectPrediction = useCallback(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999,
      colors: ["#FFD700", "#FFA500", "#FF6347", "#4ade80", "#60a5fa"],
    };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  }, []);

  const fireworks = useCallback(() => {
    const duration = 2000;
    const animationEnd = Date.now() + duration;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#1e3a5f", "#d4af37", "#4ade80"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#1e3a5f", "#d4af37", "#4ade80"],
      });
    }, 200);
  }, []);

  return { celebrate, perfectPrediction, fireworks };
};
