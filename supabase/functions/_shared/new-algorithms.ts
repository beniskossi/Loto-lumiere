import { DrawResult } from "./types.ts"; // Assuming types exist or any equivalent

export function calculateDoubleGapSequence(results: any[]): Map<number, number> {
  const scores = new Map<number, number>();
  for (let n = 1; n <= 90; n++) {
    const indices = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].winning_numbers.includes(n)) indices.push(i);
    }
    
    let score = 0;
    if (indices.length >= 4) {
      const currentGap = indices[0];
      const gaps = [];
      for (let j = 0; j < indices.length - 1; j++) {
        gaps.push(indices[j+1] - indices[j] - 1);
      }
      
      // Calculate first and second order differences (écarts des écarts)
      const d1 = gaps[0] - gaps[1]; // Velocity of gap change
      const d2 = (gaps[1] - gaps[2]) || 0; 
      const acceleration = d1 - d2;
      
      // Project next gap using sequence momentum
      // G_next = G_0 + v * t + 0.5 * a * t^2 (discretized)
      let projectedGap = gaps[0] + d1 * 0.5 + acceleration * 0.25;
      projectedGap = Math.max(0, projectedGap);
      
      // Score based on Gaussian distance to projection
      const diff = Math.abs(currentGap - projectedGap);
      score = Math.exp(-(diff * diff) / (2 * 1.5 * 1.5));
    }
    scores.set(n, score);
  }
  return scores;
}

export function calculateGapCadenceMorphology(results: any[]): Map<number, number> {
  const scores = new Map<number, number>();
  for (let n = 1; n <= 90; n++) {
    const indices = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].winning_numbers.includes(n)) indices.push(i);
    }
    
    let score = 0;
    if (indices.length >= 5) {
      const currentGap = indices[0];
      const gaps = [];
      for (let j = 0; j < indices.length - 1; j++) {
        gaps.push(indices[j+1] - indices[j] - 1);
      }
      
      // Evaluate cadence periodicities (periods 1, 2, 3)
      // We look for patterns where G[i] ~ G[i+k]
      let maxPeriodScore = 0;
      
      for (let k = 1; k <= 3; k++) {
        if (gaps.length >= k * 2) {
          let diffSum = 0;
          let count = 0;
          for (let j = 0; j < Math.min(k * 2, gaps.length - k); j++) {
            diffSum += Math.abs(gaps[j] - gaps[j+k]);
            count++;
          }
          const avgDiff = diffSum / count;
          
          // Cadence strength is higher when avgDiff is lower
          const cadenceStrength = Math.exp(-avgDiff / 2.0);
          
          // If this cadence continues, the expected gap is gaps[k-1]
          const expectedGap = gaps[k-1];
          const distanceToExpected = Math.abs(currentGap - expectedGap);
          
          const matchScore = cadenceStrength * Math.exp(-(distanceToExpected * distanceToExpected) / (2 * 1.0 * 1.0));
          
          if (matchScore > maxPeriodScore) {
            maxPeriodScore = matchScore;
          }
        }
      }
      score = maxPeriodScore;
    }
    scores.set(n, score);
  }
  return scores;
}
