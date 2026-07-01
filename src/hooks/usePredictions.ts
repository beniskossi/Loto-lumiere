import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Prediction {
  id: string;
  draw_name: string;
  prediction_date: string;
  predicted_numbers: number[];
  confidence_score: number | null;
  model_used: string;
  model_metadata: Record<string, unknown>;
  created_at: string;
}

export const usePredictions = (drawName: string, limit = 5) => {
  return useQuery({
    queryKey: ["predictions", drawName, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("id, draw_name, prediction_date, predicted_numbers, confidence_score, model_used, model_metadata, created_at")
        .eq("draw_name", drawName)
        .order("prediction_date", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Prediction[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useLatestPrediction = (drawName: string) => {
  return useQuery({
    queryKey: ["latest-prediction", drawName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("id, draw_name, prediction_date, predicted_numbers, confidence_score, model_used, model_metadata, created_at")
        .eq("draw_name", drawName)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Prediction | null;
    },
    staleTime: 5 * 60 * 1000,
  });
};
