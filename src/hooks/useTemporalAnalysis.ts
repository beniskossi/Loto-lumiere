import { useMemo } from "react";
import { useDrawResults, DrawResult } from "./useDrawResults";

export interface DayPattern {
  day: string;
  avgSum: number;
  hotNumbers: number[];
  coldNumbers: number[];
  frequency: Record<number, number>;
  drawCount: number;
}

export interface MonthPattern {
  month: number;
  monthName: string;
  avgSum: number;
  hotNumbers: number[];
  frequency: Record<number, number>;
  drawCount: number;
}

export interface TimeSlotPattern {
  timeSlot: string;
  avgSum: number;
  hotNumbers: number[];
  frequency: Record<number, number>;
  drawCount: number;
}

export interface SeasonalTrend {
  season: string;
  hotNumbers: number[];
  avgSum: number;
  evenRatio: number;
  drawCount: number;
}

export interface TemporalCycle {
  cycleLength: number;
  numbers: number[];
  confidence: number;
  description: string;
}

export interface TemporalAnalysisData {
  dayPatterns: DayPattern[];
  monthPatterns: MonthPattern[];
  timeSlotPatterns: TimeSlotPattern[];
  seasonalTrends: SeasonalTrend[];
  detectedCycles: TemporalCycle[];
  weekdayVsWeekend: {
    weekday: { avgSum: number; hotNumbers: number[]; drawCount: number };
    weekend: { avgSum: number; hotNumbers: number[]; drawCount: number };
  };
  recentTrend: {
    direction: "up" | "down" | "stable";
    trendingNumbers: number[];
    decliningNumbers: number[];
  };
}

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function getTimeSlot(time: string): string {
  const hour = parseInt(time.split(":")[0]);
  if (hour < 12) return "Matin (10h)";
  if (hour < 15) return "Midi (13h)";
  if (hour < 17) return "Après-midi (16h)";
  return "Soir (18h)";
}

function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return "Saison sèche principale";
  if (month >= 6 && month <= 9) return "Saison des pluies";
  if (month >= 10 && month <= 11) return "Saison sèche secondaire";
  return "Harmattan";
}

function calculateFrequency(results: DrawResult[]): Record<number, number> {
  const freq: Record<number, number> = {};
  results.forEach(r => {
    (r.winning_numbers || []).forEach((n: number) => {
      freq[n] = (freq[n] || 0) + 1;
    });
  });
  return freq;
}

function getHotNumbers(freq: Record<number, number>, limit = 5): number[] {
  return Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([n]) => parseInt(n));
}

function getColdNumbers(freq: Record<number, number>, allNumbers: number[], limit = 5): number[] {
  const freqWithZero: Record<number, number> = {};
  allNumbers.forEach(n => {
    freqWithZero[n] = freq[n] || 0;
  });
  return Object.entries(freqWithZero)
    .sort(([, a], [, b]) => a - b)
    .slice(0, limit)
    .map(([n]) => parseInt(n));
}

function calculateAvgSum(results: DrawResult[]): number {
  if (results.length === 0) return 0;
  let total = 0;
  let count = 0;
  results.forEach(r => {
    const nums = r.winning_numbers || [];
    if (nums.length > 0) {
      total += nums.reduce((a: number, b: number) => a + b, 0);
      count++;
    }
  });
  return count > 0 ? Math.round(total / count) : 0;
}

