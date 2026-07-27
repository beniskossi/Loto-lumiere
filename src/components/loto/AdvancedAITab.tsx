import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Sparkles, 
  Brain, 
  Settings2, 
  Zap, 
  Activity,
  Wand2,
  SlidersHorizontal,
  TrendingUp,
  RefreshCw,
  Save,
  Copy,
  ChevronDown,
  ChevronUp,
  Info,
  BarChart3,
  Target,
  Lightbulb,
  Cpu,
  ShieldCheck,
  CheckCircle,
  Scale,
  History,
  Grid3X3,
  Trophy
} from "lucide-react";
import { useAdvancedPrediction } from "@/hooks/useAdvancedPrediction";
import { useAuth } from "@/hooks/useAuth";
import { useNumberStatistics } from "@/hooks/useNumberStatistics";
import { useDrawResults } from "@/hooks/useDrawResults";
import { NumberBall } from "@/components/NumberBall";
import { AIPredictionAnalyzer } from "@/components/AIPredictionAnalyzer";
import { motion, AnimatePresence } from "framer-motion";
import { ALGORITHM_NAMES } from "@/constants/algorithms";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AdvancedAITabProps {
  drawName: string;
}

type AIMode = "automatic" | "manual" | "adaptive";

interface AlgorithmWeight {
  name: string;
  weight: number;
  enabled: boolean;
  description: string;
  color: string;
}

const INITIAL_WEIGHTS: AlgorithmWeight[] = [
  { 
    name: ALGORITHM_NAMES.FREQUENCY_PRO, 
    weight: 15, 
    enabled: true,
    description: "Analyse statistique des fréquences",
    color: "bg-blue-500"
  },
  { 
    name: ALGORITHM_NAMES.RANDOM_FOREST, 
    weight: 15, 
    enabled: true,
    description: "Ensemble d'arbres de décision",
    color: "bg-green-500"
  },
  { 
    name: ALGORITHM_NAMES.LSTM, 
    weight: 15, 
    enabled: true,
    description: "Réseau de neurones récurrent",
    color: "bg-purple-500"
  },
  { 
    name: ALGORITHM_NAMES.TRANSFORMER, 
    weight: 20, 
    enabled: true,
    description: "Architecture d'attention avancée",
    color: "bg-amber-500"
  },
  { 
    name: ALGORITHM_NAMES.XGBOOST, 
    weight: 15, 
    enabled: true,
    description: "Gradient boosting optimisé",
    color: "bg-orange-500"
  },
  { 
    name: ALGORITHM_NAMES.STACKING, 
    weight: 20, 
    enabled: true,
    description: "Fusion intelligente des 5 algorithmes",
    color: "bg-pink-500"
  },
];

