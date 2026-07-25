/**
 * Poids exponentiels (Hedge). Regret borné par sqrt(T log N)/2 vs le meilleur modèle.
 * cumulLoss[i] = somme des log-scores réalisés du modèle i, issue du LEDGER.
 */
export function hedgeWeights(cumulLoss: number[], eta: number = 0.05): number[] {
  if (cumulLoss.length === 0) return [];
  const min = Math.min(...cumulLoss);
  const raw = cumulLoss.map(l => Math.exp(-eta * (l - min)));
  const z = raw.reduce((a, b) => a + b, 0);
  if (z === 0) return new Array(cumulLoss.length).fill(1 / cumulLoss.length);
  return raw.map(r => r / z);
}

/**
 * Mélange de distributions, puis renormalisation à 5 numéros attendus.
 * Garantit strictement que sum_{k=1}^{90} pi_k = 5.
 */
export function mixDistributions(pis: Float64Array[], w: number[]): Float64Array {
  const out = new Float64Array(91);
  let sum = 0;

  for (let k = 1; k <= 90; k++) {
    let p = 0;
    for (let i = 0; i < pis.length; i++) {
      p += w[i] * pis[i][k];
    }
    out[k] = p;
    sum += p;
  }

  // Renormalisation sous contrainte E[X] = 5
  if (sum > 0) {
    const scale = 5 / sum;
    for (let k = 1; k <= 90; k++) {
      out[k] *= scale;
    }
  } else {
    for (let k = 1; k <= 90; k++) {
      out[k] = 5 / 90;
    }
  }

  return out;
}
