import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, BarChart3, PieChart as PieChartIcon, Sparkles, Activity, GitMerge, Zap } from "lucide-react";
import { Footer } from "@/components/Footer";
import { StatisticsCharts } from "@/components/StatisticsCharts";
import { AdvancedStatisticsPanel } from "@/components/AdvancedStatisticsPanel";
import { AlgorithmPerformanceComparison } from "@/components/AlgorithmPerformanceComparison";
import { NumberTrendChart } from "@/components/NumberTrendChart";
import { NumberCorrelationHeatmap } from "@/components/NumberCorrelationHeatmap";
import { useMostFrequentNumbers, useLeastFrequentNumbers, useMaxGapNumbers, useMinGapNumbers } from "@/hooks/useNumberStatistics";
import { useDrawResults } from "@/hooks/useDrawResults";
import { DRAW_SCHEDULE } from "@/types/lottery";
import { StatisticsSkeleton } from "@/components/LoadingSkeleton";
import { UserNav } from "@/components/UserNav";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MainNav } from "@/components/MainNav";
import { Skeleton } from "@/components/ui/skeleton";

const AdvancedMetricsDashboard = lazy(() => import("@/components/AdvancedMetricsDashboard").then(m => ({ default: m.AdvancedMetricsDashboard })));

const MetricsFallback = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-[400px] w-full rounded-xl" />
  </div>
);

