import { useState, useEffect, useMemo, useCallback } from "react";
import { useDrawResults } from "./useDrawResults";
import { toast } from "sonner";
import { useHapticFeedback } from "./useHapticFeedback";

export interface CadenceAlert {
  id: string;
  type: "cadence_lock" | "double_gap_trigger" | "pattern_match";
  title: string;
  description: string;
  severity: "high" | "medium" | "info";
  number?: number;
  drawName: string;
  score: number;
  patternName?: string;
  timestamp: number;
  read: boolean;
}

// Helper: Calculate Double Gap Sequence score (same logic as DoubleGapAnalyzer)
function calculateDoubleGapSequenceScore(results: any[]): Map<number, number> {
  const scores = new Map<number, number>();
  for (let n = 1; n <= 90; n++) {
    const indices: number[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].winning_numbers?.includes(n)) {
        indices.push(i);
      }
    }
    
    let score = 0;
    if (indices.length >= 4) {
      const currentGap = indices[0];
      const gaps = [];
      for (let j = 0; j < indices.length - 1; j++) {
        gaps.push(indices[j+1] - indices[j] - 1);
      }
      
      const d1 = gaps[0] - gaps[1];
      const d2 = (gaps[1] - gaps[2]) || 0; 
      const acceleration = d1 - d2;
      
      let projectedGap = gaps[0] + d1 * 0.5 + acceleration * 0.25;
      projectedGap = Math.max(0, projectedGap);
      
      const diff = Math.abs(currentGap - projectedGap);
      score = Math.exp(-(diff * diff) / (2 * 1.5 * 1.5));
    }
    scores.set(n, score);
  }
  return scores;
}

// Helper: Calculate Gap Cadence score (same logic as DoubleGapAnalyzer)
function calculateGapCadenceScore(results: any[]): Map<number, number> {
  const scores = new Map<number, number>();
  for (let n = 1; n <= 90; n++) {
    const indices: number[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].winning_numbers?.includes(n)) {
        indices.push(i);
      }
    }
    
    let score = 0;
    if (indices.length >= 5) {
      const currentGap = indices[0];
      const gaps = [];
      for (let j = 0; j < indices.length - 1; j++) {
        gaps.push(indices[j+1] - indices[j] - 1);
      }
      
      let maxPeriodScore = 0;
      for (let k = 1; k <= 3; k++) {
        if (gaps.length >= k * 2) {
          let diffSum = 0;
          let count = 0;
          for (let j = 0; j < Math.min(k * 2, gaps.length - k); j++) {
            diffSum += Math.abs(gaps[j] - gaps[j+k]);
            count++;
          }
          const avgDiff = diffSum / count;
          const cadenceStrength = Math.exp(-avgDiff / 2.0);
          
          const expectedGap = gaps[k-1];
          const distanceToExpected = Math.abs(currentGap - expectedGap);
          
          const matchScore = cadenceStrength * Math.exp(-(distanceToExpected * distanceToExpected) / (2 * 1.0 * 1.0));
          if (matchScore > maxPeriodScore) {
            maxPeriodScore = matchScore;
          }
        }
      }
      score = maxPeriodScore;
    }
    scores.set(n, score);
  }
  return scores;
}

