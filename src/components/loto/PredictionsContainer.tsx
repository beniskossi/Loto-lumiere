import { useState, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, History, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const OfficialPredictionTab = lazy(() =>
  import("./OfficialPredictionTab").then((m) => ({ default: m.OfficialPredictionTab }))
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
    </div>
    <Skeleton className="h-[400px] w-full rounded-2xl" />
  </div>
);

export const PredictionsContainer = ({
  drawName,
  selectedDate,
  onClearDate,
}: PredictionsContainerProps) => {
  const [activeSubTab, setActiveSubTab] = useState<"official" | "log">("official");

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Professional header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Espace Génération de Grilles
          </h2>
          <p className="text-sm text-muted-foreground">
            Suggérez des grilles analytiques basées sur l'état de convergence actuel des données de tirage pour <span className="font-semibold text-primary">{drawName}</span>
          </p>
        </div>
      </div>

      <Tabs
        value={activeSubTab}
        onValueChange={(v) => setActiveSubTab(v as any)}
        className="w-full"
      >
        <TabsList className="flex flex-row bg-muted/40 p-1 rounded-xl mb-6 max-w-md">
          <TabsTrigger
            value="official"
            className="flex-1 gap-2 py-2.5 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium"
          >
            <Target className="w-4 h-4 text-primary" />
            Grille Suggérée
          </TabsTrigger>
          <TabsTrigger
            value="log"
            className="flex-1 gap-2 py-2.5 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium"
          >
            <History className="w-4 h-4 text-blue-500" />
            Historique des Grilles
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

          <TabsContent value="log" className="mt-0 focus-visible:outline-none">
            <PredictionLog />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
};
