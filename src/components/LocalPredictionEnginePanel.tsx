import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { NumberBall } from "./NumberBall";
import { useLocalPredictionEngine } from "@/hooks/useLocalPredictionEngine";
import { Cpu, Sliders, Play, RefreshCw, BarChart2, Info, Check, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LocalPredictionEnginePanelProps {
  drawName: string;
}

export const LocalPredictionEnginePanel = ({ drawName }: LocalPredictionEnginePanelProps) => {
  const {
    params,
    updateParam,
    isLoading,
    recommendations,
    scores,
    insights,
    hasData,
    drawCount,
    refetchData,
  } = useLocalPredictionEngine(drawName);

  const [isComputing, setIsComputing] = useState(false);
  const [showScoresTable, setShowScoresTable] = useState(true);

  const handleCompute = () => {
    setIsComputing(true);
    setTimeout(() => {
      setIsComputing(false);
    }, 600);
  };

  // Get the top 10 numbers by combined score
  const top10Scores = [...scores]
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, 10);

  // Normalize weights for relative visual bar display
  const totalWeight = params.frequencyWeight + params.gapWeight + params.markovWeight || 1;
  const relFreq = params.frequencyWeight / totalWeight;
  const relGap = params.gapWeight / totalWeight;
  const relMarkov = params.markovWeight / totalWeight;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left Column: Interactive Parameters */}
        <div className="w-full md:w-5/12 space-y-4">
          <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Sliders className="w-5 h-5 text-primary" />
                Paramètres de Pondération
              </CardTitle>
              <CardDescription>
                Ajustez l'importance de chaque formule mathématique pour personnaliser la prédiction.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Frequency Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Poids Fréquence (Chauds)
                  </span>
                  <span className="font-mono text-muted-foreground">{params.frequencyWeight}%</span>
                </div>
                <Slider
                  value={[params.frequencyWeight]}
                  max={100}
                  step={5}
                  onValueChange={(val) => updateParam("frequencyWeight", val[0])}
                  className="[&_[role=slider]]:bg-amber-500"
                />
                <p className="text-[11px] text-muted-foreground">
                  Privilégie les numéros qui sortent le plus souvent à court et long terme.
                </p>
              </div>

              {/* Gap Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    Poids Écarts (Dus)
                  </span>
                  <span className="font-mono text-muted-foreground">{params.gapWeight}%</span>
                </div>
                <Slider
                  value={[params.gapWeight]}
                  max={100}
                  step={5}
                  onValueChange={(val) => updateParam("gapWeight", val[0])}
                  className="[&_[role=slider]]:bg-orange-500"
                />
                <p className="text-[11px] text-muted-foreground">
                  Favorise les numéros avec un grand écart d'absence (proches d'un retour).
                </p>
              </div>

              {/* Markov Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Poids Markov (Séquentiel)
                  </span>
                  <span className="font-mono text-muted-foreground">{params.markovWeight}%</span>
                </div>
                <Slider
                  value={[params.markovWeight]}
                  max={100}
                  step={5}
                  onValueChange={(val) => updateParam("markovWeight", val[0])}
                  className="[&_[role=slider]]:bg-purple-500"
                />
                <p className="text-[11px] text-muted-foreground">
                  Analyse les enchaînements : probabilité qu'un numéro suive ceux du dernier tirage.
                </p>
              </div>

              {/* Advanced Parameters Divider */}
              <div className="border-t border-border/40 pt-4 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Paramètres Avancés de l'Algorithme
                </h4>

                {/* Exponential Decay */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Demi-vie d'amortissement</span>
                    <span className="font-mono">{params.decayRate.toFixed(3)}</span>
                  </div>
                  <Slider
                    value={[params.decayRate]}
                    min={0.005}
                    max={0.1}
                    step={0.005}
                    onValueChange={(val) => updateParam("decayRate", val[0])}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Une valeur élevée réduit le poids des tirages lointains pour se focaliser sur les tendances hyper-récentes.
                  </p>
                </div>

                {/* History Depth Limit */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Données d'entraînement</span>
                    <span className="font-mono">{params.historyLimit} tirages</span>
                  </div>
                  <Slider
                    value={[params.historyLimit]}
                    min={20}
                    max={500}
                    step={10}
                    onValueChange={(val) => updateParam("historyLimit", val[0])}
                  />
                </div>
              </div>

            </CardContent>
            <CardFooter className="pt-2 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchData()}
                className="w-1/3 text-xs gap-1"
                disabled={isLoading}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button
                size="sm"
                onClick={handleCompute}
                disabled={isLoading || isComputing}
                className="flex-1 text-xs gap-1"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Simuler le Calcul
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Recommendations & Visualizations */}
        <div className="w-full md:w-7/12 space-y-4">
          
          {/* Main Results Card */}
          <Card className="border-border/40 bg-gradient-to-br from-secondary/15 to-background shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-secondary/10">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-lg text-primary font-bold">
                  <Cpu className="w-5 h-5 animate-pulse" />
                  Calcul Local en Temps Réel
                </CardTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  Base : {drawCount} tirages
                </Badge>
              </div>
              <CardDescription>
                Ces numéros sont calculés localement dans votre navigateur en croisant les 3 matrices.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {isLoading || isComputing ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground font-medium">
                    Calcul des matrices probabilistes en cours...
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Recommended Balls Container */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Combinaison Recommandée (5 numéros)
                    </span>
                    <div className="flex flex-wrap gap-3 justify-center py-4 bg-background/50 rounded-xl border border-border/40">
                      {recommendations.map((num, idx) => (
                        <motion.div
                          key={`${num}-${idx}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 100 }}
                        >
                          <NumberBall number={num} size="lg" />
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Scientific Insights */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-blue-500" />
                      Analyse Scientifique & Justifications
                    </span>
                    <div className="space-y-2">
                      {insights.map((insight, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg text-xs leading-relaxed border border-border/30 bg-muted/30 flex gap-2.5 items-start"
                        >
                          <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <div
                            dangerouslySetInnerHTML={{
                              __html: insight
                                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary font-bold">$1</strong>')
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </CardContent>
          </Card>

          {/* Detailed Scores Breakdown list */}
          {hasData && !isLoading && !isComputing && (
            <Card className="border-border/50 bg-card/40">
              <CardHeader className="py-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-primary" />
                    Top 10 : Répartition des Scores
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Composition relative des scores pour les meilleurs candidats.
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowScoresTable(!showScoresTable)}
                  className="text-xs text-primary"
                >
                  {showScoresTable ? "Masquer" : "Afficher"}
                </Button>
              </CardHeader>
              
              <AnimatePresence>
                {showScoresTable && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="pt-0 pb-4 px-4 space-y-3">
                      {top10Scores.map((scoreObj, index) => {
                        // Calculate total weighted score parts for display
                        const fVal = scoreObj.frequencyScore * relFreq;
                        const gVal = scoreObj.gapScore * relGap;
                        const mVal = scoreObj.markovScore * relMarkov;
                        const sumVal = fVal + gVal + mVal || 0.0001;

                        const fPercent = (fVal / sumVal) * 100;
                        const gPercent = (gVal / sumVal) * 100;
                        const mPercent = (mVal / sumVal) * 100;

                        return (
                          <div key={scoreObj.number} className="flex items-center gap-3 text-xs">
                            <span className="font-bold text-muted-foreground w-5 text-right">
                              #{index + 1}
                            </span>
                            <div className="w-8">
                              <NumberBall number={scoreObj.number} size="sm" />
                            </div>
                            
                            {/* Proportional Segmented Bar */}
                            <div className="flex-1 h-3 rounded-full overflow-hidden bg-secondary/30 flex">
                              {fPercent > 0 && (
                                <div
                                  style={{ width: `${fPercent}%` }}
                                  className="h-full bg-amber-500"
                                  title={`Fréquence: ${Math.round(fPercent)}%`}
                                />
                              )}
                              {gPercent > 0 && (
                                <div
                                  style={{ width: `${gPercent}%` }}
                                  className="h-full bg-orange-500"
                                  title={`Écarts: ${Math.round(gPercent)}%`}
                                />
                              )}
                              {mPercent > 0 && (
                                <div
                                  style={{ width: `${mPercent}%` }}
                                  className="h-full bg-purple-500"
                                  title={`Markov: ${Math.round(mPercent)}%`}
                                />
                              )}
                            </div>

                            <span className="font-mono text-[10px] text-muted-foreground w-12 text-right">
                              {(scoreObj.combinedScore * 100).toFixed(1)}%
                            </span>
                          </div>
                        );
                      })}

                      {/* Small Legend */}
                      <div className="flex justify-center gap-4 text-[10px] font-medium text-muted-foreground pt-2 border-t border-border/20">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                          Fréquence
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
                          Écarts
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
                          Markov
                        </span>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          )}

        </div>

      </div>
    </div>
  );
};
