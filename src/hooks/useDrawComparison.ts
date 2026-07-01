import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DrawComparisonStats {
  drawName: string;
  totalDraws: number;
  avgSum: number;
  evenRatio: number;
  hotNumbers: number[];
  coldNumbers: number[];
  frequency: Record<number, number>;
  recentTrend: "up" | "down" | "stable";
  topPairs: { numbers: number[]; count: number }[];
}

export interface ComparisonResult {
  draw1: DrawComparisonStats | null;
  draw2: DrawComparisonStats | null;
  commonHotNumbers: number[];
  uniqueToFirst: number[];
  uniqueToSecond: number[];
  sumDifference: number;
  parityDifference: number;
  correlationScore: number;
}

function calculateDrawStats(results: any[], drawName: string): DrawComparisonStats | null {
  if (!results || results.length === 0) return null;

  const frequency: Record<number, number> = {};
  const lastSeen: Record<number, number> = {};
  const pairFrequency: Record<string, number> = {};
  let totalSum = 0;
  let totalEven = 0;
  let totalNumbers = 0;

  results.forEach((result, index) => {
    const numbers = result.winning_numbers;
    if (!numbers || !Array.isArray(numbers)) return;

    numbers.forEach((num: number) => {
      totalSum += num;
      if (num % 2 === 0) totalEven++;
      totalNumbers++;
      frequency[num] = (frequency[num] || 0) + 1;
      if (lastSeen[num] === undefined) lastSeen[num] = index;
    });

    // Pairs
    for (let i = 0; i < numbers.length; i++) {
      for (let j = i + 1; j < numbers.length; j++) {
        const key = [numbers[i], numbers[j]].sort((a, b) => a - b).join("-");
        pairFrequency[key] = (pairFrequency[key] || 0) + 1;
      }
    }
  });

  const freqValues = Object.values(frequency);
  const avgFreq = freqValues.reduce((a, b) => a + b, 0) / freqValues.length;
  const stdDev = Math.sqrt(
    freqValues.reduce((sum, f) => sum + Math.pow(f - avgFreq, 2), 0) / freqValues.length
  );

  const hotNumbers = Object.entries(frequency)
    .filter(([_, f]) => (f - avgFreq) / stdDev > 1)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([num]) => parseInt(num));

  const coldNumbers = Object.entries(lastSeen)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([num]) => parseInt(num));

  const topPairs = Object.entries(pairFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([key, count]) => ({
      numbers: key.split("-").map(n => parseInt(n)),
      count
    }));

  // Calculate recent trend
  const recentResults = results.slice(0, 10);
  const olderResults = results.slice(10, 20);
  const recentFreq: Record<number, number> = {};
  const olderFreq: Record<number, number> = {};
  
  recentResults.forEach(r => {
    (r.winning_numbers || []).forEach((n: number) => {
      recentFreq[n] = (recentFreq[n] || 0) + 1;
    });
  });
  olderResults.forEach(r => {
    (r.winning_numbers || []).forEach((n: number) => {
      olderFreq[n] = (olderFreq[n] || 0) + 1;
    });
  });

  let upCount = 0;
  let downCount = 0;
  hotNumbers.forEach(n => {
    const diff = (recentFreq[n] || 0) - (olderFreq[n] || 0);
    if (diff > 0) upCount++;
    else if (diff < 0) downCount++;
  });

  const recentTrend: "up" | "down" | "stable" = upCount > downCount ? "up" : downCount > upCount ? "down" : "stable";

  return {
    drawName,
    totalDraws: results.length,
    avgSum: totalNumbers > 0 ? Math.round(totalSum / (totalNumbers / 5)) : 0,
    evenRatio: totalNumbers > 0 ? totalEven / totalNumbers : 0.5,
    hotNumbers,
    coldNumbers,
    frequency,
    recentTrend,
    topPairs
  };
}

export function useDrawComparison(draw1Name: string, draw2Name: string, limit = 100) {
  const { data: results1, isLoading: loading1 } = useQuery({
    queryKey: ["draw-comparison", draw1Name, limit],
    queryFn: async () => {
      if (!draw1Name) return [];
      const { data, error } = await supabase
        .from("draw_results")
        .select("winning_numbers, draw_date")
        .eq("draw_name", draw1Name)
        .order("draw_date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    enabled: !!draw1Name,
    staleTime: 5 * 60 * 1000
  });

  const { data: results2, isLoading: loading2 } = useQuery({
    queryKey: ["draw-comparison", draw2Name, limit],
    queryFn: async () => {
      if (!draw2Name) return [];
      const { data, error } = await supabase
        .from("draw_results")
        .select("winning_numbers, draw_date")
        .eq("draw_name", draw2Name)
        .order("draw_date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    enabled: !!draw2Name,
    staleTime: 5 * 60 * 1000
  });

  const comparison = useMemo((): ComparisonResult => {
    const stats1 = calculateDrawStats(results1 || [], draw1Name);
    const stats2 = calculateDrawStats(results2 || [], draw2Name);

    if (!stats1 || !stats2) {
      return {
        draw1: stats1,
        draw2: stats2,
        commonHotNumbers: [],
        uniqueToFirst: [],
        uniqueToSecond: [],
        sumDifference: 0,
        parityDifference: 0,
        correlationScore: 0
      };
    }

    const hot1Set = new Set(stats1.hotNumbers);
    const hot2Set = new Set(stats2.hotNumbers);

    const commonHotNumbers = stats1.hotNumbers.filter(n => hot2Set.has(n));
    const uniqueToFirst = stats1.hotNumbers.filter(n => !hot2Set.has(n));
    const uniqueToSecond = stats2.hotNumbers.filter(n => !hot1Set.has(n));

    // Calculate correlation based on frequency similarity
    let correlationSum = 0;
    let count = 0;
    for (let i = 1; i <= 90; i++) {
      const f1 = stats1.frequency[i] || 0;
      const f2 = stats2.frequency[i] || 0;
      if (f1 > 0 || f2 > 0) {
        correlationSum += 1 - Math.abs(f1 - f2) / Math.max(f1, f2, 1);
        count++;
      }
    }
    const correlationScore = count > 0 ? Math.round((correlationSum / count) * 100) : 0;

    return {
      draw1: stats1,
      draw2: stats2,
      commonHotNumbers,
      uniqueToFirst,
      uniqueToSecond,
      sumDifference: Math.abs(stats1.avgSum - stats2.avgSum),
      parityDifference: Math.abs(stats1.evenRatio - stats2.evenRatio),
      correlationScore
    };
  }, [results1, results2, draw1Name, draw2Name]);

  return {
    comparison,
    isLoading: loading1 || loading2
  };
}
