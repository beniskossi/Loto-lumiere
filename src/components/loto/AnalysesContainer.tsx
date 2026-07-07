import { useState, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Timer, Search, Calendar, FlaskConical, BarChart2, Database } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const AnalysesTab = lazy(() =>
  import("./AnalysesTab").then((m) => ({ default: m.AnalysesTab }))
);
const GapAnalysisTab = lazy(() =>
  import("./GapAnalysisTab").then((m) => ({ default: m.GapAnalysisTab }))
);
const StatistiquesTab = lazy(() =>
  import("./StatistiquesTab").then((m) => ({ default: m.StatistiquesTab }))
);
const ConsulterTab = lazy(() =>
  import("./ConsulterTab").then((m) => ({ default: m.ConsulterTab }))
);
const DonneesTab = lazy(() =>
  import("./DonneesTab").then((m) => ({ default: m.DonneesTab }))
);

interface AnalysesContainerProps {
  drawName: string;
}

const AnalysesFallback = () => (
  <div className="space-y-6">
    <div className="flex gap-2 overflow-x-auto pb-2">
      <Skeleton className="h-10 w-28 shrink-0 rounded-xl" />
      <Skeleton className="h-10 w-28 shrink-0 rounded-xl" />
      <Skeleton className="h-10 w-28 shrink-0 rounded-xl" />
      <Skeleton className="h-10 w-28 shrink-0 rounded-xl" />
    </div>
    <Skeleton className="h-[400px] w-full rounded-2xl" />
  </div>
);

export const AnalysesContainer = ({ drawName }: AnalysesContainerProps) => {
  const [activeSubTab, setActiveSubTab] = useState<"data" | "patterns" | "gaps" | "stats" | "search">("data");

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* En-tête de section professionnel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-primary" />
            Centre d'Analyses & Statistiques
          </h2>
          <p className="text-sm text-muted-foreground">
            Explorez les patterns historiques, l'état des écarts et les tendances pour le tirage <span className="font-semibold text-primary">{drawName}</span>
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
            value="data"
            className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
          >
            <Database className="w-4 h-4 text-pink-500" />
            Matrice Historique
          </TabsTrigger>
          <TabsTrigger
            value="patterns"
            className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
          >
            <FlaskConical className="w-4 h-4 text-purple-500" />
            Détection de Motifs
          </TabsTrigger>
          <TabsTrigger
            value="gaps"
            className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
          >
            <Timer className="w-4 h-4 text-orange-500" />
            Analyse des Gaps
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
          >
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            Analyse Fréquentielle
          </TabsTrigger>
          <TabsTrigger
            value="search"
            className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
          >
            <Search className="w-4 h-4 text-blue-500" />
            Audit Numérique
          </TabsTrigger>
        </TabsList>

        <Suspense fallback={<AnalysesFallback />}>
          <TabsContent value="data" className="mt-0 focus-visible:outline-none">
            <DonneesTab drawName={drawName} />
          </TabsContent>

          <TabsContent value="patterns" className="mt-0 focus-visible:outline-none">
            <AnalysesTab drawName={drawName} />
          </TabsContent>

          <TabsContent value="gaps" className="mt-0 focus-visible:outline-none">
            <GapAnalysisTab drawName={drawName} />
          </TabsContent>

          <TabsContent value="stats" className="mt-0 focus-visible:outline-none">
            <StatistiquesTab drawName={drawName} />
          </TabsContent>

          <TabsContent value="search" className="mt-0 focus-visible:outline-none">
            <ConsulterTab drawName={drawName} />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
};
