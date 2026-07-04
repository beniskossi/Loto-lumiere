import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BacktestResult {
  algorithm: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  avgMatches: number;
  bestMatch: number;
  worstMatch: number;
  consistency: number;
  totalTests: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  winRate?: number;
  profitFactor?: number;
  matchDistribution?: Record<number, number>;
  crossValidation?: {
    standardError: number;
    confidenceInterval: { lower: number; upper: number };
    foldResults: { accuracy: number; winRate: number; sharpeRatio: number }[];
  };
}

export interface BacktestConfig {
  drawName: string;
  validationType?: 'standard' | 'kfold' | 'walkforward';
  kFolds?: number;
  saveResults?: boolean;
}

export interface BacktestResponse {
  drawName: string;
  validationType: string;
  evaluations: BacktestResult[];
  crossValidationResults?: {
    algorithm: string;
    confidenceInterval?: { lower: number; upper: number };
    standardError?: number;
  }[];
  historicalCount: number;
  savedToDatabase: boolean;
}

export const useBacktesting = (drawName?: string) => {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [lastResults, setLastResults] = useState<BacktestResponse | null>(null);

  // Fetch historical performance data for comparison
  const { data: historicalPerformance, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["backtest-history", drawName],
    queryFn: async () => {
      const query = supabase
        .from("algorithm_performance")
        .select("id, model_used, matches_count, accuracy_score, f1_score, confidence_score, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (drawName) {
        query.eq("draw_name", drawName);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Run backtesting with validation type
  const runBacktest = useMutation({
    mutationFn: async (config: BacktestConfig) => {
      setIsRunning(true);
      
      const { data, error } = await supabase.functions.invoke("evaluate-algorithms", {
        body: {
          drawName: config.drawName,
          validationType: config.validationType || 'standard',
          kFolds: config.kFolds || 5,
          saveResults: config.saveResults ?? false,
        },
      });

      if (error) throw error;
      return data as BacktestResponse;
    },
    onSuccess: (data) => {
      setLastResults(data);
      toast.success(`Backtesting ${data.validationType} terminé: ${data.evaluations.length} algorithmes évalués sur ${data.historicalCount} tirages`);
      queryClient.invalidateQueries({ queryKey: ["backtest-history"] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
    onSettled: () => {
      setIsRunning(false);
    },
  });

  // Calculate aggregate statistics from historical performance
  const aggregateStats = useMemo(() => {
    if (!historicalPerformance?.length) return null;

    const byAlgorithm: Record<string, { 
      totalMatches: number; 
      count: number; 
      accuracies: number[];
      bestMatch: number;
      worstMatch: number;
      f1Scores: number[];
      confidenceScores: number[];
    }> = {};

    historicalPerformance.forEach((record) => {
      const algo = record.model_used;
      if (!byAlgorithm[algo]) {
        byAlgorithm[algo] = { 
          totalMatches: 0, 
          count: 0, 
          accuracies: [],
          bestMatch: 0,
          worstMatch: 5,
          f1Scores: [],
          confidenceScores: [],
        };
      }
      byAlgorithm[algo].totalMatches += record.matches_count;
      byAlgorithm[algo].count++;
      byAlgorithm[algo].accuracies.push(record.accuracy_score * 100);
      byAlgorithm[algo].bestMatch = Math.max(byAlgorithm[algo].bestMatch, record.matches_count);
      byAlgorithm[algo].worstMatch = Math.min(byAlgorithm[algo].worstMatch, record.matches_count);
      if (record.f1_score) byAlgorithm[algo].f1Scores.push(record.f1_score);
      if (record.confidence_score) byAlgorithm[algo].confidenceScores.push(record.confidence_score);
    });

    return Object.entries(byAlgorithm).map(([algorithm, stats]) => {
      const avgAccuracy = stats.accuracies.reduce((a, b) => a + b, 0) / stats.accuracies.length;
      const variance = stats.accuracies.reduce((sum, acc) => sum + Math.pow(acc - avgAccuracy, 2), 0) / stats.accuracies.length;
      const stdDev = Math.sqrt(variance);
      const avgF1 = stats.f1Scores.length > 0 
        ? stats.f1Scores.reduce((a, b) => a + b, 0) / stats.f1Scores.length 
        : avgAccuracy / 100;
      const avgConfidence = stats.confidenceScores.length > 0
        ? stats.confidenceScores.reduce((a, b) => a + b, 0) / stats.confidenceScores.length
        : 0.5;

      return {
        algorithm,
        avgMatches: stats.totalMatches / stats.count,
        avgAccuracy,
        bestMatch: stats.bestMatch,
        worstMatch: stats.worstMatch,
        consistency: stdDev,
        totalTests: stats.count,
        sharpeRatio: stdDev > 0 ? (avgAccuracy - 20) / stdDev : 0,
        winRate: avgF1,
        avgConfidence,
      };
    }).sort((a, b) => b.avgAccuracy - a.avgAccuracy);
  }, [historicalPerformance]);

  // Get trend data for charts
  const trendData = useMemo(() => {
    if (!historicalPerformance?.length) return [];

    const sortedData = [...historicalPerformance].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Group by date and algorithm
    const grouped: Record<string, Record<string, number[]>> = {};
    sortedData.forEach((record) => {
      const date = record.created_at.split("T")[0];
      if (!grouped[date]) grouped[date] = {};
      if (!grouped[date][record.model_used]) grouped[date][record.model_used] = [];
      grouped[date][record.model_used].push(record.accuracy_score * 100);
    });

    return Object.entries(grouped).map(([date, algorithms]) => ({
      date,
      ...Object.fromEntries(
        Object.entries(algorithms).map(([algo, accuracies]) => [
          algo,
          accuracies.reduce((a, b) => a + b, 0) / accuracies.length,
        ])
      ),
    }));
  }, [historicalPerformance]);

  // Get match distribution data
  const getMatchDistribution = useCallback(() => {
    if (!lastResults?.evaluations) return null;
    
    return lastResults.evaluations.map(e => ({
      algorithm: e.algorithm,
      distribution: e.matchDistribution || {},
      totalTests: e.totalTests
    }));
  }, [lastResults]);

  return {
    runBacktest: runBacktest.mutate,
    isRunning: isRunning || runBacktest.isPending,
    lastResults,
    historicalPerformance,
    isLoadingHistory,
    aggregateStats,
    trendData,
    getMatchDistribution,
  };
};
