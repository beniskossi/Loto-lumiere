import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeedbackData {
  prediction_id: string;
  rating: number;
  matches: number;
  comments?: string;
}

// Note: user_prediction_feedback table doesn't exist
// Returns empty data to prevent errors
export const usePredictionFeedback = (userId?: string) => {
  return useQuery({
    queryKey: ["prediction-feedback", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_prediction_feedback")
        .select("id, prediction_id, rating, matches, comments, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSubmitFeedback = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (feedback: FeedbackData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("user_prediction_feedback")
        .insert({
          user_id: user.id,
          prediction_id: feedback.prediction_id,
          rating: feedback.rating,
          matches: feedback.matches,
          comments: feedback.comments,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prediction-feedback"] });
      toast({
        title: "✓ Feedback enregistré",
        description: "Merci pour votre retour !",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le feedback",
        variant: "destructive",
      });
    },
  });
};

export const useAlgorithmFeedbackStats = (algorithm: string) => {
  return useQuery({
    queryKey: ["algorithm-feedback-stats", algorithm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_prediction_feedback")
        .select("rating, matches")
        .not("rating", "is", null);

      if (error || !data || data.length === 0) {
        return {
          avgRating: 0,
          avgMatches: 0,
          totalFeedbacks: 0,
          adjustedConfidence: 50,
        };
      }

      const totalFeedbacks = data.length;
      const avgRating = data.reduce((sum, f) => sum + (f.rating || 0), 0) / totalFeedbacks;
      const avgMatches = data.reduce((sum, f) => sum + (f.matches || 0), 0) / totalFeedbacks;
      const adjustedConfidence = Math.min(95, 50 + avgRating * 5 + avgMatches * 3);

      return { avgRating, avgMatches, totalFeedbacks, adjustedConfidence };
    },
    staleTime: 5 * 60 * 1000,
  });
};
