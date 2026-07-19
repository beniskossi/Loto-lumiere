import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useDrawResults } from "@/hooks/useDrawResults";
import { useNumberStatistics } from "@/hooks/useNumberStatistics";
import { useCadenceAlerts } from "@/hooks/useCadenceAlerts";
import { NumberBall } from "@/components/NumberBall";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  HelpCircle, 
  Zap, 
  Sparkles, 
  Sliders, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Layers,
  Percent,
  Timer,
  Award,
  History,
  Gauge
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart as RechartBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart,
  Line,
  Cell
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface DoubleGapAnalyzerProps {
  drawName: string;
}

interface SimulatorResult {
  numbers: number[];
  gaps: number[];
  sortedGaps: number[];
  secondOrderGaps: number[];
  mean: number;
  variance: number;
  trancheCounts: Record<string, number>;
  pattern: string;
  harmonyScore: number;
  advice: string;
}

// Client-side implementation of Double Gap Sequence prediction logic
function calculateDoubleGapSequenceClient(results: any[]): Map<number, number> {
  const scores = new Map<number, number>();
  for (let n = 1; n <= 90; n++) {
    const indices: number[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].winning_numbers?.includes(n)) {
        indices.push(i);
      }
    }
    
    let score = 0;
    if (indices.length >= 4) {
      const currentGap = indices[0];
      const gaps = [];
      for (let j = 0; j < indices.length - 1; j++) {
        gaps.push(indices[j+1] - indices[j] - 1);
      }
      
      const d1 = gaps[0] - gaps[1]; // Vitesse de changement d'écart
      const d2 = (gaps[1] - gaps[2]) || 0; 
      const acceleration = d1 - d2; // Accélération du retard
      
      let projectedGap = gaps[0] + d1 * 0.5 + acceleration * 0.25;
      projectedGap = Math.max(0, projectedGap);
      
      const diff = Math.abs(currentGap - projectedGap);
      score = Math.exp(-(diff * diff) / (2 * 1.5 * 1.5));
    }
    scores.set(n, score);
  }
  return scores;
}

