import { useState, lazy, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const MainDashboard = lazy(() =>
  import("@/components/MainDashboard").then((m) => ({ default: m.MainDashboard }))
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
      {/* Rationale and Disclaimer */}
      <Card className="bg-secondary/15 border-border/40 backdrop-blur-sm">
        <CardContent className="p-4 flex gap-3 items-start">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-bold text-foreground uppercase tracking-wide">
              AUDIT SCIENTIFIQUE & RIGOUREUX DES PERFORMANCES (WALK-FORWARD)
            </p>
            <p className="leading-relaxed">
              Le backtesting simule les performances passées des modèles d'analyse sur des données réelles hors-échantillon (Walk-Forward validation). Ce suivi empirique permet de mesurer l'asymétrie de distribution de nos modèles par rapport à l'espérance de hasard théorique (~5.56% par numéro).
            </p>
          </div>
        </CardContent>
      </Card>

      <Suspense fallback={<PerformancesFallback />}>
        {/* Core Main Dashboard with Probabilistic Models & Walk-Forward */}
        <MainDashboard drawName={drawName} />

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
          <h3 className="text-lg font-bold text-foreground mb-4">Résumé Global des Résultats</h3>
          <PredictionPerformanceSummary drawName={drawName} />
        </div>
      </Suspense>
    </div>
  );
};
