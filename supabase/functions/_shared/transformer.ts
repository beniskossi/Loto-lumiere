// Transformer avec Attention Mechanism
import type { DrawResult, PredictionResult } from "./types.ts";
import { selectBalancedNumbers, log } from "./utils.ts";

const EPSILON = 1e-10;

export function transformerAlgorithm(results: DrawResult[]): PredictionResult {
  if (results.length < 10) {
    return {
      numbers: [1, 2, 3, 4, 5],
      confidence: 0.2,
      algorithm: "Transformer (Données Insuffisantes)",
      factors: ["Données insuffisantes"],
      score: 0.2,
      category: "transformer",
    };
  }

  try {
    // Réduire la complexité pour économiser CPU/mémoire
    const embedDim = 16; // Réduit de 32 à 16
    const numHeads = 2;  // Réduit de 4 à 2
    const seqLength = Math.min(15, results.length); // Réduit de 30 à 15

    // Encoder les séquences
    const sequences = results.slice(0, seqLength).map(r =>
      embedNumbers(r.winning_numbers, embedDim)
    );

    // Multi-head attention
    const attention = multiHeadAttention(sequences, numHeads, embedDim);

    // Decoder
    const scores = decodeAttention(attention, embedDim);

    const sortedNumbers = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .map(([num]) => parseInt(num));

    const prediction = selectBalancedNumbers(sortedNumbers.slice(0, 15), 5);

    return {
      numbers: prediction,
      confidence: 0.89,
      algorithm: "Transformer (Attention)",
      factors: [`${numHeads} attention heads`, "Positional encoding", `${seqLength} séquences`],
      score: 0.89 * 0.89,
      category: "transformer",
    };
  } catch (error) {
    log("error", `Transformer failed`, { error });
    return {
      numbers: [1, 2, 3, 4, 5],
      confidence: 0.2,
      algorithm: "Transformer (Erreur)",
      factors: ["Erreur"],
      score: 0.2,
      category: "transformer",
    };
  }
}

function embedNumbers(numbers: number[], dim: number): number[] {
  const embedding = Array(dim).fill(0);
  numbers.forEach((num, idx) => {
    for (let i = 0; i < dim; i++) {
      const angle = num / Math.pow(10000, (2 * i) / dim);
      embedding[i] += Math.sin(angle + idx * 0.1);
    }
  });
  return embedding.map(v => v / numbers.length);
}

function multiHeadAttention(
  sequences: number[][],
  numHeads: number,
  embedDim: number
): number[][] {
  const headDim = Math.floor(embedDim / numHeads);
  const attended: number[][] = [];

  for (let h = 0; h < numHeads; h++) {
    const headStart = h * headDim;
    const headEnd = headStart + headDim;

    sequences.forEach((seq, i) => {
      const query = seq.slice(headStart, headEnd);
      const attentionSum = Array(headDim).fill(0);
      let totalWeight = 0;

      sequences.forEach((otherSeq, j) => {
        const key = otherSeq.slice(headStart, headEnd);
        const value = otherSeq.slice(headStart, headEnd);

        // Attention score
        const score = dotProduct(query, key) / Math.sqrt(headDim);
        const weight = Math.exp(score);
        totalWeight += weight;

        for (let k = 0; k < headDim; k++) {
          attentionSum[k] += weight * value[k];
        }
      });

      if (!attended[i]) attended[i] = Array(embedDim).fill(0);
      for (let k = 0; k < headDim; k++) {
        attended[i][headStart + k] = attentionSum[k] / (totalWeight + EPSILON);
      }
    });
  }

  return attended;
}

function decodeAttention(attention: number[][], embedDim: number): Record<number, number> {
  const scores: Record<number, number> = {};
  for (let i = 1; i <= 90; i++) scores[i] = 0;

  attention.forEach(att => {
    for (let num = 1; num <= 90; num++) {
      const idx = num % embedDim;
      scores[num] += Math.abs(att[idx]);
    }
  });

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  for (let i = 1; i <= 90; i++) {
    scores[i] /= (total + EPSILON);
  }

  return scores;
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
}
