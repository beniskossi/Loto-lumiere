import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OrchestrationHistory {
  id: string;
  draw_name: string;
  draw_date: string;
  adjustment_date: string;
  trigger_metrics: {
    total_algorithms?: number;
    adjustments_made?: number;
    avg_accuracy_overall?: number;
  };
  algorithms_analyzed: Array<{
    name: string;
    avg_accuracy: number;
    recent_accuracy: number;
    trend: number;
    consistency: number;
  }>;
  weight_adjustments: Record<string, { previous: number; new: number }>;
  parameter_adjustments: Record<string, unknown>;
  expected_improvement: number | null;
  adjustment_strategy: string;
  notes: string | null;
  created_at: string;
}

export const useOrchestrationHistory = (drawName?: string, limit: number = 20) => {
  return useQuery({
    queryKey: ["orchestration-history", drawName, limit],
    queryFn: async () => {
      let query = supabase
        .from("orchestration_history")
        .select("id, draw_name, draw_date, adjustment_date, trigger_metrics, algorithms_analyzed, weight_adjustments, parameter_adjustments, expected_improvement, adjustment_strategy, notes, created_at")
        .order("adjustment_date", { ascending: false })
        .limit(limit);

      if (drawName) {
        query = query.eq("draw_name", drawName);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as OrchestrationHistory[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useTriggerAdaptiveOrchestration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      drawName, 
      forceAdjustment = false 
    }: { 
      drawName: string; 
      forceAdjustment?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke("adaptive-orchestration", {
        body: { drawName, forceAdjustment },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orchestration-history"] });
      queryClient.invalidateQueries({ queryKey: ["algorithm-configs"] });
      queryClient.invalidateQueries({ queryKey: ["algorithm-rankings"] });
      
      toast.success(
        `Orchestration adaptée : ${data.applied} ajustements appliqués`,
        {
          description: data.message,
        }
      );
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de l'orchestration adaptative", {
        description: error.message,
      });
    },
  });
};