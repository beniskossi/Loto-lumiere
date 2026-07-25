const K = 90;
const EPS = 1e-12;

const clamp01 = (p: number) => Math.min(1 - EPS, Math.max(EPS, p));

/**
 * Log-loss de Bernoulli sommée sur les 90 numéros : règle de score propre.
 */
export function logScore(pi: Float64Array, winning: number[]): number {
  const y = new Uint8Array(K + 1);
  winning.forEach(n => {
    if (n >= 1 && n <= K) y[n] = 1;
  });
  let s = 0;
  for (let k = 1; k <= K; k++) {
    const p = clamp01(pi[k]);
    s -= y[k] ? Math.log(p) : Math.log(1 - p);
  }
  return s;
}

/**
 * Brier multi-numéros sur 90 numéros.
 */
export function brierScore(pi: Float64Array, winning: number[]): number {
  const y = new Uint8Array(K + 1);
  winning.forEach(n => {
    if (n >= 1 && n <= K) y[n] = 1;
  });
  let s = 0;
  for (let k = 1; k <= K; k++) {
    const diff = pi[k] - y[k];
    s += diff * diff;
  }
  return s / K;
}

/**
 * Score de compétence : > 0 seulement si le modèle bat la baseline uniforme.
 */
export function skillScore(modelLogScore: number, baselineLogScore: number): number {
  if (baselineLogScore === 0) return 0;
  return 1 - (modelLogScore / baselineLogScore);
}

/**
 * Diebold-Mariano sur différentiels de score, variance HAC (Newey-West).
 */
export function dieboldMariano(d: number[], lag: number = 5): { stat: number; p: number } {
  const n = d.length;
  if (n < 2) return { stat: 0, p: 1 };
  
  const mean = d.reduce((a, b) => a + b, 0) / n;
  const dev = d.map(x => x - mean);
  let v = dev.reduce((a, b) => a + b * b, 0) / n;

  for (let l = 1; l <= Math.min(lag, n - 1); l++) {
    let c = 0;
    for (let t = l; t < n; t++) {
      c += dev[t] * dev[t - l];
    }
    v += 2 * (1 - l / (lag + 1)) * (c / n);
  }

  if (v <= 0) return { stat: 0, p: 1 };

  const stat = mean / Math.sqrt(v / n);
  const p = 2 * (1 - normalCdf(Math.abs(stat)));
  return { stat, p };
}

/**
 * Expected Calibration Error (ECE) sur B-bins.
 */
export function calculateECE(
  predictions: Float64Array[],
  outcomes: number[][],
  numBins: number = 10
): number {
  if (predictions.length === 0) return 0;

  const total = predictions.length * K;
  const bins: { probSum: number; countSum: number; n: number }[] = Array.from(
    { length: numBins },
    () => ({ probSum: 0, countSum: 0, n: 0 })
  );

  for (let i = 0; i < predictions.length; i++) {
    const pi = predictions[i];
    const winning = outcomes[i];
    const y = new Uint8Array(K + 1);
    winning.forEach(n => { if (n >= 1 && n <= K) y[n] = 1; });

    for (let k = 1; k <= K; k++) {
      const p = pi[k];
      const binIdx = Math.min(numBins - 1, Math.floor(p * numBins));
      bins[binIdx].probSum += p;
      bins[binIdx].countSum += y[k];
      bins[binIdx].n += 1;
    }
  }

  let ece = 0;
  for (const bin of bins) {
    if (bin.n > 0) {
      const avgProb = bin.probSum / bin.n;
      const avgAcc = bin.countSum / bin.n;
      ece += (bin.n / total) * Math.abs(avgAcc - avgProb);
    }
  }

  return ece;
}

function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * z);
  const d = 0.3989423 * Math.exp(-z * z / 2);
  return (
    1 -
    d *
      t *
      (1.330274 * Math.pow(t, 4) -
        1.821256 * Math.pow(t, 3) +
        1.781478 * Math.pow(t, 2) -
        0.356538 * t +
        0.319382)
  );
}
