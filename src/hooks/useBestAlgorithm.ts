import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AlgorithmRecommendation {
  algorithm: string;
  score: number;
  weight: number;
  metrics: {
    avgAccuracy: number;
    totalPredictions: number;
    bestMatch: number;
    excellentPredictions: number;
  };
  config: {
    parameters: Record<string, unknown>;
    enabled: boolean;
  } | null;
}

export interface BestAlgorithmResponse {
  success: boolean;
  drawName: string;
  recommendation: {
    primary: AlgorithmRecommendation;
    alternatives: AlgorithmRecommendation[];
  };
  usingGlobalData: boolean;
  totalAlgorithmsAnalyzed: number;
  timestamp: string;
}

export const useBestAlgorithm = (drawName: string) => {
  return useQuery({
    queryKey: ["best-algorithm", drawName],
    queryFn: async (): Promise<BestAlgorithmResponse> => {
      const { data, error } = await supabase.functions.invoke("select-best-algorithm", {
        body: { drawName },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!drawName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
