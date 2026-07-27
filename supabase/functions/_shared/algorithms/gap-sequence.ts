import { DrawResult, PredictionResult, LOTTERY_CONSTANTS } from "../types.ts";
import { posteriorDirichlet } from "../core/dirichlet.ts";

/**
 * Algorithme "Séquence des Écarts"
 * Recherche les séquences et patterns des écarts (par tranche de 5 ou 10) 
 * composant l'historique du tirage.
 */
export function gapSequenceAlgorithm(results: DrawResult[], binSize: number = 10): PredictionResult {
  if (results.length < 20) {
    return generateFallback("Échantillon historique trop faible");
  }

  // 1. Order results chronologically: older first (index 0), newest last (index N-1)
  const chronoResults = [...results].sort(
    (a, b) => new Date(a.draw_date).getTime() - new Date(b.draw_date).getTime()
  );

  const numDraws = chronoResults.length;
  // gapHistory[i][n] = gap of number n at the start of draw i
  const gapHistory: number[][] = Array.from({ length: numDraws + 1 }, () => Array(91).fill(0));

  // Initialize gaps to max possible (or 0, but let's assume 0 initially, and they increment)
  const currentGaps = Array(91).fill(numDraws); 
  
  // We need to trace back from the beginning.
  // Actually, a better way to initialize is to do a first pass to find the first appearance of each number.
  // But let's just start with gaps = 0.
  currentGaps.fill(0);

  // Sequences of bins for each draw
  const drawBinSequences: number[][] = [];

  for (let i = 0; i < numDraws; i++) {
    // Record the gaps at the moment BEFORE this draw occurred
    gapHistory[i] = [...currentGaps];
    
    // The winning numbers of this draw
    const winners = chronoResults[i].winning_numbers;
    
    // Determine the bin sequence for this draw
    const bins = winners.map(n => Math.floor(currentGaps[n] / binSize) * binSize).sort((a, b) => a - b);
    drawBinSequences.push(bins);

    // Update gaps: increment all by 1
    for (let n = 1; n <= 90; n++) {
      currentGaps[n]++;
    }
    // Reset gaps for winners
    winners.forEach(n => {
      currentGaps[n] = 0;
    });
  }

  // currentGaps now holds the gaps for the NEXT (future) draw
  gapHistory[numDraws] = [...currentGaps];

  // 2. Analyze transitions
  // What is the sequence of the MOST RECENT draw?
  const lastSequence = drawBinSequences[drawBinSequences.length - 1];
  const lastSeqStr = lastSequence.join("-");

  // Find all times `lastSeqStr` occurred in the past (excluding the very last one)
  const transitions: Record<string, number> = {};
  for (let i = 0; i < drawBinSequences.length - 1; i++) {
    const seqStr = drawBinSequences[i].join("-");
    if (seqStr === lastSeqStr) {
      const nextSeqStr = drawBinSequences[i + 1].join("-");
      transitions[nextSeqStr] = (transitions[nextSeqStr] || 0) + 1;
    }
  }

  let targetSeqStr = "";
  if (Object.keys(transitions).length > 0) {
    // Find the most frequent next sequence
    targetSeqStr = Object.entries(transitions).sort((a, b) => b[1] - a[1])[0][0];
  } else {
    // Fallback: find the most frequent sequence overall
    const overallFreq: Record<string, number> = {};
    for (let i = 0; i < drawBinSequences.length; i++) {
      const seqStr = drawBinSequences[i].join("-");
      overallFreq[seqStr] = (overallFreq[seqStr] || 0) + 1;
    }
    targetSeqStr = Object.entries(overallFreq).sort((a, b) => b[1] - a[1])[0][0];
  }

  const targetBins = targetSeqStr.split("-").map(Number); // e.g. [0, 0, 10, 30, 40]

  // Count how many numbers we need from each bin
  const neededFromBin: Record<number, number> = {};
  targetBins.forEach(b => {
    neededFromBin[b] = (neededFromBin[b] || 0) + 1;
  });

  // 3. Find candidates for the next draw
  // Group numbers 1..90 by their CURRENT gap bin
  const currentBinMap: Record<number, number[]> = {};
  for (let n = 1; n <= 90; n++) {
    const bin = Math.floor(currentGaps[n] / binSize) * binSize;
    if (!currentBinMap[bin]) currentBinMap[bin] = [];
    currentBinMap[bin].push(n);
  }

  // 4. Score numbers using Dirichlet (Algorithmic DNA) to pick the best candidates from the required bins
  const posterior = posteriorDirichlet(results, 0.95, 1.0);
  const probMap: Record<number, number> = {};
  for (let n = 1; n <= 90; n++) {
    probMap[n] = posterior.pi[n];
  }

  const selectedNumbers: number[] = [];
  const factors: string[] = [
    `Séquence des écarts (Tranches de ${binSize})`,
    `Pattern précédent: [${lastSeqStr}]`,
    `Pattern cible déduit: [${targetSeqStr}]`
  ];

  for (const [binStr, count] of Object.entries(neededFromBin)) {
    const bin = Number(binStr);
    const candidates = currentBinMap[bin] || [];
    
    // Sort candidates by Dirichlet probability descending
    candidates.sort((a, b) => (probMap[b] || 0) - (probMap[a] || 0));
    
    const picked = candidates.slice(0, count);
    selectedNumbers.push(...picked);

    // If we couldn't find enough candidates in this bin, we'll need to fill later
  }

  // If we don't have exactly 5 numbers (maybe a bin was empty), fill with top remaining probabilities
  if (selectedNumbers.length < 5) {
    factors.push(`Ajustement: Remplissage partiel par ADN algorithmique (manque ${5 - selectedNumbers.length} numéros)`);
    const allNumbers = Array.from({ length: 90 }, (_, i) => i + 1);
    allNumbers.sort((a, b) => (probMap[b] || 0) - (probMap[a] || 0));
    
    const remaining = allNumbers.filter((n: number) => !selectedNumbers.includes(n));
    selectedNumbers.push(...remaining.slice(0, 5 - selectedNumbers.length));
  } else if (selectedNumbers.length > 5) {
    selectedNumbers.length = 5;
  }

  selectedNumbers.sort((a, b) => a - b);

  // Compute confidence based on the selected numbers' probabilities
  const confidence = selectedNumbers.reduce((sum, n) => sum + (probMap[n] || 0.01), 0) / 5;

  return {
    numbers: selectedNumbers,
    confidence: Math.min(0.95, Math.max(0.1, confidence + 0.2)), // Boost confidence because of pattern match
    algorithm: "Séquence des Écarts",
    factors,
    score: confidence + 0.2,
    category: "statistical"
  };
}

function generateFallback(reason: string): PredictionResult {
  return {
    numbers: [1, 2, 3, 4, 5],
    confidence: 0,
    algorithm: "Séquence des Écarts",
    factors: [reason],
    score: 0,
    category: "statistical"
  };
}
