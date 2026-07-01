import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UserPreference {
  number: number;
  weight: number;
  successRate: number;
}

interface PersonalModel {
  userId: string;
  preferences: UserPreference[];
  adaptedNumbers: number[];
  confidence: number;
  learningScore: number;
}

export const usePersonalLearning = (userId?: string) => {
  const queryClient = useQueryClient();

  const { data: model } = useQuery({
    queryKey: ["personal-learning", userId],
    queryFn: async (): Promise<PersonalModel | null> => {
      if (!userId) return null;

      // Use correct table name: user_favorites
      const { data: favorites } = await supabase
        .from("user_favorites")
        .select("favorite_numbers")
        .eq("user_id", userId);

      if (!favorites || favorites.length === 0) {
        return {
          userId,
          preferences: [],
          adaptedNumbers: [],
          confidence: 50,
          learningScore: 0
        };
      }

      const numberStats: Record<number, { used: number; hits: number }> = {};

      favorites.forEach(fav => {
        fav.favorite_numbers.forEach((num: number) => {
          if (!numberStats[num]) numberStats[num] = { used: 0, hits: 0 };
          numberStats[num].used++;
        });
      });

      const preferences: UserPreference[] = Object.entries(numberStats)
        .map(([num, stats]) => ({
          number: parseInt(num),
          weight: stats.used,
          successRate: stats.used > 0 ? 50 : 0
        }))
        .sort((a, b) => b.successRate - a.successRate);

      const topNumbers = preferences
        .filter(p => p.successRate > 20)
        .slice(0, 10)
        .map(p => p.number);

      const learningScore = preferences.length > 0
        ? preferences.reduce((sum, p) => sum + p.successRate, 0) / preferences.length
        : 0;

      return {
        userId,
        preferences,
        adaptedNumbers: topNumbers,
        confidence: Math.min(90, 50 + learningScore * 0.5),
        learningScore
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const updateLearning = useMutation({
    mutationFn: async ({ numbers, result }: { numbers: number[]; result: number[] }) => {
      if (!userId) throw new Error("User not authenticated");
      
      // Sauvegarder comme favori pour apprentissage futur
      const { error } = await supabase
        .from("user_favorites")
        .insert({
          user_id: userId,
          draw_name: "learning",
          favorite_numbers: numbers,
          notes: `Résultat: ${result.join(", ")}`
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-learning", userId] });
    }
  });

  return { model, updateLearning };
};
