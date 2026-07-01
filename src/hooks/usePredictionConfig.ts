import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface OptimalGapConfig {
  min: number;
  max: number;
  boost: number;
}

export interface GapThresholdConfig {
  zscore: number;
}

export interface WeightsConfig {
  frequency: number;
  gap: number;
  echo: number;
  pairs: number;
  equilibrium: number;
  temporal: number;
  momentum: number;
  spatial: number;
}

export interface PredictionConfigItem {
  id: string;
  config_key: string;
  config_value: Json;
  description: string | null;
  updated_at: string;
}

export const usePredictionConfig = () => {
  return useQuery({
    queryKey: ["prediction-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prediction_config")
        .select("id, config_key, config_value, description, updated_at")
        .order("config_key");

      if (error) throw error;
      
      return data as PredictionConfigItem[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useOptimalGapConfig = () => {
  const { data: configs, isLoading } = usePredictionConfig();
  
  const optimalGap = configs?.find(c => c.config_key === "optimal_gap");
  
  return {
    config: optimalGap?.config_value as unknown as OptimalGapConfig | undefined,
    isLoading,
  };
};

export const useUpdatePredictionConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      configKey,
      configValue,
    }: {
      configKey: string;
      configValue: OptimalGapConfig | GapThresholdConfig | WeightsConfig;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("prediction_config")
        .update({
          config_value: configValue as unknown as Json,
          updated_by: user?.id,
        })
        .eq("config_key", configKey);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prediction-config"] });
      toast.success("Configuration mise à jour");
    },
    onError: (error) => {
      console.error("Error updating config:", error);
      toast.error("Erreur lors de la mise à jour de la configuration");
    },
  });
};
