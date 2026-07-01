import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DrawPrediction {
  drawName: string;
  drawTime: string;
  numbers: number[];
  confidence: number;
  strategy: string;
}

interface MultiDrawStrategy {
  predictions: DrawPrediction[];
  totalBudget: number;
  expectedReturn: number;
  riskLevel: "low" | "medium" | "high";
  recommendation: string;
}

export const useMultiDrawPrediction = (drawNames: string[]) => {
  return useQuery({
    queryKey: ["multi-draw-prediction", drawNames],
    queryFn: async (): Promise<MultiDrawStrategy> => {
      const { data, error } = await supabase.functions.invoke("multi-draw-prediction", {
        body: { drawNames },
      });

      if (error) throw error;
      return data as MultiDrawStrategy;
    },
    enabled: drawNames.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};
