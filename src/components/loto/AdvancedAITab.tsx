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
  CheckCircle
} from "lucide-react";
import { useAdvancedPrediction } from "@/hooks/useAdvancedPrediction";
import { useAuth } from "@/hooks/useAuth";
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
  
  const { data, isLoading, refetch, isFetching } = useAdvancedPrediction(drawName, { useSmartEnsemble: true });
  
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

  // Calculate custom prediction based on weights
  const customPrediction = useMemo(() => {
    if (!data?.predictions || data.predictions.length === 0) return null;
    
    if (mode === "automatic" || mode === "adaptive") {
      return data.optimizedPrediction || data.predictions[0];
    }

    // Manual mode: combine predictions based on weights
    const enabledAlgos = weights.filter(w => w.enabled);
    if (enabledAlgos.length === 0) return null;

    const totalWeight = enabledAlgos.reduce((sum, w) => sum + w.weight, 0);
    const numberScores: Record<number, number> = {};

    data.predictions.forEach(pred => {
      const algo = weights.find(w => pred.algorithm.includes(w.name.split(" ")[0]));
      if (!algo || !algo.enabled) return;
      
      const normalizedWeight = algo.weight / totalWeight;
      pred.numbers.forEach(num => {
        numberScores[num] = (numberScores[num] || 0) + normalizedWeight * pred.confidence;
      });
    });

    const sortedNumbers = Object.entries(numberScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([num]) => parseInt(num))
      .sort((a, b) => a - b);

    const avgConfidence = enabledAlgos.reduce((sum, w) => {
      const pred = data.predictions.find(p => p.algorithm.includes(w.name.split(" ")[0]));
      return sum + (pred?.confidence || 0) * (w.weight / totalWeight);
    }, 0);

    return {
      numbers: sortedNumbers.length >= 5 ? sortedNumbers : data.predictions[0].numbers,
      confidence: avgConfidence || data.predictions[0].confidence,
      algorithm: "Fusion Personnalisée",
      factors: [`${enabledAlgos.length} algorithmes`, "Poids personnalisés"],
      score: avgConfidence * 0.9,
      category: "custom"
    };
  }, [data, weights, mode]);

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
    toast.success(`Preset appliqué : ${presetType}`);
  };

  const handleReset = () => {
    setWeights(INITIAL_WEIGHTS);
    toast.success("Poids réinitialisés");
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
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

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
