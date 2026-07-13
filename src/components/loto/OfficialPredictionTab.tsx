import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Zap, 
  Activity, 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  Info,
  TrendingUp,
  Clock,
  Star,
  RefreshCw,
  BarChart3,
  Lightbulb,
  Copy,
  Share2,
  Target,
  Flame,
  History,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Cpu
} from "lucide-react";
import { useAdvancedPrediction } from "@/hooks/useAdvancedPrediction";
import { useDateDrawResults } from "@/hooks/useDateDrawResults";
import { NumberBall } from "@/components/NumberBall";
import { SmartRecommendations } from "@/components/SmartRecommendations";
import { PredictionPerformanceSummary } from "@/components/PredictionPerformanceSummary";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { isSameDay } from "@/utils/dateUtils";

interface OfficialPredictionTabProps {
  drawName: string;
  selectedDate?: Date;
  onClearDate?: () => void;
}

export const OfficialPredictionTab = ({ drawName, selectedDate, onClearDate }: OfficialPredictionTabProps) => {
  const [useAIOrchestration, setUseAIOrchestration] = useState(false);
  const { data, isLoading, refetch, isFetching } = useAdvancedPrediction(drawName, { 
    useSmartEnsemble: true,
    useAIOrchestration
  });
  const [showDetails, setShowDetails] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [copied, setCopied] = useState(false);

  const isHistoricalView = useMemo(() => selectedDate && !isSameDay(selectedDate, new Date()), [selectedDate]);
  const { data: historicalResults } = useDateDrawResults(selectedDate || new Date());
  const historicalResult = isHistoricalView ? historicalResults?.[drawName] : null;

  // Get the optimized prediction (fusion of all algorithms)
  const officialPrediction = data?.optimizedPrediction || data?.predictions?.[0];
  const confidence = officialPrediction?.confidence || 0;
  const score = officialPrediction?.score || 0;

  // Calculate matches if we have historical results
  const matches = useMemo(() => {
    if (!historicalResult || !officialPrediction) return [];
    return officialPrediction.numbers.filter(n => historicalResult.winningNumbers.includes(n));
  }, [historicalResult, officialPrediction]);

  const handleRefresh = useCallback(async () => {
    toast.info("Actualisation de la prédiction...");
    await refetch();
    toast.success("Prédiction actualisée");
  }, [refetch]);

  const handleCopy = useCallback(() => {
    if (officialPrediction) {
      const numbers = officialPrediction.numbers.join(" - ");
      navigator.clipboard.writeText(numbers);
      setCopied(true);
      toast.success("Numéros copiés !");
      setTimeout(() => setCopied(false), 2000);
    }
  }, [officialPrediction]);

  const handlePlay = useCallback(() => {
    if (officialPrediction) {
      const numbers = officialPrediction.numbers.join(" - ");
      toast.success(`Numéros à jouer : ${numbers}`, {
        duration: 10000,
        action: {
          label: "Copier",
          onClick: handleCopy
        }
      });
    }
  }, [officialPrediction, handleCopy]);

  // Confidence level categorization
  const getConfidenceLevel = useCallback((conf: number) => {
    if (conf >= 0.8) return { label: "Excellent", color: "text-success", bg: "bg-success/10", icon: Flame };
    if (conf >= 0.6) return { label: "Bon", color: "text-primary", bg: "bg-primary/10", icon: TrendingUp };
    if (conf >= 0.4) return { label: "Modéré", color: "text-warning", bg: "bg-warning/10", icon: Target };
    return { label: "Faible", color: "text-muted-foreground", bg: "bg-muted", icon: Info };
  }, []);

  const confidenceLevel = getConfidenceLevel(confidence);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24">
      {/* Historical View Header */}
      {isHistoricalView && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-border/60 bg-secondary/30 backdrop-blur-sm shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary/80 flex items-center justify-center shrink-0">
                    <History className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground tracking-tight">Mode historique</h3>
                    <p className="text-sm font-medium text-muted-foreground">
                      {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                </div>
                {onClearDate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClearDate}
                    className="gap-2 shrink-0 border-border/60 hover:bg-secondary/50 rounded-full px-4"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Retour aujourd'hui</span>
                    <span className="xs:hidden">Auj.</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Historical Result Section */}
      {isHistoricalView && historicalResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/5">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Résultat officiel
                </Badge>
                
                {/* Winning Numbers */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Numéros gagnants</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {historicalResult.winningNumbers.map((num, index) => (
                      <motion.div
                        key={`${num}-${index}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <NumberBall 
                          number={num} 
                          size="lg" 
                          className={cn(
                            "w-12 h-12 sm:w-14 sm:h-14",
                            matches.includes(num) && "ring-2 ring-green-500 ring-offset-2 ring-offset-background"
                          )}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Machine Numbers */}
                {historicalResult.machineNumbers && historicalResult.machineNumbers.length > 0 && (
                  <div className="pt-3 border-t border-border/30">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center justify-center gap-1">
                      <Cpu className="w-3 h-3 text-blue-500" />
                      Numéros machine
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {historicalResult.machineNumbers.map((num, index) => (
                        <motion.div
                          key={`machine-${num}`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5 + index * 0.05 }}
                        >
                          <NumberBall 
                            number={num} 
                            size="md" 
                            className="w-10 h-10 sm:w-11 sm:h-11 opacity-80"
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {officialPrediction && (
                  <div className="pt-4 border-t border-border/50">
                    <p className="text-sm text-muted-foreground mb-2">
                      Correspondances avec la prédiction
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <span className={cn(
                        "text-3xl font-bold",
                        matches.length >= 3 ? "text-green-500" : 
                        matches.length >= 2 ? "text-amber-500" : "text-muted-foreground"
                      )}>
                        {matches.length}/5
                      </span>
                      {matches.length >= 3 && (
                        <Badge className="bg-green-500/20 text-green-600 dark:text-green-400">
                          🎉 Bon score !
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* No Result Message */}
      {isHistoricalView && !historicalResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="w-5 h-5 text-amber-500" />
              <p className="text-sm text-muted-foreground">
                Pas de résultat disponible pour ce tirage à cette date
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            {isHistoricalView ? "Prédiction générée" : "Prédiction Officielle"}
          </h2>
          <p className="text-sm text-muted-foreground">{drawName}</p>
        </div>
        <div className="flex items-center gap-4">
          {!isHistoricalView && (
            <div className="flex items-center gap-2 border border-border/50 bg-muted/20 px-3 py-1.5 rounded-full">
              <Switch 
                id="ai-orchestration" 
                checked={useAIOrchestration}
                onCheckedChange={setUseAIOrchestration}
                className="data-[state=checked]:bg-primary"
              />
              <Label htmlFor="ai-orchestration" className="text-xs font-medium cursor-pointer flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Hybride IA
              </Label>
            </div>
          )}
          {!isHistoricalView && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isFetching}
              className="hover:bg-primary/10"
            >
              <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            </Button>
          )}
        </div>
      </div>

      {/* Main Prediction Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-b from-background to-secondary/20">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-50" />
          
          <CardContent className="relative p-6 sm:p-10">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Activity className="w-12 h-12 animate-pulse text-primary mb-4" />
                <p className="text-muted-foreground animate-pulse">Fusion des algorithmes...</p>
              </div>
            ) : officialPrediction ? (
              <div className="space-y-6">
                {/* Title */}
                <div className="text-center">
                  <Badge className="mb-3 bg-primary/20 text-primary border-primary/30 px-4 py-1">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Prédiction Optimisée
                  </Badge>
                  
                  {data?.isPrecalculated && (
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-2">
                      <Clock className="w-3 h-3" />
                      Pré-calculée pour une réponse rapide
                    </div>
                  )}
                </div>

                {/* Numbers Grid */}
                <div className="flex flex-wrap gap-3 sm:gap-4 justify-center py-4">
                  {officialPrediction.numbers.map((num, index) => (
                    <motion.div
                      key={`${num}-${index}`}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ 
                        delay: index * 0.1, 
                        type: "spring", 
                        stiffness: 200 
                      }}
                      className="relative"
                    >
                      {/* Glow behind ball */}
                      <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl scale-150" />
                      <NumberBall 
                        number={num} 
                        size="lg" 
                        confidence={officialPrediction.confidence * 100}
                        className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 text-lg sm:text-xl shadow-lg shadow-primary/20" 
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Confidence Display */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className={cn("w-4 h-4", confidenceLevel.color)} />
                      <span className="text-sm text-muted-foreground">Confiance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs", confidenceLevel.bg, confidenceLevel.color)}>
                        {confidenceLevel.label}
                      </Badge>
                      <span className="text-2xl font-bold text-primary">
                        {Math.round(confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={confidence * 100} 
                    className="h-2 bg-secondary" 
                  />
                </div>

                {/* Algorithm Info */}
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {officialPrediction.algorithm || "Stacking Ensemble"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">Aucune prédiction disponible</p>
                <Button onClick={() => refetch()} variant="outline">
                  Générer une prédiction
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Buttons */}
      {officialPrediction && !isHistoricalView && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="space-y-3"
        >
          <Button 
            size="lg" 
            onClick={handlePlay}
            className="w-full h-14 text-lg font-semibold gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/30"
          >
            <Zap className="w-5 h-5" />
            Jouer cette prédiction
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCopy}
              className="flex-1 gap-2"
            >
              <Copy className={cn("w-4 h-4", copied && "text-success")} />
              {copied ? "Copié !" : "Copier"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (navigator.share && officialPrediction) {
                  navigator.share({
                    title: `Prédiction ${drawName}`,
                    text: `Mes numéros : ${officialPrediction.numbers.join(" - ")}`,
                  });
                } else {
                  handleCopy();
                }
              }}
              className="flex-1 gap-2"
            >
              <Share2 className="w-4 h-4" />
              Partager
            </Button>
          </div>
        </motion.div>
      )}

      {/* Data Metrics */}
      {data?.dataMetrics && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-secondary/20 border-border/30">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <p className="text-xl font-bold text-foreground">
                      {data.dataMetrics.quality}%
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">Qualité</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-primary" />
                    <p className="text-xl font-bold text-foreground">
                      {data.dataMetrics.freshness}%
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">Fraîcheur</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <BarChart3 className="w-3 h-3 text-accent" />
                    <p className="text-xl font-bold text-foreground">
                      {data.dataMetrics.historicalCount}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">Tirages</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Expandable Details */}
      {officialPrediction && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {/* Details Toggle */}
          <Button
            variant="ghost"
            className="w-full justify-between h-12 text-muted-foreground"
            onClick={() => setShowDetails(!showDetails)}
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span>Détails de la prédiction</span>
            </div>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="mt-2 bg-card/50 border-border/30">
                  <CardContent className="p-4 space-y-4">
                    {/* Algorithm Info */}
                    {data?.algorithmInfo && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                          Algorithme utilisé
                        </h4>
                        <div className="p-3 bg-secondary/30 rounded-lg">
                          <p className="font-medium">{data.algorithmInfo.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {data.algorithmInfo.description}
                          </p>
                          {data.algorithmInfo.strengths?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {data.algorithmInfo.strengths.map((s, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Algorithm Reason */}
                    {data?.algorithmReason && (
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-sm">
                          <strong>Raison du choix :</strong> {data.algorithmReason}
                        </p>
                      </div>
                    )}

                    {/* Factors */}
                    {officialPrediction.factors?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Facteurs clés</h4>
                        <div className="flex flex-wrap gap-2">
                          {officialPrediction.factors.map((factor, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Score Details */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-2 bg-secondary/30 rounded">
                        <span className="text-muted-foreground">Score</span>
                        <p className="font-bold">{score.toFixed(4)}</p>
                      </div>
                      <div className="p-2 bg-secondary/30 rounded">
                        <span className="text-muted-foreground">Catégorie</span>
                        <p className="font-bold">{officialPrediction.category || "Standard"}</p>
                      </div>
                    </div>

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
        </motion.div>
      )}

      {/* Explanations Section */}
      {data?.explanations && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            variant="ghost"
            className="w-full justify-between h-12 text-muted-foreground"
            onClick={() => setShowExplanation(!showExplanation)}
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Explications IA</span>
            </div>
            {showExplanation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          <AnimatePresence>
            {showExplanation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="mt-2 bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/20">
                  <CardContent className="p-4 space-y-4">
                    <p className="text-sm">{data.explanations.summary}</p>
                    
                    {data.explanations.strengths?.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-green-500 mb-2">Points forts</h5>
                        <ul className="space-y-1">
                          {data.explanations.strengths.map((s, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-green-500">✓</span> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {data.explanations.recommendation && (
                      <div className="p-3 bg-primary/5 rounded-lg">
                        <p className="text-sm font-medium">{data.explanations.recommendation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Warning */}
      {data?.warning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-3">
              <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                {data.warning}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Smart Recommendations */}
      {!isHistoricalView && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <SmartRecommendations drawName={drawName} />
        </motion.div>
      )}

      {/* Performance Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <PredictionPerformanceSummary drawName={drawName} />
      </motion.div>
    </div>
  );
};
