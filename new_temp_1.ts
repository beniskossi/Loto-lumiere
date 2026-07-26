import { DrawResult } from "@/types/lottery";

export interface ScoreBreakdown {
  number: number;
  frequencyScore: number; // Raw frequency or decayed frequency
  gapScore: number;       // Score based on elapsed draws since last appearance
  markovScore: number;    // Conditional probability based on the last draw
  momentumScore: number;  // Score based on mean-reversion and balance models
  combinedScore: number;  // Weighted combination of the above
  // Raw metrics for XAI
  rawFrequency?: number;
  currentGap?: number;
  avgGap?: number;
}

export interface PredictionEngineOptions {
  frequencyWeight: number;
  gapWeight: number;
  markovWeight: number;
  momentumWeight: number; // New: weight for the mean-reversion & balance model
  decayRate?: number;     // Decaying factor for frequency (smaller = more uniform, larger = focus on recent)
  markovOrder?: number;   // 1 or 2 (First-order or Second-order Markov transitions)
  poissonLambda?: number; // Multiplier for Poisson gap recurrence scaling (defaults to 1.0)
  maxNumber?: number;     // Usually 90 for this lottery
  targetCount?: number;   // Number of recommended balls to generate
}

export class LocalPredictionEngine {
  private static MAX_NUMBER = 90;

  /**
   * Generates local predictions based on four high-fidelity analytical pillars:
   * 1. Decayed Frequency (F1): Weighted frequency using a deterministic exponential decay factor.
   * 2. Poisson-Gap Recurrence (F2): Evaluates the elapsed draws against Poisson arrival probability: P(X >= 1) = 1 - e^(-lambda * currentGap / avgGap).
   * 3. High-Order Markov Transitions (F3): Conditional transition probabilities from the last draw (Order 1) and second last draw (Order 2).
   * 4. Ornstein-Uhlenbeck Mean Reversion Momentum (F4): Measures the deviation of recent draw sums and parity from historical averages, boosting numbers that pull the system back to the central limit median.
   */
  public static calculatePredictions(
    results: DrawResult[],
    options: PredictionEngineOptions
  ): {
    recommendations: number[];
    scores: ScoreBreakdown[];
    insights: string[];
    hyperparameters: Record<string, number>;
  } {
    const maxNum = options.maxNumber || this.MAX_NUMBER;
    const targetCount = options.targetCount || 5;

    // Default weights if not fully provided
    const wFreq = options.frequencyWeight;
    const wGap = options.gapWeight;
    const wMarkov = options.markovWeight;
    const wMomentum = options.momentumWeight ?? 0;

    const totalWeight = (wFreq + wGap + wMarkov + wMomentum) || 1;

    if (!results || results.length === 0) {
      return {
        recommendations: Array.from({ length: targetCount }, (_, i) => i + 1),
        scores: [],
        insights: ["Aucune donnée historique pour lancer le calcul stochastique."],
        hyperparameters: { decayRate: 0.05, markovOrder: 1, poissonLambda: 1.0 },
      };
    }

    // 1. Order draws chronologically (index 0 is the newest)
    const sortedDraws = [...results].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Compute central metrics of the dataset (no magic numbers, derived entirely from data)
    const allSums = sortedDraws.map(d => (d.winningNumbers || []).reduce((sum, n) => sum + n, 0)).filter(s => s > 0);
    const meanSum = allSums.length > 0 ? allSums.reduce((a, b) => a + b, 0) / allSums.length : 227.5; // Theoretical mean of 5 numbers from 1-90 is 5 * 45.5 = 227.5
    const varianceSum = allSums.length > 0 ? allSums.reduce((sum, s) => sum + Math.pow(s - meanSum, 2), 0) / allSums.length : 1000;
    const stdDevSum = Math.sqrt(varianceSum) || 30;

    // Determine the optimal decay rate dynamically if not specified
    const halfLife = Math.max(10, Math.min(50, Math.floor(sortedDraws.length * 0.25)));
    const dynamicDecayRate = Math.LN2 / halfLife;
    const decay = options.decayRate !== undefined ? options.decayRate : dynamicDecayRate;

    // Get order for Markov
    const mOrder = options.markovOrder === 2 ? 2 : 1;

    // Get Poisson lambda scaling
    const pLambda = options.poissonLambda !== undefined ? options.poissonLambda : 1.0;

    // Pre-calculate statistics for F1 and F2
    const frequencies = new Array(maxNum + 1).fill(0);
    const lastAppearances = new Array(maxNum + 1).fill(-1);
    const gaps = new Array(maxNum + 1).fill(sortedDraws.length);
    const allAppearancesIndices: Record<number, number[]> = {};

    for (let n = 1; n <= maxNum; n++) {
      allAppearancesIndices[n] = [];
    }

    // Initialize the Dirichlet Multinomial Model
    const historicalDrawsArrays = sortedDraws.map(d => d.winningNumbers || []);
    const dirichlet = new DirichletMultinomialEngine({
      timeDecay: Math.exp(-decay)
    });
    
    const posterior = dirichlet.calculatePosterior(historicalDrawsArrays);
    const bayesianProbs = dirichlet.estimateProbabilities(posterior);

    // Calculate F1 (Bayesian Expected Probability) and collect gap history
    for (let i = 0; i < sortedDraws.length; i++) {
      const draw = sortedDraws[i];
      const numbers = draw.winningNumbers || [];

      numbers.forEach((num) => {
        if (num >= 1 && num <= maxNum) {
          allAppearancesIndices[num].push(i);
          if (lastAppearances[num] === -1) {
            lastAppearances[num] = i;
            gaps[num] = i;
          }
        }
      });
    }

    for (let n = 1; n <= maxNum; n++) {
      frequencies[n] = bayesianProbs.get(n)?.expectedProbability || 0;
    }
    // Calculate F2 (Poisson-Gap Recurrence Score)
    const gapScores = new Array(maxNum + 1).fill(0);
    const avgGaps = new Array(maxNum + 1).fill(0);
    for (let num = 1; num <= maxNum; num++) {
