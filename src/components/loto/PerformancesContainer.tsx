import { useState, lazy, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const BacktestingDashboard = lazy(() =>
  import("@/components/BacktestingDashboard").then((m) => ({ default: m.BacktestingDashboard }))
);
const PredictionPerformanceSummary = lazy(() =>
  import("@/components/PredictionPerformanceSummary").then((m) => ({ default: m.PredictionPerformanceSummary }))
);
const PredictionVsResultsComparison = lazy(() =>
  import("@/components/PredictionVsResultsComparison").then((m) => ({ default: m.PredictionVsResultsComparison }))
);
const AlgorithmPerformanceTracker = lazy(() =>
  import("@/components/AlgorithmPerformanceTracker").then((m) => ({ default: m.AlgorithmPerformanceTracker }))
);

interface PerformancesContainerProps {
  drawName: string;
}

const PerformancesFallback = () => (
  <div className="space-y-6">
    <Skeleton className="h-40 w-full rounded-2xl" />
    <Skeleton className="h-[400px] w-full rounded-2xl" />
  </div>
);

export const PerformancesContainer = ({ drawName }: PerformancesContainerProps) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Professional section header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <LineChart className="w-6 h-6 text-primary" />
            Centre de Performance & Backtesting
          </h2>
          <p className="text-sm text-muted-foreground">
            Suivi historique des précisions, backtesting hors-échantillon et métriques de validation Walk-Forward pour <span className="font-semibold text-primary">{drawName}</span>
          </p>
        </div>
        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 font-mono">
          Rapport Rigoureux Actif
        </Badge>
      </div>

      {/* Rationale and Disclaimer */}
      <Card className="bg-secondary/10 border-border/30">
        <CardContent className="p-4 flex gap-3 items-start">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-bold text-foreground">AIDE AU SUIVI DES METRIQUES :</p>
            <p className="leading-relaxed">
              Le backtesting simule les performances passées des modèles d'analyse sur des données réelles hors-échantillon (Walk-Forward backtesting). Ce suivi empirique permet de mesurer l'asymétrie de distribution de nos modèles par rapport à l'espérance de hasard théorique (~5.6% pour un numéro de loto 5/90). C'est l'outil de référence pour auditer la rigueur scientifique de l'application.
            </p>
          </div>
        </CardContent>
      </Card>

      <Suspense fallback={<PerformancesFallback />}>
        {/* Core Backtesting Tool */}
        <BacktestingDashboard />

        {/* Model-by-model detailed tracking */}
        <div className="pt-6 border-t border-border/30">
          <AlgorithmPerformanceTracker drawName={drawName} />
        </div>

        {/* Real-time automatic comparison */}
        <div className="pt-6 border-t border-border/30">
          <PredictionVsResultsComparison />
        </div>

        {/* Global summary stats */}
        <div className="pt-6 border-t border-border/30">
          <h3 className="text-lg font-semibold text-foreground mb-4">Résumé Global des Résultats</h3>
          <PredictionPerformanceSummary drawName={drawName} />
        </div>
      </Suspense>
    </div>
  );
};
