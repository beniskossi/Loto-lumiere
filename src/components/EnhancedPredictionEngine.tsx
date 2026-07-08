import { useState, lazy, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NumberBall } from "./NumberBall";
import { Brain, Zap, Target, TrendingUp, Activity, RefreshCw, HelpCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DecisionTreeVisualization } from "./DecisionTreeVisualization";
import { usePredictionOrchestrator } from "@/hooks/usePredictionOrchestrator";
import { Skeleton } from "@/components/ui/skeleton";
import { PredictionExplanationModal } from "./PredictionExplanationModal";
import { CustomGridAnalyzer } from "./CustomGridAnalyzer";
import { LocalPredictionEnginePanel } from "./LocalPredictionEnginePanel";

const FormulasDashboard = lazy(() => import("./FormulasDashboard").then(m => ({ default: m.FormulasDashboard })));

const DashboardFallback = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-64 w-full rounded-xl" />
  </div>
);

interface EnhancedPredictionEngineProps {
  drawName: string;
}

interface AlgorithmPerformance {
  name: string;
  accuracy: number;
  trend: "up" | "down" | "stable";
  predictions: number;
}

interface PredictionItem {
  numbers: number[];
  confidence: number;
  algorithm: string;
  factors: string[];
  score: number;
  category: string;
}

