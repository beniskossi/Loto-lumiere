// Hook pour les prédictions améliorées avec les 5 formules algorithmiques
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateAndCleanPredictions } from "@/utils/predictionValidation";

export interface EnhancedScoreBreakdown {
  frequency: number;
  pairs: number;
  gap: number;
  equilibrium: number;
  echo: number;
  // Formules avancées F6-F8
  temporalResonance?: number;
  numericalMomentum?: number;
  spatialClustering?: number;
  composite: number;
}

export interface PairScore {
  numbers: [number, number];
  score: number;
  count: number;
  lastGap: number;
}

export interface EnhancedPrediction {
  numbers: number[];
  confidence: number;
  algorithm: string;
  factors: string[];
  score: number;
  category: string;
  breakdown: EnhancedScoreBreakdown;
  narratives: string[];
  topPairs: PairScore[];
}

export interface EnhancedPredictionResponse {
  predictions: Array<{
    numbers: number[];
    confidence: number;
    algorithm: string;
    factors: string[];
    score: number;
    category: string;
  }>;
  optimizedPrediction: EnhancedPrediction;
  enhancedPrediction?: EnhancedPrediction;
  selectedAlgorithm: string;
  algorithmReason: string;
  dataMetrics: {
    quality: number;
    freshness: number;
    historicalCount: number;
  };
  executionTime: number;
  formulasBreakdown?: EnhancedScoreBreakdown;
}

const STALE_TIME = 2 * 60 * 1000; // 2 minutes - predictions refresh more frequently
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

export const useEnhancedPrediction = (drawName: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["enhanced-predictions", drawName],
    queryFn: async (): Promise<EnhancedPredictionResponse> => {
      try {
        const { data, error } = await supabase.functions.invoke("advanced-ai-prediction-v2", {
          body: { 
            drawName,
          },
        });

        if (error) {
          if (error.message?.includes("WORKER_LIMIT")) {
            toast.error("Serveur temporairement saturé", {
              description: "Veuillez réessayer dans quelques instants"
            });
            throw new Error("WORKER_LIMIT");
          }
          throw error;
        }

        // Valider et nettoyer les données
        if (data && data.predictions) {
          data.predictions = validateAndCleanPredictions<any>(data.predictions);
        }

        return data;
      } catch (error) {
        console.error("Error in useEnhancedPrediction:", error);
        
        if (error instanceof Error && error.message === "WORKER_LIMIT") {
          throw error;
        }
        
        toast.error("Erreur lors du chargement des prédictions améliorées");
        throw error;
      }
    },
    enabled: !!drawName && enabled,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === "WORKER_LIMIT") {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: true, // Refresh when user returns to window
    refetchOnMount: 'always', // Always fetch fresh data on mount
  });
};

// Hook pour récupérer uniquement le breakdown des formules
export const useFormulasBreakdown = (drawName: string) => {
  const { data, isLoading, error } = useEnhancedPrediction(drawName);
  
  return {
    breakdown: data?.formulasBreakdown,
    narratives: data?.enhancedPrediction?.narratives || [],
    topPairs: data?.enhancedPrediction?.topPairs || [],
    isLoading,
    error,
  };
};
