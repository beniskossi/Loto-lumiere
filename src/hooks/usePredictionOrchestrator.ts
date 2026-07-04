import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEnhancedPrediction } from "./useEnhancedPrediction";
import { ALGORITHMS, getAlgorithm } from "@/lib/algorithms/registry";

export const usePredictionOrchestrator = (drawName: string, options: { useSmartEnsemble?: boolean } = {}) => {
  // Use useEnhancedPrediction as the single source of truth for edge function
  const { data, isLoading, error, refetch } = useEnhancedPrediction(drawName, true);

  // Fetch precalculated predictions info for intelligent selection
  const { data: precalculatedData } = useQuery({
    queryKey: ["precalculated-predictions-meta", drawName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("precalculated_predictions")
        .select("selected_algorithm")
        .eq("draw_name", drawName)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching precalculated predictions:", error);
      }
      
      return data || null;
    },
    enabled: !!drawName,
    staleTime: 5 * 60 * 1000,
  });

  // Intelligent Algorithm Selection:
  // 1. Edge function returned an algorithm
  // 2. Or we fall back to precalculated_predictions
  // 3. Or default to FrequencyPro
  const rawSelectedAlgorithm = data?.selectedAlgorithm || precalculatedData?.selected_algorithm || "FrequencyPro";
  
  // Standardize the algorithm name
  const selectedAlgorithmInfo = getAlgorithm(rawSelectedAlgorithm as any);
  const selectedAlgorithm = selectedAlgorithmInfo?.name || "FrequencyPro";

  const predictions = data?.predictions || [];
  
  // Construct explanations if not provided by backend
  const explanations = (data as any)?.explanations || {
    summary: `Prédictions basées sur ${selectedAlgorithmInfo?.displayName || selectedAlgorithm}`,
    strengths: selectedAlgorithmInfo?.description ? [selectedAlgorithmInfo.description] : [],
    weaknesses: [],
    recommendation: "Utilisez ces prédictions comme guide d'aide à la décision.",
  };

  const formulasBreakdown = data?.formulasBreakdown || data?.enhancedPrediction?.breakdown;
  const narratives = data?.enhancedPrediction?.narratives || [];
  const topPairs = data?.enhancedPrediction?.topPairs || [];

  return {
    predictions,
    selectedAlgorithm,
    selectedAlgorithmInfo,
    algorithmReason: data?.algorithmReason || "Sélection par l'orchestrateur",
    explanations,
    formulasBreakdown,
    narratives,
    topPairs,
    dataMetrics: data?.dataMetrics,
    executionTime: data?.executionTime,
    isLoading,
    error,
    refetch,
    precalculatedMeta: precalculatedData,
  };
};