// Client-side implementation of Gap Cadence prediction logic
function calculateGapCadenceClient(results: any[]): Map<number, number> {
  const scores = new Map<number, number>();
  for (let n = 1; n <= 90; n++) {
    const indices: number[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].winning_numbers?.includes(n)) {
        indices.push(i);
      }
    }
    
    let score = 0;
    if (indices.length >= 5) {
      const currentGap = indices[0];
      const gaps = [];
      for (let j = 0; j < indices.length - 1; j++) {
        gaps.push(indices[j+1] - indices[j] - 1);
      }
      
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
          const cadenceStrength = Math.exp(-avgDiff / 2.0);
          
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

// Tranches définies scientifiquement pour les écarts (gaps)
const GAP_TRANCHES = [
  { id: "A", name: "Ultra-Chauds (0-3)", min: 0, max: 3, color: "text-red-500", border: "border-red-500/30", bg: "bg-red-500/10", glow: "shadow-red-500/20" },
  { id: "B", name: "Harmoniques (4-9)", min: 4, max: 9, color: "text-orange-500", border: "border-orange-500/30", bg: "bg-orange-500/10", glow: "shadow-orange-500/20" },
  { id: "C", name: "Équilibre (10-18)", min: 10, max: 18, color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10", glow: "shadow-emerald-500/20" },
  { id: "D", name: "Sommeil (19+)", min: 19, max: 999, color: "text-cyan-400", border: "border-cyan-500/30", bg: "bg-cyan-500/10", glow: "shadow-cyan-500/20" },
];

export const DoubleGapAnalyzer = ({ drawName }: DoubleGapAnalyzerProps) => {
  const { data: results, isLoading: resultsLoading } = useDrawResults(drawName, 120);
  const { data: statistics, isLoading: statsLoading } = useNumberStatistics(drawName);
  const { alerts: cadenceAlerts } = useCadenceAlerts(drawName);
  
  const [activeTab, setActiveTab] = useState<"dispersion" | "projection" | "simulator" | "performance">("dispersion");
  const [customNumbers, setCustomNumbers] = useState<string>("");
  const [simulatorResult, setSimulatorResult] = useState<SimulatorResult | null>(null);
  const [backtestLimit, setBacktestLimit] = useState<number>(10);

  const isLoading = resultsLoading || statsLoading;

  // Real-time automatic post-mortem comparison engine
  const performanceInsights = useMemo(() => {
    if (!results || results.length === 0) return null;

    const evaluatedDraws: Array<{
      id: string;
      draw_name: string;
      draw_date: string;
      winningNumbers: number[];
      doubleGap: {
        predictions: number[];
        matches: number[];
        score: number;
      };
      gapCadence: {
        predictions: number[];
        matches: number[];
        score: number;
      };
      hybrid: {
        predictions: number[];
        matches: number[];
        score: number;
      };
      alignmentScore: number;
    }> = [];

    // Ensure we have a minimum of 30 historical draws to evaluate sequence and cadence
    const maxEval = Math.min(backtestLimit, results.length - 30);
    
    for (let i = 0; i < maxEval; i++) {
      const currentDraw = results[i];
      const winning = currentDraw.winning_numbers || [];
      if (winning.length === 0) continue;

      // Slice results so we only use elements after i (which represent previous draws)
      const historyPrior = results.slice(i + 1);

      // 1. Double Gap Sequence scoring
      const doubleGapScores = calculateDoubleGapSequenceClient(historyPrior);
      
      // 2. Gap Cadence scoring
      const gapCadenceScores = calculateGapCadenceClient(historyPrior);

      // Sort and extract top predictions
      const sortedDoubleGap = Array.from({ length: 90 }, (_, idx) => idx + 1)
        .map(n => ({ number: n, score: doubleGapScores.get(n) || 0 }))
        .sort((a, b) => b.score - a.score);

      const sortedGapCadence = Array.from({ length: 90 }, (_, idx) => idx + 1)
        .map(n => ({ number: n, score: gapCadenceScores.get(n) || 0 }))
        .sort((a, b) => b.score - a.score);

      // 3. Hybrid Stacking scoring (average of both signals)
      const hybridScores = new Map<number, number>();
      for (let n = 1; n <= 90; n++) {
        const score = ((doubleGapScores.get(n) || 0) + (gapCadenceScores.get(n) || 0)) / 2;
        hybridScores.set(n, score);
      }
      
      const sortedHybrid = Array.from({ length: 90 }, (_, idx) => idx + 1)
        .map(n => ({ number: n, score: hybridScores.get(n) || 0 }))
        .sort((a, b) => b.score - a.score);

      // Top 5 projections
      const topDoubleGap = sortedDoubleGap.slice(0, 5).map(item => item.number);
      const topGapCadence = sortedGapCadence.slice(0, 5).map(item => item.number);
      const topHybrid = sortedHybrid.slice(0, 5).map(item => item.number);

      // Matches against actual outcome
      const matchesDoubleGap = topDoubleGap.filter(num => winning.includes(num));
      const matchesGapCadence = topGapCadence.filter(num => winning.includes(num));
      const matchesHybrid = topHybrid.filter(num => winning.includes(num));

      // Calculate Rank Alignment Score (how high the actual winning numbers ranked overall in hybrid)
      let totalRankPoints = 0;
      winning.forEach(num => {
        const rank = sortedHybrid.findIndex(item => item.number === num) + 1; // 1 to 90
        if (rank <= 10) totalRankPoints += 100;
        else if (rank <= 20) totalRankPoints += 80;
        else if (rank <= 35) totalRankPoints += 50;
        else if (rank <= 50) totalRankPoints += 25;
        else totalRankPoints += 5;
      });
      const alignmentScore = Math.round(totalRankPoints / winning.length);

      evaluatedDraws.push({
        id: currentDraw.id,
        draw_name: currentDraw.draw_name,
        draw_date: currentDraw.draw_date,
        winningNumbers: winning,
        doubleGap: {
          predictions: topDoubleGap,
          matches: matchesDoubleGap,
          score: matchesDoubleGap.length
        },
        gapCadence: {
          predictions: topGapCadence,
          matches: matchesGapCadence,
          score: matchesGapCadence.length
        },
        hybrid: {
          predictions: topHybrid,
          matches: matchesHybrid,
          score: matchesHybrid.length
        },
        alignmentScore
      });
    }

    const totalDraws = evaluatedDraws.length;
    if (totalDraws === 0) return null;

    const avgMatchesDoubleGap = evaluatedDraws.reduce((sum, d) => sum + d.doubleGap.score, 0) / totalDraws;
    const avgMatchesGapCadence = evaluatedDraws.reduce((sum, d) => sum + d.gapCadence.score, 0) / totalDraws;
    const avgMatchesHybrid = evaluatedDraws.reduce((sum, d) => sum + d.hybrid.score, 0) / totalDraws;
    const avgAlignmentScore = evaluatedDraws.reduce((sum, d) => sum + d.alignmentScore, 0) / totalDraws;

    // Direct hit distributions
    const hitDistribution = { 0: 0, 1: 0, 2: 0, "3+": 0 };
    evaluatedDraws.forEach(d => {
      const hits = d.hybrid.score;
      if (hits === 0) hitDistribution[0]++;
      else if (hits === 1) hitDistribution[1]++;
      else if (hits === 2) hitDistribution[2]++;
      else hitDistribution["3+"]++;
    });

    const hitDistributionPercent = {
      0: Math.round((hitDistribution[0] / totalDraws) * 100),
      1: Math.round((hitDistribution[1] / totalDraws) * 100),
      2: Math.round((hitDistribution[2] / totalDraws) * 100),
      "3+": Math.round((hitDistribution["3+"] / totalDraws) * 100),
    };

    let bestModel = "Double Gap Sequence";
    let bestAvg = avgMatchesDoubleGap;
    if (avgMatchesGapCadence > bestAvg) {
      bestModel = "Gap Cadence";
      bestAvg = avgMatchesGapCadence;
    }
    if (avgMatchesHybrid > bestAvg) {
      bestModel = "Stacking Hybride";
      bestAvg = avgMatchesHybrid;
    }

    return {
      evaluatedDraws,
      metrics: {
        avgMatchesDoubleGap: Math.round(avgMatchesDoubleGap * 100) / 100,
        avgMatchesGapCadence: Math.round(avgMatchesGapCadence * 100) / 100,
        avgMatchesHybrid: Math.round(avgMatchesHybrid * 100) / 100,
        avgAlignmentScore: Math.round(avgAlignmentScore * 10) / 10,
        bestModel,
        hitDistributionPercent,
      }
    };
  }, [results, backtestLimit]);

  // 1. Calcul de l'historique des Écarts de Premier Ordre et de Second Ordre (Écarts des Écarts)
  const gapAnalysisData = useMemo(() => {
    if (!results || results.length === 0) return null;

    // Trier chronologiquement (le plus ancien en premier)
    const chronoDraws = [...results].reverse();
    
    // Garder une trace du dernier index de tirage où chaque numéro est apparu
    const lastSeenIndex: Record<number, number> = {};
    
    // Structure pour collecter l'historique d'analyse
    const drawsGapsHistory: Array<{
      drawIndex: number;
      date: string;
      winningNumbers: number[];
      firstOrderGaps: number[];
      sortedGaps: number[];
      secondOrderGaps: number[]; // Gaps des Gaps (différences entre gaps consécutifs triés)
      meanSecondOrderGap: number;
      varianceSecondOrderGap: number;
      trancheCounts: Record<string, number>;
      combinationPattern: string; // Ex: "2-1-1-1" représentant le nombre d'éléments dans les tranches A, B, C, D
    }> = [];

    // Histogramme des écarts de second ordre
    const secondOrderGapsDistribution: Record<number, number> = {};

    chronoDraws.forEach((draw, tIdx) => {
      const winning = draw.winning_numbers || [];
      if (winning.length === 0) return;

      // Calculer l'écart de chaque numéro au moment du tirage tIdx
      const currentGaps = winning.map(num => {
        if (lastSeenIndex[num] !== undefined) {
          return tIdx - lastSeenIndex[num] - 1; // Écart de premier ordre
        }
        // Fallback si jamais vu auparavant dans notre fenêtre historique (écart estimé basé sur la fréquence moyenne)
        return Math.min(tIdx, 15);
      });

      // Trier les écarts de premier ordre
      const sortedGaps = [...currentGaps].sort((a, b) => a - b);

      // Calculer les écarts de second ordre (écarts des écarts)
      const secondOrderGaps: number[] = [];
      for (let i = 0; i < sortedGaps.length - 1; i++) {
        const diff = sortedGaps[i + 1] - sortedGaps[i];
        secondOrderGaps.push(diff);
        
        // Enregistrer dans la distribution globale
        secondOrderGapsDistribution[diff] = (secondOrderGapsDistribution[diff] || 0) + 1;
      }

      // Calculer la moyenne et variance de ces écarts de second ordre
      const sum = secondOrderGaps.reduce((acc, val) => acc + val, 0);
      const mean = secondOrderGaps.length > 0 ? sum / secondOrderGaps.length : 0;
      
      const squareDiffs = secondOrderGaps.map(val => Math.pow(val - mean, 2));
      const variance = secondOrderGaps.length > 0 
        ? squareDiffs.reduce((acc, val) => acc + val, 0) / secondOrderGaps.length 
        : 0;

      // Catégoriser ces écarts de premier ordre par tranche
      const trancheCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
      currentGaps.forEach(gap => {
        const tranche = GAP_TRANCHES.find(t => gap >= t.min && gap <= t.max);
        if (tranche) {
          trancheCounts[tranche.id]++;
        }
      });

      // Motif de combinaison (ex: "AABB" -> trié par id pour un motif canonique)
      const pattern = Object.entries(trancheCounts)
        .filter(([_, count]) => count > 0)
        .map(([id, count]) => `${count}${id}`)
        .join("-");

      // Enregistrer le dernier tirage pour chaque numéro
      winning.forEach(num => {
        lastSeenIndex[num] = tIdx;
      });

      drawsGapsHistory.push({
        drawIndex: tIdx,
        date: draw.draw_date,
        winningNumbers: winning,
        firstOrderGaps: currentGaps,
        sortedGaps,
        secondOrderGaps,
        meanSecondOrderGap: Math.round(mean * 100) / 100,
        varianceSecondOrderGap: Math.round(variance * 100) / 100,
        trancheCounts,
        combinationPattern: pattern
      });
    });

    return {
      drawsGapsHistory,
      secondOrderGapsDistribution,
      lastSeenIndex
    };
  }, [results]);

  // 2. Projections avancées et tendances de tranches
  const projections = useMemo(() => {
    if (!gapAnalysisData || !statistics) return null;

    const { drawsGapsHistory } = gapAnalysisData;
    const totalDraws = drawsGapsHistory.length;
    if (totalDraws === 0) return null;

    // Calculer les fréquences historiques des motifs de tranche
    const patternFrequencies: Record<string, number> = {};
    const trancheDistributionTotal = { A: 0, B: 0, C: 0, D: 0 };

    drawsGapsHistory.forEach(draw => {
      patternFrequencies[draw.combinationPattern] = (patternFrequencies[draw.combinationPattern] || 0) + 1;
      
      Object.keys(trancheDistributionTotal).forEach(key => {
        trancheDistributionTotal[key as keyof typeof trancheDistributionTotal] += draw.trancheCounts[key] || 0;
      });
    });

    // Trier les motifs par popularité décroissante
    const sortedPatterns = Object.entries(patternFrequencies)
      .map(([pattern, count]) => ({
        pattern,
        count,
        percentage: Math.round((count / totalDraws) * 1000) / 10
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculer les probabilités de transition pour l'écart de second ordre moyen (Modèle Auto-Régressif d'Écarts)
    const recentDraws = drawsGapsHistory.slice(-30);
    const meanEvolution = recentDraws.map(d => ({
      name: d.drawIndex.toString(),
      meanGap: d.meanSecondOrderGap,
      variance: d.varianceSecondOrderGap,
    }));

    // Élaborer la répartition actuelle des 90 numéros dans les tranches d'écart réels
    const currentTrancheDistribution = GAP_TRANCHES.map(tranche => {
      const numbersInTranche = statistics
        .filter(s => s.days_since_last >= tranche.min && s.days_since_last <= tranche.max)
        .map(s => ({
          number: s.number,
          gap: s.days_since_last,
          frequency: s.frequency
        }))
        .sort((a, b) => b.frequency - a.frequency);

      const ratio = statistics.length > 0 ? numbersInTranche.length / statistics.length : 0;

      return {
        ...tranche,
        numbers: numbersInTranche,
        count: numbersInTranche.length,
        percentage: Math.round(ratio * 100)
      };
    });

    // Projection de tranche conseillée pour le prochain tirage
    const mostProbablePattern = sortedPatterns[0]?.pattern || "Non disponible";
    
    // Fréquence empirique de chaque tranche (probabilités de sortie par boule tirée)
    const totalBoulesTirees = totalDraws * 5;
    const trancheProbabilities = Object.entries(trancheDistributionTotal).map(([id, sum]) => {
      const p = sum / totalBoulesTirees;
      const trancheMeta = GAP_TRANCHES.find(t => t.id === id);
      return {
        id,
        name: trancheMeta?.name || id,
        probability: Math.round(p * 100),
        expectedCount: Math.round(p * 5 * 10) / 10, // Combien on en attend sur 5 numéros
        color: trancheMeta?.color,
        bg: trancheMeta?.bg,
        border: trancheMeta?.border
      };
    });

    return {
      sortedPatterns,
      currentTrancheDistribution,
      meanEvolution,
      mostProbablePattern,
      trancheProbabilities
    };
  }, [gapAnalysisData, statistics]);

  // 3. Gestionnaire du simulateur de combinaison
  const handleSimulate = () => {
    if (!statistics || !gapAnalysisData || !projections) return;

    // Parser les numéros saisis (support de formats variés : virgules, espaces, tirets)
    const nums = customNumbers
      .split(/[\s,.-]+/)
      .map(n => parseInt(n.trim(), 10))
      .filter(n => !isNaN(n) && n >= 1 && n <= 90);

    // Supprimer les doublons
    const uniqueNums = Array.from(new Set(nums));

    if (uniqueNums.length !== 5) {
      toast.error("Veuillez saisir exactement 5 numéros distincts entre 1 et 90.");
      return;
    }

    // Récupérer les écarts actuels de ces 5 numéros
    const gaps = uniqueNums.map(num => {
      const stat = statistics.find(s => s.number === num);
      return stat ? stat.days_since_last : 0;
    });

    // Trier les écarts de premier ordre
    const sortedGaps = [...gaps].sort((a, b) => a - b);

    // Calculer les écarts de second ordre (écarts des écarts)
    const secondOrderGaps: number[] = [];
    for (let i = 0; i < sortedGaps.length - 1; i++) {
      secondOrderGaps.push(sortedGaps[i + 1] - sortedGaps[i]);
    }

    // Calculer la moyenne et la variance des écarts de second ordre
    const sum = secondOrderGaps.reduce((acc, val) => acc + val, 0);
    const mean = sum / secondOrderGaps.length;
    const squareDiffs = secondOrderGaps.map(val => Math.pow(val - mean, 2));
    const variance = squareDiffs.reduce((acc, val) => acc + val, 0) / secondOrderGaps.length;

    // Calculer la répartition par tranche pour cette combinaison
    const trancheCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    gaps.forEach(gap => {
      const tranche = GAP_TRANCHES.find(t => gap >= t.min && gap <= t.max);
      if (tranche) {
        trancheCounts[tranche.id]++;
      }
    });

    // Construire le motif
    const pattern = Object.entries(trancheCounts)
      .filter(([_, count]) => count > 0)
      .map(([id, count]) => `${count}${id}`)
      .join("-");

    // Évaluer l'harmonie par rapport au profil historique
    const matchedPatternHistory = projections.sortedPatterns.find(p => p.pattern === pattern);
    const patternScore = matchedPatternHistory ? matchedPatternHistory.percentage * 3.5 : 5; // score basé sur la probabilité du motif
    
    // Le second-order gap moyen idéal se situe généralement entre 2 et 8 pour un tirage harmonieux
    const dispersionScore = Math.max(0, 100 - Math.abs(mean - 4.5) * 12);

    const harmonyScore = Math.round((patternScore + dispersionScore) / 2);

    let advice = "";
    if (harmonyScore >= 75) {
      advice = "Excellente harmonie ! Votre combinaison respecte parfaitement la séquence idéale des écarts des écarts. Les tensions statistiques sont idéalement réparties.";
    } else if (harmonyScore >= 50) {
      advice = "Harmonie modérée. La dispersion de vos écarts est acceptable, mais vous devriez essayer de remplacer un numéro trop chaud ou trop froid pour stabiliser l'écart des écarts moyen.";
    } else {
      advice = "Déséquilibre critique ! La séquence des écarts de vos numéros est trop asymétrique ou concentrée. Le risque d'un gap de second ordre hors-norme est statistiquement trop élevé.";
    }

    setSimulatorResult({
      numbers: uniqueNums,
      gaps,
      sortedGaps,
      secondOrderGaps,
      mean: Math.round(mean * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      trancheCounts,
      pattern,
      harmonyScore,
      advice
    });

    toast.success("Analyse de la combinaison terminée !");
  };

  // Suggérer une combinaison optimisée
  const handleSuggestOptimized = () => {
    if (!statistics || !projections) return;

    // Algorithme sophistiqué d'optimisation d'écart de second ordre (Double-Gap Convergence)
    // 1. Sélectionner le motif le plus probable historique (ex: 2A-1B-1C-1D ou similaire)
    const targetPattern = projections.sortedPatterns[0]?.pattern || "1A-2B-1C-1D";
    
    // Parser le motif ciblé
    const targets: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    targetPattern.split("-").forEach(part => {
      const count = parseInt(part[0], 10);
      const id = part[1];
      targets[id] = count;
    });

    const selectedSuggested: number[] = [];

    // Piocher intelligemment dans chaque tranche de manière déterministe/fréquentielle
    GAP_TRANCHES.forEach(tranche => {
      const needed = targets[tranche.id] || 0;
      if (needed === 0) return;

      const candidates = projections.currentTrancheDistribution.find(t => t.id === tranche.id)?.numbers || [];
      
      // Prendre les meilleurs candidats (meilleure régularité / fréquence)
      let count = 0;
      for (const cand of candidates) {
        if (count >= needed) break;
        if (!selectedSuggested.includes(cand.number)) {
          selectedSuggested.push(cand.number);
          count++;
        }
      }

      // Si pas assez de candidats, fallback sur des numéros aléatoires de la tranche
      while (count < needed) {
        const fallbackNum = Math.floor(Math.random() * (tranche.max === 999 ? 90 : tranche.max - tranche.min + 1)) + tranche.min;
        if (!selectedSuggested.includes(fallbackNum) && fallbackNum >= 1 && fallbackNum <= 90) {
          selectedSuggested.push(fallbackNum);
          count++;
        }
      }
    });

    // Trier les numéros générés
    const finalSelection = selectedSuggested.slice(0, 5).sort((a, b) => a - b);
    setCustomNumbers(finalSelection.join(", "));
    setSimulatorResult(null);
    toast.info("Combinaison optimale générée selon le profil des Écarts des Écarts.");
  };

  // Préparation des données pour le graphique de distribution des écarts de second ordre
  const chartDistributionData = useMemo(() => {
    if (!gapAnalysisData) return [];
    const dist = gapAnalysisData.secondOrderGapsDistribution;
    
    // Générer une série continue pour les deltas d'écarts de 0 à 15
    return Array.from({ length: 16 }, (_, i) => ({
      delta: `+${i}`,
      frequence: dist[i] || 0
    }));
  }, [gapAnalysisData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Activity className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Calcul des tenseurs d'écarts de second ordre en cours...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-card to-muted/10 border-border/40">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Layers className="w-40 h-40" />
        </div>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Layers className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Équilibreur des Écarts de Second Ordre (Delta Gaps)</CardTitle>
              <CardDescription>
                Analyse avancée de l'espacement et de l'accélération des latences pour prédire les tranches optimales de retour.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground leading-relaxed">
          <p>
            L'<strong>Écart des Écarts (ou Second-Order Gap)</strong> mesure la différence de retard entre les numéros tirés au sein d'une même combinaison. 
            Contrairement à l'analyse classique qui n'observe que le retard brut, cette modélisation met en lumière 
            l'<strong>asymétrie de tension</strong> du tirage. Un tirage hautement probable montre un écart des écarts condensé et stable, 
            évitant les trop grands écarts d'accélération statistique.
          </p>
        </CardContent>
      </Card>

      {/* Alertes de Cadence en Direct */}
      {cadenceAlerts && cadenceAlerts.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5 backdrop-blur-sm overflow-hidden relative">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <CardTitle className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                  Signaux de Cadence Majeurs Détectés
                </CardTitle>
              </div>
              <Badge  className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                {cadenceAlerts.length} {cadenceAlerts.length > 1 ? "Signaux" : "Signal"}
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Les algorithmes de morphologie d'écart ont identifié des numéros en synchronisation parfaite de phase avec leurs cycles de sortie historiques.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cadenceAlerts.slice(0, 3).map((alert) => (
                <div 
                  key={alert.id} 
                  className="p-3 rounded-xl border border-amber-500/10 bg-slate-900/40 hover:bg-slate-900/80 transition-all flex items-start gap-3"
                >
                  {alert.number && (
                    <div className="shrink-0 pt-0.5">
                      <NumberBall number={alert.number} size="sm"  />
                    </div>
                  )}
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-100 truncate">{alert.title}</p>
                    <p className="text-[10px] text-muted-foreground leading-normal line-clamp-2">{alert.description}</p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[9px] font-mono text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                        Confiance : {Math.round(alert.score * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs list */}
      <div className="grid grid-cols-2 md:flex border-b border-border/40 p-1 bg-muted/20 rounded-lg gap-2">
        <Button
          variant={activeTab === "dispersion" ? "secondary" : "ghost"}
          size="sm"
          className="text-xs sm:text-sm flex-1"
          onClick={() => setActiveTab("dispersion")}
        >
          <BarChart3 className="w-4 h-4 mr-1.5 text-purple-400" />
          Dispersion Historique
        </Button>
        <Button
          variant={activeTab === "projection" ? "secondary" : "ghost"}
          size="sm"
          className="text-xs sm:text-sm flex-1"
          onClick={() => setActiveTab("projection")}
        >
          <Sparkles className="w-4 h-4 mr-1.5 text-amber-400" />
          Projections de Tranche
        </Button>
        <Button
          variant={activeTab === "simulator" ? "secondary" : "ghost"}
          size="sm"
          className="text-xs sm:text-sm flex-1"
          onClick={() => setActiveTab("simulator")}
        >
          <Sliders className="w-4 h-4 mr-1.5 text-emerald-400" />
          Optimiseur de Ticket
        </Button>
        <Button
          variant={activeTab === "performance" ? "secondary" : "ghost"}
          size="sm"
          className="text-xs sm:text-sm flex-1 col-span-2 md:col-span-1"
          onClick={() => setActiveTab("performance")}
        >
          <Gauge className="w-4 h-4 mr-1.5 text-blue-400" />
          Performance Insight
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "dispersion" && (
          <motion.div
            key="dispersion"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Chart: Distribution of Delta Gaps */}
            <Card className="lg:col-span-2 bg-card/40 border-border/30 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  Densité Empirique des Écarts de Second Ordre
                </CardTitle>
                <CardDescription className="text-xs">
                  Distribution des écarts des écarts (différence de retard entre numéros triés) sur les 120 derniers tirages.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartBarChart data={chartDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08" />
                    <XAxis dataKey="delta" stroke="#888888" fontSize={11} />
                    <YAxis stroke="#888888" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1e1b4b", borderColor: "#4338ca", borderRadius: "8px" }}
                      labelClassName="text-white font-bold"
                    />
                    <Bar dataKey="frequence" fill="#a855f7" radius={[4, 4, 0, 0]}>
                      {chartDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </RechartBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quick Metrics of Delta Gaps */}
            <div className="space-y-4">
              <Card className="bg-card/40 border-border/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                    Tension Moyenne Globale
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-3xl font-extrabold tracking-tight text-white flex items-baseline gap-1">
                      {projections ? projections.meanEvolution[projections.meanEvolution.length - 1]?.meanGap : "0.0"}
                      <span className="text-xs font-normal text-muted-foreground">tirages</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Indice d'écart moyen entre les retards consécutifs. Plus l'indice est bas, plus le tirage est groupé harmoniquement.
                    </p>
                  </div>
                  <Progress value={65} className="h-1.5" />
                </CardContent>
              </Card>

              <Card className="bg-card/40 border-border/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
                    <span>Motif Majeur Détecté</span>
                    <Badge  className="text-[9px] border-amber-500/30 text-amber-400">
                      Top 1 Probabilité
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="text-xl font-bold font-mono text-purple-300">
                      {projections?.mostProbablePattern}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Ce motif indique la répartition de tranches de premier ordre la plus fréquente observée dans l'histoire pour ce tirage précis.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Linechart: Harmonic Evolution */}
            <Card className="lg:col-span-3 bg-card/40 border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Évolution de l'Indice d'Écart de Second Ordre (30 derniers tirages)
                </CardTitle>
                <CardDescription className="text-xs">
                  Suivi temporel de la déviation standard des retards d'apparition. Des pics d'anomalies précèdent généralement un retour à l'équilibre.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-56 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={projections?.meanEvolution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={11} label={{ value: "Tirages récents →", position: 'insideBottomRight', offset: -5 }} />
                    <YAxis stroke="#888888" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: "#1e1b4b", borderColor: "#4338ca", borderRadius: "8px" }} />
                    <Legend />
                    <Line name="Écart de second ordre moyen" type="monotone" dataKey="meanGap" stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line name="Variance de l'accélération" type="monotone" dataKey="variance" stroke="#a855f7" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === "projection" && (
          <motion.div
            key="projection"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Top Probabilities of Tranches */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {projections?.trancheProbabilities.map((tranche) => (
                <Card key={tranche.id} className={cn("bg-card/40 border-border/30 relative overflow-hidden")}>
                  <div className="absolute top-1 right-2 text-3xl font-extrabold opacity-5 text-white">
                    {tranche.id}
                  </div>
                  <CardHeader className="pb-1 p-4">
                    <Badge className={cn("w-max text-[10px]", tranche.color, tranche.bg, tranche.border)}>
                      Tranche {tranche.id}
                    </Badge>
                    <CardTitle className="text-xs text-muted-foreground mt-2">{tranche.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-white">{tranche.probability}%</span>
                      <span className="text-[10px] text-muted-foreground">de probabilité</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Moyenne attendue : <strong>{tranche.expectedCount}</strong> / tirage
                    </div>
                    <Progress value={tranche.probability} className="h-1 bg-muted/50" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Current Pool distribution of numbers */}
            <Card className="bg-card/30 border-border/20 backdrop-blur-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-emerald-400" />
                  Répartition Actuelle du Pool (Grille 1 - 90)
                </CardTitle>
                <CardDescription className="text-xs">
                  Situation réelle des 90 numéros classés par leur écart actuel. Utilisez ces pools de tranches pour construire votre combinaison idéale.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                {projections?.currentTrancheDistribution.map((tranche) => (
                  <div key={tranche.id} className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className={cn("font-bold flex items-center gap-1.5", tranche.color)}>
                        <span className="w-2 h-2 rounded-full bg-current" />
                        Tranche {tranche.id} : {tranche.name}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {tranche.count} numéros ({tranche.percentage}%)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-muted/10 border border-border/20">
                      {tranche.numbers.slice(0, 24).map((cand) => (
                        <div key={cand.number} className="relative group cursor-pointer">
                          <NumberBall number={cand.number} size="sm" className="w-8 h-8 text-[11px]" />
                          <Badge className="absolute -bottom-1 -right-1 text-[8px] px-1 py-0 bg-background/90 text-muted-foreground border border-border/40 scale-75">
                            {cand.gap}j
                          </Badge>
                        </div>
                      ))}
                      {tranche.count > 24 && (
                        <Badge  className="text-[10px] self-center">
                          + {tranche.count - 24} autres
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Mathematical Summary and Advice */}
            <Card className="bg-purple-950/20 border-purple-500/20">
              <CardContent className="p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-purple-300">Tendance de Tranche Conseillée</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Les statistiques d'écarts de second ordre suggèrent un motif de configuration optimal de type <strong>{projections?.mostProbablePattern}</strong>. 
                    Pour maximiser votre harmonie statistique, nous vous suggérons de composer votre prochain ticket en piochant exactement : 
                    {projections?.trancheProbabilities.map((t, idx) => (
                      <span key={t.id}>
                        {idx > 0 && ", "} <strong>{Math.max(1, Math.round(t.expectedCount))}</strong> numéro(s) dans la <strong>Tranche {t.id}</strong>
                      </span>
                    ))}.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === "simulator" && (
          <motion.div
            key="simulator"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Input Form & Buttons */}
            <Card className="bg-card/40 border-border/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  Évaluez et Optimisez Votre Grille
                </CardTitle>
                <CardDescription className="text-xs">
                  Saisissez votre combinaison de 5 numéros ou laissez l'IA générer la combinaison ayant le meilleur écart de second ordre (Double Gap).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Ex: 5, 12, 33, 49, 78"
                    value={customNumbers}
                    onChange={(e) => setCustomNumbers(e.target.value)}
                    className="flex-1 bg-muted/20 border-border/40 focus-visible:ring-emerald-500 font-bold tracking-widest placeholder:tracking-normal text-center sm:text-left"
                  />
                  <div className="flex gap-2 shrink-0">
                    <Button onClick={handleSimulate} className="bg-emerald-600 hover:bg-emerald-500 text-white flex-1 sm:flex-none">
                      <Timer className="w-4 h-4 mr-1.5" />
                      Analyser
                    </Button>
                    <Button onClick={handleSuggestOptimized}  className="border-purple-500/30 hover:bg-purple-500/10 flex-1 sm:flex-none">
                      <Sparkles className="w-4 h-4 mr-1.5 text-purple-400" />
                      Suggérer IA
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Display */}
            {simulatorResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {/* Visual scorecard */}
                <Card className="bg-gradient-to-br from-card to-muted/20 border-border/30 flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                      Score de Cohérence Statistique
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center p-6 space-y-4 flex-1">
                    <div className="relative flex items-center justify-center">
                      {/* Score Circle */}
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="54"
                          stroke="rgba(255,255,255,0.03)"
                          strokeWidth="8"
                          fill="transparent"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="54"
                          stroke={simulatorResult.harmonyScore >= 75 ? "#10b981" : simulatorResult.harmonyScore >= 50 ? "#f59e0b" : "#ef4444"}
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={339.29}
                          strokeDashoffset={339.29 - (339.29 * simulatorResult.harmonyScore) / 100}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-black text-white">{simulatorResult.harmonyScore}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">HARMONIE</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {simulatorResult.harmonyScore >= 75 ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      )}
                      <span>
                        Profil : <strong>{simulatorResult.harmonyScore >= 75 ? "Optimal" : simulatorResult.harmonyScore >= 50 ? "Moyen" : "Décompensé"}</strong>
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Grid details */}
                <Card className="md:col-span-2 bg-card/40 border-border/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Analyse Harmonique des Écarts
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Écarts de premier et de second ordre calculés pour vos numéros.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Selected balls and gaps */}
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                      {simulatorResult.numbers.map((num: number, idx: number) => (
                        <div key={num} className="flex flex-col items-center gap-1 bg-muted/10 p-2 rounded-xl border border-border/20">
                          <NumberBall number={num} size="sm" />
                          <div className="text-[10px] text-muted-foreground">
                            Écart : <strong className="text-amber-400">{simulatorResult.gaps[idx]}j</strong>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Math breakdown */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/30">
                      <div>
                        <span className="text-xs text-muted-foreground block">Séquence Écarts Triée</span>
                        <span className="text-sm font-bold text-white font-mono">
                          {simulatorResult.sortedGaps.join(" → ")}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Écarts des Écarts (Delta)</span>
                        <span className="text-sm font-bold text-purple-400 font-mono">
                          {simulatorResult.secondOrderGaps.map((d: number) => `+${d}`).join(", ")}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div>
                        <span className="text-xs text-muted-foreground block">Moyenne d'Écart Second Ordre</span>
                        <span className="text-sm font-extrabold text-white">
                          {simulatorResult.mean}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Motif Canonique Déduit</span>
                        <span className="text-sm font-extrabold text-cyan-300 font-mono">
                          {simulatorResult.pattern}
                        </span>
                      </div>
                    </div>

                    {/* Advice block */}
                    <div className="p-3 bg-muted/25 rounded-xl border border-border/30 text-xs">
                      <p className="text-muted-foreground leading-relaxed">
                        {simulatorResult.advice}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === "performance" && performanceInsights && (
          <motion.div
            key="performance"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header / Intro Card */}
            <Card className="bg-gradient-to-br from-card to-muted/10 border-border/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <Gauge className="w-40 h-40" />
              </div>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Gauge className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Analyse de Performance Post-Mortem (Backtesting)</CardTitle>
                      <CardDescription>
                        Évaluation de la précision historique des modèles de cadence et séquence d'écart sur les derniers tirages.
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-xl border border-border/30 self-start sm:self-auto">
                    <span className="text-[10px] text-muted-foreground px-1.5 font-medium">Audit :</span>
                    {[5, 10, 15, 20].map((num) => (
                      <Button
                        key={num}
                        variant={backtestLimit === num ? "secondary" : "ghost"}
                        size="sm"
                        className="text-[10px] h-6 px-2 rounded-lg"
                        onClick={() => setBacktestLimit(num)}
                      >
                        {num} T.
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed">
                <p>
                  Ce module de diagnostic applique **rétroactivement** les algorithmes *Double Gap Sequence* et *Gap Cadence* 
                  à chaque tirage passé, en utilisant exclusivement les données antérieures disponibles à cette date précise. 
                  En comparant ces projections mathématiques pures avec les numéros réellement sortis, nous calculons un score de précision objectif et transparent.
                </p>
              </CardContent>
            </Card>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-card/40 border-border/30 flex flex-col justify-between">
                <CardHeader className="pb-1">
                  <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Hits Moyens (Hybride)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex items-baseline gap-1.5 pt-2">
                    <span className="text-3xl font-black text-white">{performanceInsights.metrics.avgMatchesHybrid}</span>
                    <span className="text-xs text-muted-foreground">/ 5 numéros</span>
                  </div>
                  <Progress value={(performanceInsights.metrics.avgMatchesHybrid / 5) * 100} className="h-1.5 mt-3 bg-white/5" />
                  <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                    Moyenne exacte de numéros prédits dans le Top 5 de l'Ensemble Hybride.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card/40 border-border/30 flex flex-col justify-between">
                <CardHeader className="pb-1">
                  <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Alignement Rythmique (Rank)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex items-baseline gap-1.5 pt-2">
                    <span className="text-3xl font-black text-blue-400">{performanceInsights.metrics.avgAlignmentScore}%</span>
                    <span className="text-xs text-muted-foreground">cohérence</span>
                  </div>
                  <Progress value={performanceInsights.metrics.avgAlignmentScore} className="h-1.5 mt-3 bg-white/5" />
                  <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                    Mesure l'indice de proximité des numéros gagnants au sommet de nos cartes de probabilité.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card/40 border-border/30 flex flex-col justify-between">
                <CardHeader className="pb-1">
                  <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Meilleure Modélisation
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex items-center gap-2 pt-2">
                    <Award className="w-8 h-8 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-white leading-tight">
                        {performanceInsights.metrics.bestModel}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Performance maximale
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
                    Le modèle ayant généré le taux de couverture le plus régulier.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card/40 border-border/30 flex flex-col justify-between">
                <CardHeader className="pb-1">
                  <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Taux de Rentrée (Hits)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                    <div className="flex items-center justify-between border-b border-border/10 pb-1">
                      <span className="text-muted-foreground">0 hit:</span>
                      <span className="font-bold text-white">{performanceInsights.metrics.hitDistributionPercent[0]}%</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/10 pb-1">
                      <span className="text-emerald-400 font-medium">1 hit:</span>
                      <span className="font-bold text-white">{performanceInsights.metrics.hitDistributionPercent[1]}%</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/10 pb-1">
                      <span className="text-blue-400 font-medium">2 hits:</span>
                      <span className="font-bold text-white">{performanceInsights.metrics.hitDistributionPercent[2]}%</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/10 pb-1">
                      <span className="text-purple-400 font-medium">3+ hits:</span>
                      <span className="font-bold text-white">{performanceInsights.metrics.hitDistributionPercent["3+"]}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart */}
            <Card className="bg-card/40 border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-400" />
                  Chronologie des Précisions & Alignements de Séquence
                </CardTitle>
                <CardDescription className="text-xs">
                  Suivi temporel de l'indice d'alignement de pattern et des hits exacts sur les tirages audités.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[...performanceInsights.evaluatedDraws].reverse()}>
                    <defs>
                      <linearGradient id="colorAlignment" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorHybrid" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08" />
                    <XAxis dataKey="draw_name" stroke="#888888" fontSize={9} />
                    <YAxis yAxisId="left" stroke="#888888" fontSize={9} label={{ value: 'Alignement (%)', angle: -90, position: 'insideLeft', style: { fill: '#888888', fontSize: 9 } }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#888888" fontSize={9} label={{ value: 'Hits (0-5)', angle: 90, position: 'insideRight', style: { fill: '#888888', fontSize: 9 } }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1e1b4b", borderColor: "#312e81", borderRadius: "12px" }}
                      labelClassName="text-white font-bold text-xs"
                    />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="alignmentScore" 
                      name="Alignement de Pattern (%)" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorAlignment)" 
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="hybrid.score"
                      name="Hits Stacking Hybride"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="doubleGap.score"
                      name="Hits Double Gap"
                      stroke="#f59e0b"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      dot={{ r: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Detailed Draws Audit */}
            <Card className="bg-card/40 border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-blue-400" />
                  Registre d'Audit Post-Mortem Individuel
                </CardTitle>
                <CardDescription className="text-xs">
                  Comparaison directe entre les numéros gagnants réels et les projections du Top 5 de chaque algorithme.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border/20 bg-muted/20 text-muted-foreground uppercase text-[9px] tracking-wider">
                      <th className="p-4 font-semibold">Tirage / Date</th>
                      <th className="p-4 font-semibold text-center">Résultat Réel</th>
                      <th className="p-4 font-semibold">Projections Double Gap</th>
                      <th className="p-4 font-semibold">Projections Gap Cadence</th>
                      <th className="p-4 font-semibold">Stacking Hybride</th>
                      <th className="p-4 font-semibold text-center">Score d'Alignement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {performanceInsights.evaluatedDraws.map((draw) => (
                      <tr key={draw.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white">{draw.draw_name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{draw.draw_date}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1 justify-center">
                            {draw.winningNumbers.map((num) => (
                              <NumberBall key={num} number={num} size="xs" />
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex gap-1">
                              {draw.doubleGap.predictions.map((num) => {
                                const isMatch = draw.winningNumbers.includes(num);
                                return (
                                  <div key={num} className={cn("relative rounded-full", isMatch && "ring-2 ring-emerald-500 ring-offset-1 ring-offset-background")}>
                                    <NumberBall number={num} size="xs" />
                                  </div>
                                );
                              })}
                            </div>
                            <Badge variant={draw.doubleGap.score > 0 ? "default" : "secondary"} className={cn("text-[10px] px-1.5 h-5", draw.doubleGap.score > 0 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground")}>
                              {draw.doubleGap.score} match{draw.doubleGap.score > 1 ? "es" : ""}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex gap-1">
                              {draw.gapCadence.predictions.map((num) => {
                                const isMatch = draw.winningNumbers.includes(num);
                                return (
                                  <div key={num} className={cn("relative rounded-full", isMatch && "ring-2 ring-emerald-500 ring-offset-1 ring-offset-background")}>
                                    <NumberBall number={num} size="xs" />
                                  </div>
                                );
                              })}
                            </div>
                            <Badge variant={draw.gapCadence.score > 0 ? "default" : "secondary"} className={cn("text-[10px] px-1.5 h-5", draw.gapCadence.score > 0 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground")}>
                              {draw.gapCadence.score} match{draw.gapCadence.score > 1 ? "es" : ""}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex gap-1">
                              {draw.hybrid.predictions.map((num) => {
                                const isMatch = draw.winningNumbers.includes(num);
                                return (
                                  <div key={num} className={cn("relative rounded-full", isMatch && "ring-2 ring-emerald-400 ring-offset-1 ring-offset-background")}>
                                    <NumberBall number={num} size="xs" />
                                  </div>
                                );
                              })}
                            </div>
                            <Badge variant={draw.hybrid.score > 0 ? "default" : "secondary"} className={cn("text-[10px] px-1.5 h-5", draw.hybrid.score > 0 ? "bg-blue-500/15 text-blue-400 border-blue-500/20" : "bg-muted text-muted-foreground")}>
                              {draw.hybrid.score} match{draw.hybrid.score > 1 ? "es" : ""}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className={cn("font-bold text-sm", draw.alignmentScore >= 75 ? "text-emerald-400" : draw.alignmentScore >= 50 ? "text-blue-400" : "text-muted-foreground")}>
                              {draw.alignmentScore}%
                            </span>
                            <span className="text-[9px] text-muted-foreground scale-95 uppercase tracking-wider mt-0.5 whitespace-nowrap">
                              {draw.alignmentScore >= 75 ? "Excellent" : draw.alignmentScore >= 50 ? "Optimal" : "Stable"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
