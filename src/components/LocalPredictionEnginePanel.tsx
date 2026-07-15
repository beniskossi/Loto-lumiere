import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { NumberBall } from "./NumberBall";
import { useLocalPredictionEngine } from "@/hooks/useLocalPredictionEngine";
import { Cpu, Sliders, Play, RefreshCw, BarChart2, Info, Check, GitBranch, Binary, BarChart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { InteractiveMathSandbox } from "./InteractiveMathSandbox";

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
  const totalWeight =
    params.frequencyWeight +
    params.gapWeight +
    params.markovWeight +
    params.momentumWeight || 1;

  const relFreq = params.frequencyWeight / totalWeight;
  const relGap = params.gapWeight / totalWeight;
  const relMarkov = params.markovWeight / totalWeight;
  const relMomentum = params.momentumWeight / totalWeight;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left Column: Interactive Parameters & Hyperparameters */}
        <div className="w-full md:w-5/12 space-y-4 animate-fade-in">
          <Card className="border-border/50 bg-card/60 backdrop-blur-xl shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <Sliders className="w-5 h-5 text-primary" />
                Hyper-Paramètres d'Optimisation
              </CardTitle>
              <CardDescription>
                Configurez les poids des piliers stochastiques et calibrez l'algorithme d'inférence.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              
              {/* Frequency Weight Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold flex items-center gap-1.5 text-foreground/90">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Poids Fréquence Amortie (F1)
                  </span>
                  <span className="font-mono font-bold text-amber-500">{params.frequencyWeight}%</span>
                </div>
                <Slider
                  value={[params.frequencyWeight]}
                  max={100}
                  step={5}
                  onValueChange={(val) => updateParam("frequencyWeight", val[0])}
                  className="[&_[role=slider]]:bg-amber-500"
                />
                <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                  Poids accordé aux occurrences passées. L'importance décroît de manière exponentielle avec l'ancienneté.
                </p>
              </div>

              {/* Gap Weight Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold flex items-center gap-1.5 text-foreground/90">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    Poids Écarts de Poisson (F2)
                  </span>
                  <span className="font-mono font-bold text-orange-500">{params.gapWeight}%</span>
                </div>
                <Slider
                  value={[params.gapWeight]}
                  max={100}
                  step={5}
                  onValueChange={(val) => updateParam("gapWeight", val[0])}
                  className="[&_[role=slider]]:bg-orange-500"
                />
                <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                  Poids sur l'anomalie d'écart d'apparition d'un numéro par rapport à sa propre moyenne attendue.
                </p>
              </div>

              {/* Markov Weight Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold flex items-center gap-1.5 text-foreground/90">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    Poids Transition de Markov (F3)
                  </span>
                  <span className="font-mono font-bold text-purple-500">{params.markovWeight}%</span>
                </div>
                <Slider
                  value={[params.markovWeight]}
                  max={100}
                  step={5}
                  onValueChange={(val) => updateParam("markovWeight", val[0])}
                  className="[&_[role=slider]]:bg-purple-500"
                />
                <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                  Mesure la probabilité d'enchaînement séquentiel d'un tirage à l'autre d'après les dernières boules sorties.
                </p>
              </div>

              {/* Momentum Weight Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold flex items-center gap-1.5 text-foreground/90">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Poids Régression Moyenne (F4)
                  </span>
                  <span className="font-mono font-bold text-emerald-500">{params.momentumWeight}%</span>
                </div>
                <Slider
                  value={[params.momentumWeight]}
                  max={100}
                  step={5}
                  onValueChange={(val) => updateParam("momentumWeight", val[0])}
                  className="[&_[role=slider]]:bg-emerald-500"
                />
                <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                  Modèle Ornstein-Uhlenbeck d'équilibrage des sommes et de la parité pour favoriser le retour au centre.
                </p>
              </div>

              {/* Advanced Controls Section */}
              <div className="border-t border-border/40 pt-4 space-y-4">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 flex items-center gap-1.5">
                  <Binary className="w-3.5 h-3.5 text-primary" />
                  Calibrage des Hyper-Paramètres
                </h4>

                {/* Exponential Decay */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Taux d'amortissement exponentiel</span>
                    <span className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold">
                      λ = {params.decayRate.toFixed(3)}
                    </span>
                  </div>
                  <Slider
                    value={[params.decayRate]}
                    min={0.005}
                    max={0.1}
                    step={0.005}
                    onValueChange={(val) => updateParam("decayRate", val[0])}
                  />
                  <p className="text-[10px] text-muted-foreground/70">
                    Plus λ est élevé, plus le modèle oublie vite l'histoire lointaine pour se focaliser sur l'état récent.
                  </p>
                </div>

                {/* Markov Order Selection */}
                <div className="flex items-center justify-between py-2 bg-muted/30 px-3 rounded-lg border border-border/30">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-purple-500" />
                      Ordre de Transition Markov
                    </span>
                    <p className="text-[10px] text-muted-foreground/80">
                      Modélise des séquences d'ordre 1 (tirage t-1) ou d'ordre 2 (t-2).
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant={params.markovOrder === 1 ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-[10px] px-2 rounded-md font-bold"
                      onClick={() => updateParam("markovOrder", 1)}
                    >
                      Ordre 1
                    </Button>
                    <Button
                      variant={params.markovOrder === 2 ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-[10px] px-2 rounded-md font-bold"
                      onClick={() => updateParam("markovOrder", 2)}
                    >
                      Ordre 2
                    </Button>
                  </div>
                </div>

                {/* Poisson Lambda Multiplier */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Facteur Lambda Poisson (Intensité)</span>
                    <span className="font-mono bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded text-[10px] font-bold">
                      k = {params.poissonLambda.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    value={[params.poissonLambda]}
                    min={0.2}
                    max={2.0}
                    step={0.1}
                    onValueChange={(val) => updateParam("poissonLambda", val[0])}
                  />
                  <p className="text-[10px] text-muted-foreground/70">
                    Ajuste la sensibilité de la courbe d'arrivée Poisson face à l'attente prolongée d'un numéro.
                  </p>
                </div>

                {/* History Depth Limit */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Profondeur de l'historique</span>
                    <span className="font-mono text-xs font-semibold text-foreground">{params.historyLimit} tirages</span>
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
                className="w-1/3 text-xs gap-1 border-border/60"
                disabled={isLoading}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button
                size="sm"
                onClick={handleCompute}
                disabled={isLoading || isComputing}
                className="flex-1 text-xs gap-1 font-semibold"
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
          <Card className="border-border/40 bg-gradient-to-br from-secondary/10 to-background shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-secondary/5 border-b border-border/30">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-base text-primary font-bold">
                  <Cpu className="w-5 h-5 text-primary animate-pulse" />
                  Calcul Local en Temps Réel
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono border-border/60">
                  Base : {drawCount} tirages
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Combinaison optimale calculée côté client par convolution matricielle déterministe.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {isLoading || isComputing ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    Convolutions matricielles probabilistes en cours...
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Recommended Balls Container */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Vecteur de Sortie Recommandé (5 boules)
                    </span>
                    <div className="flex flex-wrap gap-4 justify-center py-5 bg-secondary/5 rounded-2xl border border-border/30">
                      {recommendations.map((num, idx) => (
                        <motion.div
                          key={`${num}-${idx}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 120 }}
                        >
                          <NumberBall number={num} size="lg" />
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Scientific Insights */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-blue-500" />
                      Analyse Systémique des Équations
                    </span>
                    <div className="space-y-2">
                      {insights.map((insight, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl text-xs leading-relaxed border border-border/20 bg-muted/40 flex gap-2.5 items-start"
                        >
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div
                            className="text-foreground/90 font-medium"
                            dangerouslySetInnerHTML={{
                              __html: insight
                                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary font-bold font-mono">$1</strong>')
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
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide text-foreground/80">
                    <BarChart2 className="w-4 h-4 text-primary" />
                    Répartition des Scores Combinés (Top 10)
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    Contribution harmonique relative de chaque équation (F1, F2, F3, F4) par candidat.
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowScoresTable(!showScoresTable)}
                  className="text-xs text-primary font-bold h-8 px-2.5 rounded-lg hover:bg-secondary/30"
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
                    <CardContent className="pt-0 pb-4 px-4 space-y-2.5">
                      {top10Scores.map((scoreObj, index) => {
                        const fVal = scoreObj.frequencyScore * relFreq;
                        const gVal = scoreObj.gapScore * relGap;
                        const mVal = scoreObj.markovScore * relMarkov;
                        const moVal = (scoreObj.momentumScore || 0) * relMomentum;
                        const sumVal = fVal + gVal + mVal + moVal || 0.0001;

                        const fPercent = (fVal / sumVal) * 100;
                        const gPercent = (gVal / sumVal) * 100;
                        const mPercent = (mVal / sumVal) * 100;
                        const moPercent = (moVal / sumVal) * 100;

                        return (
                          <div key={scoreObj.number} className="flex items-center gap-3 text-xs">
                            <span className="font-mono font-bold text-muted-foreground w-6 text-right">
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
                                  title={`Fréquence F1: ${Math.round(fPercent)}%`}
                                />
                              )}
                              {gPercent > 0 && (
                                <div
                                  style={{ width: `${gPercent}%` }}
                                  className="h-full bg-orange-500"
                                  title={`Poisson Gaps F2: ${Math.round(gPercent)}%`}
                                />
                              )}
                              {mPercent > 0 && (
                                <div
                                  style={{ width: `${mPercent}%` }}
                                  className="h-full bg-purple-500"
                                  title={`Markov Transitions F3: ${Math.round(mPercent)}%`}
                                />
                              )}
                              {moPercent > 0 && (
                                <div
                                  style={{ width: `${moPercent}%` }}
                                  className="h-full bg-emerald-500"
                                  title={`Régression Moyenne F4: ${Math.round(moPercent)}%`}
                                />
                              )}
                            </div>

                            <span className="font-mono text-[10px] text-muted-foreground w-12 text-right font-semibold">
                              {(scoreObj.combinedScore * 100).toFixed(1)}%
                            </span>
                          </div>
                        );
                      })}

                      {/* Legend */}
                      <div className="grid grid-cols-2 xs:flex xs:justify-center gap-3 text-[10px] font-semibold text-muted-foreground pt-3 border-t border-border/20">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                          F1: Fréquence
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-orange-500" />
                          F2: Poisson Gaps
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-purple-500" />
                          F3: Markov
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                          F4: Régression
                        </span>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          )}

          {hasData && !isLoading && !isComputing && (
            <InteractiveMathSandbox scores={scores} params={params} drawCount={drawCount} />
          )}

        </div>

      </div>
    </div>
  );
};
