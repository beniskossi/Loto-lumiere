import { useState, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { 
  BarChart2, 
  FlaskConical, 
  Database, 
  Clock, 
  Timer, 
  Layers, 
  BarChart3, 
  ArrowLeftRight, 
  Search, 
  Zap, 
  SlidersHorizontal, 
  GitBranch, 
  Compass, 
  BrainCircuit, 
  LayoutGrid, 
  ShieldAlert, 
  Info,
  Briefcase
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// --- Lazy-loaded standard statistical components ---
const GapAnalysisTab = lazy(() =>
  import("./GapAnalysisTab").then((m) => ({ default: m.GapAnalysisTab }))
);
const DoubleGapAnalyzer = lazy(() =>
  import("./DoubleGapAnalyzer").then((m) => ({ default: m.DoubleGapAnalyzer }))
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
const TemporalAnalysis = lazy(() =>
  import("@/components/TemporalAnalysis").then((m) => ({ default: m.TemporalAnalysis }))
);
const DrawComparison = lazy(() =>
  import("@/components/DrawComparison").then((m) => ({ default: m.DrawComparison }))
);

// --- Lazy-loaded experimental laboratory components ---
const EnhancedPredictionEngine = lazy(() =>
  import("@/components/EnhancedPredictionEngine").then((m) => ({ default: m.EnhancedPredictionEngine }))
);
const AdvancedAITab = lazy(() =>
  import("./AdvancedAITab").then((m) => ({ default: m.AdvancedAITab }))
);
const ConditionalPredictions = lazy(() =>
  import("@/components/ConditionalPredictions").then((m) => ({ default: m.ConditionalPredictions }))
);
const AffinityAndTransforms = lazy(() =>
  import("./AffinityAndTransforms").then((m) => ({ default: m.AffinityAndTransforms }))
);
const FractalPatternAnalyzer = lazy(() =>
  import("@/components/FractalPatternAnalyzer").then((m) => ({ default: m.FractalPatternAnalyzer }))
);
const AnisotropyAnalyzer = lazy(() =>
  import("./AnisotropyAnalyzer").then((m) => ({ default: m.AnisotropyAnalyzer }))
);
const ForensicAuditPanel = lazy(() =>
  import("@/components/ForensicAuditPanel").then((m) => ({ default: m.ForensicAuditPanel }))
);
const EducationalGlossary = lazy(() =>
  import("@/components/EducationalGlossary").then((m) => ({ default: m.EducationalGlossary }))
);
const PortfolioOptimizerPanel = lazy(() =>
  import("./PortfolioOptimizerPanel").then((m) => ({ default: m.PortfolioOptimizerPanel }))
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

type ClassicSubTab = "data" | "temporal" | "gaps" | "double-gap" | "stats" | "comparison" | "search";
type ExperimentalSubTab = "formulas" | "portfolio" | "ai-config" | "rules" | "affinity" | "fractal" | "anisotropy" | "forensic" | "glossary";

export const AnalysesContainer = ({ drawName }: AnalysesContainerProps) => {
  // Master category: 'classic' (standard analyses) or 'experimental' (laboratoire)
  const [masterCategory, setMasterCategory] = useState<"classic" | "experimental">("classic");
  
  // Subtabs state for each category
  const [classicSubTab, setClassicSubTab] = useState<ClassicSubTab>("data");
  const [experimentalSubTab, setExperimentalSubTab] = useState<ExperimentalSubTab>("formulas");

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Header section with master switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-border/40 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 font-display">
            {masterCategory === "classic" ? (
              <>
                <BarChart2 className="w-6 h-6 text-primary" />
                Centre d'Analyses & Statistiques
              </>
            ) : (
              <>
                <FlaskConical className="w-6 h-6 text-purple-500 animate-pulse" />
                Laboratoire Expérimental & IA
              </>
            )}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {masterCategory === "classic" 
              ? `Explorez les patterns historiques, l'état des écarts et les tendances de distribution pour ${drawName}`
              : `Algorithmes alternatifs, modélisation de chaos, analyses fractales et dérives stochastiques pour ${drawName}`}
          </p>
        </div>

        {/* Master switcher tabs */}
        <div className="flex bg-muted/30 p-1 rounded-xl self-start lg:self-auto border border-border/30 shadow-inner">
          <button
            onClick={() => setMasterCategory("classic")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              masterCategory === "classic"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Statistiques Classiques
          </button>
          <button
            onClick={() => setMasterCategory("experimental")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              masterCategory === "experimental"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Laboratoire IA
          </button>
        </div>
      </div>

      {/* Experimental Laboratory Sandbox Disclaimer */}
      {masterCategory === "experimental" && (
        <Card className="bg-purple-500/5 border-purple-500/20 shadow-sm animate-in fade-in duration-300">
          <CardContent className="p-4 flex gap-3 items-start">
            <Info className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-bold text-foreground uppercase tracking-wider">Avertissement du Laboratoire :</p>
              <p className="leading-relaxed">
                Les outils de cet espace sont hautement théoriques et de nature stochastique. Ils explorent des corrélations complexes et des structures d'asymétrie dans les tirages passés. Gardez à l'esprit que les tirages physiques de loterie sont régis par l'indépendance statistique et le hasard pur. Ces algorithmes sont conçus pour l'exploration de données (Data Mining) et n'offrent aucune prédiction à caractère garanti.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs Navigation */}
      {masterCategory === "classic" ? (
        <Tabs
          value={classicSubTab}
          onValueChange={(v) => setClassicSubTab(v as ClassicSubTab)}
          className="w-full"
        >
          <TabsList className="flex flex-row flex-nowrap w-full h-auto bg-muted/40 p-1.5 rounded-xl mb-6 overflow-x-auto no-scrollbar justify-start gap-1">
            <TabsTrigger
              value="data"
              className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <Database className="w-4 h-4 text-pink-500" />
              Matrice Historique
            </TabsTrigger>
            <TabsTrigger
              value="temporal"
              className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <Clock className="w-4 h-4 text-cyan-400" />
              Analyse Temporelle
            </TabsTrigger>
            <TabsTrigger
              value="gaps"
              className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <Timer className="w-4 h-4 text-orange-500" />
              Analyse des Gaps
            </TabsTrigger>
            <TabsTrigger
              value="double-gap"
              className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <Layers className="w-4 h-4 text-purple-400" />
              Écart des Écarts
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              Analyse Fréquentielle
            </TabsTrigger>
            <TabsTrigger
              value="comparison"
              className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <ArrowLeftRight className="w-4 h-4 text-amber-500" />
              Comparateur
            </TabsTrigger>
            <TabsTrigger
              value="search"
              className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <Search className="w-4 h-4 text-blue-500" />
              Audit d'un Numéro
            </TabsTrigger>
          </TabsList>

          <Suspense fallback={<AnalysesFallback />}>
            <TabsContent value="data" className="mt-0 focus-visible:outline-none">
              <DonneesTab drawName={drawName} />
            </TabsContent>

            <TabsContent value="temporal" className="mt-0 focus-visible:outline-none">
              <TemporalAnalysis drawName={drawName} />
            </TabsContent>

            <TabsContent value="gaps" className="mt-0 focus-visible:outline-none">
              <GapAnalysisTab drawName={drawName} />
            </TabsContent>

            <TabsContent value="double-gap" className="mt-0 focus-visible:outline-none">
              <DoubleGapAnalyzer drawName={drawName} />
            </TabsContent>

            <TabsContent value="stats" className="mt-0 focus-visible:outline-none">
              <StatistiquesTab drawName={drawName} />
            </TabsContent>

            <TabsContent value="comparison" className="mt-0 focus-visible:outline-none">
              <DrawComparison initialDraw1={drawName} />
            </TabsContent>

            <TabsContent value="search" className="mt-0 focus-visible:outline-none">
              <ConsulterTab drawName={drawName} />
            </TabsContent>
          </Suspense>
        </Tabs>
      ) : (
        <Tabs
          value={experimentalSubTab}
          onValueChange={(v) => setExperimentalSubTab(v as ExperimentalSubTab)}
          className="w-full"
        >
          <TabsList className="flex flex-row flex-nowrap w-full h-auto bg-muted/40 p-1.5 rounded-xl mb-6 overflow-x-auto no-scrollbar justify-start gap-1">
            <TabsTrigger
              value="formulas"
              className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              Moteur de Formules
            </TabsTrigger>
            <TabsTrigger
              value="portfolio"
              className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <Briefcase className="w-4 h-4 text-indigo-400" />
              Optimisation Portefeuille
            </TabsTrigger>
            <TabsTrigger
              value="ai-config"
              className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <SlidersHorizontal className="w-4 h-4 text-accent" />
              IA Paramétrable
            </TabsTrigger>
            <TabsTrigger
              value="rules"
              className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <GitBranch className="w-4 h-4 text-purple-500" />
              Règles & Corrélations
            </TabsTrigger>
            <TabsTrigger
              value="affinity"
              className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <Compass className="w-4 h-4 text-primary" />
              Affinités de Paires
            </TabsTrigger>
            <TabsTrigger
              value="fractal"
              className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <BrainCircuit className="w-4 h-4 text-purple-400" />
              Analyse Fractale
            </TabsTrigger>
            <TabsTrigger
              value="anisotropy"
              className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <LayoutGrid className="w-4 h-4 text-emerald-500" />
              Anisotropie Spatiale
            </TabsTrigger>
            <TabsTrigger
              value="forensic"
              className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <ShieldAlert className="w-4 h-4 text-destructive" />
              Audit Forensic
            </TabsTrigger>
            <TabsTrigger
              value="glossary"
              className="flex-1 gap-2 py-2.5 px-3 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <Info className="w-4 h-4 text-purple-400" />
              Glossaire
            </TabsTrigger>
          </TabsList>

          <Suspense fallback={<AnalysesFallback />}>
            <TabsContent value="formulas" className="mt-0 focus-visible:outline-none">
              <EnhancedPredictionEngine drawName={drawName} />
            </TabsContent>

            <TabsContent value="portfolio" className="mt-0 focus-visible:outline-none">
              <PortfolioOptimizerPanel />
            </TabsContent>

            <TabsContent value="ai-config" className="mt-0 focus-visible:outline-none">
              <AdvancedAITab drawName={drawName} />
            </TabsContent>

            <TabsContent value="rules" className="mt-0 focus-visible:outline-none">
              <div className="max-w-3xl mx-auto">
                <ConditionalPredictions drawName={drawName} />
              </div>
            </TabsContent>

            <TabsContent value="affinity" className="mt-0 focus-visible:outline-none">
              <AffinityAndTransforms drawName={drawName} />
            </TabsContent>

            <TabsContent value="fractal" className="mt-0 focus-visible:outline-none">
              <FractalPatternAnalyzer drawName={drawName} />
            </TabsContent>

            <TabsContent value="anisotropy" className="mt-0 focus-visible:outline-none">
              <AnisotropyAnalyzer drawName={drawName} />
            </TabsContent>

            <TabsContent value="forensic" className="mt-0 focus-visible:outline-none">
              <ForensicAuditPanel />
            </TabsContent>
            <TabsContent value="glossary" className="mt-0 focus-visible:outline-none">
              <EducationalGlossary />
            </TabsContent>
          </Suspense>
        </Tabs>
      )}
    </div>
  );
};
