import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, CheckCircle, XCircle, RefreshCw, Info } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAlgorithmComparison } from "@/hooks/useAlgorithmComparison";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ALGORITHM_NAMES } from "@/lib/algorithms/registry";

// Source unique de vérité : registre centralisé
const ALL_ALGORITHMS = ALGORITHM_NAMES;

interface AlgorithmPerformanceTrackerProps {
  drawName?: string;
}

export const AlgorithmPerformanceTracker = ({ drawName }: AlgorithmPerformanceTrackerProps) => {
  const { toast } = useToast();
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>("all");
  
  const { data: comparisonData, isLoading: comparisonLoading } = useAlgorithmComparison(drawName);
  
  // Récupérer l'historique détaillé des performances
  const { data: performanceHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["algorithm-performance-history", drawName, selectedAlgorithm],
    queryFn: async () => {
      let query = supabase
        .from("algorithm_performance")
        .select("id, draw_date, matches_count, accuracy_score, predicted_numbers, winning_numbers, model_used, draw_name")
        .order("draw_date", { ascending: false })
        .limit(100);
      
      if (drawName && drawName !== "all") {
        query = query.eq("draw_name", drawName);
      }
      
      if (selectedAlgorithm !== "all") {
        query = query.eq("model_used", selectedAlgorithm);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: selectedAlgorithm !== "all",
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = comparisonLoading;

  const handleEvaluate = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ 
          title: "Connexion requise", 
          description: "Vous devez être connecté pour évaluer les algorithmes",
          variant: "destructive"
        });
        return;
      }

      toast({ 
        title: "Évaluation en cours", 
        description: "L'évaluation des algorithmes est lancée" 
      });

      const { error } = await supabase.functions.invoke("evaluate-algorithms", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { drawName },
      });

      if (error) throw error;

      toast({ 
        title: "Évaluation terminée", 
        description: "Les performances ont été mises à jour" 
      });
    } catch (error) {
      toast({ 
        title: "Erreur", 
        description: "Impossible d'évaluer les algorithmes",
        variant: "destructive"
      });
    }
  };

  // Calculer les statistiques par algorithme
  const algorithmStats = ALL_ALGORITHMS.map(algo => {
    const matchingData = comparisonData?.find(d => d.model_used === algo);
    
    return {
      name: algo,
      totalPredictions: matchingData?.total_predictions || 0,
      avgAccuracy: matchingData?.avg_accuracy || 0,
      bestMatch: matchingData?.best_accuracy || 0,
      excellentPredictions: matchingData?.excellent_predictions || 0,
      hasData: !!matchingData && matchingData.total_predictions > 0,
    };
  });

  const totalTrackedAlgorithms = algorithmStats.filter(a => a.hasData).length;
  const missingAlgorithms = algorithmStats.filter(a => !a.hasData);

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Suivi de Performance des Algorithmes
              </CardTitle>
              <CardDescription>
                {totalTrackedAlgorithms}/{ALL_ALGORITHMS.length} algorithmes avec des données
              </CardDescription>
            </div>
            <Button
              onClick={handleEvaluate}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Évaluer
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {missingAlgorithms.length > 0 && (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                <strong>{missingAlgorithms.length} algorithmes sans données:</strong>{" "}
                {missingAlgorithms.map(a => a.name).join(", ")}
                <br />
                <span className="text-xs text-muted-foreground">
                  Lancez une évaluation pour générer les statistiques
                </span>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Filtrer par algorithme</label>
            <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les algorithmes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les algorithmes</SelectItem>
                {ALL_ALGORITHMS.map(algo => (
                  <SelectItem key={algo} value={algo}>
                    {algo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {algorithmStats.map(stat => (
              <div
                key={stat.name}
                className={`p-4 rounded-lg border transition-all ${
                  stat.hasData
                    ? "bg-card border-border/50 hover:border-primary/50"
                    : "bg-muted/20 border-border/30 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-sm">{stat.name}</h4>
                  {stat.hasData ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>

                {stat.hasData ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Prédictions:</span>
                      <Badge variant="secondary" className="text-xs">
                        {stat.totalPredictions}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Précision moy:</span>
                      <span className="font-semibold text-primary">
                        {stat.avgAccuracy.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Meilleur:</span>
                      <span className="font-semibold">{stat.bestMatch.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Excellent (≥3):</span>
                      <span className="font-semibold text-accent">
                        {stat.excellentPredictions}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Aucune donnée de performance disponible
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedAlgorithm !== "all" && performanceHistory && performanceHistory.length > 0 && (
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">
              Historique détaillé: {selectedAlgorithm}
            </CardTitle>
            <CardDescription>
              {performanceHistory.length} évaluations récentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {performanceHistory.slice(0, 10).map((perf) => (
                <div
                  key={perf.id}
                  className="p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {format(new Date(perf.draw_date), "d MMM yyyy", { locale: fr })}
                      </span>
                      <Badge
                        variant={perf.matches_count >= 3 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {perf.matches_count}/5
                      </Badge>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-primary">
                        {Number(perf.accuracy_score).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Prédits: </span>
                      <span className="font-mono">{perf.predicted_numbers.join(", ")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gagnants: </span>
                      <span className="font-mono">{perf.winning_numbers.join(", ")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
