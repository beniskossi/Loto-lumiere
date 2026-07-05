import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DRAW_SCHEDULE } from "@/types/lottery";
import { useToast } from "@/hooks/use-toast";
import { Brain, History, RefreshCw, Activity, ArrowRight, Play, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const ChronologicalTrainingPanel = () => {
  const [selectedDrawName, setSelectedDrawName] = useState<string>("");
  const [isTraining, setIsTraining] = useState(false);
  const [trainingResults, setTrainingResults] = useState<any[] | null>(null);
  const { toast } = useToast();

  // Extract unique draw names from the schedule
  const uniqueDrawNames = Array.from(
    new Set(
      Object.values(DRAW_SCHEDULE)
        .flat()
        .map((draw) => draw.name)
    )
  ).sort();

  const handleStartTraining = async () => {
    if (!selectedDrawName) {
      toast({
        title: "Sélection requise",
        description: "Veuillez sélectionner un tirage à entraîner.",
        variant: "destructive",
      });
      return;
    }

    setIsTraining(true);
    setTrainingResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("chronological-training", {
        body: { drawName: selectedDrawName },
      });

      if (error) throw error;

      if (data && data.success) {
        toast({
          title: "Entraînement réussi",
          description: data.message || `Entraînement chronologique réussi pour ${selectedDrawName}.`,
        });
        
        if (data.history && data.history.length > 0) {
          setTrainingResults(data.history);
        } else {
          toast({
            title: "Aucune mise à jour",
            description: "Les algorithmes sont déjà optimisés pour ce tirage.",
          });
        }
      } else {
        throw new Error(data?.error || "Erreur lors de l'entraînement");
      }
    } catch (error) {
      console.error("Erreur lors de l'entraînement chronologique:", error);
      toast({
        title: "Échec de l'entraînement",
        description: error instanceof Error ? error.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <Card className="bg-card border-border/50 shadow-sm overflow-hidden animate-fade-in hover:shadow-glow transition-all duration-300 relative">
      <div className="absolute top-0 right-0 p-32 bg-primary/5 blur-3xl -z-10 rounded-full pointer-events-none transition-opacity duration-500 opacity-50 hover:opacity-100" />
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <div className="p-2 bg-primary/10 rounded-lg">
            <History className="w-5 h-5 text-primary" />
          </div>
          Entraînement Chronologique
        </CardTitle>
        <CardDescription className="text-base mt-1">
          Analysez l'historique d'un tirage spécifique pour appliquer des corrections et optimiser les algorithmes selon ses patterns uniques.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Sélectionner le tirage
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedDrawName} onValueChange={setSelectedDrawName} disabled={isTraining}>
              <SelectTrigger className="w-full sm:w-[250px] bg-background">
                <SelectValue placeholder="Nom du tirage (ex: Etoile)" />
              </SelectTrigger>
              <SelectContent>
                {uniqueDrawNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleStartTraining} 
              disabled={isTraining || !selectedDrawName}
              className="w-full sm:w-auto gap-2 shadow-glow"
            >
              {isTraining ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Entraînement en cours...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Démarrer l'analyse
                </>
              )}
            </Button>
          </div>
        </div>

        {trainingResults && (
          <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h4 className="font-medium text-sm flex items-center gap-2 text-primary">
              <CheckCircle2 className="w-4 h-4" />
              Résultats d'optimisation
            </h4>
            <div className="grid gap-3">
              {trainingResults.map((result, idx) => (
                <div key={idx} className="p-3 bg-background rounded-lg border border-border/50 shadow-sm flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-muted rounded">
                      <Brain className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{result.algorithm_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {result.training_metrics?.learned_pattern || "Pondération ajustée."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono bg-muted/30 px-3 py-1.5 rounded-md border border-border/30">
                    <div className="text-muted-foreground">
                      Poids: <span className="text-foreground">{result.previous_weight?.toFixed(3)}</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <div className={result.new_weight > result.previous_weight ? "text-success" : "text-warning"}>
                      {result.new_weight?.toFixed(3)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-muted/10 border-t border-border/50 text-xs text-muted-foreground p-4">
        <Activity className="w-3.5 h-3.5 mr-2" />
        Ce processus simule les tirages passés dans l'ordre chronologique pour auto-calibrer les heuristiques.
      </CardFooter>
    </Card>
  );
};
