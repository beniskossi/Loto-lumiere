import { useMemo } from "react";
import { DrawResult } from "@/hooks/useDrawResults";

interface HistoryStats {
  totalDraws: number;
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
  mostFrequentNumber: {
    number: number;
    count: number;
  } | null;
  drawBreakdown: Record<string, number>;
  recentActivity: {
    last7Days: number;
    last30Days: number;
  };
}

export const useHistoryStats = (results: DrawResult[]): HistoryStats => {
  return useMemo(() => {
    if (!results || results.length === 0) {
      return {
        totalDraws: 0,
        dateRange: { earliest: null, latest: null },
        mostFrequentNumber: null,
        drawBreakdown: {},
        recentActivity: { last7Days: 0, last30Days: 0 },
      };
    }

    // Date range
    const sortedByDate = [...results].sort(
      (a, b) => new Date(a.draw_date).getTime() - new Date(b.draw_date).getTime()
    );
    const earliest = sortedByDate[0]?.draw_date || null;
    const latest = sortedByDate[sortedByDate.length - 1]?.draw_date || null;

    // Most frequent number
    const numberCounts = new Map<number, number>();
    results.forEach((result) => {
      result.winning_numbers.forEach((num) => {
        numberCounts.set(num, (numberCounts.get(num) || 0) + 1);
      });
    });

    const mostFrequent = Array.from(numberCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];

    // Draw breakdown
    const drawBreakdown: Record<string, number> = {};
    results.forEach((result) => {
      drawBreakdown[result.draw_name] = (drawBreakdown[result.draw_name] || 0) + 1;
    });

    // Recent activity
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentActivity = {
      last7Days: results.filter(
        (r) => new Date(r.draw_date) >= last7Days
      ).length,
      last30Days: results.filter(
        (r) => new Date(r.draw_date) >= last30Days
      ).length,
    };

    return {
      totalDraws: results.length,
      dateRange: { earliest, latest },
      mostFrequentNumber: mostFrequent
        ? { number: mostFrequent[0], count: mostFrequent[1] }
        : null,
      drawBreakdown,
      recentActivity,
    };
  }, [results]);
};
