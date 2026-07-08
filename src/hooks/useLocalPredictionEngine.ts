import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LocalPredictionEngine, ScoreBreakdown } from "@/lib/algorithms/predictionEngine";
import { DrawResult as LotteryDrawResult } from "@/types/lottery";

export interface LocalPredictionEngineParams {
  frequencyWeight: number;
  gapWeight: number;
  markovWeight: number;
  momentumWeight: number;
  decayRate: number;
  markovOrder: number;
  poissonLambda: number;
  historyLimit: number;
}

export const useLocalPredictionEngine = (drawName: string) => {
  const [params, setParams] = useState<LocalPredictionEngineParams>({
    frequencyWeight: 35,
    gapWeight: 25,
    markovWeight: 20,
    momentumWeight: 20,
    decayRate: 0.02,
    markovOrder: 1,
    poissonLambda: 1.0,
    historyLimit: 200,
  });

  // Fetch a robust history for accurate local calculations
  const { data: rawDraws, isLoading, error, refetch } = useQuery({
    queryKey: ["local-engine-draws", drawName, params.historyLimit],
    queryFn: async () => {
      let query = supabase
        .from("draw_results")
        .select("id, draw_name, draw_day, draw_time, draw_date, winning_numbers")
        .order("draw_date", { ascending: false })
        .limit(params.historyLimit);

      if (drawName && drawName !== "all") {
        query = query.eq("draw_name", drawName);
      }

      const { data, error: dbError } = await query;
      if (dbError) throw dbError;

      // Transform db response into the format our prediction engine expects
      return (data || []).map((draw) => ({
        id: draw.id,
        drawName: draw.draw_name,
        drawTime: draw.draw_time,
        drawDay: draw.draw_day,
        date: draw.draw_date,
        winningNumbers: draw.winning_numbers,
      })) as LotteryDrawResult[];
    },
    enabled: !!drawName,
  });

  // Run the LocalPredictionEngine on the retrieved data
  const predictionResult = useMemo(() => {
    if (!rawDraws || rawDraws.length === 0) {
      return null;
    }

    return LocalPredictionEngine.calculatePredictions(rawDraws, {
      frequencyWeight: params.frequencyWeight,
      gapWeight: params.gapWeight,
      markovWeight: params.markovWeight,
      momentumWeight: params.momentumWeight,
      decayRate: params.decayRate,
      markovOrder: params.markovOrder,
      poissonLambda: params.poissonLambda,
      targetCount: 5,
    });
  }, [rawDraws, params]);

  const updateParam = <K extends keyof LocalPredictionEngineParams>(
    key: K,
    value: LocalPredictionEngineParams[K]
  ) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return {
    params,
    updateParam,
    isLoading,
    error,
    refetchData: refetch,
    recommendations: predictionResult?.recommendations || [],
    scores: predictionResult?.scores || [],
    insights: predictionResult?.insights || [],
    hyperparameters: predictionResult?.hyperparameters || {},
    hasData: !!rawDraws && rawDraws.length > 0,
    drawCount: rawDraws?.length || 0,
  };
};
