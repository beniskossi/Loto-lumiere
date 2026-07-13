// useAdvancedPrediction.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdvancedPrediction {
  numbers: number[];
  confidence: number;
  algorithm: string;
  factors: string[];
  score: number;
  category: string;
}

export interface AdvancedPredictionResponse {
  predictions: AdvancedPrediction[];
  optimizedPrediction?: AdvancedPrediction;
  selectedAlgorithm?: string;
  algorithmReason?: string;
  explanations?: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendation: string;
  };
  algorithmInfo?: {
    name: string;
    description: string;
    strengths: string[];
    optimalRange: string;
  };
  dataMetrics?: {
    quality: number;
    freshness: number;
    historicalCount: number;
  };
  executionTime?: number;
  warning?: string;
  isPrecalculated?: boolean;
}

// Longer stale time — predictions don't change every second
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const CACHE_TIME = 15 * 60 * 1000; // 15 minutes

export interface AdvancedPredictionOptions {
  useSmartEnsemble?: boolean;
  useAIOrchestration?: boolean;
}

export const useAdvancedPrediction = (drawName: string, options: AdvancedPredictionOptions = {}) => {
  const { useSmartEnsemble = false, useAIOrchestration = false } = options;
  
  return useQuery({
    queryKey: ["advanced-predictions", drawName, useSmartEnsemble, useAIOrchestration],
    queryFn: async (): Promise<AdvancedPredictionResponse> => {
      try {
        const { data, error } = await supabase.functions.invoke("advanced-ai-prediction-v2", {
          body: { 
            drawName,
            useSmartEnsemble,
            useAIOrchestration
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

        // Validate and clean data
        if (data && data.predictions) {
          data.predictions = data.predictions.map((pred: AdvancedPrediction) => ({
            ...pred,
            numbers: pred.numbers
              .filter((n: number) => typeof n === 'number' && n >= 1 && n <= 90)
              .sort((a: number, b: number) => a - b)
          }));
        }

        return data;
      } catch (error) {
        console.error("Error in useAdvancedPrediction:", error);
        
        if (error instanceof Error && error.message === "WORKER_LIMIT") {
          throw error;
        }
        
        toast.error("Erreur lors du chargement des prédictions", {
          description: "Une erreur est survenue lors de la génération des prédictions"
        });
        throw error;
      }
    },
    enabled: !!drawName,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === "WORKER_LIMIT") {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false, // Don't refetch on every window focus — wastes API calls
    refetchOnMount: false, // Use cached data if still fresh
  });
};
