import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, TrendingUp } from "lucide-react";
import { Footer } from "@/components/Footer";
import { NumberConsult } from "@/components/NumberConsult";
import { NumberRegularityChart } from "@/components/NumberRegularityChart";
import { AdvancedSearch } from "@/components/AdvancedSearch";
import { SocialShare } from "@/components/SocialShare";
import { DRAW_SCHEDULE } from "@/types/lottery";
import { UserNav } from "@/components/UserNav";

const Consult = () => {
  const navigate = useNavigate();
  const allDraws = Object.values(DRAW_SCHEDULE).flat();
  const [selectedDraw, setSelectedDraw] = useState(allDraws[0].name);
  const [searchResults, setSearchResults] = useState<Record<string, unknown> | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const handleSearch = (filters: any) => {
    setSearchResults(filters);
  };

  const handleResetSearch = () => {
    setSearchResults(null);
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
            
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-extrabold tracking-tight font-display text-foreground">
                CONSULTER
              </h1>
            </div>

            <UserNav />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full px-4 py-8 space-y-8 flex-1">
        <div className="text-center mb-10 mt-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3 font-display">
            Analyser un Numéro
          </h2>
          <p className="text-sm font-medium text-muted-foreground/80">
            Recherche détaillée, probabilités et graphiques de régularité
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Sélectionner un Tirage
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Choisissez le tirage pour analyser les numéros
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedDraw} onValueChange={setSelectedDraw}>
                <SelectTrigger className="w-full touch-target">
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
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                  className="gap-2"
                >
                  <Search className="w-4 h-4" />
                  Recherche avancée
                </Button>
                <SocialShare 
                  title="Consultation Loto Lumière"
                  description={`Analyse du tirage ${selectedDraw}`}
                  drawName={selectedDraw}
                />
              </div>
            </CardContent>
          </Card>
          
          {showAdvancedSearch && (
            <AdvancedSearch 
              onSearch={handleSearch}
              onReset={handleResetSearch}
            />
          )}
        </div>

        <div className="space-y-6 sm:space-y-8 animate-slide-up">
          {searchResults && (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-blue-800 dark:text-blue-200">Filtres Actifs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                  {Object.entries(searchResults).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="font-semibold capitalize">{key}:</span>
                      <span>{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          <NumberConsult drawName={selectedDraw} />
          <NumberRegularityChart drawName={selectedDraw} />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Consult;