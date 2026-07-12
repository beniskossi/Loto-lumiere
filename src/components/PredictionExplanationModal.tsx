import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { NumberBall } from "./NumberBall";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Brain, 
  Cpu, 
  Gauge, 
  HelpCircle, 
  Sparkles, 
  CheckCircle2, 
  TrendingUp, 
  Clock, 
  Waves, 
  Users, 
  Scale, 
  Timer, 
  Zap, 
  Target, 
  ChevronRight,
  Info
} from "lucide-react";
import { useMemo } from "react";

export interface ScoreBreakdown {
  frequency: number;
  pairs: number;
  gap: number;
  equilibrium: number;
  echo: number;
  temporalResonance?: number;
  numericalMomentum?: number;
  spatialClustering?: number;
  composite: number;
}

export interface PairItem {
  numbers: [number, number];
  score: number;
  count: number;
  lastGap: number;
}

interface PredictionExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  drawName: string;
  prediction: {
    numbers: number[];
    confidence: number;
    algorithm: string;
    score: number;
    factors?: string[];
  } | null;
  selectedAlgorithm?: string;
  algorithmReason?: string;
  formulasBreakdown?: ScoreBreakdown;
  narratives?: string[];
  topPairs?: PairItem[];
}

const FORMULA_METRICS = {
  frequency: {
    name: "F1: Fréquence Pondérée",
    icon: TrendingUp,
    description: "Analyse la fréquence historique avec décroissance temporelle exponentielle.",
    color: "bg-blue-500",
    textClass: "text-blue-500",
    maxPoints: 15,
  },
  gap: {
    name: "F2: Gap Adaptatif",
    icon: Clock,
    description: "Détecte les numéros en retard à l'aide d'un Z-score normalisé.",
    color: "bg-amber-500",
    textClass: "text-amber-500",
    maxPoints: 15,
  },
  echo: {
    name: "F3: Échos Inter-Tirages",
    icon: Waves,
    description: "Mesure la résonance d'apparition et les répétitions entre tirages récents.",
    color: "bg-purple-500",
    textClass: "text-purple-500",
    maxPoints: 12,
  },
  pairs: {
    name: "F4: Paires Récurrentes",
    icon: Users,
    description: "Identifie les paires de numéros statistiquement fréquentes.",
    color: "bg-emerald-500",
    textClass: "text-emerald-500",
    maxPoints: 10,
  },
  equilibrium: {
    name: "F5: Équilibre Somme-Parité",
    icon: Scale,
    description: "Vérifie la conformité statistique de la somme et du ratio pair/impair.",
    color: "bg-rose-500",
    textClass: "text-rose-500",
    maxPoints: 8,
  },
  temporalResonance: {
    name: "F6: Résonance Temporelle",
    icon: Timer,
    description: "Détecte des cycles temporels de périodicité d'apparition des numéros.",
    color: "bg-cyan-500",
    textClass: "text-cyan-500",
    maxPoints: 15,
  },
  numericalMomentum: {
    name: "F7: Momentum Numérique",
    icon: Zap,
    description: "Calcule la vélocité et l'accélération des numéros récemment tirés.",
    color: "bg-orange-500",
    textClass: "text-orange-500",
    maxPoints: 15,
  },
  spatialClustering: {
    name: "F8: Clustering Spatial",
    icon: Target,
    description: "Analyse la répartition géométrique des numéros sur la grille.",
    color: "bg-pink-500",
    textClass: "text-pink-500",
    maxPoints: 10,
  },
};