export function useTemporalAnalysis(drawName?: string, limit = 200): {
  data: TemporalAnalysisData | null;
  isLoading: boolean;
  error: Error | null;
} {
  const { data: results, isLoading, error } = useDrawResults(drawName || "", limit);

  const analysisData = useMemo(() => {
    if (!results || results.length < 10) return null;

    const allNumbers = Array.from({ length: 90 }, (_, i) => i + 1);

    // Group by day of week
    const byDay: Record<string, DrawResult[]> = {};
    // Group by month
    const byMonth: Record<number, DrawResult[]> = {};
    // Group by time slot
    const byTimeSlot: Record<string, DrawResult[]> = {};
    // Group by season
    const bySeason: Record<string, DrawResult[]> = {};
    // Weekday vs Weekend
    const weekdayResults: DrawResult[] = [];
    const weekendResults: DrawResult[] = [];

    results.forEach(result => {
      const date = new Date(result.draw_date);
      const dayOfWeek = date.getDay();
      const month = date.getMonth();
      const dayName = DAY_NAMES[dayOfWeek];
      const timeSlot = getTimeSlot(result.draw_time || "18:00");
      const season = getSeason(month);

      // By day
      if (!byDay[dayName]) byDay[dayName] = [];
      byDay[dayName].push(result);

      // By month
      if (!byMonth[month]) byMonth[month] = [];
      byMonth[month].push(result);

      // By time slot
      if (!byTimeSlot[timeSlot]) byTimeSlot[timeSlot] = [];
      byTimeSlot[timeSlot].push(result);

      // By season
      if (!bySeason[season]) bySeason[season] = [];
      bySeason[season].push(result);

      // Weekday vs Weekend
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendResults.push(result);
      } else {
        weekdayResults.push(result);
      }
    });

    // Calculate day patterns
    const dayPatterns: DayPattern[] = Object.entries(byDay)
      .map(([day, dayResults]) => {
        const freq = calculateFrequency(dayResults);
        return {
          day,
          avgSum: calculateAvgSum(dayResults),
          hotNumbers: getHotNumbers(freq),
          coldNumbers: getColdNumbers(freq, allNumbers),
          frequency: freq,
          drawCount: dayResults.length
        };
      })
      .sort((a, b) => {
        const order = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
        return order.indexOf(a.day) - order.indexOf(b.day);
      });

    // Calculate month patterns
    const monthPatterns: MonthPattern[] = Object.entries(byMonth)
      .map(([monthStr, monthResults]) => {
        const month = parseInt(monthStr);
        const freq = calculateFrequency(monthResults);
        return {
          month,
          monthName: MONTH_NAMES[month],
          avgSum: calculateAvgSum(monthResults),
          hotNumbers: getHotNumbers(freq),
          frequency: freq,
          drawCount: monthResults.length
        };
      })
      .sort((a, b) => a.month - b.month);

    // Calculate time slot patterns
    const timeSlotPatterns: TimeSlotPattern[] = Object.entries(byTimeSlot)
      .map(([timeSlot, slotResults]) => {
        const freq = calculateFrequency(slotResults);
        return {
          timeSlot,
          avgSum: calculateAvgSum(slotResults),
          hotNumbers: getHotNumbers(freq),
          frequency: freq,
          drawCount: slotResults.length
        };
      })
      .sort((a, b) => {
        const order = ["Matin (10h)", "Midi (13h)", "Après-midi (16h)", "Soir (18h)"];
        return order.indexOf(a.timeSlot) - order.indexOf(b.timeSlot);
      });

    // Calculate seasonal trends
    const seasonalTrends: SeasonalTrend[] = Object.entries(bySeason)
      .map(([season, seasonResults]) => {
        const freq = calculateFrequency(seasonResults);
        let evenCount = 0;
        let totalNums = 0;
        seasonResults.forEach(r => {
          (r.winning_numbers || []).forEach((n: number) => {
            totalNums++;
            if (n % 2 === 0) evenCount++;
          });
        });
        return {
          season,
          hotNumbers: getHotNumbers(freq),
          avgSum: calculateAvgSum(seasonResults),
          evenRatio: totalNums > 0 ? evenCount / totalNums : 0.5,
          drawCount: seasonResults.length
        };
      });

    // Detect cycles (simplified - looking for numbers appearing at regular intervals)
    const detectedCycles: TemporalCycle[] = detectCycles(results);

    // Weekday vs Weekend analysis
    const weekdayFreq = calculateFrequency(weekdayResults);
    const weekendFreq = calculateFrequency(weekendResults);

    // Recent trend analysis (last 20% vs previous 20%)
    const windowSize = Math.max(10, Math.floor(results.length * 0.2));
    const recentResults = results.slice(0, windowSize);
    const previousResults = results.slice(windowSize, windowSize * 2);
    const recentFreq = calculateFrequency(recentResults);
    const previousFreq = calculateFrequency(previousResults);

    const trendingNumbers: number[] = [];
    const decliningNumbers: number[] = [];

    allNumbers.forEach(n => {
      const recentRate = (recentFreq[n] || 0) / Math.max(recentResults.length, 1);
      const prevRate = (previousFreq[n] || 0) / Math.max(previousResults.length, 1);
      const diff = recentRate - prevRate;
      
      if (diff > 0.1) {
        trendingNumbers.push(n);
      } else if (diff < -0.1) {
        decliningNumbers.push(n);
      }
    });

    // Sort by trend strength
    trendingNumbers.sort((a, b) => {
      const aRate = (recentFreq[a] || 0) - (previousFreq[a] || 0);
      const bRate = (recentFreq[b] || 0) - (previousFreq[b] || 0);
      return bRate - aRate;
    });
    decliningNumbers.sort((a, b) => {
      const aRate = (previousFreq[a] || 0) - (recentFreq[a] || 0);
      const bRate = (previousFreq[b] || 0) - (recentFreq[b] || 0);
      return bRate - aRate;
    });

    const avgTrendingRate = trendingNumbers.length > 0 
      ? trendingNumbers.reduce((sum, n) => sum + (recentFreq[n] || 0) - (previousFreq[n] || 0), 0) / trendingNumbers.length
      : 0;
    const avgDecliningRate = decliningNumbers.length > 0
      ? decliningNumbers.reduce((sum, n) => sum + (previousFreq[n] || 0) - (recentFreq[n] || 0), 0) / decliningNumbers.length
      : 0;
    
    const trendDirection: "up" | "down" | "stable" = avgTrendingRate > avgDecliningRate 
      ? "up" 
      : avgDecliningRate > avgTrendingRate 
        ? "down" 
        : "stable";

    return {
      dayPatterns,
      monthPatterns,
      timeSlotPatterns,
      seasonalTrends,
      detectedCycles,
      weekdayVsWeekend: {
        weekday: {
          avgSum: calculateAvgSum(weekdayResults),
          hotNumbers: getHotNumbers(weekdayFreq),
          drawCount: weekdayResults.length
        },
        weekend: {
          avgSum: calculateAvgSum(weekendResults),
          hotNumbers: getHotNumbers(weekendFreq),
          drawCount: weekendResults.length
        }
      },
      recentTrend: {
        direction: trendDirection,
        trendingNumbers: trendingNumbers.slice(0, 5),
        decliningNumbers: decliningNumbers.slice(0, 5)
      }
    };
  }, [results]);

  return {
    data: analysisData,
    isLoading,
    error: error as Error | null
  };
}

