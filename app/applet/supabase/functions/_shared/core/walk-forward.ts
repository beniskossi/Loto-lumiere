import { logScore, skillScore, dieboldMariano } from './scoring.ts';

export interface DrawResultItem {
  draw_date: string;
  winning_numbers: number[];
}

export interface ModelSpec {
  name: string;
  fitPredict: (historicalDraws: DrawResultItem[]) => Float64Array;
}

export interface WalkForwardResult {
  model: string;
  n: number;
  logScore: number;
  baseline: number;
  skill: number;
  dm: { stat: number; p: number };
}

/**
 * Harness Walk-Forward strict : le passé uniquement alimente chaque modèle.
 * Aucun data leakage du présent/futur possible.
 */
export async function walkForward(
  draws: DrawResultItem[],
  models: ModelSpec[],
  minTrain: number = 50
): Promise<WalkForwardResult[]> {
  const chrono = [...draws].sort((a, b) => new Date(a.draw_date).getTime() - new Date(b.draw_date).getTime());
  const losses = models.map(() => [] as number[]);
  const baseLosses: number[] = [];
  const uniform = new Float64Array(91).fill(5 / 90);

  if (chrono.length <= minTrain) {
    return models.map(m => ({
      model: m.name,
      n: 0,
      logScore: 0,
      baseline: 0,
      skill: 0,
      dm: { stat: 0, p: 1 }
    }));
  }

  for (let t = minTrain; t < chrono.length; t++) {
    const train = chrono.slice(0, t); // strictement le passé t-1
    const actual = chrono[t].winning_numbers;

    models.forEach((m, i) => {
      const pi = m.fitPredict(train); // aucune donnée de t ou plus tard
      losses[i].push(logScore(pi, actual));
    });

    baseLosses.push(logScore(uniform, actual));
  }

  return models.map((m, i) => {
    const total = losses[i].reduce((a, b) => a + b, 0);
    const base = baseLosses.reduce((a, b) => a + b, 0);
    const diff = losses[i].map((l, j) => l - baseLosses[j]);
    const n = losses[i].length;

    const avgLogScore = n > 0 ? total / n : 0;
    const avgBaseLogScore = n > 0 ? base / n : 0;

    return {
      model: m.name,
      n,
      logScore: avgLogScore,
      baseline: avgBaseLogScore,
      skill: skillScore(avgLogScore, avgBaseLogScore),
      dm: dieboldMariano(diff)
    };
  });
}
