import { useCallback, useRef } from "react";

type SoundType = "success" | "click" | "hover" | "error" | "celebration";

export const useSoundEffects = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        }
      } catch (error) {
        console.warn("Web Audio API not supported:", error);
      }
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, volume: number = 0.1) => {
    if (!enabledRef.current) return;
    
    const ctx = initAudioContext();
    if (!ctx) return;

    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      console.warn("Error playing sound:", error);
    }
  }, [initAudioContext]);

  const playSound = useCallback((type: SoundType) => {
    if (!enabledRef.current) return;

    switch (type) {
      case "success":
        // Ascending triad
        playTone(523.25, 0.1, 0.08); // C5
        setTimeout(() => playTone(659.25, 0.1, 0.08), 80); // E5
        setTimeout(() => playTone(783.99, 0.15, 0.08), 160); // G5
        break;
      case "click":
        playTone(800, 0.05, 0.05);
        break;
      case "hover":
        playTone(600, 0.03, 0.03);
        break;
      case "error":
        playTone(200, 0.2, 0.08);
        break;
      case "celebration":
        // Celebratory arpeggio
        playTone(523.25, 0.1, 0.1); // C5
        setTimeout(() => playTone(659.25, 0.1, 0.1), 100); // E5
        setTimeout(() => playTone(783.99, 0.1, 0.1), 200); // G5
        setTimeout(() => playTone(1046.5, 0.2, 0.1), 300); // C6
        break;
    }
  }, [playTone]);

  const toggleSounds = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  return { playSound, toggleSounds };
};
