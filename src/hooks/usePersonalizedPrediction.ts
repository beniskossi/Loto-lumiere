import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const usePersonalizedPrediction = (drawName: string, userId?: string) => {
  return useQuery({
    queryKey: ["personalized-prediction", drawName, userId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("personalized-prediction", {
        body: { drawName, userId },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!drawName,
    staleTime: 5 * 60 * 1000,
  });
};
