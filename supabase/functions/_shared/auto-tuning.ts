import type { DrawResult, PredictionResult } from "./types.ts";

export interface HyperParams {
  epochs?: number;
  learningRate?: number;
  hiddenSize?: number;
  windowSize?: number;
}

export interface TuningResult {
  params: HyperParams;
  score: number;
  avgMatches: number;
}

export async function autoTuneAlgorithm(
  algorithm: (results: DrawResult[], params?: HyperParams) => PredictionResult,
  data: DrawResult[],
  paramGrid: Record<string, number[]>
): Promise<TuningResult> {
  let bestResult: TuningResult = {
    params: {},
    score: 0,
    avgMatches: 0,
  };
  
  const epochs = paramGrid.epochs || [50, 100];
  const learningRates = paramGrid.learningRate || [0.01, 0.05];
  
  for (const epoch of epochs) {
    for (const lr of learningRates) {
      const params: HyperParams = { epochs: epoch, learningRate: lr };
      const score = await evaluateParams(algorithm, data, params);
      
      if (score > bestResult.score) {
        bestResult = { params, score, avgMatches: score };
      }
    }
  }
  
  return bestResult;
}

async function evaluateParams(
  algorithm: (results: DrawResult[], params?: HyperParams) => PredictionResult,
  data: DrawResult[],
  params: HyperParams
): Promise<number> {
  const windowSize = 30;
  const scores: number[] = [];
  
  for (let i = windowSize; i < Math.min(data.length, windowSize + 5); i++) {
    const trainingData = data.slice(i - windowSize, i);
    const testData = data[i];
    
    try {
      const prediction = algorithm(trainingData, params);
      const matches = prediction.numbers.filter(n => 
        testData.winning_numbers.includes(n)
      ).length;
      scores.push(matches);
    } catch {
      scores.push(0);
    }
  }
  
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function getOptimalParams(algorithm: string): HyperParams {
  const defaults: Record<string, HyperParams> = {
    "Neural Network": { epochs: 100, learningRate: 0.01, hiddenSize: 10 },
    "LSTM": { epochs: 50, learningRate: 0.05, hiddenSize: 8 },
    "Gradient Boosting": { learningRate: 0.1, windowSize: 20 },
  };
  
  return defaults[algorithm] || { epochs: 100, learningRate: 0.01 };
}
