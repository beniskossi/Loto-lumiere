import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DrawResult {
  id: string;
  draw_name: string;
  draw_day: string;
  draw_time: string;
  draw_date: string;
  winning_numbers: number[];
  machine_numbers: number[] | null;
  created_at: string;
}

export interface PaginatedResults {
  data: DrawResult[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const useDrawResults = (drawName?: string, limit = 10) => {
  return useQuery({
    queryKey: ["draw-results", drawName, limit],
    queryFn: async () => {
      let query = supabase
        .from("draw_results")
        .select("id, draw_name, draw_day, draw_time, draw_date, winning_numbers, machine_numbers, created_at")
        .order("draw_date", { ascending: false })
        .limit(limit);

      if (drawName) {
        query = query.eq("draw_name", drawName);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DrawResult[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useDrawResultsPaginated = (
  drawName?: string,
  page = 1,
  pageSize = 20
) => {
  return useQuery({
    queryKey: ["draw-results-paginated", drawName, page, pageSize],
    queryFn: async (): Promise<PaginatedResults> => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("draw_results")
        .select("id, draw_name, draw_day, draw_time, draw_date, winning_numbers, machine_numbers, created_at", { count: "exact" })
        .order("draw_date", { ascending: false })
        .range(from, to);

      if (drawName) {
        query = query.eq("draw_name", drawName);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data as DrawResult[],
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useRefreshResults = () => {
  return async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error("Authentication required");
    }

    const { data, error } = await supabase.functions.invoke("scrape-results", {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });
    
    if (error) {
      toast.error("Erreur lors de l'actualisation des résultats");
      throw error;
    }
    
    return data;
  };
};
