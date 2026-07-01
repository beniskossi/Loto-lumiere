// useNumberTrends.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO } from "date-fns";
import { toast } from "sonner";

export interface NumberTrendData {
  date: string;
  [key: string]: string | number;
}

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

export const useNumberTrends = (drawName: string, numbers: number[], days: number = 30) => {
  return useQuery({
    queryKey: ["number-trends", drawName, numbers, days],
    queryFn: async (): Promise<NumberTrendData[]> => {
      const endDate = new Date();
      const startDate = subDays(endDate, days);

      const { data, error } = await supabase
        .from("draw_results")
        .select("draw_date, winning_numbers")
        .eq("draw_name", drawName)
        .gte("draw_date", startDate.toISOString().split('T')[0])
        .lte("draw_date", endDate.toISOString().split('T')[0])
        .order("draw_date", { ascending: true });

      if (error) throw error;

      // Group by date and count occurrences
      const trendMap = new Map<string, Record<number, number>>();
      
      data.forEach((result) => {
        const dateKey = result.draw_date;
        if (!trendMap.has(dateKey)) {
          trendMap.set(dateKey, {});
        }
        
        const dateData = trendMap.get(dateKey)!;
        result.winning_numbers.forEach((num: number) => {
          if (numbers.includes(num)) {
            dateData[num] = (dateData[num] || 0) + 1;
          }
        });
      });

      // Convert to array format for charts
      const trendData: NumberTrendData[] = Array.from(trendMap.entries()).map(([date, counts]) => {
        const entry: NumberTrendData = { date: format(parseISO(date), 'dd/MM') };
        numbers.forEach(num => {
          entry[`num_${num}`] = counts[num] || 0;
        });
        return entry;
      });

      return trendData;
    },
    enabled: !!drawName && numbers.length > 0,
    staleTime: STALE_TIME,
  });
};

export const useNumberCorrelation = (drawName: string) => {
  return useQuery({
    queryKey: ["number-correlation", drawName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("draw_results")
        .select("winning_numbers")
        .eq("draw_name", drawName)
        .limit(100);

      if (error) throw error;

      // Build correlation matrix using nested Maps for sparsity
      const correlationMatrix = new Map<number, Map<number, number>>();
      
      data.forEach((result) => {
        const numbers = result.winning_numbers as number[];
        for (let i = 0; i < numbers.length; i++) {
          for (let j = i + 1; j < numbers.length; j++) {
            const num1 = numbers[i];
            const num2 = numbers[j];
            
            if (!correlationMatrix.has(num1)) correlationMatrix.set(num1, new Map());
            const map1 = correlationMatrix.get(num1)!;
            map1.set(num2, (map1.get(num2) || 0) + 1);
            
            if (!correlationMatrix.has(num2)) correlationMatrix.set(num2, new Map());
            const map2 = correlationMatrix.get(num2)!;
            map2.set(num1, (map2.get(num1) || 0) + 1);
          }
        }
      });

      // Get top correlations
      const topCorrelations: Array<{
        number1: number;
        number2: number;
        count: number;
      }> = [];

      correlationMatrix.forEach((innerMap, i) => {
        innerMap.forEach((count, j) => {
          if (j > i) {  // Avoid duplicates
            topCorrelations.push({
              number1: i,
              number2: j,
              count,
            });
          }
        });
      });

      return {
        matrix: correlationMatrix,
        topCorrelations: topCorrelations.sort((a, b) => b.count - a.count).slice(0, 50),
      };
    },
    enabled: !!drawName,
    staleTime: STALE_TIME,
  });
};