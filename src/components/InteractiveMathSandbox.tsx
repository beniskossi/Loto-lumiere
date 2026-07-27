import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberBall } from "./NumberBall";
import { 
  Sigma, 
  HelpCircle, 
  TrendingUp, 
  Clock, 
  GitBranch, 
  Zap, 
  HelpCircle as InfoIcon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { ScoreBreakdown, LocalPredictionEngineParams } from "@/hooks/useLocalPredictionEngine";

interface InteractiveMathSandboxProps {
  scores: ScoreBreakdown[];
  params: LocalPredictionEngineParams;
  drawCount: number;
}

export const InteractiveMathSandbox = ({ scores, params, drawCount }: InteractiveMathSandboxProps) => {
  const [selectedNum, setSelectedNum] = useState<number>(45);

  const selectedScore = useMemo(() => {
    return scores.find(s => s.number === selectedNum) || scores[0];
  }, [scores, selectedNum]);

  const handlePrev = () => {
    setSelectedNum(prev => (prev === 1 ? 90 : prev - 1));
  };

  const handleNext = () => {
    setSelectedNum(prev => (prev === 90 ? 1 : prev + 1));
  };

  // Safe parameters extraction
  const wFreq = params.frequencyWeight;
  const wGap = params.gapWeight;
  const wMarkov = params.markovWeight;
  const wMomentum = params.momentumWeight;
  const totalWeight = (wFreq + wGap + wMarkov + wMomentum) || 1;

  // Percentage calculations for real equations display
  const fContribution = selectedScore ? (selectedScore.frequencyScore * wFreq / totalWeight) : 0;
  const gContribution = selectedScore ? (selectedScore.gapScore * wGap / totalWeight) : 0;
  const mContribution = selectedScore ? (selectedScore.markovScore * wMarkov / totalWeight) : 0;
  const moContribution = selectedScore ? ((selectedScore.momentumScore || 0) * wMomentum / totalWeight) : 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-b from-background to-muted/20 shadow-lg">
      <CardHeader className="pb-3 border-b border-border/30">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sigma className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle className="text-base font-bold">Simulateur d'Équations Interactif (XAI)</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-border/50 text-primary">
            Explainable AI Engine
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Sélectionnez un numéro pour décomposer et simuler ses équations stochastiques en temps réel.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Selector Header */}
        <div className="flex items-center justify-between bg-secondary/20 p-3 rounded-xl border border-border/30">
          <Button variant="outline" size="icon" onClick={handlePrev} className="h-8 w-8 rounded-lg shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">Numéro testé :</span>
            <NumberBall number={selectedNum} size="md" className="ring-2 ring-primary/40 ring-offset-2 ring-offset-background" />
            <span className="text-xs font-mono font-bold text-foreground">
              Score : {selectedScore ? (selectedScore.combinedScore * 100).toFixed(1) : 0}%
            </span>
          </div>

          <Button variant="outline" size="icon" onClick={handleNext} className="h-8 w-8 rounded-lg shrink-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* 1-90 Grid Selection */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Grille de Sélection Rapide (1 - 90)
          </span>
          <div className="grid grid-cols-10 gap-1 p-2 bg-background border border-border/40 rounded-xl max-h-[140px] overflow-y-auto no-scrollbar">
            {Array.from({ length: 90 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setSelectedNum(n)}
                className={`h-7 rounded-md text-[10px] font-mono font-bold transition-all flex items-center justify-center border ${
                  selectedNum === n
                    ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105 z-10"
                    : "bg-secondary/20 hover:bg-secondary/60 text-muted-foreground border-border/30"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Formulas breakdown */}
        <div className="space-y-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Décomposition des 4 Piliers Mathématiques
          </span>

          {selectedScore && (
            <div className="space-y-3">
              {/* Pillar 1: Decayed Frequency */}
              <div className="p-3.5 bg-background border border-border/30 rounded-xl space-y-2 hover:border-amber-500/30 transition-colors">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <TrendingUp className="h-4 w-4" />
                    <span>F1 : Fréquence Amortie</span>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px] text-amber-500 bg-amber-500/5">
                    Poids : {wFreq}%
                  </Badge>
                </div>
                
                <div className="text-[11px] bg-secondary/15 p-2 rounded-lg font-mono text-muted-foreground leading-relaxed border border-border/10">
                  <span className="text-foreground font-semibold">Équation :</span> S<sub>freq</sub> = N<sub>occ</sub> × e<sup>-λ × d</sup> / Max<sub>freq</sub>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-[10px] border-t border-border/10 pt-1">
                    <span>• Occurrences historiques : <strong className="text-foreground">{selectedScore.rawFrequency ?? 0} fois</strong></span>
                    <span>• Retard actuel (d) : <strong className="text-foreground">{selectedScore.currentGap ?? 0} tirages</strong></span>
                    <span>• Taux d'amortissement (λ) : <strong className="text-foreground">{params.decayRate.toFixed(3)}</strong></span>
                    <span>• Score normalisé : <strong className="text-amber-500 font-bold">{(selectedScore.frequencyScore * 100).toFixed(1)}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Pillar 2: Poisson Gap */}
              <div className="p-3.5 bg-background border border-border/30 rounded-xl space-y-2 hover:border-orange-500/30 transition-colors">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-orange-500">
                    <Clock className="h-4 w-4" />
                    <span>F2 : Loi de Poisson (Gap)</span>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px] text-orange-500 bg-orange-500/5">
                    Poids : {wGap}%
                  </Badge>
                </div>

                <div className="text-[11px] bg-secondary/15 p-2 rounded-lg font-mono text-muted-foreground leading-relaxed border border-border/10">
                  <span className="text-foreground font-semibold">Équation :</span> P(X ≥ 1) = 1 - e<sup>-k × (d<sub>actuel</sub> / d<sub>moyen</sub>)</sup>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-[10px] border-t border-border/10 pt-1">
                    <span>• Écart moyen : <strong className="text-foreground">{(selectedScore.avgGap ?? 18).toFixed(1)} tirages</strong></span>
                    <span>• Écart constaté (d<sub>actuel</sub>) : <strong className="text-foreground">{selectedScore.currentGap ?? 0}</strong></span>
                    <span>• Facteur Intensité (k) : <strong className="text-foreground">{params.poissonLambda.toFixed(1)}</strong></span>
                    <span>• Score normalisé : <strong className="text-orange-500 font-bold">{(selectedScore.gapScore * 100).toFixed(1)}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Pillar 3: Markov Transitions */}
              <div className="p-3.5 bg-background border border-border/30 rounded-xl space-y-2 hover:border-purple-500/30 transition-colors">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-purple-500">
                    <GitBranch className="h-4 w-4" />
                    <span>F3 : Transition de Markov</span>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px] text-purple-500 bg-purple-500/5">
                    Poids : {wMarkov}%
                  </Badge>
                </div>

                <div className="text-[11px] bg-secondary/15 p-2 rounded-lg font-mono text-muted-foreground leading-relaxed border border-border/10">
                  <span className="text-foreground font-semibold">Équation :</span> P(N<sub>t</sub> | N<sub>t-1</sub>) = Transitions / Somme_transitions
                  <div className="mt-1 grid grid-cols-2 gap-2 text-[10px] border-t border-border/10 pt-1">
                    <span>• Ordre Markov : <strong className="text-foreground">Ordre {params.markovOrder}</strong></span>
                    <span>• Probabilité transition : <strong className="text-foreground">{(selectedScore.markovScore * 100).toFixed(2)}%</strong></span>
                    <span>• Score normalisé : <strong className="text-purple-500 font-bold">{(selectedScore.markovScore * 100).toFixed(1)}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Pillar 4: Ornstein-Uhlenbeck Mean Reversion */}
              <div className="p-3.5 bg-background border border-border/30 rounded-xl space-y-2 hover:border-emerald-500/30 transition-colors">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-emerald-500">
                    <Zap className="h-4 w-4" />
                    <span>F4 : Équilibre & Régression (OU)</span>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px] text-emerald-500 bg-emerald-500/5">
                    Poids : {wMomentum}%
                  </Badge>
                </div>

                <div className="text-[11px] bg-secondary/15 p-2 rounded-lg font-mono text-muted-foreground leading-relaxed border border-border/10">
                  <span className="text-foreground font-semibold">Équation :</span> M = M<sub>somme</sub> × M<sub>parité</sub> × M<sub>décade</sub>
                  <div className="mt-1.5 grid grid-cols-2 gap-2 text-[10px] border-t border-border/10 pt-1.5">
                    <span>• Centrage Médian : <strong className="text-foreground">{(selectedNum - 45.5).toFixed(1)}</strong></span>
                    <span>• Ratio Pairs Récents : <strong className="text-foreground">{((selectedScore.recentEvenRatio ?? 0.5) * 100).toFixed(1)}%</strong></span>
                    <span>• Discrépance Décade : <strong className="text-foreground">{((selectedScore.decadeDiscrepancy ?? 0) * 100).toFixed(1)}%</strong></span>
                    <span>• Score normalisé : <strong className="text-emerald-500 font-bold">{((selectedScore.momentumScore || 0) * 100).toFixed(1)}%</strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Composite Score Calculation Panel */}
        {selectedScore && (
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <InfoIcon className="h-4 w-4 text-primary" />
                Équation Composite Intégrale
              </span>
              <Badge className="bg-primary/90 text-primary-foreground font-mono">
                {(selectedScore.combinedScore * 100).toFixed(1)}%
              </Badge>
            </div>

            {/* Arithmetic layout of the computation with values plugged in */}
            <div className="font-mono text-[11px] space-y-1 bg-background/50 p-3 rounded-xl border border-border/20 text-muted-foreground leading-relaxed">
              <p className="font-semibold text-foreground">S<sub>final</sub> = (F1 × W1 + F2 × W2 + F3 × W3 + F4 × W4) / W<sub>total</sub></p>
              
              <div className="text-[10px] pt-1.5 border-t border-border/10 space-y-1">
                <p className="flex items-center justify-between">
                  <span>• Contribution F1 (Fréquence) :</span>
                  <span className="text-amber-500 font-bold">{(selectedScore.frequencyScore).toFixed(4)} × {wFreq} = {(selectedScore.frequencyScore * wFreq).toFixed(2)}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>• Contribution F2 (Poisson) :</span>
                  <span className="text-orange-500 font-bold">{(selectedScore.gapScore).toFixed(4)} × {wGap} = {(selectedScore.gapScore * wGap).toFixed(2)}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>• Contribution F3 (Markov) :</span>
                  <span className="text-purple-500 font-bold">{(selectedScore.markovScore).toFixed(4)} × {wMarkov} = {(selectedScore.markovScore * wMarkov).toFixed(2)}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>• Contribution F4 (Régression) :</span>
                  <span className="text-emerald-500 font-bold">{((selectedScore.momentumScore || 0)).toFixed(4)} × {wMomentum} = {(((selectedScore.momentumScore || 0) * wMomentum)).toFixed(2)}</span>
                </p>
              </div>

              <div className="pt-2 border-t border-dashed border-border/20 text-xs text-foreground font-bold flex flex-wrap items-center justify-between gap-1.5">
                <span>Calcul en temps réel :</span>
                <span className="text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/20">
                  (({(selectedScore.frequencyScore * wFreq).toFixed(1)} + {(selectedScore.gapScore * wGap).toFixed(1)} + {(selectedScore.markovScore * wMarkov).toFixed(1)} + {(((selectedScore.momentumScore || 0) * wMomentum)).toFixed(1)}) / {totalWeight}) = <strong className="font-extrabold">{(selectedScore.combinedScore * 100).toFixed(1)}%</strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
