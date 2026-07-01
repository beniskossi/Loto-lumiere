import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AlgorithmPrediction {
  algorithm: string;
  numbers: number[];
  confidence: number;
  recentAccuracy: number;
  rank: number;
}

interface ConsensusResult {
  numbers: number[];
  confidence: number;
  agreementScore: number;
}

export const useMultiAlgorithmComparison = (drawName: string) => {
  return useQuery({
    queryKey: ["multi-algorithm-comparison", drawName],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("multi-algorithm-comparison", {
        body: { drawName },
      });

      if (error) throw error;
      return data as { topAlgorithms: AlgorithmPrediction[]; consensus: ConsensusResult };
    },
    staleTime: 3 * 60 * 1000,
    enabled: !!drawName,
  });
};
