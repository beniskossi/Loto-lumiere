import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PredictionWithResult {
  prediction_id: string;
  prediction_date: string;
  predicted_numbers: number[];
  model_used: string;
  confidence_score: number | null;
  draw_name: string;
  draw_date: string | null;
  winning_numbers: number[] | null;
  matches: number;
  success_rate: number;
  is_compared: boolean; // Indique si la comparaison a déjà été faite
}

export const usePredictionComparison = (drawName?: string, limit = 20) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["prediction-comparison", drawName, limit],
    queryFn: async (): Promise<PredictionWithResult[]> => {
      // 1. Fetch already compared predictions from algorithm_performance
      let performanceQuery = supabase
        .from("algorithm_performance")
        .select("id, prediction_date, predicted_numbers, model_used, confidence_score, draw_name, draw_date, winning_numbers, matches_count")
        .order("prediction_date", { ascending: false })
        .limit(limit);

      if (drawName) {
        performanceQuery = performanceQuery.eq("draw_name", drawName);
      }

      const { data: performanceData, error: perfError } = await performanceQuery;
      if (perfError) throw perfError;

      // 2. Convert algorithm_performance to our format (these are already compared)
      const comparedPredictions: PredictionWithResult[] = (performanceData || []).map((perf) => ({
        prediction_id: perf.id,
        prediction_date: perf.prediction_date,
        predicted_numbers: perf.predicted_numbers,
        model_used: perf.model_used,
        confidence_score: perf.confidence_score,
        draw_name: perf.draw_name,
        draw_date: perf.draw_date,
        winning_numbers: perf.winning_numbers,
        matches: perf.matches_count,
        success_rate: (perf.matches_count / perf.predicted_numbers.length) * 100,
        is_compared: true,
      }));

      // 3. Fetch pending predictions (not yet compared)
      let predictionsQuery = supabase
        .from("predictions")
        .select("id, prediction_date, predicted_numbers, model_used, confidence_score, draw_name")
        .order("prediction_date", { ascending: false })
        .limit(limit);

      if (drawName) {
        predictionsQuery = predictionsQuery.eq("draw_name", drawName);
      }

      const { data: predictions, error: predError } = await predictionsQuery;
      if (predError) throw predError;

      if (!predictions || predictions.length === 0) {
        return comparedPredictions;
      }

      // 4. Find pending predictions (not in algorithm_performance)
      const comparedDates = new Set(
        comparedPredictions.map((p) => `${p.draw_name}-${p.prediction_date}-${p.model_used}`)
      );

      const pendingPredictions = predictions.filter(
        (pred) => !comparedDates.has(`${pred.draw_name}-${pred.prediction_date}-${pred.model_used}`)
      );

      // 5. For pending predictions, check if there's a result available
      if (pendingPredictions.length > 0) {
        const { data: drawResults, error: drawError } = await supabase
          .from("draw_results")
          .select("draw_name, draw_date, winning_numbers")
          .in("draw_name", pendingPredictions.map((p) => p.draw_name))
          .order("draw_date", { ascending: true });

        if (drawError) throw drawError;

        const pendingWithResults: PredictionWithResult[] = pendingPredictions.map((pred) => {
          // Find the FIRST draw result AFTER the prediction date for the same draw type
          const matchingResult = drawResults?.find(
            (result) =>
              result.draw_name === pred.draw_name &&
              new Date(result.draw_date) > new Date(pred.prediction_date)
          );

          let matches = 0;
          if (matchingResult) {
            matches = pred.predicted_numbers.filter((num: number) =>
              matchingResult.winning_numbers.includes(num)
            ).length;
          }

          const success_rate = matchingResult
            ? (matches / pred.predicted_numbers.length) * 100
            : 0;

          return {
            prediction_id: pred.id,
            prediction_date: pred.prediction_date,
            predicted_numbers: pred.predicted_numbers,
            model_used: pred.model_used,
            confidence_score: pred.confidence_score,
            draw_name: pred.draw_name,
            draw_date: matchingResult?.draw_date || null,
            winning_numbers: matchingResult?.winning_numbers || null,
            matches,
            success_rate,
            is_compared: false, // Ces prédictions sont en attente ou nouvellement comparées
          };
        });

        // Combine and sort by date
        return [...comparedPredictions, ...pendingWithResults]
          .sort((a, b) => new Date(b.prediction_date).getTime() - new Date(a.prediction_date).getTime())
          .slice(0, limit);
      }

      return comparedPredictions;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Clear local cache for memory management
  const clearCache = () => {
    queryClient.removeQueries({ queryKey: ["prediction-comparison"] });
    queryClient.removeQueries({ queryKey: ["algorithm-comparison"] });
    queryClient.removeQueries({ queryKey: ["algorithm-trends"] });
    toast.success("Cache des comparaisons vidé", {
      description: "Les données seront rechargées"
    });
  };

  // Refetch data
  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["prediction-comparison", drawName, limit] });
  };

  return {
    ...query,
    clearCache,
    refetch,
  };
};

// Hook pour supprimer les anciennes comparaisons de la base de données
export const useDeleteOldComparisons = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ drawName, olderThanDays = 30 }: { drawName?: string; olderThanDays?: number }) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      // Delete old predictions (only from predictions table, algorithm_performance is auto-maintained)
      let deleteQuery = supabase
        .from("predictions")
        .delete()
        .lt("prediction_date", cutoffDateStr);

      if (drawName && drawName !== "all") {
        deleteQuery = deleteQuery.eq("draw_name", drawName);
      }

      const { error, count } = await deleteQuery;
      
      if (error) {
        // Si erreur RLS, informer l'utilisateur
        if (error.code === "42501") {
          throw new Error("Vous n'avez pas les permissions pour supprimer les prédictions");
        }
        throw error;
      }

      return { deletedCount: count || 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["prediction-comparison"] });
      queryClient.invalidateQueries({ queryKey: ["predictions"] });
      toast.success(`${data.deletedCount} anciennes prédictions supprimées`, {
        description: "Les comparaisons ont été nettoyées"
      });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la suppression", {
        description: error.message
      });
    },
  });
};
