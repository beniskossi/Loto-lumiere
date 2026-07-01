import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Anomaly {
  type: "unusual_pattern" | "suspicious_draw" | "randomness_issue" | "frequency_spike";
  severity: "low" | "medium" | "high";
  description: string;
  drawDate?: string;
  numbers?: number[];
  score: number;
}

export const useAnomalyDetection = (drawName: string) => {
  return useQuery({
    queryKey: ["anomaly-detection", drawName],
    queryFn: async (): Promise<Anomaly[]> => {
      const { data: results } = await supabase
        .from("draw_results")
        .select("winning_numbers, draw_date")
        .eq("draw_name", drawName)
        .order("draw_date", { ascending: false })
        .limit(50);

      if (!results || results.length < 10) return [];

      const anomalies: Anomaly[] = [];

      // 1. Détection de patterns inhabituels (séquences)
      results.forEach(result => {
        const nums = result.winning_numbers || [];
        const sorted = [...nums].sort((a, b) => a - b);
        let consecutive = 0;
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i + 1] - sorted[i] === 1) consecutive++;
        }
        if (consecutive >= 3) {
          anomalies.push({
            type: "unusual_pattern",
            severity: "medium",
            description: `${consecutive + 1} numéros consécutifs détectés`,
            drawDate: result.draw_date,
            numbers: nums,
            score: consecutive * 20
          });
        }
      });

      // 2. Analyse de randomness (chi-square test simplifié)
      const allNumbers = results.flatMap(r => r.winning_numbers || []);
      const frequency: Record<number, number> = {};
      for (let i = 1; i <= 90; i++) frequency[i] = 0;
      allNumbers.forEach(num => frequency[num]++);

      const expected = allNumbers.length / 90;
      let chiSquare = 0;
      Object.values(frequency).forEach(observed => {
        chiSquare += Math.pow(observed - expected, 2) / expected;
      });

      const criticalValue = 112.02; // Chi-square 90 df, p=0.05
      if (chiSquare > criticalValue * 1.5) {
        anomalies.push({
          type: "randomness_issue",
          severity: "high",
          description: `Distribution non-aléatoire détectée (χ²=${chiSquare.toFixed(1)})`,
          score: 90
        });
      }

      // 3. Détection de pics de fréquence
      Object.entries(frequency).forEach(([num, count]) => {
        const rate = (count / results.length) * 100;
        if (rate > 15) {
          anomalies.push({
            type: "frequency_spike",
            severity: rate > 20 ? "high" : "medium",
            description: `Numéro ${num} apparaît ${rate.toFixed(1)}% du temps (attendu: 5.6%)`,
            numbers: [parseInt(num)],
            score: rate * 3
          });
        }
      });

      // 4. Tirages suspects (trop similaires)
      for (let i = 0; i < Math.min(results.length - 1, 10); i++) {
        const nums1 = results[i].winning_numbers || [];
        const nums2 = results[i + 1].winning_numbers || [];
        const common = nums1.filter(n => nums2.includes(n)).length;
        if (common >= 4) {
          anomalies.push({
            type: "suspicious_draw",
            severity: "high",
            description: `${common} numéros identiques entre 2 tirages consécutifs`,
            drawDate: results[i].draw_date,
            numbers: nums1.filter(n => nums2.includes(n)),
            score: common * 25
          });
        }
      }

      return anomalies.sort((a, b) => b.score - a.score).slice(0, 5);
    },
    staleTime: 10 * 60 * 1000,
  });
};