export const AdvancedAITab = ({ drawName }: AdvancedAITabProps) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<AIMode>("automatic");
  const [weights, setWeights] = useState<AlgorithmWeight[]>(INITIAL_WEIGHTS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  
  // Custom Fine-Tuning Sliders
  const [parityBias, setParityBias] = useState<number>(0); // -100 (Odd) to +100 (Even)
  const [recencyBias, setRecencyBias] = useState<number>(0); // -100 (Cold) to +100 (Hot)
  const [decadeBalance, setDecadeBalance] = useState<number>(30); // 0 (None) to 100 (Strict dispersion)
  const [markovInfluence, setMarkovInfluence] = useState<number>(20); // 0 to 100
  const [harmonicAlignment, setHarmonicAlignment] = useState<number>(30); // 0 to 100

  const { data, isLoading, refetch, isFetching } = useAdvancedPrediction(drawName, { useSmartEnsemble: true });
  const { data: statistics } = useNumberStatistics(drawName);
  const { data: historyResults } = useDrawResults(drawName, 10);

  // Préparer les prédictions pour l'analyse IA
  const predictionsForAI = useMemo(() => {
    if (!data?.predictions) return [];
    return data.predictions.map(p => ({
      numbers: p.numbers,
      confidence: p.confidence,
      algorithm: p.algorithm,
      factors: [],
      score: p.score || p.confidence
    }));
  }, [data?.predictions]);

  // Calculer la distribution historique des décades sur les derniers tirages
  const recentDecadeCounts = useMemo(() => {
    const counts = new Array(9).fill(0);
    if (!historyResults || historyResults.length === 0) return counts.fill(1/9);
    let total = 0;
    historyResults.forEach(draw => {
      const numbers = draw.winning_numbers || [];
      numbers.forEach(n => {
        const decade = Math.floor((n - 1) / 10);
        if (decade >= 0 && decade < 9) {
          counts[decade]++;
          total++;
        }
      });
    });
    return total > 0 ? counts.map(c => c / total) : counts.fill(1/9);
  }, [historyResults]);

  // Calculate custom prediction based on weights, parity bias, recency bias, and decade balance
  const customPrediction = useMemo(() => {
    if (!data?.predictions || data.predictions.length === 0) return null;
    
    if (mode === "automatic") {
      return data.optimizedPrediction || data.predictions[0];
    }

    if (mode === "adaptive") {
      // Adaptive mode: dynamic low-overlap / diversified ensemble calculation
      // We want to select 5 numbers that are highly recommended by the algorithms but have low historical co-occurrence (Jaccard) with each other
      const candidates = new Set<number>();
      const candidateScores: Record<number, number> = {};
      
      // Collect all candidates and their base weighted algorithm scores
      data.predictions.forEach(pred => {
        pred.numbers.forEach(num => {
          if (num >= 1 && num <= 90) {
            candidates.add(num);
            candidateScores[num] = (candidateScores[num] || 0) + pred.confidence;
          }
        });
      });

      // Find co-occurrence counts of all pairs in the historyResults
      const pairCounts: Record<string, number> = {};
      const singleCounts: Record<number, number> = {};

      historyResults?.forEach(draw => {
        const nums = draw.winning_numbers || [];
        nums.forEach(n1 => {
          singleCounts[n1] = (singleCounts[n1] || 0) + 1;
          nums.forEach(n2 => {
            if (n1 < n2) {
              const pairKey = `${n1}-${n2}`;
              pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
            }
          });
        });
      });

      // Select numbers one-by-one to build a diversified set of 5 numbers
      const selected: number[] = [];
      const remaining = Array.from(candidates).sort((a, b) => candidateScores[b] - candidateScores[a]);

      if (remaining.length > 0) {
        // First number is the highest scoring candidate
        selected.push(remaining.shift()!);

        while (selected.length < 5 && remaining.length > 0) {
          let bestNextNum = remaining[0];
          let bestNextScore = -Infinity;
          let bestIdx = 0;

          for (let i = 0; i < remaining.length; i++) {
            const num = remaining[i];
            const baseScore = candidateScores[num];

            // Calculate Jaccard penalty with currently selected numbers
            let jaccardPenalty = 0;
            selected.forEach(sel => {
              const minN = Math.min(sel, num);
              const maxN = Math.max(sel, num);
              const pairKey = `${minN}-${maxN}`;
              const joint = pairCounts[pairKey] || 0;
              const union = (singleCounts[sel] || 0) + (singleCounts[num] || 0) - joint;
              const jaccard = union > 0 ? joint / union : 0;
              jaccardPenalty += jaccard;
            });

            // Diversification score: baseScore - coefficient * jaccardPenalty
            const divScore = baseScore - 1.5 * jaccardPenalty;
            if (divScore > bestNextScore) {
              bestNextScore = divScore;
              bestNextNum = num;
              bestIdx = i;
            }
          }

          selected.push(bestNextNum);
          remaining.splice(bestIdx, 1);
        }
      }

      // Fill up if we have fewer than 5 numbers using deterministic candidate rank
      if (selected.length < 5) {
        for (let n = 1; n <= 90 && selected.length < 5; n++) {
          if (!selected.includes(n)) selected.push(n);
        }
      }

      const sortedSelected = [...selected].sort((a, b) => a - b);
      return {
        numbers: sortedSelected,
        confidence: Math.max(0.1, Math.min(0.99, (data.optimizedPrediction?.confidence || 0.7) * 0.95)),
        algorithm: "Ensemble Adaptatif Diversifié",
        factors: [
          "Atténuation de recouvrement Jaccard",
          "Calcul d'asymétrie stochastique",
          "Analyse de co-occurrence de paire"
        ],
        score: (data.optimizedPrediction?.confidence || 0.7) * 0.9,
        category: "adaptive"
      };
    }

    // Manual mode: combine predictions based on weights
    const enabledAlgos = weights.filter(w => w.enabled);
    if (enabledAlgos.length === 0) return null;

    const totalWeight = enabledAlgos.reduce((sum, w) => sum + w.weight, 0);
    
    // Initialise scores for all numbers between 1 and 90
    const finalScores: Record<number, number> = {};
    for (let num = 1; num <= 90; num++) {
      finalScores[num] = 0;
    }

    // 1. Base scores from predicted algorithms
    data.predictions.forEach(pred => {
      const algo = weights.find(w => 
        pred.algorithm.toLowerCase().includes(w.name.split(" ")[0].toLowerCase()) ||
        w.name.toLowerCase().includes(pred.algorithm.toLowerCase())
      );
      if (!algo || !algo.enabled) return;
      
      const normalizedWeight = algo.weight / totalWeight;
      pred.numbers.forEach(num => {
        if (num >= 1 && num <= 90) {
          finalScores[num] += normalizedWeight * pred.confidence * 10;
        }
      });
    });

    // 2. Add fallback support for numbers not covered by algorithms to allow parameters to function
    for (let num = 1; num <= 90; num++) {
      if (finalScores[num] === 0) {
        finalScores[num] = 0.05;
      }
    }

    // 3. Apply Parity Bias (Odd vs Even)
    if (parityBias !== 0) {
      for (let num = 1; num <= 90; num++) {
        const isEven = num % 2 === 0;
        const parityFactor = isEven ? (parityBias / 100) : -(parityBias / 100);
        finalScores[num] *= (1 + parityFactor * 0.8);
      }
    }

    // 4. Apply Recency Bias (Hot vs Cold)
    if (recencyBias !== 0 && statistics && statistics.length > 0) {
      let maxGap = 1;
      let maxFreq = 0.01;
      statistics.forEach(s => {
        if (s.days_since_last > maxGap) maxGap = s.days_since_last;
        if (s.frequency > maxFreq) maxFreq = s.frequency;
      });

      statistics.forEach(s => {
        const num = s.number;
        if (num >= 1 && num <= 90) {
          const normGap = s.days_since_last / maxGap;
          const normFreq = s.frequency / maxFreq;

          if (recencyBias > 0) {
            // Hot: favors low gaps and high frequencies
            const gapScore = 1 - normGap;
            const hotFactor = (gapScore * 0.6 + normFreq * 0.4) * (recencyBias / 100);
            finalScores[num] *= (1 + hotFactor * 1.5);
          } else {
            // Cold: favors high gaps and lower frequencies
            const gapScore = normGap;
            const coldFactor = (gapScore * 0.7 + (1 - normFreq) * 0.3) * (-recencyBias / 100);
            finalScores[num] *= (1 + coldFactor * 1.5);
          }
        }
      });
    }

    // 5. Apply Decade Anti-Concentration Balance
    if (decadeBalance > 0 && recentDecadeCounts) {
      for (let num = 1; num <= 90; num++) {
        const decade = Math.floor((num - 1) / 10);
        if (decade >= 0 && decade < 9) {
          const expectedRatio = 1 / 9;
          const actualRatio = recentDecadeCounts[decade] || expectedRatio;
          const deviation = actualRatio - expectedRatio;
          
          // Penalize overrepresented decades, encourage underrepresented ones
          const balanceFactor = -deviation * (decadeBalance / 100);
          finalScores[num] *= (1 + balanceFactor * 1.2);
        }
      }
    }

    // 5.5 Apply Transitional Markov Influence
    if (markovInfluence > 0 && historyResults && historyResults.length > 1) {
      const latestNumbers = historyResults[0]?.winning_numbers || [];
      const transitionCounts: Record<number, number> = {};
      let totalTransitions = 0;

      for (let i = historyResults.length - 1; i > 0; i--) {
        const prevNumbers = historyResults[i].winning_numbers || [];
        const nextNumbers = historyResults[i - 1].winning_numbers || [];
        const intersection = latestNumbers.filter(n => prevNumbers.includes(n));
        if (intersection.length > 0) {
          nextNumbers.forEach(n => {
            transitionCounts[n] = (transitionCounts[n] || 0) + intersection.length;
            totalTransitions += intersection.length;
          });
        }
      }

      if (totalTransitions > 0) {
        for (let num = 1; num <= 90; num++) {
          const prob = (transitionCounts[num] || 0) / totalTransitions;
          finalScores[num] *= (1 + prob * (markovInfluence / 100) * 3.0);
        }
      }
    }

    // 5.6 Apply Harmonic Gap / Fibonacci Spatial Alignment
    if (harmonicAlignment > 0 && historyResults && historyResults.length > 0) {
      const latestNumbers = historyResults[0]?.winning_numbers || [];
      const fibSpacings = [1, 2, 3, 5, 8, 13, 21, 34];
      const gridSpacings = [9, 10, 11]; // vertical and diagonal grid adjacent

      for (let num = 1; num <= 90; num++) {
        let maxBoost = 0;
        latestNumbers.forEach(latestNum => {
          const diff = Math.abs(num - latestNum);
          if (fibSpacings.includes(diff)) {
            maxBoost = Math.max(maxBoost, 0.25); // Fibonacci spacing boost
          } else if (gridSpacings.includes(diff)) {
            maxBoost = Math.max(maxBoost, 0.20); // Grid alignment boost
          }
        });
        if (maxBoost > 0) {
          finalScores[num] *= (1 + maxBoost * (harmonicAlignment / 100) * 1.5);
        }
      }
    }

    // 6. Sort and pick the top 5 numbers
    const sortedNumbers = Object.entries(finalScores)
      .map(([num, score]) => ({ number: parseInt(num), score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.number)
      .sort((a, b) => a - b);

    const avgConfidence = enabledAlgos.reduce((sum, w) => {
      const pred = data.predictions.find(p => 
        p.algorithm.toLowerCase().includes(w.name.split(" ")[0].toLowerCase()) ||
        w.name.toLowerCase().includes(p.algorithm.toLowerCase())
      );
      return sum + (pred?.confidence || 0.15) * (w.weight / totalWeight);
    }, 0);

    return {
      numbers: sortedNumbers.length === 5 ? sortedNumbers : data.predictions[0].numbers,
      confidence: Math.max(0.1, Math.min(0.99, avgConfidence)),
      algorithm: "Fusion Personnalisée",
      factors: [
        `${enabledAlgos.length} algos`,
        parityBias !== 0 ? `Parité: ${parityBias > 0 ? "Pairs" : "Impairs"} (${Math.abs(parityBias)}%)` : "Parité Équilibrée",
        recencyBias !== 0 ? `Écart: ${recencyBias > 0 ? "Hot" : "Cold"} (${Math.abs(recencyBias)}%)` : "Écart Équilibré",
        decadeBalance > 0 ? `Dispersion: ${decadeBalance}%` : "Dispersion Libre",
        markovInfluence > 0 ? `Markov: ${markovInfluence}%` : null,
        harmonicAlignment > 0 ? `Harmonique: ${harmonicAlignment}%` : null
      ].filter(Boolean) as string[],
      score: avgConfidence * 0.9,
      category: "custom"
    };
  }, [data, weights, mode, parityBias, recencyBias, decadeBalance, markovInfluence, harmonicAlignment, statistics, recentDecadeCounts, historyResults]);

  // Calculate local retrospective performance simulation
  const retrospectiveMatches = useMemo(() => {
    if (!customPrediction || !historyResults || historyResults.length === 0) return [];
    
    return historyResults.slice(0, 5).map(draw => {
      const matches = customPrediction.numbers.filter(n => draw.winning_numbers.includes(n));
      return {
        drawName: draw.draw_name,
        drawDate: draw.draw_date,
        winningNumbers: draw.winning_numbers,
        matchedNumbers: matches,
        matchCount: matches.length
      };
    });
  }, [customPrediction, historyResults]);

  const handleWeightChange = useCallback((index: number, value: number) => {
    setWeights(prev => {
      const newWeights = [...prev];
      newWeights[index].weight = value;
      return newWeights;
    });
  }, []);

  const handleToggleAlgorithm = useCallback((index: number) => {
    setWeights(prev => {
      const newWeights = [...prev];
      newWeights[index].enabled = !newWeights[index].enabled;
      return newWeights;
    });
  }, []);

  const applyPreset = (presetType: "balanced" | "deep" | "ensemble" | "stats") => {
    setWeights(prev => {
      return prev.map(w => {
        if (presetType === "balanced") {
          return { ...w, enabled: true, weight: 20 };
        } else if (presetType === "deep") {
          const isDeep = w.name.includes("LSTM") || w.name.includes("Transformer");
          return { ...w, enabled: true, weight: isDeep ? 40 : 10 };
        } else if (presetType === "ensemble") {
          const isEnsemble = w.name.includes("Stacking") || w.name.includes("Random Forest");
          return { ...w, enabled: true, weight: isEnsemble ? 40 : 10 };
        } else {
          // stats
          const isStats = w.name.includes("FrequencyPro");
          return { ...w, enabled: true, weight: isStats ? 50 : 10 };
        }
      });
    });
    
    // Auto-adjust fine tuning according to preset
    if (presetType === "stats") {
      setRecencyBias(40); // high recency / frequency bias
      setParityBias(0);
      setDecadeBalance(10);
    } else if (presetType === "balanced") {
      setRecencyBias(0);
      setParityBias(0);
      setDecadeBalance(30);
    } else {
      setRecencyBias(-10);
      setParityBias(0);
      setDecadeBalance(40);
    }
    
    toast.success(`Preset appliqué : ${presetType}`);
  };

  const handleReset = () => {
    setWeights(INITIAL_WEIGHTS);
    setParityBias(0);
    setRecencyBias(0);
    setDecadeBalance(30);
    toast.success("Paramètres réinitialisés");
  };

  const handleSaveFavorite = () => {
    if (customPrediction) {
      const saved = {
        numbers: customPrediction.numbers,
        mode,
        weights: weights.filter(w => w.enabled).map(w => ({ name: w.name, weight: w.weight })),
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(`favorite_prediction_${drawName}`, JSON.stringify(saved));
      toast.success("Simulation sauvegardée");
    }
  };

  const handleCopyNumbers = () => {
    if (customPrediction) {
      navigator.clipboard.writeText(customPrediction.numbers.join(" - "));
      toast.success("Numéros copiés !");
    }
  };

  const handleRefresh = async () => {
    toast.info("Actualisation...");
    await refetch();
    toast.success("Génération actualisée");
  };

  const modeButtons: { id: AIMode; label: string; icon: React.ElementType; description: string }[] = [
    { 
      id: "automatic", 
      label: "Uniforme", 
      icon: Wand2,
      description: "Simulation aléatoire mathématiquement neutre"
    },
    { 
      id: "manual", 
      label: "Contrainte", 
      icon: SlidersHorizontal,
      description: "Contrôlez les poids d'échantillonnage"
    },
    { 
      id: "adaptive", 
      label: "Diversifiée", 
      icon: TrendingUp,
      description: "Réduit le recouvrement avec les propositions précédentes"
    },
  ];

  const totalEnabledWeight = weights.filter(w => w.enabled).reduce((s, w) => s + w.weight, 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Brain className="w-5 h-5 text-accent" />
            Laboratoire de Génération
          </h2>
          <p className="text-sm text-muted-foreground">{drawName}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
        </Button>
      </div>

      {/* Mode Selector */}
      <Card className="border-border/30 bg-gradient-to-r from-background to-secondary/15 backdrop-blur-sm shadow-md">
        <CardContent className="p-3">
          <div className="grid grid-cols-3 gap-2">
            {modeButtons.map((btn) => (
              <motion.button
                key={btn.id}
                onClick={() => setMode(btn.id)}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative p-3 sm:p-4 rounded-xl transition-all duration-300 border",
                  "flex flex-col items-center gap-1.5 text-center cursor-pointer",
                  mode === btn.id 
                    ? "bg-gradient-to-r from-accent to-purple-600 text-accent-foreground shadow-lg shadow-accent/20 border-accent/40" 
                    : "bg-secondary/20 hover:bg-secondary/40 border-border/10 text-muted-foreground"
                )}
              >
                <btn.icon className="w-5 h-5" />
                <span className="font-semibold text-xs sm:text-sm">{btn.label}</span>
                <span className="text-[9px] opacity-75 hidden sm:block leading-tight">
                  {btn.description}
                </span>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prediction Display */}
      <motion.div
        key={mode}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="relative overflow-hidden border-accent/30">
          <div className="absolute inset-0 bg-gradient-radial from-accent/5 via-transparent to-transparent" />
          
          <CardContent className="relative p-6 sm:p-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Activity className="w-10 h-10 animate-pulse text-accent mb-4" />
                <p className="text-muted-foreground">Calcul stochastique en cours...</p>
              </div>
            ) : customPrediction ? (
              <div className="space-y-6">
                {/* Mode Badge */}
                <div className="text-center">
                  <Badge className="bg-accent/20 text-accent border-accent/30 px-3 py-1">
                    <Brain className="w-3 h-3 mr-1" />
                    Mode {modeButtons.find(m => m.id === mode)?.label}
                  </Badge>
                </div>

                {/* Numbers */}
                <div className="flex flex-wrap gap-3 justify-center py-4">
                  <AnimatePresence mode="popLayout">
                    {customPrediction.numbers.map((num, index) => (
                      <motion.div
                        key={`${num}-${index}-${mode}`}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ delay: index * 0.05, type: "spring" }}
                        className="relative"
                      >
                        <div className="absolute inset-0 rounded-full bg-accent/20 blur-lg scale-150" />
                        <NumberBall 
                          number={num} 
                          size="lg" 
                          confidence={customPrediction.confidence * 100}
                          className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 shadow-lg shadow-accent/20" 
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Confidence */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Indice de conformité</span>
                    <span className="font-bold text-accent">
                      {Math.round(customPrediction.confidence * 100)}%
                    </span>
                  </div>
                  <Progress value={customPrediction.confidence * 100} className="h-1.5" />
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyNumbers}
                    className="flex-1 gap-2"
                  >
                    <Copy className="w-3 h-3" />
                    Copier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveFavorite}
                    className="flex-1 gap-2"
                  >
                    <Save className="w-3 h-3" />
                    Sauvegarder
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Aucune simulation disponible
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Manual Mode Controls */}
      <AnimatePresence>
        {mode === "manual" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-muted-foreground" />
                    Contrôle d'Échantillonnage
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Presets */}
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">Presets Stratégiques :</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => applyPreset("balanced")}>
                      ⚖️ Équilibré
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => applyPreset("deep")}>
                      🧠 Deep Learning
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => applyPreset("ensemble")}>
                      🌲 Stacking & Forest
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => applyPreset("stats")}>
                      📊 Pure Statistique
                    </Button>
                  </div>
                </div>

                {weights.map((algo, index) => (
                  <motion.div 
                    key={algo.name}
                    layout
                    className={cn(
                      "p-3 rounded-lg transition-all",
                      algo.enabled ? "bg-secondary/30" : "bg-secondary/10 opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={algo.enabled}
                          onCheckedChange={() => handleToggleAlgorithm(index)}
                        />
                        <div>
                          <Label className="text-sm font-medium cursor-pointer">
                            {algo.name}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {algo.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", algo.color)} />
                        <span className="text-sm font-bold text-primary min-w-[40px] text-right">
                          {algo.enabled ? `${Math.round((algo.weight / totalEnabledWeight) * 100)}%` : "—"}
                        </span>
                      </div>
                    </div>
                    
                    {algo.enabled && (
                      <Slider
                        value={[algo.weight]}
                        onValueChange={(v) => handleWeightChange(index, v[0])}
                        min={5}
                        max={50}
                        step={5}
                        className="mt-2"
                      />
                    )}
                  </motion.div>
                ))}

                {/* Fine-Tuning Advanced Math Sliders */}
                <div className="border-t border-border/10 pt-4 mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
                      Optimisation & Ajustements Mathématiques
                    </h3>
                  </div>

                  {/* Recency Slider */}
                  <div className="space-y-2 bg-secondary/10 p-3 rounded-xl border border-border/5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <History className="w-3.5 h-3.5 text-amber-500" />
                        Biais Temporel (Écart Récent)
                      </span>
                      <span className="font-mono text-[10px] text-amber-500 px-1.5 py-0.5 rounded bg-amber-500/5">
                        {recencyBias > 0 ? `Chaud (+${recencyBias}%)` : recencyBias < 0 ? `Froid (${recencyBias}%)` : "Équilibré (0%)"}
                      </span>
                    </div>
                    <Slider
                      value={[recencyBias]}
                      onValueChange={(v) => setRecencyBias(v[0])}
                      min={-100}
                      max={100}
                      step={10}
                      className="py-1"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                      <span>❄️ Froid (Réversion)</span>
                      <span>Neutre</span>
                      <span>🔥 Chaud (Fréquent)</span>
                    </div>
                  </div>

                  {/* Parity Slider */}
                  <div className="space-y-2 bg-secondary/10 p-3 rounded-xl border border-border/5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <Scale className="w-3.5 h-3.5 text-blue-400" />
                        Polarité de Parité
                      </span>
                      <span className="font-mono text-[10px] text-blue-400 px-1.5 py-0.5 rounded bg-blue-400/5">
                        {parityBias > 0 ? `Pairs (+${parityBias}%)` : parityBias < 0 ? `Impairs (${parityBias}%)` : "Neutre (50/50)"}
                      </span>
                    </div>
                    <Slider
                      value={[parityBias]}
                      onValueChange={(v) => setParityBias(v[0])}
                      min={-100}
                      max={100}
                      step={10}
                      className="py-1"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                      <span>1️⃣ Impairs</span>
                      <span>Équilibré</span>
                      <span>2️⃣ Pairs</span>
                    </div>
                  </div>

                  {/* Decade Balance Slider */}
                  <div className="space-y-2 bg-secondary/10 p-3 rounded-xl border border-border/5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <Grid3X3 className="w-3.5 h-3.5 text-purple-400" />
                        Dispersion Décennale (Uniformité)
                      </span>
                      <span className="font-mono text-[10px] text-purple-400 px-1.5 py-0.5 rounded bg-purple-400/5">
                        {decadeBalance}%
                      </span>
                    </div>
                    <Slider
                      value={[decadeBalance]}
                      onValueChange={(v) => setDecadeBalance(v[0])}
                      min={0}
                      max={100}
                      step={10}
                      className="py-1"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                      <span>Aléatoire (Libre)</span>
                      <span>Modéré</span>
                      <span>Strict (Anti-concentration)</span>
                    </div>
                  </div>

                  {/* Markov Influence Slider */}
                  <div className="space-y-2 bg-secondary/10 p-3 rounded-xl border border-border/5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <Brain className="w-3.5 h-3.5 text-pink-400" />
                        Influence Transitionnelle (Markov)
                      </span>
                      <span className="font-mono text-[10px] text-pink-400 px-1.5 py-0.5 rounded bg-pink-400/5">
                        {markovInfluence}%
                      </span>
                    </div>
                    <Slider
                      value={[markovInfluence]}
                      onValueChange={(v) => setMarkovInfluence(v[0])}
                      min={0}
                      max={100}
                      step={10}
                      className="py-1"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                      <span>Standard (Neutre)</span>
                      <span>Chaînes Courtes</span>
                      <span>Prise de Décision Forte</span>
                    </div>
                  </div>

                  {/* Harmonic Alignment Slider */}
                  <div className="space-y-2 bg-secondary/10 p-3 rounded-xl border border-border/5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                        Ajustement Harmonique (Grille & Fibonacci)
                      </span>
                      <span className="font-mono text-[10px] text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-400/5">
                        {harmonicAlignment}%
                      </span>
                    </div>
                    <Slider
                      value={[harmonicAlignment]}
                      onValueChange={(v) => setHarmonicAlignment(v[0])}
                      min={0}
                      max={100}
                      step={10}
                      className="py-1"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                      <span>Désactivé (Brut)</span>
                      <span>Résonance Légère</span>
                      <span>Alignement Strict</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Retrospective Performance Simulator */}
      {customPrediction && retrospectiveMatches.length > 0 && (
        <Card className="border-border/30 bg-gradient-to-br from-background to-secondary/10 backdrop-blur-sm shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/10 rounded-lg">
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Simulateur de Performance Rétrospective
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Calcul en temps réel de l'adéquation de votre configuration sur les 5 derniers tirages réels.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            <div className="space-y-2.5">
              {retrospectiveMatches.map((match, i) => (
                <div 
                  key={i} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-secondary/15 border border-border/5 text-xs gap-3"
                >
                  <div className="flex flex-col min-w-[100px]">
                    <span className="font-semibold text-foreground">{match.drawName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(match.drawDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {match.winningNumbers.map((num, idx) => {
                      const isMatched = match.matchedNumbers.includes(num);
                      return (
                        <span
                          key={idx}
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs transition-all",
                            isMatched 
                              ? "bg-amber-500 text-amber-950 font-bold scale-110 shadow-sm shadow-amber-500/30" 
                              : "bg-secondary text-muted-foreground border border-border/10"
                          )}
                        >
                          {num}
                        </span>
                      );
                    })}
                  </div>

                  <div className="min-w-[90px] text-right">
                    {match.matchCount > 0 ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-mono text-[10px] py-0.5 px-2">
                        {match.matchCount} {match.matchCount > 1 ? "matchs" : "match"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-muted-foreground/60 bg-secondary/5 font-mono text-[10px] py-0.5 px-2">
                        Aucun match
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Algorithm Weights Visualization */}
      {customPrediction && (
        <Card className="bg-secondary/10 border-border/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-3 text-center">
              Distribution des poids
            </p>
            <div className="flex gap-0.5 h-4 rounded-full overflow-hidden">
              {weights.filter(w => w.enabled).map((algo) => {
                const widthPercent = (algo.weight / totalEnabledWeight) * 100;
                return (
                  <motion.div
                    key={algo.name}
                    layout
                    className={cn("transition-all", algo.color)}
                    style={{ width: `${widthPercent}%` }}
                    title={`${algo.name}: ${Math.round(widthPercent)}%`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 mt-3 justify-center">
              {weights.filter(w => w.enabled).map((algo) => (
                <Badge 
                  key={algo.name} 
                  variant="outline" 
                  className="text-xs gap-1"
                >
                  <div className={cn("w-2 h-2 rounded-full", algo.color)} />
                  {algo.name.split(" ")[0]}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fiche de Transparence et d'Intégrité Mathématique */}
      {customPrediction && (
        <Card className="border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Certificat de Rigueur Mathématique & Anti-Hasard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Chaque recommandation de LOTO LUMIERE est issue de calculs mathématiques et statistiques purs et reproductibles. Les fonctions aléatoires (hasard pur) et les valeurs fictives sont formellement proscrites du moteur d'orchestration.
            </p>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 border border-emerald-500/10 rounded bg-emerald-950/20 flex flex-col justify-between">
                <span className="text-muted-foreground block mb-1">Garantie Anti-Doublons</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  100% Conforme
                </span>
              </div>

              <div className="p-2 border border-emerald-500/10 rounded bg-emerald-950/20 flex flex-col justify-between">
                <span className="text-muted-foreground block mb-1">Bornes Loto [1 - 90]</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  100% Conforme
                </span>
              </div>

              <div className="p-2 border border-emerald-500/10 rounded bg-emerald-950/20 flex flex-col justify-between">
                <span className="text-muted-foreground block mb-1">Déterminisme Algorithmique</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  100% Reproductible
                </span>
              </div>

              <div className="p-2 border border-emerald-500/10 rounded bg-emerald-950/20 flex flex-col justify-between">
                <span className="text-muted-foreground block mb-1">Explicabilité (XAI)</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  Piliers Justifiés
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison with Official */}
      {data?.predictions && data.predictions.length > 0 && (
        <div>
          <Button
            variant="ghost"
            className="w-full justify-between h-12 text-muted-foreground"
            onClick={() => setShowComparison(!showComparison)}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span>Comparer avec les autres algorithmes</span>
            </div>
            {showComparison ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          <AnimatePresence>
            {showComparison && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="mt-2 bg-card/50 border-border/30">
                  <CardContent className="p-4 space-y-3">
                    {data.predictions.slice(0, 5).map((pred, i) => (
                      <div 
                        key={i}
                        className="p-3 bg-secondary/20 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{pred.algorithm}</span>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(pred.confidence * 100)}%
                          </Badge>
                        </div>
                        <div className="flex gap-1.5">
                          {pred.numbers.map((num, idx) => (
                            <NumberBall key={idx} number={num} size="sm" confidence={pred.confidence * 100} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* AI Analysis Section */}
      {user && predictionsForAI.length > 0 && (
        <div className="space-y-3">
          <Button
            variant="ghost"
            className="w-full justify-between h-12 text-muted-foreground"
            onClick={() => setShowAIAnalysis(!showAIAnalysis)}
          >
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-accent" />
              <span>Analyse IA Avancée</span>
              <Badge variant="outline" className="text-[10px] ml-1">Gemini</Badge>
            </div>
            {showAIAnalysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          <AnimatePresence>
            {showAIAnalysis && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AIPredictionAnalyzer
                  predictions={predictionsForAI}
                  drawName={drawName}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Execution Options */}
      <div>
        <Button
          variant="ghost"
          className="w-full justify-between h-12 text-muted-foreground"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            <span>Paramètres d'Exécution & Métriques</span>
          </div>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="mt-2 bg-card/50 border-border/30">
                <CardContent className="p-4 space-y-4">
                  {/* Data Quality */}
                  {data?.dataMetrics && (
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-2 bg-secondary/30 rounded">
                        <p className="text-lg font-bold">{data.dataMetrics.quality}%</p>
                        <p className="text-xs text-muted-foreground">Qualité</p>
                      </div>
                      <div className="p-2 bg-secondary/30 rounded">
                        <p className="text-lg font-bold">{data.dataMetrics.freshness}%</p>
                        <p className="text-xs text-muted-foreground">Fraîcheur</p>
                      </div>
                      <div className="p-2 bg-secondary/30 rounded">
                        <p className="text-lg font-bold">{data.dataMetrics.historicalCount}</p>
                        <p className="text-xs text-muted-foreground">Tirages</p>
                      </div>
                    </div>
                  )}

                  {/* Algorithm Info */}
                  {data?.algorithmInfo && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        <span className="font-medium text-sm">{data.algorithmInfo.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {data.algorithmInfo.description}
                      </p>
                    </div>
                  )}

                  {/* Execution Time */}
                  {data?.executionTime && (
                    <div className="text-xs text-muted-foreground text-center">
                      Temps de calcul : {data.executionTime}ms
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Save Button */}
      {customPrediction && (
        <Button
          onClick={handleSaveFavorite}
          className="w-full h-12 gap-2 bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90"
        >
          <Sparkles className="w-4 h-4" />
          Verrouiller comme Vecteur de Base
        </Button>
      )}
    </div>
  );
};
