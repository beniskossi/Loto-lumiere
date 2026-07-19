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

export const useCreateAndTrackPrediction = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      userId,
      drawName,
      predictedNumbers,
      confidenceScore,
      modelUsed,
      notes,
    }: {
      userId: string;
      drawName: string;
      predictedNumbers: number[];
      confidenceScore: number;
      modelUsed: string;
      notes?: string;
    }) => {
      // 1. Insert into predictions
      const { data: predData, error: predError } = await supabase
        .from("predictions")
        .insert({
          draw_name: drawName,
          prediction_date: new Date().toISOString(),
          predicted_numbers: predictedNumbers,
          confidence_score: confidenceScore,
          model_used: modelUsed,
        })
        .select()
        .single();

      if (predError) throw predError;

      // 2. Insert into user_prediction_tracking
      const { data: trackData, error: trackError } = await supabase
        .from("user_prediction_tracking")
        .insert({
          user_id: userId,
          prediction_id: predData.id,
          notes: notes || null,
        })
        .select()
        .single();

      if (trackError) throw trackError;
      return trackData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracked-predictions"] });
      queryClient.invalidateQueries({ queryKey: ["prediction-log"] });
      toast({
        title: "✓ Enregistré sur le serveur",
        description: "La grille a été ajoutée à votre historique personnel.",
      });
    },
    onError: (error) => {
      console.error("Error saving prediction:", error);
      toast({
        title: "Erreur d'enregistrement",
        description: "Impossible de sauvegarder la grille sur le serveur.",
        variant: "destructive",
      });
    },
  });
};
