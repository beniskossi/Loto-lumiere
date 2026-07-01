import type { DrawResult } from "./types.ts";

export interface Pattern {
  type: "pair" | "triplet" | "cycle" | "hot" | "cold";
  numbers: number[];
  frequency: number;
  confidence: number;
  lastSeen: number;
  description: string;
}

export function detectPatterns(results: DrawResult[]): Pattern[] {
  const patterns: Pattern[] = [];
  
  patterns.push(...detectPairPatterns(results));
  patterns.push(...detectCyclicPatterns(results));
  patterns.push(...detectHotColdPatterns(results));
  
  return patterns.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
}

function detectPairPatterns(results: DrawResult[]): Pattern[] {
  const pairs: Record<string, { count: number; lastIdx: number }> = {};
  
  results.forEach((r, idx) => {
    for (let i = 0; i < r.winning_numbers.length; i++) {
      for (let j = i + 1; j < r.winning_numbers.length; j++) {
        const key = [r.winning_numbers[i], r.winning_numbers[j]].sort().join('-');
        if (!pairs[key]) pairs[key] = { count: 0, lastIdx: idx };
        pairs[key].count++;
        pairs[key].lastIdx = Math.min(pairs[key].lastIdx, idx);
      }
    }
  });

  return Object.entries(pairs)
    .filter(([, data]) => data.count >= 3)
    .map(([key, data]) => {
      const nums = key.split('-').map(Number);
      return {
        type: "pair" as const,
        numbers: nums,
        frequency: data.count / results.length,
        confidence: Math.min(0.9, data.count / 10),
        lastSeen: data.lastIdx,
        description: `Paire ${nums[0]}-${nums[1]} (${data.count}x)`,
      };
    });
}

function detectCyclicPatterns(results: DrawResult[]): Pattern[] {
  const cycles: Pattern[] = [];
  
  for (let num = 1; num <= 90; num++) {
    const appearances: number[] = [];
    results.forEach((r, idx) => {
      if (r.winning_numbers.includes(num)) appearances.push(idx);
    });
    
    if (appearances.length >= 3) {
      const gaps = appearances.slice(1).map((a, i) => a - appearances[i]);
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const variance = gaps.reduce((sum, g) => sum + Math.pow(g - avgGap, 2), 0) / gaps.length;
      
      if (variance < avgGap * 0.5) {
        cycles.push({
          type: "cycle",
          numbers: [num],
          frequency: 1 / avgGap,
          confidence: Math.min(0.85, 1 / (variance + 1)),
          lastSeen: appearances[0],
          description: `N°${num} cycle ~${Math.round(avgGap)} tirages`,
        });
      }
    }
  }
  
  return cycles;
}

function detectHotColdPatterns(results: DrawResult[]): Pattern[] {
  const patterns: Pattern[] = [];
  const recentWindow = 10;
  
  for (let num = 1; num <= 90; num++) {
    const recentCount = results.slice(0, recentWindow).filter(r => 
      r.winning_numbers.includes(num)
    ).length;
    const totalCount = results.filter(r => r.winning_numbers.includes(num)).length;
    const lastIdx = results.findIndex(r => r.winning_numbers.includes(num));
    
    if (recentCount >= 3) {
      patterns.push({
        type: "hot",
        numbers: [num],
        frequency: totalCount / results.length,
        confidence: recentCount / recentWindow,
        lastSeen: lastIdx,
        description: `N°${num} chaud (${recentCount}/${recentWindow})`,
      });
    } else if (lastIdx > 20) {
      patterns.push({
        type: "cold",
        numbers: [num],
        frequency: totalCount / results.length,
        confidence: 0.6,
        lastSeen: lastIdx,
        description: `N°${num} froid (${lastIdx} tirages)`,
      });
    }
  }
  
  return patterns;
}

export function predictFromPatterns(patterns: Pattern[]): number[] {
  const scores: Record<number, number> = {};
  for (let i = 1; i <= 90; i++) scores[i] = 0;
  
  patterns.forEach(pattern => {
    pattern.numbers.forEach(num => {
      scores[num] += pattern.confidence * pattern.frequency * 10;
    });
  });
  
  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([num]) => parseInt(num));
}
