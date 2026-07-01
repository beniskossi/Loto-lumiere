import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EnsemblePerformanceData {
  stackingMetrics: PerformanceMetrics | null;
  smartMetrics: PerformanceMetrics | null;
  allAlgorithmsAvg: PerformanceMetrics | null;
}

export interface PerformanceMetrics {
  totalPredictions: number;
  avgAccuracy: number;
  avgMatches: number;
  bestMatch: number;
  accuracyStddev: number | null;
  recentTrend: "up" | "down" | "stable";
}

export const useEnsemblePerformance = () => {
  return useQuery({
    queryKey: ["ensemble-performance"],
    queryFn: async (): Promise<EnsemblePerformanceData> => {
      // Récupérer les performances par modèle
      const { data: performanceData, error } = await supabase
        .from("algorithm_performance")
        .select("model_used, accuracy_score, matches_count, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error("Error fetching ensemble performance:", error);
        throw error;
      }

      if (!performanceData || performanceData.length === 0) {
        return {
          stackingMetrics: null,
          smartMetrics: null,
          allAlgorithmsAvg: null,
        };
      }

      // Grouper par type d'ensemble
      const stackingData = performanceData.filter(
        (p) =>
          p.model_used?.toLowerCase().includes("stacking") ||
          p.model_used?.toLowerCase().includes("hybrid") ||
          p.model_used?.toLowerCase().includes("ensemble")
      );

      const smartData = performanceData.filter(
        (p) =>
          p.model_used?.toLowerCase().includes("smart") ||
          p.model_used?.toLowerCase().includes("adaptive")
      );

      // Calculer les métriques
      const calculateMetrics = (data: typeof performanceData): PerformanceMetrics | null => {
        if (data.length === 0) return null;

        const avgAccuracy = data.reduce((sum, p) => sum + (p.accuracy_score || 0), 0) / data.length;
        const avgMatches = data.reduce((sum, p) => sum + (p.matches_count || 0), 0) / data.length;
        const bestMatch = Math.max(...data.map((p) => p.matches_count || 0));

        // Calcul de l'écart-type
        const variance =
          data.reduce((sum, p) => sum + Math.pow((p.accuracy_score || 0) - avgAccuracy, 2), 0) /
          data.length;
        const stddev = Math.sqrt(variance);

        // Tendance récente (comparer les 10 derniers vs les 10 précédents)
        const recent = data.slice(0, 10);
        const previous = data.slice(10, 20);
        let trend: "up" | "down" | "stable" = "stable";

        if (recent.length > 0 && previous.length > 0) {
          const recentAvg = recent.reduce((sum, p) => sum + (p.accuracy_score || 0), 0) / recent.length;
          const previousAvg = previous.reduce((sum, p) => sum + (p.accuracy_score || 0), 0) / previous.length;
          
          if (recentAvg > previousAvg * 1.05) trend = "up";
          else if (recentAvg < previousAvg * 0.95) trend = "down";
        }

        return {
          totalPredictions: data.length,
          avgAccuracy: Math.round(avgAccuracy * 100) / 100,
          avgMatches: Math.round(avgMatches * 100) / 100,
          bestMatch,
          accuracyStddev: Math.round(stddev * 100) / 100,
          recentTrend: trend,
        };
      };

      // Métriques globales pour tous les algorithmes
      const allAlgorithmsAvg = calculateMetrics(performanceData);

      return {
        stackingMetrics: calculateMetrics(stackingData),
        smartMetrics: calculateMetrics(smartData),
        allAlgorithmsAvg,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
};