export const EnhancedPredictionEngine = ({ drawName }: EnhancedPredictionEngineProps) => {
  const { 
    predictions, 
    isLoading, 
    refetch, 
    formulasBreakdown, 
    narratives: formulasNarratives,
    selectedAlgorithm,
    algorithmReason,
    topPairs
  } = usePredictionOrchestrator(drawName);
  
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionItem | null>(null);
  
  // Récupérer les vraies performances via fonction RPC sécurisée
  const { data: rankings } = useQuery({
    queryKey: ["algorithm-rankings-detailed", drawName],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_algorithm_rankings_detailed", { p_draw_name: null });
      
      if (error) throw error;
      // Limiter à 6 résultats côté client
      return data?.slice(0, 6) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Transformer les données en format AlgorithmPerformance et dédupliquer par nom
  const algorithmPerformance: AlgorithmPerformance[] = (() => {
    if (!rankings) return [];
    const seen = new Set<string>();
    const unique: AlgorithmPerformance[] = [];
    rankings.forEach(r => {
      const name = r.model_used || "Unknown";
      if (!seen.has(name)) {
        seen.add(name);
        unique.push({
          name,
          accuracy: r.avg_accuracy ?? 0,
          trend: (r.overall_score ?? 0) > 50 ? "up" : (r.overall_score ?? 0) > 30 ? "stable" : "down",
          predictions: r.total_predictions ?? 0,
        });
      }
    });
    return unique;
  })();

  const topPredictions = predictions.slice(0, 3);

  // Calculer le consensus des numéros les plus fréquents parmi toutes les prédictions
  const consensusNumbers = (() => {
    if (predictions.length === 0) return [];
    
    const numberCounts: Record<number, number> = {};
    predictions.forEach(pred => {
      pred.numbers.forEach(num => {
        numberCounts[num] = (numberCounts[num] || 0) + 1;
      });
    });
    
    return Object.entries(numberCounts)
      .map(([num, count]) => ({ 
        number: parseInt(num), 
        count,
        percentage: Math.round((count / predictions.length) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  })();

  const toggleAlgorithm = (algorithm: string) => {
    setSelectedAlgorithms(prev => 
      prev.includes(algorithm) 
        ? prev.filter(a => a !== algorithm)
        : [...prev, algorithm]
    );
  };

  const runCustomAnalysis = async () => {
    if (selectedAlgorithms.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      await refetch();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return "📈";
      case "down": return "📉";
      default: return "➡️";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-primary text-white border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Brain className="w-8 h-8" />
            Moteur de Prédiction Avancé
          </CardTitle>
          <CardDescription className="text-white/80">
            Analyse multi-algorithmes avec optimisation en temps réel
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="predictions" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto gap-1 text-[10px] sm:text-xs p-1 bg-secondary/40 backdrop-blur-sm rounded-xl border border-border/30">
          <TabsTrigger value="predictions" className="rounded-lg py-1.5 transition-all">Prédictions</TabsTrigger>
          <TabsTrigger value="formulas" className="rounded-lg py-1.5 transition-all">Formules</TabsTrigger>
          <TabsTrigger value="tree" className="rounded-lg py-1.5 transition-all">Arbre IA</TabsTrigger>
          <TabsTrigger value="performance" className="rounded-lg py-1.5 transition-all">Performance</TabsTrigger>
          <TabsTrigger value="custom" className="rounded-lg py-1.5 transition-all">Analyse Perso</TabsTrigger>
          <TabsTrigger value="local-engine" className="rounded-lg py-1.5 transition-all">Moteur Local</TabsTrigger>
        </TabsList>

        <TabsContent value="predictions" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <Activity className="w-12 h-12 animate-pulse text-primary mx-auto" />
                  <p>Calcul des prédictions optimales...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Prédictions principales */}
              <Card className="bg-gradient-card border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Top 3 Prédictions Optimisées
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {topPredictions.map((pred, index) => (
                    <div key={index} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={index === 0 ? "default" : "secondary"}>
                            #{index + 1}
                          </Badge>
                          <span className="font-medium">{pred.algorithm}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">
                            {Math.round(pred.confidence * 100)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Score: {pred.score.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mb-3">
                        {pred.numbers.map((num, idx) => (
                          <NumberBall key={`${num}-${idx}`} number={num} size="lg" />
                        ))}
                      </div>
                      
                      <Progress 
                        value={pred.confidence * 100} 
                        className="h-2 mb-2" 
                      />
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
                        <div className="flex gap-1 flex-wrap">
                          {pred.factors.slice(0, 3).map((factor, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {factor}
                            </Badge>
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-primary hover:text-primary/80 hover:bg-primary/5 gap-1.5 h-7 px-2.5 rounded-md"
                          onClick={() => {
                            setSelectedPrediction(pred);
                            setIsExplanationOpen(true);
                          }}
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          Explication IA
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Consensus des algorithmes */}
              {consensusNumbers.length > 0 && (
                <Card className="bg-accent/10 border-accent/30">
                  <CardHeader>
                    <CardTitle className="text-lg">Consensus Multi-Algorithmes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-4 mb-4">
                      {consensusNumbers.map(({ number, percentage }) => (
                        <div key={number} className="text-center">
                          <NumberBall number={number} size="md" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {percentage}%
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Numéros recommandés par la majorité des algorithmes
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Performance des Algorithmes
              </CardTitle>
              <CardDescription>
                Suivi en temps réel de l'efficacité de chaque algorithme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {algorithmPerformance.map((algo, index) => (
                <div key={index} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{algo.name}</span>
                      <span className="text-lg">{getTrendIcon(algo.trend)}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{algo.accuracy.toFixed(1)}%</p>
                    </div>
                  </div>
                  
                  <Progress value={algo.accuracy} className="h-2 mb-2" />
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{algo.predictions} prédictions</span>
                    <span>Tendance: {algo.trend === "up" ? "↗️" : algo.trend === "down" ? "↘️" : "→"}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Analyse Personnalisée
              </CardTitle>
              <CardDescription>
                Sélectionnez les algorithmes pour une analyse sur mesure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {algorithmPerformance.map(algo => (
                  <div key={algo.name} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={algo.name}
                      checked={selectedAlgorithms.includes(algo.name)}
                      onChange={() => toggleAlgorithm(algo.name)}
                      className="rounded"
                    />
                    <label htmlFor={algo.name} className="text-sm cursor-pointer">
                      {algo.name}
                    </label>
                  </div>
                ))}
              </div>
              
              <Button 
                onClick={runCustomAnalysis}
                disabled={selectedAlgorithms.length === 0 || isAnalyzing}
                className="w-full gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Lancer l'analyse ({selectedAlgorithms.length} algo.)
                  </>
                )}
              </Button>
              
              {selectedAlgorithms.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Algorithmes sélectionnés:</p>
                  <div className="flex gap-1 flex-wrap">
                    {selectedAlgorithms.map(algo => (
                      <Badge key={algo} variant="secondary" className="text-xs">
                        {algo}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <CustomGridAnalyzer drawName={drawName} formulasBreakdown={formulasBreakdown} />
        </TabsContent>

        <TabsContent value="tree">
          <DecisionTreeVisualization drawName={drawName} />
        </TabsContent>

        <TabsContent value="formulas">
          {formulasBreakdown ? (
            <Suspense fallback={<DashboardFallback />}>
              <FormulasDashboard 
                breakdown={{
                  ...formulasBreakdown,
                  temporalResonance: formulasBreakdown.temporalResonance ?? 0,
                  numericalMomentum: formulasBreakdown.numericalMomentum ?? 0,
                  spatialClustering: formulasBreakdown.spatialClustering ?? 0,
                }}
                narratives={formulasNarratives}
              />
            </Suspense>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <Activity className="w-12 h-12 animate-pulse text-primary mx-auto" />
                  <p>Chargement du tableau de bord des formules...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="local-engine" className="space-y-4">
          <LocalPredictionEnginePanel drawName={drawName} />
        </TabsContent>
      </Tabs>

      <PredictionExplanationModal
        isOpen={isExplanationOpen}
        onClose={() => {
          setIsExplanationOpen(false);
          setSelectedPrediction(null);
        }}
        drawName={drawName}
        prediction={selectedPrediction}
        selectedAlgorithm={selectedAlgorithm}
        algorithmReason={algorithmReason}
        formulasBreakdown={formulasBreakdown}
        narratives={formulasNarratives}
        topPairs={topPairs}
      />
    </div>
  );
};