// Detect cyclical patterns in number appearances
function detectCycles(results: DrawResult[]): TemporalCycle[] {
  const cycles: TemporalCycle[] = [];
  
  // Need enough data points to detect meaningful cycles
  // At least 1/3 of the MAX_NUMBERS
  const minRequiredData = Math.ceil(90 * 0.33); 
  if (results.length < minRequiredData) return cycles;

  // Derive structural cycle lengths dynamically from total data span
  const maxCycle = Math.floor(results.length / 3);
  const cycleLengths = [7, 14, 28].filter(len => len <= maxCycle);

  cycleLengths.forEach(len => {
    const numbers = findCyclicalNumbers(results, len);
    if (numbers.length > 0) {
      cycles.push({
        cycleLength: len,
        numbers: numbers.slice(0, 5),
        confidence: Math.min(0.9, 0.3 + numbers.length * 0.1),
        description: `Cycle de ${len} tirages détecté`
      });
    }
  });

  return cycles;
}

function findCyclicalNumbers(results: DrawResult[], cycleLength: number): number[] {
  const cyclicalNumbers: number[] = [];
  const numberAppearances: Record<number, number[]> = {};

  // Track when each number appears
  results.forEach((result, index) => {
    (result.winning_numbers || []).forEach((num: number) => {
      if (!numberAppearances[num]) numberAppearances[num] = [];
      numberAppearances[num].push(index);
    });
  });

  // Check if gaps match cycle length
  Object.entries(numberAppearances).forEach(([numStr, appearances]) => {
    if (appearances.length < 3) return;
    
    const gaps: number[] = [];
    for (let i = 1; i < appearances.length; i++) {
      gaps.push(appearances[i] - appearances[i - 1]);
    }

    // Check if gaps are consistently close to cycle length
    const matchingGaps = gaps.filter(gap => 
      gap >= cycleLength - 2 && gap <= cycleLength + 2
    ).length;

    if (matchingGaps >= gaps.length * 0.4) {
      cyclicalNumbers.push(parseInt(numStr));
    }
  });

  return cyclicalNumbers;
}
