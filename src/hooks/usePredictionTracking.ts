import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PredictionTracking {
  id: string;
  user_id: string;
  prediction_id: string;
  marked_at: string;
  notes: string | null;
}

export const useTrackedPredictions = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["tracked-predictions", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_prediction_tracking")
        .select(`
          *,
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

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

export const useTrackPrediction = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, predictionId, notes }: { 
      userId: string; 
      predictionId: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("user_prediction_tracking")
        .insert({ 
          user_id: userId, 
          prediction_id: predictionId,
          notes 
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracked-predictions"] });
      toast({
        title: "Prédiction sauvegardée",
        description: "Cette prédiction a été ajoutée à votre historique",
      });
    },
  });
};