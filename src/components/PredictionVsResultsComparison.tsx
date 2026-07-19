import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberBall } from "@/components/NumberBall";
import { usePredictionComparison, useDeleteOldComparisons } from "@/hooks/usePredictionComparison";
import { useConfetti } from "@/hooks/useConfetti";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { DRAW_SCHEDULE } from "@/types/lottery";
import { GitCompare, TrendingUp, Trophy, AlertCircle, CheckCircle2, XCircle, Sparkles, Award, Target, Trash2, RefreshCw, Clock, CheckCheck, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const PredictionVsResultsComparison = () => {
  const allDraws = Object.values(DRAW_SCHEDULE).flat();
  const [selectedDraw, setSelectedDraw] = useState<string>("all");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showOnlyCompared, setShowOnlyCompared] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  
  const { data: comparisons = [], isLoading, clearCache, refetch, isFetching } = usePredictionComparison(
    selectedDraw === "all" ? undefined : selectedDraw,
    30
  );

  const deleteOldComparisons = useDeleteOldComparisons();

  const [isClearing, setIsClearing] = useState(false);
  
  // Séparer les prédictions comparées des pendantes
  const comparedComparisons = comparisons.filter(c => c.winning_numbers !== null);
  const pendingComparisons = comparisons.filter(c => c.winning_numbers === null);
  
  // Filtrer selon le mode d'affichage
  const displayedComparisons = showOnlyCompared 
    ? comparedComparisons 
    : comparisons;
  
  const handleClearCache = () => {
    setIsClearing(true);
    clearCache();
    setTimeout(() => setIsClearing(false), 500);
  };

  const handleDeleteOld = () => {
    deleteOldComparisons.mutate({ 
      drawName: selectedDraw === "all" ? undefined : selectedDraw,
      olderThanDays: 30 
    });
  };

  const { celebrate, perfectPrediction } = useConfetti();
  const { triggerHaptic } = useHapticFeedback();
  const { playSound } = useSoundEffects();

  // Celebrate perfect predictions
  useEffect(() => {
    if (comparisons.length > 0) {
      const perfectOnes = comparisons.filter(
        (c) => c.matches === c.predicted_numbers.length && c.winning_numbers !== null
      );
      if (perfectOnes.length > 0) {
        perfectPrediction();
        triggerHaptic("success");
        playSound("celebration");
      }
    }
  }, [comparisons, perfectPrediction, triggerHaptic, playSound]);

  const getSuccessColor = (rate: number) => {
    if (rate >= 80) return "text-success";
    if (rate >= 60) return "text-primary";
    if (rate >= 40) return "text-warning";
    return "text-destructive";
  };

  const getSuccessIcon = (matches: number, total: number) => {
    if (matches === total) return <Trophy className="w-4 h-4 text-success" />;
    if (matches >= total * 0.6) return <CheckCircle2 className="w-4 h-4 text-primary" />;
    if (matches > 0) return <AlertCircle className="w-4 h-4 text-warning" />;
    return <XCircle className="w-4 h-4 text-destructive" />;
  };

  const avgSuccessRate =
    comparedComparisons.length > 0
      ? comparedComparisons.reduce((sum, c) => sum + c.success_rate, 0) / comparedComparisons.length
      : 0;

  const totalMatches = comparedComparisons.reduce((sum, c) => sum + c.matches, 0);

  const perfectPredictions = comparedComparisons.filter(
    (c) => c.matches === c.predicted_numbers.length
  ).length;

  const handleCardClick = (predictionId: string, hasResults: boolean) => {
    setExpandedCard(expandedCard === predictionId ? null : predictionId);
    if (hasResults) {
      triggerHaptic("light");
      playSound("click");
    }
  };

  const handleCelebrate = () => {
    celebrate("high");
    triggerHaptic("success");
    playSound("celebration");
  };

  return (
    <Card className="bg-gradient-card border-border/50 animate-fade-in overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <CardHeader className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <GitCompare className="w-5 h-5 text-primary animate-pulse-subtle" />
              Prédictions vs Résultats Réels
            </CardTitle>
            <CardDescription className="mt-2">
              Comparez les prédictions passées avec les résultats réels
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="shrink-0"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Réduire</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Étendre</span>
              </>
            )}
          </Button>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-4 mt-4">
          {/* Ligne 1: Filtres et actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedDraw} onValueChange={setSelectedDraw}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Tous les tirages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les tirages</SelectItem>
                {allDraws.map((draw) => (
                  <SelectItem key={draw.name} value={draw.name}>
                    {draw.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            
            <Button
              variant={showOnlyCompared ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOnlyCompared(!showOnlyCompared)}
            >
              {showOnlyCompared ? (
                <>
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Comparées ({comparedComparisons.length})
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Toutes ({comparisons.length})
                </>
              )}
            </Button>

            {comparedComparisons.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    disabled={deleteOldComparisons.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleteOldComparisons.isPending ? "Suppression..." : "Supprimer anciennes"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer les anciennes prédictions ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action supprimera toutes les prédictions de plus de 30 jours
                      {selectedDraw !== "all" && ` pour le tirage ${selectedDraw}`}.
                      Les comparaisons associées seront également supprimées.
                      Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteOld}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Ligne 2: Statistiques */}
          {!isLoading && comparedComparisons.length > 0 && (
            <motion.div 
              className="flex gap-4 flex-wrap"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div 
                className="bg-primary/10 px-4 py-2 rounded-lg border border-primary/30 hover:scale-105 transition-transform cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-3 h-3 text-primary" />
                  <p className="text-xs text-muted-foreground">Taux Moyen</p>
                </div>
                <p className="text-xl font-bold text-primary">
                  {avgSuccessRate.toFixed(1)}%
                </p>
              </motion.div>
              <motion.div 
                className="bg-success/10 px-4 py-2 rounded-lg border border-success/30 hover:scale-105 transition-transform cursor-pointer group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={perfectPredictions > 0 ? handleCelebrate : undefined}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-3 h-3 text-success group-hover:animate-bounce" />
                  <p className="text-xs text-muted-foreground">Prédictions Parfaites</p>
                </div>
                <p className="text-xl font-bold text-success flex items-center gap-1">
                  {perfectPredictions}
                  {perfectPredictions > 0 && <Sparkles className="w-4 h-4 animate-pulse" />}
                </p>
              </motion.div>
              <motion.div 
                className="bg-accent/10 px-4 py-2 rounded-lg border border-accent/30 hover:scale-105 transition-transform cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-3 h-3 text-accent" />
                  <p className="text-xs text-muted-foreground">Total Correspondances</p>
                </div>
                <p className="text-xl font-bold">{totalMatches}</p>
              </motion.div>
              
              {/* Indicateur prédictions en attente */}
              {pendingComparisons.length > 0 && (
                <motion.div 
                  className="bg-warning/10 px-4 py-2 rounded-lg border border-warning/30"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3 h-3 text-warning" />
                    <p className="text-xs text-muted-foreground">En attente</p>
                  </div>
                  <p className="text-xl font-bold text-warning">{pendingComparisons.length}</p>
                </motion.div>
              )}
            </motion.div>
          )}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-border rounded-lg p-4">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        ) : displayedComparisons.length === 0 ? (
          <div className="text-center py-12">
            <GitCompare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {showOnlyCompared 
                ? "Aucune prédiction comparée pour le moment" 
                : "Aucune prédiction à comparer pour le moment"}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {displayedComparisons.map((comparison, index) => (
                <motion.div
                  key={comparison.prediction_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="border border-border rounded-lg p-4 hover:border-primary/50 hover:shadow-lg transition-all duration-300 bg-card cursor-pointer group"
                  onClick={() => handleCardClick(comparison.prediction_id, !!comparison.winning_numbers)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-xs hover:bg-primary/10 transition-colors">
                        {comparison.draw_name}
                      </Badge>
                      <Badge variant="secondary" className="text-xs hover:scale-105 transition-transform">
                        {comparison.model_used}
                      </Badge>
                      {comparison.confidence_score && (
                        <Badge 
                          variant="default" 
                          className={`text-xs transition-all hover:scale-105 ${
                            comparison.confidence_score >= 0.7 ? "bg-success" : ""
                          }`}
                        >
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Prédiction
                        </Badge>
                      )}
                      {/* Indicateur de statut */}
                      {comparison.is_compared ? (
                        <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                          <CheckCheck className="w-3 h-3 mr-1" />
                          Comparée
                        </Badge>
                      ) : comparison.winning_numbers ? (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Nouvelle
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                          <Clock className="w-3 h-3 mr-1" />
                          En attente
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Prédiction du{" "}
                      {new Date(comparison.prediction_date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {comparison.winning_numbers && (
                    <motion.div 
                      className="flex items-center gap-2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    >
                      <motion.div
                        animate={
                          comparison.matches === comparison.predicted_numbers.length
                            ? { rotate: [0, 360], scale: [1, 1.2, 1] }
                            : {}
                        }
                        transition={{ duration: 0.6 }}
                      >
                        {getSuccessIcon(
                          comparison.matches,
                          comparison.predicted_numbers.length
                        )}
                      </motion.div>
                      <div className="text-right">
                        <motion.p
                          className={`text-2xl font-bold ${getSuccessColor(
                            comparison.success_rate
                          )}`}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          {comparison.success_rate.toFixed(0)}%
                        </motion.p>
                        <p className="text-xs text-muted-foreground">
                          {comparison.matches}/{comparison.predicted_numbers.length} matchs
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Progress Bar */}
                {comparison.winning_numbers && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{ transformOrigin: "left" }}
                  >
                    <Progress
                      value={comparison.success_rate}
                      className="h-2 mb-4"
                    />
                  </motion.div>
                )}

                {/* Numbers Comparison */}
                <AnimatePresence>
                  {expandedCard === comparison.prediction_id || !comparison.winning_numbers ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="grid md:grid-cols-2 gap-4 overflow-hidden"
                    >
                      {/* Predicted Numbers */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                          <TrendingUp className="w-3 h-3" />
                          Numéros Prédits
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {comparison.predicted_numbers.map((num, idx) => {
                            const isMatch =
                              comparison.winning_numbers?.includes(num) || false;
                            return (
                              <motion.div 
                                key={`${num}-${idx}`} 
                                className="relative"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ 
                                  delay: idx * 0.05,
                                  type: "spring",
                                  stiffness: 200
                                }}
                              >
                                <NumberBall
                                  number={num}
                                  size="sm"
                                  className={
                                    isMatch
                                      ? "ring-2 ring-success ring-offset-2 animate-pulse"
                                      : "opacity-50 hover:opacity-70 transition-opacity"
                                  }
                                />
                                {isMatch && (
                                  <motion.div 
                                    className="absolute -top-1 -right-1 bg-success text-white rounded-full w-4 h-4 flex items-center justify-center"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: idx * 0.05 + 0.2, type: "spring" }}
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                  </motion.div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Winning Numbers */}
                      <div>
                        {comparison.winning_numbers ? (
                          <>
                            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                              <Trophy className="w-3 h-3 text-accent" />
                              Résultat Réel
                              {comparison.draw_date && (
                                <span className="text-xs text-muted-foreground font-normal">
                                  ({new Date(comparison.draw_date).toLocaleDateString("fr-FR")})
                                </span>
                              )}
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {comparison.winning_numbers.map((num, idx) => (
                                <motion.div
                                  key={`${num}-${idx}`}
                                  initial={{ scale: 0, rotate: 180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ 
                                    delay: idx * 0.05 + 0.1,
                                    type: "spring",
                                    stiffness: 200
                                  }}
                                >
                                  <NumberBall number={num} size="sm" />
                                </motion.div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <motion.div 
                            className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <AlertCircle className="w-4 h-4 inline mr-2" />
                            Résultat non disponible
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
          </AnimatePresence>
        )}
      </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
