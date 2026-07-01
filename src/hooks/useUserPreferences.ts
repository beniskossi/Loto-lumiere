import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserPreferences {
  id: string;
  user_id: string;
  has_completed_onboarding: boolean;
  preferred_draw_name: string | null;
  notification_enabled: boolean;
  notification_time?: string;
  preferred_algorithm: string;
  theme_primary_color: string;
  theme_accent_color: string;
  custom_layout: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const useUserPreferences = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-preferences", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("user_preferences")
        .select("id, user_id, has_completed_onboarding, preferred_draw_name, notification_enabled, notification_time, preferred_algorithm, theme_primary_color, theme_accent_color, custom_layout, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data as UserPreferences | null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdatePreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, preferences }: { 
      userId: string; 
      preferences: Partial<Omit<UserPreferences, "id" | "user_id" | "created_at" | "updated_at">>
    }) => {
      // Try to update first
      const { data: existingData } = await supabase
        .from("user_preferences")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingData) {
        const { data, error } = await supabase
          .from("user_preferences")
          .update(preferences)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert if doesn't exist
        const { data, error } = await supabase
          .from("user_preferences")
          .insert({ user_id: userId, ...preferences })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences", variables.userId] });
    },
  });
};