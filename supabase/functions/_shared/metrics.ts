export function calculateBrierScore(predictions: Map<number, number>, winningNumbers: number[]): number {
  let sumSquaredErrors = 0;
  
  for (let num = 1; num <= 90; num++) {
    const predictedProb = predictions.get(num) || 0;
    const actualOutcome = winningNumbers.includes(num) ? 1 : 0;
    sumSquaredErrors += Math.pow(predictedProb - actualOutcome, 2);
  }
  
  return sumSquaredErrors / 90;
}

export function calculateLogLoss(predictions: Map<number, number>, winningNumbers: number[]): number {
  let logLossSum = 0;
  const epsilon = 1e-15;
  
  for (let num = 1; num <= 90; num++) {
    const p = Math.max(epsilon, Math.min(1 - epsilon, predictions.get(num) || 0));
    const y = winningNumbers.includes(num) ? 1 : 0;
    
    logLossSum += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
  }
  
  return logLossSum / 90;
}

export function calculateJaccardSimilarity(predA: number[], predB: number[]): number {
  if (predA.length === 0 && predB.length === 0) return 1.0;
  if (predA.length === 0 || predB.length === 0) return 0;
  
  const setA = new Set(predA);
  const setB = new Set(predB);
  
  let intersectionSize = 0;
  for (const num of setA) {
    if (setB.has(num)) intersectionSize++;
  }
  
  const unionSize = setA.size + setB.size - intersectionSize;
  return intersectionSize / unionSize;
}

export function calculateMarginalDiversity(
  algoPreds: number[][], 
  ensemblePreds: number[][], 
  actualResults: number[][]
): number {
  let uniqueValueAdded = 0;
  let totalOpportunities = 0;
  
  for (let i = 0; i < Math.min(actualResults.length, algoPreds.length, ensemblePreds.length); i++) {
    const actual = actualResults[i];
    const algo = algoPreds[i];
    const ensemble = ensemblePreds[i];
    
    if (!actual || !algo || !ensemble) continue;
    
    for (const winningNum of actual) {
      if (!ensemble.includes(winningNum)) {
        totalOpportunities++;
        if (algo.includes(winningNum)) {
          uniqueValueAdded++;
        }
      }
    }
  }
  
  return totalOpportunities > 0 ? uniqueValueAdded / totalOpportunities : 0;
}

export function calculateExpectedCalibrationError(
  predictions: { probs: Map<number, number>, actual: number[] }[],
  bins: number = 10
): number {
  const binEdges = Array.from({ length: bins + 1 }, (_, i) => i / bins);
  const binData = Array.from({ length: bins }, () => ({ sumProbs: 0, sumActual: 0, count: 0 }));
  
  for (const pred of predictions) {
    for (let num = 1; num <= 90; num++) {
      const p = pred.probs.get(num) || 0;
      const y = pred.actual.includes(num) ? 1 : 0;
      
      const binIdx = Math.min(bins - 1, Math.max(0, Math.floor(p * bins)));
      
      binData[binIdx].sumProbs += p;
      binData[binIdx].sumActual += y;
      binData[binIdx].count += 1;
    }
  }
  
  let ece = 0;
  const totalSamples = predictions.length * 90;
  
  if (totalSamples === 0) return 0;
  
  for (const bin of binData) {
    if (bin.count > 0) {
      const meanProb = bin.sumProbs / bin.count;
      const meanActual = bin.sumActual / bin.count;
      const weight = bin.count / totalSamples;
      ece += weight * Math.abs(meanProb - meanActual);
    }
  }
  
  return ece;
}