export const PredictionExplanationModal = ({
  isOpen,
  onClose,
  drawName,
  prediction,
  selectedAlgorithm,
  algorithmReason,
  formulasBreakdown,
  narratives = [],
  topPairs = [],
}: PredictionExplanationModalProps) => {
  
  const confidenceLevel = useMemo(() => {
    if (!prediction) return { text: "Indéterminé", color: "text-muted-foreground", bg: "bg-muted", percent: 0 };
    const pct = Math.round(prediction.confidence * 100);
    if (pct >= 80) return { text: "Très Élevé", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", percent: pct };
    if (pct >= 60) return { text: "Élevé", color: "text-cyan-500", bg: "bg-cyan-500/10 border-cyan-500/30", percent: pct };
    if (pct >= 40) return { text: "Modéré", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30", percent: pct };
    return { text: "Faible (Expérimental)", color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/30", percent: pct };
  }, [prediction]);

  const activeBreakdown = useMemo(() => {
    if (formulasBreakdown) return formulasBreakdown;
    if (prediction && (prediction as Record<string, unknown>).breakdown) return (prediction as Record<string, unknown>).breakdown;
    return null;
  }, [formulasBreakdown, prediction]);

  const formulasProgressData = useMemo(() => {
    if (!activeBreakdown) return [];
    
    return Object.entries(FORMULA_METRICS).map(([key, meta]) => {
      const val = (activeBreakdown as Record<string, number>)[key] ?? 0;
      // Convert value between 0 and 100 for visual progress, assuming val is already normalized out of maxPoints or 100.
      const displayVal = Math.min(Math.round(val * 10) / 10, meta.maxPoints);
      const percentage = Math.round((displayVal / meta.maxPoints) * 100);
      
      return {
        key,
        name: meta.name,
        icon: meta.icon,
        description: meta.description,
        value: displayVal,
        maxPoints: meta.maxPoints,
        percentage,
        color: meta.color,
        textClass: meta.textClass,
      };
    });
  }, [activeBreakdown]);

  if (!prediction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-background border border-border">
        
        {/* Header de l'explication */}
        <DialogHeader className="p-6 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary animate-pulse">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">Explication Détaillée de l'IA</DialogTitle>
              <DialogDescription className="text-sm">
                Décryptage des facteurs de décision de l'orchestrateur pour {drawName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Corps défilable */}
        <ScrollArea className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6 pb-4">
            
            {/* L'algorithme sélectionné & la raison */}
            <div className="p-4 rounded-xl border bg-card/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> Algorithme Sélectionné
                </span>
                <Badge variant="outline" className="font-semibold text-xs border-primary/30 text-primary bg-primary/5">
                  {prediction.algorithm || selectedAlgorithm || "FrequencyPro"}
                </Badge>
              </div>
              <p className="text-sm text-foreground/90 font-medium leading-relaxed italic bg-muted/40 p-3 rounded-lg border-l-2 border-primary">
                "{algorithmReason || "Sélection intelligente basée sur le profil de performance historique."}"
              </p>
            </div>

            {/* Section Numéros Prédictés et Confiance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Les Numéros de la Prédiction */}
              <div className="p-4 rounded-xl border bg-card/30 flex flex-col justify-between space-y-4">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Numéros Suggérés
                </span>
                <div className="flex gap-2 justify-center items-center py-2">
                  {prediction.numbers.map((num, idx) => (
                    <NumberBall key={`${num}-${idx}`} number={num} size="md" />
                  ))}
                </div>
                <div className="text-xs text-center text-muted-foreground bg-muted/30 p-2 rounded-lg">
                  Score de combinaison : <span className="font-mono font-semibold text-foreground">{(prediction.score || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Confiance Calibrée */}
              <div className={`p-4 rounded-xl border ${confidenceLevel.bg} flex flex-col justify-between space-y-3`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5" /> Indice de Confiance
                  </span>
                  <span className={`text-xs font-bold ${confidenceLevel.color}`}>
                    {confidenceLevel.text}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 py-1">
                  <span className="text-3xl font-extrabold tracking-tight">{confidenceLevel.percent}%</span>
                  <span className="text-xs text-muted-foreground">de certitude calibrée</span>
                </div>
                <Progress value={confidenceLevel.percent} className="h-2.5 bg-muted/40" />
              </div>
            </div>

            {/* Breakdown des formules */}
            {formulasProgressData.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold tracking-wide text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Poids et Contributions des Formules Mathématiques
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {formulasProgressData.map((formula) => {
                    const Icon = formula.icon;
                    return (
                      <div key={formula.key} className="p-3 rounded-lg border bg-card/40 space-y-2 hover:bg-card/70 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${formula.color}/10 ${formula.textClass}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-semibold text-foreground/90">{formula.name}</span>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground font-semibold">
                            {formula.value} / {formula.maxPoints} pts
                          </span>
                        </div>
                        <Progress value={formula.percentage} className="h-1.5" />
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {formula.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Narratives explicatives / tirages historiques similaires */}
            {narratives.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold tracking-wide text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Analyses Phénoménologiques & Contextuelles
                </h3>
                <div className="space-y-2">
                  {narratives.map((narrative, index) => (
                    <div key={index} className="flex gap-2.5 p-3 rounded-lg bg-muted/30 border text-xs text-foreground/85 leading-relaxed">
                      <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{narrative}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Paires du tirage */}
            {topPairs.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold tracking-wide text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Synergie des Paires Récurrentes Identifiées
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {topPairs.slice(0, 3).map((pair, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border bg-card/20 flex flex-col items-center justify-between text-center space-y-1.5">
                      <div className="flex gap-1.5">
                        <NumberBall number={pair.numbers[0]} size="sm" />
                        <span className="text-muted-foreground self-center text-xs">&</span>
                        <NumberBall number={pair.numbers[1]} size="sm" />
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Apparitions: <span className="font-mono text-foreground font-semibold">{pair.count}</span> | Retard: <span className="font-mono text-foreground font-semibold">{pair.lastGap}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clause de non-responsabilité informative */}
            <div className="flex gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/25 text-[11px] text-muted-foreground leading-relaxed">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                Ces analyses proviennent d'une agrégation algorithmique avancée et probabiliste (mélange de modèles fréquentiels, markoviens et de réseaux de neurones légers). Les résultats passés ne garantissent pas les gains futurs. Jouez de manière responsable.
              </span>
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
