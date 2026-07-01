import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentFrenchDay } from "@/utils/dateUtils";
import { DRAW_SCHEDULE } from "@/types/lottery";

interface DrawResultWithTime {
  drawName: string;
  winningNumbers: number[];
  machineNumbers?: number[];
  drawDate: string;
}

export const useTodayDrawResults = () => {
  const today = getCurrentFrenchDay();
  const todayDrawNames = DRAW_SCHEDULE[today]?.map(d => d.name) || [];

  return useQuery({
    queryKey: ["today-draw-results", today],
    queryFn: async () => {
      if (todayDrawNames.length === 0) return {};

      const { data, error } = await supabase
        .from("draw_results")
        .select("draw_name, winning_numbers, machine_numbers, draw_date")
        .in("draw_name", todayDrawNames)
        .order("draw_date", { ascending: false });

      if (error) throw error;

      const resultsMap: Record<string, DrawResultWithTime> = {};
      data?.forEach(result => {
        if (!resultsMap[result.draw_name]) {
          resultsMap[result.draw_name] = {
            drawName: result.draw_name,
            winningNumbers: result.winning_numbers,
            machineNumbers: result.machine_numbers || undefined,
            drawDate: result.draw_date
          };
        }
      });

      return resultsMap;
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    enabled: todayDrawNames.length > 0
  });
};
