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
        .order("draw_date", { ascending: false });

      if (!results || results.length < 10) return [];
      
      // Dynamic Data Parameters
      const drawCount = results.length;
      const numberSpace = 90;
      const numbersPerDraw = 5;
      
      const expectedFrequencyPerDraw = numbersPerDraw / numberSpace;
      const expectedTotalFrequency = drawCount * expectedFrequencyPerDraw;
      const expectedRate = expectedFrequencyPerDraw * 100;

      const anomalies: Anomaly[] = [];

      // 1. Détection de patterns inhabituels (séquences)
      results.forEach(result => {
        const nums = result.winning_numbers || [];
        const sorted = [...nums].sort((a, b) => a - b);
        let consecutive = 0;
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i + 1] - sorted[i] === 1) consecutive++;
        }
        
        // Probability of getting consecutive numbers is low.
        // We score based on inverse probability heuristic.
        const maxExpectedConsecutive = Math.ceil(numbersPerDraw * expectedFrequencyPerDraw);
        
        if (consecutive > maxExpectedConsecutive) {
          const score = (consecutive / numbersPerDraw) * 100;
          anomalies.push({
            type: "unusual_pattern",
            severity: consecutive >= 3 ? "high" : "medium",
            description: `${consecutive + 1} numéros consécutifs détectés`,
            drawDate: result.draw_date,
            numbers: nums,
            score: score
          });
        }
      });

      // 2. Analyse de randomness
      const allNumbers = results.flatMap(r => r.winning_numbers || []);
      const frequency: Record<number, number> = {};
      for (let i = 1; i <= numberSpace; i++) frequency[i] = 0;
      allNumbers.forEach(num => frequency[num]++);
      
      // Calculate variance and std dev of frequencies
      const frequencies = Object.values(frequency);
      const meanFreq = frequencies.reduce((a, b) => a + b, 0) / numberSpace;
      const varianceFreq = frequencies.reduce((a, b) => a + Math.pow(b - meanFreq, 2), 0) / numberSpace;
      const stdDevFreq = Math.sqrt(varianceFreq);

      // Chi-square heuristic based on variance
      let chiSquare = 0;
      frequencies.forEach(observed => {
        chiSquare += Math.pow(observed - expectedTotalFrequency, 2) / expectedTotalFrequency;
      });

      // Dynamic critical threshold based on empirical rule
      const dynamicChiSquareThreshold = numberSpace + (2 * Math.sqrt(2 * numberSpace));
      
      if (chiSquare > dynamicChiSquareThreshold) {
        anomalies.push({
          type: "randomness_issue",
          severity: chiSquare > dynamicChiSquareThreshold * 1.5 ? "high" : "medium",
          description: `Distribution non-aléatoire détectée (écart de ${((chiSquare / dynamicChiSquareThreshold) * 100 - 100).toFixed(1)}% au modèle théorique)`,
          score: Math.min((chiSquare / dynamicChiSquareThreshold) * 50, 100)
        });
      }

      // 3. Détection de pics de fréquence
      // Dynamic threshold: Mean + 2 Standard Deviations
      const spikeThreshold = meanFreq + (2 * stdDevFreq);
      const criticalSpikeThreshold = meanFreq + (3 * stdDevFreq);
      
      Object.entries(frequency).forEach(([num, count]) => {
        if (count > spikeThreshold) {
          const rate = (count / drawCount) * 100;
          anomalies.push({
            type: "frequency_spike",
            severity: count > criticalSpikeThreshold ? "high" : "medium",
            description: `Numéro ${num} apparaît ${rate.toFixed(1)}% du temps (attendu: ${expectedRate.toFixed(1)}%)`,
            numbers: [parseInt(num)],
            score: Math.min((count / spikeThreshold) * 50, 100)
          });
        }
      });

      // 4. Tirages suspects (trop similaires)
      // Check adjacent draws for similarity, derived from hypergeometric expected overlap
      const expectedOverlap = (numbersPerDraw * numbersPerDraw) / numberSpace;
      const suspiciousOverlapThreshold = Math.ceil(expectedOverlap + 2); // At least expected + 2
      
      for (let i = 0; i < results.length - 1; i++) {
        const nums1 = results[i].winning_numbers || [];
        const nums2 = results[i + 1].winning_numbers || [];
        const common = nums1.filter(n => nums2.includes(n)).length;
        
        if (common >= suspiciousOverlapThreshold) {
          anomalies.push({
            type: "suspicious_draw",
            severity: common > suspiciousOverlapThreshold ? "high" : "medium",
            description: `${common} numéros identiques entre 2 tirages consécutifs`,
            drawDate: results[i].draw_date,
            numbers: nums1.filter(n => nums2.includes(n)),
            score: Math.min((common / numbersPerDraw) * 100, 100)
          });
        }
      }

      return anomalies.sort((a, b) => b.score - a.score).slice(0, Math.ceil(Math.sqrt(drawCount)));
    },
    staleTime: 10 * 60 * 1000,
  });
};
