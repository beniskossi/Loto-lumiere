import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain, RefreshCw, Sparkles, Info, Activity, ShieldCheck } from "lucide-react";
import { PredictionPanel } from "@/components/PredictionPanel";
import { EnhancedPredictionEngine } from "@/components/EnhancedPredictionEngine";
import { AnalysesContainer } from "@/components/loto/AnalysesContainer";
import { ForensicAuditPanel } from "@/components/ForensicAuditPanel";
import { HowItWorks } from "@/components/HowItWorks";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { useRefreshResults } from "@/hooks/useDrawResults";
import { useToast } from "@/hooks/use-toast";
import { PredictionComparison } from "@/components/PredictionComparison";
import { UserNav } from "@/components/UserNav";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

const DrawDetails = () => {
  const { drawName } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const refreshResults = useRefreshResults();
  const decodedDrawName = decodeURIComponent(drawName || "");
  const [activeTab, setActiveTab] = useState("analyses");

  // Scroll vers le haut lors du changement d'onglet
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  const handleRefresh = async () => {
    try {
      toast({
        title: "Mise à jour en cours...",
        description: "Récupération des derniers résultats",
      });
      
      await refreshResults();
      
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
              value="analyses"
              className="flex-1 gap-2 py-2.5 px-4 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <Activity className="w-4 h-4 text-orange-500" />
              Analyses & Écarts
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
              Noyau IA
            </TabsTrigger>
            <TabsTrigger
              value="forensic"
              className="flex-1 gap-2 py-2.5 px-4 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4 text-red-500" />
              Forensic Audit
            </TabsTrigger>
            <TabsTrigger
              value="aide"
              className="flex-1 gap-2 py-2.5 px-4 rounded-lg data-[state=active]:shadow-sm transition-all text-xs font-medium whitespace-nowrap"
            >
              <Info className="w-4 h-4 text-blue-400" />
              Aide
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analyses">
            <AnalysesContainer drawName={decodedDrawName} />
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

          <TabsContent value="forensic">
            <ForensicAuditPanel drawName={decodedDrawName} />
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