export const useCadenceAlerts = (drawName: string) => {
  const { data: results, isLoading } = useDrawResults(drawName, 120);
  const { triggerHaptic } = useHapticFeedback();
  const [alerts, setAlerts] = useState<CadenceAlert[]>([]);
  const [lastNotifiedId, setLastNotifiedId] = useState<string | null>(null);

  // Read read/unread states from localStorage
  const loadAlertState = useCallback((calculatedAlerts: CadenceAlert[]) => {
    try {
      const stored = localStorage.getItem(`loto-lumiere-alerts-${drawName}`);
      if (stored) {
        const storedList = JSON.parse(stored) as { id: string; read: boolean }[];
        const readMap = new Map(storedList.map((item) => [item.id, item.read]));
        
        return calculatedAlerts.map((alert) => ({
          ...alert,
          read: readMap.get(alert.id) ?? false,
        }));
      }
    } catch (e) {
      console.error("Error reading alert states", e);
    }
    return calculatedAlerts;
  }, [drawName]);

  // Save alerts list in localStorage
  const saveAlertState = useCallback((currentAlerts: CadenceAlert[]) => {
    try {
      const minimal = currentAlerts.map((a) => ({ id: a.id, read: a.read }));
      localStorage.setItem(`loto-lumiere-alerts-${drawName}`, JSON.stringify(minimal));
    } catch (e) {
      console.error("Error saving alert states", e);
    }
  }, [drawName]);

  const calculatedAlerts = useMemo(() => {
    if (!results || results.length < 30) return [];

    const activeAlerts: CadenceAlert[] = [];

    // 1. Calculate scores
    const cadenceScores = calculateGapCadenceScore(results);
    const doubleGapScores = calculateDoubleGapSequenceScore(results);

    // 2. Scan for Rhythmic Cadence Locks (Gap Cadence)
    const cadenceEntries = Array.from(cadenceScores.entries())
      .filter(([_, score]) => score >= 0.80)
      .sort((a, b) => b[1] - a[1]);

    cadenceEntries.forEach(([num, score]) => {
      const percentage = Math.round(score * 100);
      const isHigh = score >= 0.88;
      
      activeAlerts.push({
        id: `cadence_lock-${drawName}-${num}-${results[0]?.id}`,
        type: "cadence_lock",
        title: `Verrouillage Rythmique : Numéro ${num}`,
        description: `Le numéro ${num} a atteint une périodicité d'écart régulière exceptionnelle (${percentage}% de fidélité). Prêt à se synchroniser sur le prochain tirage.`,
        severity: isHigh ? "high" : "medium",
        number: num,
        drawName,
        score,
        timestamp: Date.now(),
        read: false,
      });
    });

    // 3. Scan for Double-Gap Acceleration Trigger (Double Gap Sequence)
    const doubleGapEntries = Array.from(doubleGapScores.entries())
      .filter(([_, score]) => score >= 0.85)
      .sort((a, b) => b[1] - a[1]);

    doubleGapEntries.forEach(([num, score]) => {
      const percentage = Math.round(score * 100);
      const isHigh = score >= 0.92;

      activeAlerts.push({
        id: `double_gap-${drawName}-${num}-${results[0]?.id}`,
        type: "double_gap_trigger",
        title: `Accélération d'Écart : Numéro ${num}`,
        description: `La variation de l'écart du second ordre du numéro ${num} montre une accélération gravitationnelle critique (${percentage}% de convergence théorique).`,
        severity: isHigh ? "high" : "medium",
        number: num,
        drawName,
        score,
        timestamp: Date.now(),
        read: false,
      });
    });

    // 4. Pattern combination matching (tranche counts)
    // Calculate historical pattern statistics
    const patternFrequencies: Record<string, number> = {};
    const GAP_TRANCHES = [
      { id: "A", min: 0, max: 3 },
      { id: "B", min: 4, max: 9 },
      { id: "C", min: 10, max: 18 },
      { id: "D", min: 19, max: 999 },
    ];

    results.forEach((draw) => {
      const winning = draw.winning_numbers || [];
      if (winning.length === 0) return;
      
      // Calculate tranche counts
      // We estimate the gap of each number as index of last appearance
      const trancheCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
      winning.forEach((num) => {
        // Find first appearance before this draw
        const idx = results.findIndex((d, dIdx) => dIdx > 0 && d.winning_numbers?.includes(num));
        const gap = idx === -1 ? 15 : idx - 1;
        const tranche = GAP_TRANCHES.find((t) => gap >= t.min && gap <= t.max);
        if (tranche) trancheCounts[tranche.id]++;
      });

      const pattern = Object.entries(trancheCounts)
        .filter(([_, count]) => count > 0)
        .map(([id, count]) => `${count}${id}`)
        .join("-");

      patternFrequencies[pattern] = (patternFrequencies[pattern] || 0) + 1;
    });

    // Top historical pattern
    const topPatterns = Object.entries(patternFrequencies)
      .map(([pattern, count]) => ({ pattern, percentage: count / results.length }))
      .sort((a, b) => b.percentage - a.percentage);

    if (topPatterns.length > 0) {
      const topPat = topPatterns[0];
      const percentage = Math.round(topPat.percentage * 100);

      if (topPat.percentage >= 0.30) {
        activeAlerts.push({
          id: `pattern_match-${drawName}-${topPat.pattern}-${results[0]?.id}`,
          type: "pattern_match",
          title: `Résonance Harmonique de Tranche`,
          description: `La configuration des écarts globaux du tirage actuel s'aligne idéalement avec le motif historique dominant "${topPat.pattern}" (fréquence historique de ${percentage}%).`,
          severity: "high",
          drawName,
          score: topPat.percentage,
          patternName: topPat.pattern,
          timestamp: Date.now(),
          read: false,
        });
      }
    }

    return activeAlerts;
  }, [results, drawName]);

  const markAsRead = useCallback((alertId: string) => {
    setAlerts((prev) => {
      const updated = prev.map((a) => (a.id === alertId ? { ...a, read: true } : a));
      saveAlertState(updated);
      return updated;
    });
  }, [saveAlertState]);

  // Effect to load and notify new alerts
  useEffect(() => {
    if (calculatedAlerts.length === 0) return;

    const merged = loadAlertState(calculatedAlerts);
    setAlerts(merged);

    // Look for high severity unread alert to notify the user
    const highAlerts = merged.filter((a) => a.severity === "high" && !a.read);
    if (highAlerts.length > 0) {
      const bestAlert = highAlerts[0];
      
      // Notify only once per alert ID session-wise
      if (bestAlert.id !== lastNotifiedId) {
        setLastNotifiedId(bestAlert.id);
        
        // Haptic feedback
        triggerHaptic("warning");

        // Custom Sonner Toast with gorgeous styling
        toast.custom((id) => (
          <div className="flex flex-col gap-2 p-4 bg-slate-900 border border-amber-500/30 rounded-2xl shadow-xl shadow-amber-950/20 max-w-sm pointer-events-auto">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
              <p className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">Alerte Cadence Majeure</p>
            </div>
            <h4 className="text-sm font-bold text-white leading-tight">{bestAlert.title}</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{bestAlert.description}</p>
            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={() => {
                  markAsRead(bestAlert.id);
                  toast.dismiss(id);
                }}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition-all"
              >
                Prendre Note
              </button>
            </div>
          </div>
        ), { duration: 8000 });

        // HTML5 Push Notification if granted and enabled
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification("Loto Lumière - Alerte Rythmique", {
              body: `${bestAlert.title} : ${bestAlert.description}`,
              icon: "/icon-192.png"
            });
          } catch (e) {
            console.error("Error showing push notification", e);
          }
        }
      }
    }
  }, [calculatedAlerts, loadAlertState, lastNotifiedId, triggerHaptic, markAsRead]);

  const markAllAsRead = useCallback(() => {
    setAlerts((prev) => {
      const updated = prev.map((a) => ({ ...a, read: true }));
      saveAlertState(updated);
      return updated;
    });
    toast.success("Toutes les alertes ont été lues !");
  }, [saveAlertState]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    localStorage.removeItem(`loto-lumiere-alerts-${drawName}`);
    toast.success("Alertes nettoyées !");
  }, [drawName]);

  const unreadCount = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);

  return {
    alerts,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    clearAlerts,
  };
};
