import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AlgorithmPerformanceData {
  model_used: string;
  draw_name: string;
  total_predictions: number;
  avg_accuracy: number;
  avg_matches: number;
  best_accuracy: number;
  worst_accuracy: number;
  perfect_predictions: number;
  excellent_predictions: number;
  good_predictions: number;
  consistency_score: number;
  recent_trend: "improving" | "stable" | "declining";
  trend_value: number;
  last_prediction_date: string;
}

export interface AlgorithmTrend {
  date: string;
  model_used: string;
  accuracy_score: number;
  matches_count: number;
}

export const useAlgorithmComparison = (drawName?: string) => {
  return useQuery({
    queryKey: ["algorithm-comparison", drawName],
    queryFn: async (): Promise<AlgorithmPerformanceData[]> => {
      // Requête pour obtenir les performances par algorithme et tirage
      let query = supabase
        .from("algorithm_performance")
        .select("model_used, draw_name, accuracy_score, matches_count, prediction_date")
        .order("prediction_date", { ascending: false });

      if (drawName && drawName !== "all") {
        query = query.eq("draw_name", drawName);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      type PerfRow = NonNullable<typeof data>[number];

      interface GroupType {
        model_used: string;
        draw_name: string;
        predictions: PerfRow[];
      }

      // Grouper par model_used et draw_name
      const grouped = data.reduce((acc, perf) => {
        const key = `${perf.model_used}-${perf.draw_name}`;
        if (!acc[key]) {
          acc[key] = {
            model_used: perf.model_used,
            draw_name: perf.draw_name,
            predictions: [],
          };
        }
        acc[key].predictions.push(perf);
        return acc;
      }, {} as Record<string, GroupType>);

      // Calculer les métriques pour chaque groupe
      const results: AlgorithmPerformanceData[] = Object.values(grouped).map((group) => {
        const predictions = group.predictions;
        const total = predictions.length;
        
        const accuracies = predictions.map((p) => Number(p.accuracy_score));
        const matches = predictions.map((p) => Number(p.matches_count));
        
        const avgAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / total;
        const avgMatches = matches.reduce((sum, m) => sum + m, 0) / total;
        
        const bestAccuracy = Math.max(...accuracies);
        const worstAccuracy = Math.min(...accuracies);
        
        // Compter les excellentes prédictions (4-5 numéros corrects)
        const perfectPredictions = predictions.filter((p) => p.matches_count === 5).length;
        const excellentPredictions = predictions.filter((p) => p.matches_count === 4).length;
        const goodPredictions = predictions.filter((p) => p.matches_count === 3).length;
        
        // Calculer le score de consistance (écart-type inversé)
        const mean = avgAccuracy;
        const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - mean, 2), 0) / total;
        const stdDev = Math.sqrt(variance);
        const consistencyScore = Math.max(0, 100 - stdDev);
        
        // Analyser la tendance (comparer les 30% plus récents vs 30% plus anciens)
        const recentCount = Math.max(1, Math.floor(total * 0.3));
        const recentPredictions = predictions.slice(0, recentCount);
        const oldPredictions = predictions.slice(-recentCount);
        
        const recentAvg = recentPredictions.reduce((sum: number, p) => sum + Number(p.accuracy_score), 0) / recentCount;
        const oldAvg = oldPredictions.reduce((sum: number, p) => sum + Number(p.accuracy_score), 0) / recentCount;
        
        const trendValue = recentAvg - oldAvg;
        let recent_trend: "improving" | "stable" | "declining";
        if (trendValue > 5) recent_trend = "improving";
        else if (trendValue < -5) recent_trend = "declining";
        else recent_trend = "stable";
        
        // Date de la dernière prédiction
        const lastPredictionDate = predictions[0].prediction_date;
        
        return {
          model_used: group.model_used,
          draw_name: group.draw_name,
          total_predictions: total,
          avg_accuracy: Number(avgAccuracy.toFixed(2)),
          avg_matches: Number(avgMatches.toFixed(2)),
          best_accuracy: Number(bestAccuracy.toFixed(2)),
          worst_accuracy: Number(worstAccuracy.toFixed(2)),
          perfect_predictions: perfectPredictions,
          excellent_predictions: excellentPredictions,
          good_predictions: goodPredictions,
          consistency_score: Number(consistencyScore.toFixed(2)),
          recent_trend,
          trend_value: Number(trendValue.toFixed(2)),
          last_prediction_date: lastPredictionDate,
        };
      });

      // Trier par accuracy moyenne décroissante
      return results.sort((a, b) => b.avg_accuracy - a.avg_accuracy);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAlgorithmTrends = (drawName?: string, limit = 50) => {
  return useQuery({
    queryKey: ["algorithm-trends", drawName, limit],
    queryFn: async (): Promise<AlgorithmTrend[]> => {
      let query = supabase
        .from("algorithm_performance")
        .select("prediction_date, model_used, accuracy_score, matches_count")
        .order("prediction_date", { ascending: true });

      if (drawName && drawName !== "all") {
        query = query.eq("draw_name", drawName);
      }

      const { data, error } = await query.limit(limit);

      if (error) throw error;
      if (!data) return [];

      return data.map((item) => ({
        date: item.prediction_date,
        model_used: item.model_used,
        accuracy_score: Number(item.accuracy_score),
        matches_count: Number(item.matches_count),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
};