const Statistics = () => {
  const navigate = useNavigate();
  const allDraws = Object.values(DRAW_SCHEDULE).flat();
  const [selectedDraw, setSelectedDraw] = useState(allDraws[0].name);
  
  const { data: mostFrequent = [], isLoading: loadingMost } = useMostFrequentNumbers(selectedDraw, 90);
  const { data: leastFrequent = [], isLoading: loadingLeast } = useLeastFrequentNumbers(selectedDraw, 90);
  const { data: maxGapNumbers = [], isLoading: loadingGap } = useMaxGapNumbers(selectedDraw, 10);
  const { data: minGapNumbers = [], isLoading: loadingMinGap } = useMinGapNumbers(selectedDraw, 10);
  const { data: drawResults } = useDrawResults(selectedDraw, 100);

  const loading = loadingMost || loadingLeast || loadingGap || loadingMinGap;
  const topNumbers = mostFrequent.slice(0, 10);
  const coldNumbers = leastFrequent.slice(0, 10);
  const machineDrawsCount = drawResults?.filter(r => r.machine_numbers?.length).length || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-x-hidden">
      {/* Background ambient blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-accent/5 blur-[150px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl transition-all duration-300">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex h-16 items-center justify-between">
            <MainNav className="flex-1" />
            
            <div className="flex items-center gap-2 px-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-extrabold tracking-tight font-display text-foreground hidden sm:block uppercase">
                Statistiques
              </h1>
            </div>

            <UserNav />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full px-4 py-8 space-y-8 flex-1">
        <Breadcrumbs />
        
        <div className="text-center mb-10 mt-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3 font-display">
            Statistiques Avancées
          </h2>
          <p className="text-sm font-medium text-muted-foreground/80">
            Analyse complète des tendances et fréquences des numéros
          </p>
        </div>

        <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in max-w-3xl mx-auto">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Sélectionner un Tirage
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Choisissez le tirage pour analyser les statistiques
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedDraw} onValueChange={setSelectedDraw}>
              <SelectTrigger className="w-full sm:max-w-md touch-target">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[60vh] overflow-y-auto">
                {allDraws.map((draw) => (
                  <SelectItem key={draw.name} value={draw.name}>
                    {draw.name} - {draw.day} {draw.time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {machineDrawsCount > 0 && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                ℹ️ {machineDrawsCount} tirage{machineDrawsCount > 1 ? 's' : ''} avec numéros machine disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <StatisticsSkeleton />
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-6 sm:mb-8 h-auto">
              <TabsTrigger value="overview" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Vue</span>
                <span className="xs:hidden">Vue</span>
              </TabsTrigger>
              <TabsTrigger value="charts" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Graph.</span>
                <span className="xs:hidden">Graph.</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
                <GitMerge className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Tendances</span>
                <span className="xs:hidden">Tend.</span>
              </TabsTrigger>
              <TabsTrigger value="advanced" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Avancé</span>
                <span className="xs:hidden">Avanc.</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Analytics</span>
                <span className="xs:hidden">Anal.</span>
              </TabsTrigger>
              <TabsTrigger value="algorithms" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Algos</span>
                <span className="xs:hidden">Algos</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 animate-slide-up">
                <Card className="bg-gradient-card border-border/50 hover:shadow-glow transition-all">
                  <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="flex items-center gap-2 text-success text-base sm:text-lg">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                      Numéros Chauds
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Les 10 numéros les plus fréquents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 xs:grid-cols-5 gap-2 sm:gap-3">
                      {topNumbers.map((stat, idx) => (
                        <div
                          key={stat.number}
                          className="relative flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg bg-success/10 border border-success/30 hover:scale-105 active:scale-95 transition-transform touch-target"
                        >
                          <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-success text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs font-bold">
                            {idx + 1}
                          </div>
                          <div className="text-xl sm:text-2xl font-bold text-success">
                            {stat.number}
                          </div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground">
                            {stat.frequency}x
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-card border-border/50 hover:shadow-glow transition-all">
                  <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="flex items-center gap-2 text-primary text-base sm:text-lg">
                      <PieChartIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      Numéros Froids
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Les 10 numéros les plus en retard
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 xs:grid-cols-5 gap-2 sm:gap-3">
                      {coldNumbers.map((stat, idx) => (
                        <div
                          key={stat.number}
                          className="relative flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg bg-primary/10 border border-primary/30 hover:scale-105 active:scale-95 transition-transform touch-target"
                        >
                          <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-primary text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs font-bold">
                            {idx + 1}
                          </div>
                          <div className="text-xl sm:text-2xl font-bold text-primary">
                            {stat.number}
                          </div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground">
                            {stat.days_since_last}j
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gradient-card border-border/50 hover:shadow-glow transition-all">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-destructive text-base sm:text-lg">
                    <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                    Écarts Maximums
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Les 10 numéros avec les plus grands écarts d'apparition
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 xs:grid-cols-5 gap-2 sm:gap-3">
                    {maxGapNumbers.map((stat, idx) => (
                      <div
                        key={stat.number}
                        className="relative flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg bg-destructive/10 border border-destructive/30 hover:scale-105 active:scale-95 transition-transform touch-target"
                      >
                        <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-destructive text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs font-bold">
                          {idx + 1}
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-destructive">
                          {stat.number}
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          {stat.days_since_last}j
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card border-border/50 hover:shadow-glow transition-all">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-success text-base sm:text-lg">
                    <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                    Écarts Minimums
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Les 10 numéros avec les plus petits écarts d'apparition
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 xs:grid-cols-5 gap-2 sm:gap-3">
                    {minGapNumbers.map((stat, idx) => (
                      <div
                        key={stat.number}
                        className="relative flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg bg-success/10 border border-success/30 hover:scale-105 active:scale-95 transition-transform touch-target"
                      >
                        <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-success text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs font-bold">
                          {idx + 1}
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-success">
                          {stat.number}
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          {stat.days_since_last}j
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-primary text-white border-0">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Sparkles className="w-12 h-12" />
                    <div>
                      <h3 className="text-xl font-bold mb-1">Découvrez l'Analyse Avancée</h3>
                      <p className="text-white/80 text-sm">
                        Explorez les paires fréquentes, triplets, patterns temporels et bien plus encore
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="charts" className="animate-fade-in">
              <StatisticsCharts
                mostFrequent={mostFrequent}
                leastFrequent={leastFrequent}
                drawName={selectedDraw}
              />
            </TabsContent>

            <TabsContent value="trends" className="space-y-6 animate-fade-in">
              <NumberTrendChart
                drawName={selectedDraw}
                numbers={topNumbers.slice(0, 5).map(s => s.number)}
                days={30}
                title="Tendances des 5 Numéros les Plus Chauds"
              />
              
              <NumberCorrelationHeatmap drawName={selectedDraw} />
            </TabsContent>

            <TabsContent value="advanced" className="animate-fade-in">
              <AdvancedStatisticsPanel drawName={selectedDraw} />
            </TabsContent>

            <TabsContent value="analytics" className="animate-fade-in">
              <Suspense fallback={<MetricsFallback />}>
                <AdvancedMetricsDashboard drawName={selectedDraw} />
              </Suspense>
            </TabsContent>

            <TabsContent value="algorithms" className="animate-fade-in">
              <AlgorithmPerformanceComparison />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Statistics;
