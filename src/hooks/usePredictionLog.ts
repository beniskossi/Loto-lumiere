import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LoggedPrediction {
  id: string; // tracking id
  prediction_id: string;
  prediction_date: string;
  draw_name: string;
  predicted_numbers: number[];
  confidence_score: number | null;
  model_used: string;
  notes: string | null;
  draw_date: string | null;
  winning_numbers: number[] | null;
  matches: number;
  success_rate: number;
}

export const usePredictionLog = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["prediction-log", userId],
    queryFn: async (): Promise<LoggedPrediction[]> => {
      if (!userId) return [];
      
      // Fetch user's tracked predictions
      const { data: trackingData, error: trackingError } = await supabase
        .from("user_prediction_tracking")
        .select(`
          id,
          prediction_id,
          marked_at,
          notes,
          predictions (
            id,
            draw_name,
            prediction_date,
            predicted_numbers,
            confidence_score,
            model_used
          )
        `)
        .eq("user_id", userId)
        .order("marked_at", { ascending: false });

      if (trackingError) throw trackingError;

      const predictions = (trackingData || []).map((t: any) => ({
        ...t.predictions,
        tracking_id: t.id,
        notes: t.notes,
      })).filter((p: any) => p && p.id);

      if (predictions.length === 0) return [];

      // Fetch possible draw results to match
      const drawNames = Array.from(new Set(predictions.map((p) => p.draw_name)));
      const { data: drawResults, error: drawError } = await supabase
        .from("draw_results")
        .select("draw_name, draw_date, winning_numbers")
        .in("draw_name", drawNames)
        .order("draw_date", { ascending: true });

      if (drawError) throw drawError;

      // Match each prediction with the next result
      return predictions.map((pred: any) => {
        // Find the FIRST draw result AFTER or ON the prediction date
        // Note: comparing dates as strings or timestamps
        const predDate = new Date(pred.prediction_date);
        
        const MS_PER_DAY = 86400000; // Constante dérivée de la rotation terrestre standard (24h)
        
        // Find the first draw result that happened AFTER the prediction was made
        // or on the same day if the prediction was made early
        const matchingResult = drawResults?.find((result) => {
          if (result.draw_name !== pred.draw_name) return false;
          const resultDate = new Date(result.draw_date);
          return resultDate.getTime() >= predDate.getTime() - MS_PER_DAY; 
        });

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
          id: pred.tracking_id,
          prediction_id: pred.id,
          prediction_date: pred.prediction_date,
          draw_name: pred.draw_name,
          predicted_numbers: pred.predicted_numbers,
          confidence_score: pred.confidence_score,
          model_used: pred.model_used,
          notes: pred.notes,
          draw_date: matchingResult?.draw_date || null,
          winning_numbers: matchingResult?.winning_numbers || null,
          matches,
          success_rate,
        };
      });
    },
    enabled: !!userId,
  });
};
