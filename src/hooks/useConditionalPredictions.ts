import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Constantes empiriques
const HISTORY_LIMIT = 100;
const MIN_DRAWS_REQUIRED = 10;
const PROBABILITY_MIN_THRESHOLD = 40;
const HIGH_CONFIDENCE_THRESHOLD = 70;
const MEDIUM_CONFIDENCE_THRESHOLD = 50;
const TOP_RULES_LIMIT = 10;
const TOP_COMBINATIONS_LIMIT = 8;
const RECENCY_DECAY_DAYS = 30;
const STALE_TIME = 10 * 60 * 1000;

interface ConditionalRule {
  condition: number;
  consequence: number;
  probability: number;
  occurrences: number;
  confidence: "high" | "medium" | "low";
}

interface WinningCombination {
  numbers: number[];
  frequency: number;
  lastSeen: string;
  score: number;
}

interface DrawResultRow {
  winning_numbers: number[] | null;
  draw_date: string;
}

export const useConditionalPredictions = (drawName: string) => {
  return useQuery({
    queryKey: ["conditional-predictions", drawName],
    queryFn: async () => {
      const { data: results } = await supabase
        .from("draw_results")
        .select("winning_numbers, draw_date")
        .eq("draw_name", drawName)
        .order("draw_date", { ascending: false })
        .limit(HISTORY_LIMIT);

      if (!results || results.length < MIN_DRAWS_REQUIRED) {
        return { rules: [], combinations: [] };
      }

      const typedResults = results as DrawResultRow[];
      const rules = findConditionalRules(typedResults);
      const combinations = findWinningCombinations(typedResults);

      return { rules, combinations };
    },
    staleTime: STALE_TIME,
  });
};

function findConditionalRules(results: DrawResultRow[]): ConditionalRule[] {
  const pairs: Record<string, { count: number; total: number }> = {};

  results.forEach(result => {
    const numbers = result.winning_numbers || [];
    numbers.forEach((num1: number) => {
      numbers.forEach((num2: number) => {
        if (num1 !== num2) {
          const key = `${num1}-${num2}`;
          if (!pairs[key]) pairs[key] = { count: 0, total: 0 };
          pairs[key].count++;
        }
      });
      
      const totalWithNum1 = results.filter(r => r.winning_numbers?.includes(num1)).length;
      numbers.forEach((num2: number) => {
        if (num1 !== num2) {
          const key = `${num1}-${num2}`;
          pairs[key].total = totalWithNum1;
        }
      });
    });
  });

  return Object.entries(pairs)
    .map(([key, data]) => {
      const [condition, consequence] = key.split("-").map(Number);
      const probability = (data.count / data.total) * 100;
      const confidence: "high" | "medium" | "low" = 
        probability >= HIGH_CONFIDENCE_THRESHOLD ? "high" : probability >= MEDIUM_CONFIDENCE_THRESHOLD ? "medium" : "low";
      
      return {
        condition,
        consequence,
        probability,
        occurrences: data.count,
        confidence
      };
    })
    .filter(rule => rule.probability >= PROBABILITY_MIN_THRESHOLD)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, TOP_RULES_LIMIT);
}

function findWinningCombinations(results: DrawResultRow[]): WinningCombination[] {
  const combos: Record<string, { count: number; lastSeen: string }> = {};

  results.forEach(result => {
    const numbers = result.winning_numbers || [];
    for (let i = 0; i < numbers.length - 1; i++) {
      for (let j = i + 1; j < numbers.length; j++) {
        const key = [numbers[i], numbers[j]].sort((a, b) => a - b).join("-");
        if (!combos[key]) combos[key] = { count: 0, lastSeen: result.draw_date };
        combos[key].count++;
        if (result.draw_date > combos[key].lastSeen) {
          combos[key].lastSeen = result.draw_date;
        }
      }
    }
  });

  return Object.entries(combos)
    .map(([key, data]) => {
      const numbers = key.split("-").map(Number);
      const frequency = (data.count / results.length) * 100;
      const daysSince = Math.floor((Date.now() - new Date(data.lastSeen).getTime()) / (1000 * 60 * 60 * 24));
      const recencyScore = Math.exp(-daysSince / RECENCY_DECAY_DAYS);
      const score = frequency * recencyScore;

      return {
        numbers,
        frequency: data.count,
        lastSeen: data.lastSeen,
        score
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_COMBINATIONS_LIMIT);
}
