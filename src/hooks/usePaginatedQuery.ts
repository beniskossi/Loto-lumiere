import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  ascending?: boolean;
}

export const usePaginatedQuery = <T>(
  table: string,
  queryKey: string[],
  options: PaginationOptions = {},
  filters?: Record<string, any>
) => {
  const { page = 1, pageSize = 20, orderBy = "created_at", ascending = false } = options;

  return useQuery({
    queryKey: [...queryKey, page, pageSize],
    queryFn: async (): Promise<PaginatedResponse<T>> => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from(table as any)
        .select("*", { count: "exact" })
        .order(orderBy, { ascending })
        .range(from, to);

      // Apply filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value) as any;
          }
        });
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: (data as T[]) || [],
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    placeholderData: (previousData) => previousData,
  });
};
