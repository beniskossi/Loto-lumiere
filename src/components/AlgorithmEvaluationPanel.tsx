import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, TrendingUp, Award, Loader2, Play, AlertCircle, BarChart as BarIcon, Sparkles } from "lucide-react";
import { DRAW_SCHEDULE, DAYS_ORDER } from "@/types/lottery";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface AlgorithmEvaluation {
  algorithm: string;
  accuracy: number;
  avgMatches: number;
  bestMatch: number;
  worstMatch: number;
  consistency: number;
  totalTests: number;
}

export const AlgorithmEvaluationPanel = () => {
  const { toast } = useToast();
  const [selectedDraw, setSelectedDraw] = useState("Etoile");
  const [evaluations, setEvaluations] = useState<AlgorithmEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const allDraws = DAYS_ORDER.flatMap(day => DRAW_SCHEDULE[day]);

  const handleEvaluate = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-algorithms", {
        body: { drawName: selectedDraw },
      });

      if (error) throw error;

      setEvaluations(data.evaluations);
      toast({
        title: "✓ Évaluation terminée",
        description: `${data.evaluations.length} algorithmes évalués`,
      });
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: "Erreur",
        description: err.message || "Impossible d'évaluer les algorithmes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Préparer les données pour le graphique d'évaluation
  const evaluationChartData = useMemo(() => {
    return evaluations.map(e => ({
      name: e.algorithm.replace(" Network", "").replace(" (Attention)", ""),
      Précision: parseFloat(e.accuracy.toFixed(1)),
      Consistance: parseFloat(Math.min(e.consistency * 10, 100).toFixed(1)), // normalisé sur 100 pour la comparaison visuelle
      "Matchs Moyens": parseFloat((e.avgMatches * 20).toFixed(1)), // normalisé sur 100 (5 matches = 100%)
    }));
  }, [evaluations]);

  return (
    <Card className="bg-gradient-to-br from-card to-muted/20 border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-full">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          Évaluation Rétrospective (Backtesting)
        </CardTitle>
        <CardDescription>
          Simulez et évaluez les performances des différents modèles prédictifs sur l'historique réel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Contrôles de backtesting */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between p-4 rounded-xl bg-secondary/15 border border-border/20">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <span className="text-xs font-semibold text-muted-foreground self-center">Tirage Cible :</span>
            <Select value={selectedDraw} onValueChange={setSelectedDraw}>
              <SelectTrigger className="w-full sm:w-[240px] bg-background border-border/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allDraws.map(draw => (
                  <SelectItem key={draw.name} value={draw.name}>
                    {draw.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleEvaluate} disabled={isLoading} className="gap-2 cursor-pointer">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Simulation en cours...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Lancer le Backtesting
              </>
            )}
          </Button>
        </div>

        {evaluations.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Graphique de comparaison des simulations */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-1.5">
                <BarIcon className="w-4 h-4 text-primary" /> Comparatif de Performance (Métriques Normalisées)
              </h3>
              <div className="h-[280px] w-full p-2 bg-secondary/5 rounded-xl border border-border/25">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evaluationChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "11px"
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="Précision" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Consistance" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Matchs Moyens" fill="hsl(var(--emerald-500))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Liste hiérarchisée des scores de simulation */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-accent" /> Classement des Algorithmes
              </h3>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {(() => {
                  const randomBaseline = evaluations.find(e => e.algorithm.includes("Baseline Aléatoire") || e.algorithm.includes("Aléatoire"));
                  const baselineAccuracy = randomBaseline ? randomBaseline.accuracy : 5.55;

                  return evaluations.map((evaluation, idx) => {
                    const diff = evaluation.accuracy - baselineAccuracy;
                    const isRandom = evaluation.algorithm.includes("Aléatoire");
                    const advantage = isRandom ? "N/A" : (diff > 0.5 ? `+${diff.toFixed(1)}%` : "Aucun avantage mesurable");
                    const advantageColor = diff > 0.5 && !isRandom ? "text-emerald-500" : "text-muted-foreground";

                    return (
                      <div
                        key={evaluation.algorithm}
                        className={`p-3 rounded-xl border transition-all ${
                          idx === 0 && !isRandom
                            ? "bg-primary/10 border-primary/40 shadow-sm" 
                            : "bg-muted/20 border-border/30 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {idx === 0 && !isRandom && <Award className="w-4 h-4 text-yellow-500" />}
                            <h4 className="font-semibold text-xs text-foreground/90">{evaluation.algorithm}</h4>
                          </div>
                          <Badge variant={idx === 0 && !isRandom ? "default" : "secondary"} className="scale-90 font-mono">
                            #{idx + 1}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] leading-relaxed">
                          <div>
                            <span className="text-muted-foreground">Précision : </span>
                            <span className="font-bold text-foreground">{evaluation.accuracy.toFixed(1)}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Matchs : </span>
                            <span className="font-semibold text-foreground">{evaluation.avgMatches.toFixed(2)}/5</span>
                          </div>
                          <div className="col-span-2 pt-1 border-t border-border/20">
                            <span className="text-muted-foreground">Avantage vs Hasard : </span>
                            <span className={`font-semibold ${advantageColor}`}>{advantage}</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1.5 flex justify-between">
                          <span>{evaluation.totalTests} simulations lancées</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

          </div>
        )}

        {evaluations.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border/40 rounded-xl bg-card/5">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40 text-primary animate-pulse" />
            <h3 className="font-semibold text-sm text-foreground/80">Simulations de Backtesting Prêtes</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              Sélectionnez un tirage de loterie ci-dessus et cliquez sur le bouton pour simuler des prédictions sur tout l'historique et évaluer les modèles.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
