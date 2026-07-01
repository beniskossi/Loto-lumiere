import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Database, Search, BarChart3, Brain, RefreshCw, Sparkles, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberBall } from "@/components/NumberBall";
import { NumberConsult } from "@/components/NumberConsult";
import { PredictionPanel } from "@/components/PredictionPanel";
import { StatisticsCharts } from "@/components/StatisticsCharts";
import { EnhancedPredictionEngine } from "@/components/EnhancedPredictionEngine";
import { HowItWorks } from "@/components/HowItWorks";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { useDrawResultsPaginated, useRefreshResults } from "@/hooks/useDrawResults";
import { useMostFrequentNumbers, useLeastFrequentNumbers } from "@/hooks/useNumberStatistics";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DrawResultsSkeleton, StatisticsSkeleton } from "@/components/LoadingSkeleton";
import { PredictionComparison } from "@/components/PredictionComparison";
import { UserNav } from "@/components/UserNav";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

const DrawDetails = () => {
  const { drawName } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const refreshResults = useRefreshResults();

  const decodedDrawName = decodeURIComponent(drawName || "");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("historique");
  const pageSize = 20;

  // Scroll vers le haut lors du changement d'onglet
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);
  
  const { data: paginatedResults, isLoading: resultsLoading, refetch: refetchResults } = useDrawResultsPaginated(decodedDrawName, currentPage, pageSize);
  const results = paginatedResults?.data || [];
  const totalPages = paginatedResults?.totalPages || 1;
  const totalCount = paginatedResults?.count || 0;
  
  const { data: mostFrequent, isLoading: mostFrequentLoading } = useMostFrequentNumbers(decodedDrawName, 10);
  const { data: leastFrequent, isLoading: leastFrequentLoading } = useLeastFrequentNumbers(decodedDrawName, 10);

  const handleRefresh = async () => {
    try {
      toast({
        title: "Mise à jour en cours...",
        description: "Récupération des derniers résultats",
      });
      
      await refreshResults();
      await refetchResults();
      
      toast({
        title: "✓ Mise à jour réussie",
        description: "Les résultats ont été actualisés",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les résultats",
        variant: "destructive",
      });
    }
  };

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
            <Button
              variant="ghost"
              className="text-foreground hover:bg-secondary/80 touch-target gap-2"
              onClick={() => navigate("/")}
              size="sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Retour</span>
            </Button>
            
            <div className="flex items-center gap-2 px-4">
              <h1 className="text-lg font-extrabold tracking-tight font-display text-foreground hidden sm:block uppercase">
                {decodedDrawName}
              </h1>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <ThemeToggle />
              <UserNav />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full px-4 py-8 space-y-8 flex-1">
        
        <div className="text-center mb-10 mt-4 flex flex-col items-center justify-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4 font-display uppercase">
            {decodedDrawName}
          </h2>
          <p className="text-sm md:text-base font-medium text-muted-foreground/80 mb-6 max-w-lg">
            Analyse complète et prédictions intelligentes
          </p>
          <Button
            variant="outline"
            onClick={handleRefresh}
            className="gap-2 shadow-sm rounded-full px-6 font-medium border-border/60 hover:bg-secondary/20"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 text-primary" />
            <span>Actualiser les données</span>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-row w-full h-auto bg-muted/40 p-1.5 rounded-xl mb-6 overflow-x-auto no-scrollbar justify-start gap-1">
            <TabsTrigger
              value="historique"
              className="flex-1 gap-2 py-2.5 px-4 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <Database className="w-4 h-4 text-pink-500" />
              Historique des Tirages
            </TabsTrigger>
            <TabsTrigger
              value="consulter"
              className="flex-1 gap-2 py-2.5 px-4 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <Search className="w-4 h-4 text-blue-500" />
              Consulter un Numéro
            </TabsTrigger>
            <TabsTrigger
              value="statistiques"
              className="flex-1 gap-2 py-2.5 px-4 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              Statistiques & Fréquences
            </TabsTrigger>
            <TabsTrigger
              value="prediction"
              className="flex-1 gap-2 py-2.5 px-4 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <Brain className="w-4 h-4 text-purple-500" />
              Prédictions
            </TabsTrigger>
            <TabsTrigger
              value="ia-engine"
              className="flex-1 gap-2 py-2.5 px-4 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-accent animate-pulse" />
              Noyau de Prédiction IA
            </TabsTrigger>
            <TabsTrigger
              value="aide"
              className="flex-1 gap-2 py-2.5 px-4 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <Info className="w-4 h-4 text-orange-500" />
              Comment ça marche
            </TabsTrigger>
          </TabsList>

          <TabsContent value="historique">
            <div className="space-y-4">
              {resultsLoading ? (
                <DrawResultsSkeleton />
              ) : (
                <Card className="bg-gradient-card border-border/50">
                  <CardHeader>
                    <CardTitle>Historique des Tirages</CardTitle>
                    <CardDescription>
                      {totalCount} résultats pour {decodedDrawName} • Page {currentPage}/{totalPages}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {results && results.length > 0 ? (
                      <>
                        {results.map((result) => (
                          <div
                            key={result.id}
                            className="p-3 sm:p-4 rounded-lg bg-card border border-border/50 space-y-2 sm:space-y-3 hover:border-primary/50 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-muted-foreground">
                                {format(new Date(result.draw_date), "EEEE d MMMM yyyy", { locale: fr })}
                              </span>
                              <span className="text-xs text-muted-foreground">{result.draw_time}</span>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Numéros Gagnants
                              </p>
                              <div className="flex gap-2 flex-wrap">
                                {result.winning_numbers.map((num, idx) => (
                                  <NumberBall key={`${num}-${idx}`} number={num} size="md" />
                                ))}
                              </div>
                            </div>
                            {result.machine_numbers && result.machine_numbers.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                  Numéros Machine
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                  {result.machine_numbers.map((num, idx) => (
                                    <NumberBall key={`${num}-${idx}`} number={num} size="sm" />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-center gap-4 pt-4 border-t border-border/50">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                            >
                              <ChevronLeft className="w-4 h-4 mr-1" />
                              Précédent
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Page {currentPage} sur {totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                            >
                              Suivant
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground">
                        Aucun résultat disponible. Cliquez sur "Actualiser" pour récupérer les derniers tirages.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="consulter">
            <NumberConsult drawName={decodedDrawName} />
          </TabsContent>

          <TabsContent value="statistiques">
            <div className="space-y-6">
              {mostFrequent && leastFrequent && mostFrequent.length > 0 && leastFrequent.length > 0 && (
                <StatisticsCharts 
                  mostFrequent={mostFrequent} 
                  leastFrequent={leastFrequent}
                  drawName={decodedDrawName}
                />
              )}
              {mostFrequentLoading || leastFrequentLoading ? (
                <StatisticsSkeleton />
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-gradient-card border-border/50">
                  <CardHeader>
                    <CardTitle className="text-success">Numéros les Plus Fréquents</CardTitle>
                    <CardDescription>Top 10 des numéros qui sortent le plus</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {mostFrequentLoading ? (
                      <p className="text-muted-foreground">Chargement...</p>
                    ) : mostFrequent && mostFrequent.length > 0 ? (
                      <div className="space-y-3">
                        {mostFrequent.map((stat, idx) => (
                          <div key={stat.id} className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-muted-foreground w-8">
                              #{idx + 1}
                            </span>
                            <NumberBall number={stat.number} size="md" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                Fréquence: <span className="text-success font-bold">{stat.frequency}</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Dernier: {stat.last_appearance ? format(new Date(stat.last_appearance), "dd/MM/yyyy") : "N/A"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Aucune statistique disponible</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-gradient-card border-border/50">
                  <CardHeader>
                    <CardTitle className="text-destructive">Numéros les Moins Fréquents</CardTitle>
                    <CardDescription>Top 10 des numéros qui sortent le moins</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {leastFrequentLoading ? (
                      <p className="text-muted-foreground">Chargement...</p>
                    ) : leastFrequent && leastFrequent.length > 0 ? (
                      <div className="space-y-3">
                        {leastFrequent.map((stat, idx) => (
                          <div key={stat.id} className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-muted-foreground w-8">
                              #{idx + 1}
                            </span>
                            <NumberBall number={stat.number} size="md" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                Fréquence: <span className="text-destructive font-bold">{stat.frequency}</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Écart: {stat.days_since_last} jours
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Aucune statistique disponible</p>
                    )}
                  </CardContent>
                </Card>
              </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="prediction">
            <div className="space-y-6">
              <PredictionPanel drawName={decodedDrawName} />
              <PredictionComparison drawName={decodedDrawName} />
            </div>
          </TabsContent>

          <TabsContent value="ia-engine">
            <EnhancedPredictionEngine drawName={decodedDrawName} />
          </TabsContent>

          <TabsContent value="aide">
            <HowItWorks />
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
      <ScrollToTopButton />
    </div>
  );
};

export default DrawDetails;
