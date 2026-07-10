import { useState, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Brain, Sparkles, Cpu, Zap, GitBranch, SlidersHorizontal, FlaskConical, Compass, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MonteCarloOracle } from "@/components/MonteCarloOracle";
import { MathematicalModelsVisualizer } from "@/components/MathematicalModelsVisualizer";
import { useAdvancedPrediction } from "@/hooks/useAdvancedPrediction";

const OfficialPredictionTab = lazy(() =>
  import("./OfficialPredictionTab").then((m) => ({ default: m.OfficialPredictionTab }))
);
const AdvancedAITab = lazy(() =>
  import("./AdvancedAITab").then((m) => ({ default: m.AdvancedAITab }))
);
const EnhancedPredictionEngine = lazy(() =>
  import("@/components/EnhancedPredictionEngine").then((m) => ({ default: m.EnhancedPredictionEngine }))
);
const ConditionalPredictions = lazy(() =>
  import("@/components/ConditionalPredictions").then((m) => ({ default: m.ConditionalPredictions }))
);
const BacktestingDashboard = lazy(() =>
  import("@/components/BacktestingDashboard").then((m) => ({ default: m.BacktestingDashboard }))
);
const AffinityAndTransforms = lazy(() =>
  import("./AffinityAndTransforms").then((m) => ({ default: m.AffinityAndTransforms }))
);
const PredictionLog = lazy(() =>
  import("@/components/PredictionLog").then((m) => ({ default: m.PredictionLog }))
);

interface PredictionsContainerProps {
  drawName: string;
  selectedDate: Date | undefined;
  onClearDate: () => void;
}

const PredictionsFallback = () => (
  <div className="space-y-6">
    <div className="flex gap-4">
      <Skeleton className="h-10 w-32 rounded-xl" />
      <Skeleton className="h-10 w-32 rounded-xl" />
      <Skeleton className="h-10 w-32 rounded-xl" />
    </div>
    <Skeleton className="h-[400px] w-full rounded-2xl" />
  </div>
);

export const PredictionsContainer = ({
  drawName,
  selectedDate,
  onClearDate,
}: PredictionsContainerProps) => {
  const [activeSubTab, setActiveSubTab] = useState<"official" | "enhanced" | "conditional" | "advanced" | "montecarlo" | "backtesting" | "affinity" | "log">("official");
  const { data } = useAdvancedPrediction(drawName, { useSmartEnsemble: true });
  const basePrediction = data?.optimizedPrediction?.numbers || data?.predictions?.[0]?.numbers || [1, 2, 3, 4, 5];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* En-tête de section professionnel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            Noyau de Prédiction IA & Statistique
          </h2>
          <p className="text-sm text-muted-foreground">
            Accédez aux modélisations stochastiques, calculs matriciels et architectures d'attention neuronale pour le tirage <span className="font-semibold text-primary">{drawName}</span>
          </p>
        </div>
      </div>

      <Tabs
        value={activeSubTab}
        onValueChange={(v) => setActiveSubTab(v as any)}
        className="w-full"
      >
        <TabsList className="flex flex-row w-full h-auto bg-muted/40 p-1.5 rounded-xl mb-6 overflow-x-auto no-scrollbar justify-start gap-1">
          <TabsTrigger
            value="official"
            className="flex-1 min-w-[140px] gap-2 py-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs sm:text-sm font-medium whitespace-nowrap"
          >
            <Target className="w-4 h-4 text-primary" />
            Modèle Officiel
          </TabsTrigger>
          <TabsTrigger
            value="enhanced"
            className="flex-1 min-w-[140px] gap-2 py-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs sm:text-sm font-medium whitespace-nowrap"
          >
            <Zap className="w-4 h-4 text-amber-500" />
            Moteur Avancé (Formules)
          </TabsTrigger>
          <TabsTrigger
            value="conditional"
            className="flex-1 min-w-[140px] gap-2 py-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs sm:text-sm font-medium whitespace-nowrap"
          >
            <GitBranch className="w-4 h-4 text-purple-500" />
            Règles & Corrélations
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            className="flex-1 min-w-[140px] gap-2 py-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs sm:text-sm font-medium whitespace-nowrap"
          >
            <SlidersHorizontal className="w-4 h-4 text-accent" />
            IA Paramétrable
          </TabsTrigger>
          <TabsTrigger
            value="montecarlo"
            className="flex-1 min-w-[140px] gap-2 py-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs sm:text-sm font-medium whitespace-nowrap"
          >
            <Cpu className="w-4 h-4 text-emerald-500" />
            Laboratoire Monte Carlo
          </TabsTrigger>
          <TabsTrigger
            value="affinity"
            className="flex-1 min-w-[140px] gap-2 py-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs sm:text-sm font-medium whitespace-nowrap"
          >
            <Compass className="w-4 h-4 text-primary" />
            Affinités & Écarts
          </TabsTrigger>
          <TabsTrigger
            value="backtesting"
            className="flex-1 min-w-[140px] gap-2 py-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs sm:text-sm font-medium whitespace-nowrap"
          >
            <FlaskConical className="w-4 h-4 text-orange-500" />
            Backtesting & Précision
          </TabsTrigger>
          <TabsTrigger
            value="log"
            className="flex-1 min-w-[140px] gap-2 py-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs sm:text-sm font-medium whitespace-nowrap"
          >
            <History className="w-4 h-4 text-blue-500" />
            Journal (Logs)
          </TabsTrigger>
        </TabsList>

        <Suspense fallback={<PredictionsFallback />}>
          <TabsContent value="official" className="mt-0 focus-visible:outline-none">
            <OfficialPredictionTab
              drawName={drawName}
              selectedDate={selectedDate}
              onClearDate={onClearDate}
            />
          </TabsContent>

          <TabsContent value="enhanced" className="mt-0 focus-visible:outline-none">
            <EnhancedPredictionEngine drawName={drawName} />
          </TabsContent>

          <TabsContent value="conditional" className="mt-0 focus-visible:outline-none">
            <div className="max-w-3xl mx-auto space-y-6">
              <ConditionalPredictions drawName={drawName} />
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="mt-0 focus-visible:outline-none">
            <AdvancedAITab drawName={drawName} />
          </TabsContent>

          <TabsContent value="montecarlo" className="mt-0 focus-visible:outline-none">
             <div className="space-y-6">
               <MonteCarloOracle 
                  drawName={drawName} 
                  initialPredictions={basePrediction} 
               />
               <MathematicalModelsVisualizer />
             </div>
          </TabsContent>

          <TabsContent value="affinity" className="mt-0 focus-visible:outline-none">
            <AffinityAndTransforms drawName={drawName} />
          </TabsContent>

          <TabsContent value="log" className="mt-0 focus-visible:outline-none">
            <PredictionLog />
          </TabsContent>
          <TabsContent value="backtesting" className="mt-0 focus-visible:outline-none">
            <BacktestingDashboard />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
};
