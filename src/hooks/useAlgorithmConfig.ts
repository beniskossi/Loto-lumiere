import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AlgorithmConfig {
  id: string;
  algorithm_name: string;
  is_enabled: boolean;
  weight: number;
  description: string | null;
  parameters: any;
  created_at: string;
  updated_at: string;
}

export const useAlgorithmConfigs = () => {
  return useQuery({
    queryKey: ["algorithm-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("algorithm_config")
        .select("id, algorithm_name, is_enabled, weight, description, parameters, created_at, updated_at")
        .order("weight", { ascending: false });

      if (error) throw error;
      return data as AlgorithmConfig[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateAlgorithmConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<Omit<AlgorithmConfig, "id" | "created_at" | "updated_at">>
    }) => {
      const { data, error } = await supabase
        .from("algorithm_config")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Configuration mise à jour");
      queryClient.invalidateQueries({ queryKey: ["algorithm-configs"] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
};