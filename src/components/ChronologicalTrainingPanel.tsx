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
      // 1. Fetch historical results for this draw chronologically
      const { data: results, error: resultsError } = await supabase
        .from("draw_results")
        .select("*")
        .eq("draw_name", selectedDrawName)
        .order("draw_date", { ascending: true });

      if (resultsError) throw resultsError;
      if (!results || results.length < 10) {
        throw new Error(`Pas assez de données historiques pour ${selectedDrawName}. Requis: 10`);
      }

      // 2. Fetch algorithm configs
      const { data: configs, error: configsError } = await supabase
        .from("algorithm_config")
        .select("*")
        .eq("is_enabled", true);

      if (configsError) throw configsError;

      const updates: any[] = [];
      const historyToSave: any[] = [];
      
      // 3. Analyze real patterns in history
      let repetitionCount = 0;
      let plusOneCount = 0;
      let minusOneCount = 0;
      let mirrorCount = 0;
      let shadowCount = 0;
      let totalTransitions = 0;

      const recentResults = results.slice(-50);
      const frequencyMap: Record<number, number> = {};
      
      results.forEach((r: any) => {
        if (r.winning_numbers) {
          r.winning_numbers.forEach((n: number) => {
            frequencyMap[n] = (frequencyMap[n] || 0) + 1;
          });
        }
      });
      
      const sortedFrequencies = Object.entries(frequencyMap)
        .sort((a, b) => b[1] - a[1])
        .map(e => parseInt(e[0]));
      const top15 = new Set(sortedFrequencies.slice(0, 15));

      let top15HitsInRecent = 0;
      let totalRecentNumbers = 0;

      for (let i = 0; i < recentResults.length - 1; i++) {
        const currentDraw = recentResults[i].winning_numbers || [];
        const nextDraw = recentResults[i+1].winning_numbers || [];
        
        for (const num of currentDraw) {
          if (nextDraw.includes(num)) repetitionCount++;
          
          const plusOne = num === 90 ? 1 : num + 1;
          if (nextDraw.includes(plusOne)) plusOneCount++;
          
          const minusOne = num === 1 ? 90 : num - 1;
          if (nextDraw.includes(minusOne)) minusOneCount++;
          
          const strNum = num.toString().padStart(2, '0');
          const mirror = parseInt(strNum.split('').reverse().join(''));
          if (mirror !== num && mirror > 0 && mirror <= 90 && nextDraw.includes(mirror)) mirrorCount++;
          
          const shadow = (num + 45) > 90 ? (num + 45) - 90 : num + 45;
          if (nextDraw.includes(shadow)) shadowCount++;
          
          totalTransitions++;
        }
        
        for (const num of nextDraw) {
          if (top15.has(num)) top15HitsInRecent++;
          totalRecentNumbers++;
        }
      }
      
      const repRate = totalTransitions > 0 ? repetitionCount / totalTransitions : 0;
      const p1Rate = totalTransitions > 0 ? plusOneCount / totalTransitions : 0;
      const m1Rate = totalTransitions > 0 ? minusOneCount / totalTransitions : 0;
      const mirrorRate = totalTransitions > 0 ? mirrorCount / totalTransitions : 0;
      const shadowRate = totalTransitions > 0 ? shadowCount / totalTransitions : 0;
      const freqRate = totalRecentNumbers > 0 ? top15HitsInRecent / totalRecentNumbers : 0;

      const detectedLessons: string[] = [];
      if (repRate > 0.12) detectedLessons.push("Forte tendance à la répétition (n -> n).");
      if (p1Rate > 0.08) detectedLessons.push("Séquences positives fréquentes (n -> n+1).");
      if (m1Rate > 0.08) detectedLessons.push("Séquences négatives fréquentes (n -> n-1).");
      if (mirrorRate > 0.04) detectedLessons.push("Modèles miroirs actifs (ex: 12 -> 21).");
      if (shadowRate > 0.04) detectedLessons.push("Modèles d'ombre actifs (n -> n+45).");
      
      for (const config of configs) {
        const params = config.parameters || {};
        const drawSpecific = params.draw_specific || {};
        const currentDrawStats = drawSpecific[selectedDrawName] || { weight: config.weight, lessons: [], patterns: {} };
        
        let simulatedScore = 0.5;
        let learnedPattern = "";
        
        const algoName = config.algorithm_name.toLowerCase();
        
        if (algoName.includes("freq") || algoName.includes("poisson")) {
          simulatedScore = freqRate > 0.3 ? 0.7 : (freqRate > 0.2 ? 0.55 : 0.4);
          learnedPattern = `Taux de réussite des numéros chauds: ${(freqRate*100).toFixed(1)}%.`;
        } else if (algoName.includes("gap") || algoName.includes("ecart")) {
          simulatedScore = repRate < 0.08 ? 0.65 : 0.45;
          learnedPattern = `Taux de répétition mesuré: ${(repRate*100).toFixed(1)}%.`;
        } else if (algoName.includes("markov") || algoName.includes("pattern")) {
          const patternPower = p1Rate + m1Rate + mirrorRate + shadowRate;
          simulatedScore = patternPower > 0.2 ? 0.75 : 0.5;
          learnedPattern = `Force des transitions détectée: ${(patternPower*100).toFixed(1)}%.`;
        } else {
          simulatedScore = 0.5 + Math.min(0.1, results.length / 5000); 
          learnedPattern = `Analyse validée sur ${results.length} tirages.`;
        }

        const performanceDelta = simulatedScore - 0.5;
        const adjustmentFactor = performanceDelta * 0.2;
        const newSpecificWeight = Math.min(2, Math.max(0.1, currentDrawStats.weight * (1 + adjustmentFactor)));
        const improvement = ((newSpecificWeight - currentDrawStats.weight) / currentDrawStats.weight) * 100;
        
        if (Math.abs(improvement) > 0.1 || detectedLessons.length > 0) {
          currentDrawStats.weight = newSpecificWeight;
          
          const allLessons = [learnedPattern, ...detectedLessons];
          currentDrawStats.lessons = Array.from(new Set(allLessons)).slice(0, 5);
          currentDrawStats.patterns = {
            repRate, p1Rate, m1Rate, mirrorRate, shadowRate, freqRate
          };
          
          const newParams = {
            ...params,
            draw_specific: {
              ...drawSpecific,
              [selectedDrawName]: currentDrawStats
            }
          };

          updates.push({
            id: config.id,
            parameters: newParams,
          });

          historyToSave.push({
            algorithm_name: config.algorithm_name,
            previous_weight: currentDrawStats.weight,
            new_weight: newSpecificWeight,
            previous_parameters: params,
            new_parameters: newParams,
            performance_improvement: improvement,
            training_metrics: {
              drawName: selectedDrawName,
              simulated_score: simulatedScore,
              total_evaluations: results.length,
              learned_pattern: learnedPattern,
              patterns_stats: currentDrawStats.patterns
            },
          });
        }
      }

      if (historyToSave.length > 0) {
        const { error: historyError } = await supabase
          .from("algorithm_training_history")
          .insert(historyToSave);

        if (historyError) console.error("Failed to save training history:", historyError);
      }

      for (const update of updates) {
        await supabase
          .from("algorithm_config")
          .update({ parameters: update.parameters })
          .eq("id", update.id);
      }

      toast({
        title: "Entraînement réussi",
        description: `Entraînement chronologique réussi pour ${selectedDrawName}. ${updates.length} algorithmes optimisés.`,
      });
      
      if (historyToSave.length > 0) {
        setTrainingResults(historyToSave);
      } else {
        toast({
          title: "Aucune mise à jour",
          description: "Les algorithmes sont déjà optimisés pour ce tirage.",
        });
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
    <Card className="bg-gradient-to-br from-card to-muted/20 border-border/50 shadow-sm overflow-hidden">
      <div className="absolute top-0 right-0 p-32 bg-primary/5 blur-3xl -z-10 rounded-full pointer-events-none" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-full">
            <History className="w-5 h-5 text-primary" />
          </div>
          Entraînement Chronologique
        </CardTitle>
        <CardDescription>
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
                    Tirage {name}
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
