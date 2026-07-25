export interface BiasReport {
  chi2: number;
  df: number;
  pMonteCarlo: number;
  suspects: { number: number; observed: number; expected: number; qValue: number }[];
  gapKS: { statistic: number; p: number };
  serialCorrelation: number;
  verdict: "conforme" | "ainvestiguer" | "biaisprobable";
}

export function chiSquareUniformity(counts: Float64Array, T: number) {
  const E = (5 * T) / 90;
  let x2 = 0;
  for (let k = 1; k <= 90; k++) {
    x2 += Math.pow(counts[k] - E, 2) / E;
  }
  return { chi2: x2, df: 89, expected: E };
}

/**
 * p-value exacte par simulation Monte Carlo : robuste quand E est petit.
 */
export function monteCarloP(
  observedChi2: number,
  T: number,
  rng: () => number,
  B: number = 20000
): number {
  let ge = 0;
  for (let b = 0; b < B; b++) {
    const c = new Float64Array(91);
    for (let t = 0; t < T; t++) {
      const picked = new Set<number>();
      while (picked.size < 5) {
        picked.add(1 + Math.floor(rng() * 90));
      }
      picked.forEach(n => { c[n] += 1; });
    }
    const { chi2 } = chiSquareUniformity(c, T);
    if (chi2 >= observedChi2) ge++;
  }
  return (ge + 1) / (B + 1);
}

/**
 * Contrôle du FDR (False Discovery Rate) selon Benjamini-Hochberg sur m tests simultanés.
 */
export function benjaminiHochberg(pValues: number[], alpha: number = 0.05): number[] {
  const m = pValues.length;
  if (m === 0) return [];
  const idx = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const q = new Array<number>(m).fill(1);
  let prev = 1;

  for (let r = m - 1; r >= 0; r--) {
    const rank = r + 1;
    const currentQ = (idx[r].p * m) / rank;
    prev = Math.min(prev, currentQ);
    q[idx[r].i] = Math.min(1, Math.max(0, prev));
  }

  return q;
}

/**
 * Test Kolmogorov-Smirnov des écarts observés contre la distribution théorique Géométrique(5/90).
 */
export function kolmogorovSmirnovGaps(gaps: number[]): { statistic: number; p: number } {
  if (gaps.length === 0) return { statistic: 0, p: 1 };
  
  const pGeometric = 5 / 90;
  const sorted = [...gaps].sort((a, b) => a - b);
  const n = sorted.length;
  let maxD = 0;

  for (let i = 0; i < n; i++) {
    const x = sorted[i];
    // CDF théorique Géométrique P(X <= x) = 1 - (1 - p)^(x + 1)
    const cdfTheoretical = 1 - Math.pow(1 - pGeometric, x + 1);
    const cdfEmpiricalUpper = (i + 1) / n;
    const cdfEmpiricalLower = i / n;

    const diff1 = Math.abs(cdfEmpiricalUpper - cdfTheoretical);
    const diff2 = Math.abs(cdfEmpiricalLower - cdfTheoretical);
    if (diff1 > maxD) maxD = diff1;
    if (diff2 > maxD) maxD = diff2;
  }

  // Approximation asymptotique de la p-value de Kolmogorov-Smirnov
  const sqrtN = Math.sqrt(n);
  const lambda = (sqrtN + 0.12 + 0.11 / sqrtN) * maxD;
  let pValue = 0;
  for (let k = 1; k <= 100; k++) {
    const term = 2 * Math.pow(-1, k - 1) * Math.exp(-2 * k * k * lambda * lambda);
    pValue += term;
    if (Math.abs(term) < 1e-8) break;
  }
  pValue = Math.min(1, Math.max(0, pValue));

  return { statistic: maxD, p: pValue };
}

/**
 * Calcul de la corrélation sérielle (Autocorrélation d'ordre 1 des sommes de tirages).
 */
export function serialCorrelation(series: number[]): number {
  const n = series.length;
  if (n < 3) return 0;

  const mean = series.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;

  for (let i = 0; i < n; i++) {
    const dev = series[i] - mean;
    den += dev * dev;
    if (i < n - 1) {
      num += dev * (series[i + 1] - mean);
    }
  }

  return den > 0 ? num / den : 0;
}

/**
 * Diagnostic complet Forensic des Biais
 */
export function runFullBiasDiagnosis(
  counts: Float64Array,
  totalDraws: number,
  allGaps: number[],
  sumsSeries: number[],
  rng: () => number = Math.random
): BiasReport {
  const { chi2, df, expected } = chiSquareUniformity(counts, totalDraws);
  const pMC = monteCarloP(chi2, totalDraws, rng, 5000);

  // Calcul des p-values binomiales par numéro (5/90 proba par numéro par tirage)
  const binomialPValues: number[] = [];
  const pProb = 5 / 90;

  for (let k = 1; k <= 90; k++) {
    const obs = counts[k];
    const dev = Math.abs(obs - expected);
    // Approximation normale de la p-value binomiale pour 1 à 90
    const z = dev / Math.sqrt(totalDraws * pProb * (1 - pProb));
    const pVal = 2 * (1 - normalCdf(Math.abs(z)));
    binomialPValues.push(pVal);
  }

  const qValues = benjaminiHochberg(binomialPValues, 0.05);
  const suspects: { number: number; observed: number; expected: number; qValue: number }[] = [];

  for (let k = 1; k <= 90; k++) {
    if (qValues[k - 1] < 0.10) { // Détection si FDR < 10%
      suspects.push({
        number: k,
        observed: counts[k],
        expected: Math.round(expected * 100) / 100,
        qValue: Math.round(qValues[k - 1] * 10000) / 10000
      });
    }
  }

  const gapKS = kolmogorovSmirnovGaps(allGaps);
  const serialCorr = serialCorrelation(sumsSeries);

  let verdict: "conforme" | "ainvestiguer" | "biaisprobable" = "conforme";
  if (pMC < 0.01 || gapKS.p < 0.01 || suspects.length >= 3) {
    verdict = "biaisprobable";
  } else if (pMC < 0.05 || gapKS.p < 0.05 || suspects.length >= 1 || Math.abs(serialCorr) > 0.15) {
    verdict = "ainvestiguer";
  }

  return {
    chi2: Math.round(chi2 * 100) / 100,
    df,
    pMonteCarlo: Math.round(pMC * 10000) / 10000,
    suspects,
    gapKS: { statistic: Math.round(gapKS.statistic * 10000) / 10000, p: Math.round(gapKS.p * 10000) / 10000 },
    serialCorrelation: Math.round(serialCorr * 10000) / 10000,
    verdict
  };
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
