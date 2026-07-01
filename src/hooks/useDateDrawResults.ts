import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDateForQuery } from "@/utils/dateUtils";

interface DrawResultsByName {
  [drawName: string]: {
    winningNumbers: number[];
    machineNumbers?: number[];
  };
}

export const useDateDrawResults = (date: Date) => {
  const dateString = formatDateForQuery(date);
  
  return useQuery({
    queryKey: ['draw-results-by-date', dateString],
    queryFn: async (): Promise<DrawResultsByName> => {
      const { data, error } = await supabase
        .from('draw_results')
        .select('draw_name, winning_numbers, machine_numbers')
        .eq('draw_date', dateString);
      
      if (error) throw error;
      
      const resultsByName: DrawResultsByName = {};
      
      data?.forEach(result => {
        resultsByName[result.draw_name] = {
          winningNumbers: result.winning_numbers,
          machineNumbers: result.machine_numbers || undefined
        };
      });
      
      return resultsByName;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
