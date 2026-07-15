import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useOrchestrationHistory, useTriggerAdaptiveOrchestration } from "@/hooks/useOrchestrationHistory";
import { Loader2, TrendingUp, TrendingDown, Minus, Play, History, Scale, Award, Percent, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { DRAW_SCHEDULE } from "@/types/lottery";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from "recharts";

const DRAW_NAMES = Object.values(DRAW_SCHEDULE).flatMap(schedule => schedule.map(draw => draw.name));

export interface WeightAdjustment {
  previous: number;
  new: number;
}

export interface ParameterAdjustmentValue {
  previous: string | number | boolean;
  new: string | number | boolean;
}

export interface ParameterAdjustments {
  [param: string]: ParameterAdjustmentValue;
}

export const AdaptiveOrchestrationPanel = () => {
  const [selectedDraw, setSelectedDraw] = useState<string>(DRAW_NAMES[0] || "Etoile");
  const { data: history, isLoading } = useOrchestrationHistory(selectedDraw, 10);
  const triggerOrchestration = useTriggerAdaptiveOrchestration();

  const handleTrigger = () => {
    triggerOrchestration.mutate({ 
      drawName: selectedDraw, 
      forceAdjustment: true 
    });
  };

  const latestRecord = history && history.length > 0 ? history[0] : null;

  // Préparation des données pour le graphe de poids
  const weightsChartData = useMemo(() => {
    if (!latestRecord || !latestRecord.weight_adjustments) return [];
    return Object.entries(latestRecord.weight_adjustments as Record<string, WeightAdjustment>).map(([algo, w]) => {
      const prev = typeof w?.previous === 'number' ? w.previous : 0;
      const next = typeof w?.new === 'number' ? w.new : 0;
      return {
        name: algo.replace(" Network", "").replace(" (Attention)", ""),
        Précédent: parseFloat(prev.toFixed(3)),
        Nouveau: parseFloat(next.toFixed(3)),
      };
    });
  }, [latestRecord]);

  // Préparation des données de tendance
  const trendChartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return [...history].reverse().map((record) => {
      const precision = typeof record.trigger_metrics?.avg_accuracy_overall === 'number' ? record.trigger_metrics.avg_accuracy_overall : parseFloat(record.trigger_metrics?.avg_accuracy_overall || '0') || 0;
      const improvement = typeof record.expected_improvement === 'number' ? record.expected_improvement : parseFloat(record.expected_improvement || '0') || 0;
      return {
        date: new Date(record.adjustment_date).toLocaleDateString("fr-FR", { month: "short", day: "numeric" }),
        Précision: parseFloat(precision.toFixed(1)),
        "Amélioration Attendue": parseFloat(improvement.toFixed(1)),
      };
    });
  }, [history]);

  return (
    <div className="space-y-6">
      {/* Contrôles et Déclenchement */}
      <Card className="bg-card border-border/50 shadow-sm animate-fade-in hover:shadow-glow transition-all duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              <History className="h-5 w-5 text-primary" />
            </div>
            Orchestration Adaptative des Algorithmes
          </CardTitle>
          <CardDescription className="text-base mt-1">
            Ajustement automatique des poids d'algorithmes basé sur les performances récentes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            <div className="flex-1 max-w-[320px]">
              <Select value={selectedDraw} onValueChange={setSelectedDraw}>
                <SelectTrigger className="h-11 bg-secondary/20 border-border/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRAW_NAMES.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleTrigger}
              disabled={triggerOrchestration.isPending}
              size="lg"
              className="bg-primary hover:bg-primary/95 text-primary-foreground gap-2 cursor-pointer shadow-md h-11"
            >
              {triggerOrchestration.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Lancer l'orchestration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !history || history.length === 0 ? (
        <Card className="border-dashed border-border/55 p-12 text-center bg-card/10">
          <Scale className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-semibold text-lg">Aucun historique</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2">
            Aucune orchestration n'a été exécutée pour ce tirage. Cliquez sur le bouton ci-dessus pour lancer le premier ajustement adaptatif.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Visualisation de la dernière transition de poids */}
          {weightsChartData.length > 0 && (
            <Card className="bg-gradient-to-br from-card to-muted/20 border-border/50 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="p-1.5 bg-accent/10 rounded-full">
                        <Scale className="h-4 w-4 text-accent" />
                      </div>
                      Ajustement des Poids (Dernier Run)
                    </CardTitle>
                    <CardDescription>
                      Comparaison de l'allocation des poids d'importance
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="border-accent/30 text-accent bg-accent/5">
                    Dernière run
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weightsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
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
                      <Bar dataKey="Précédent" fill="hsl(var(--muted-foreground))" opacity={0.5} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Nouveau" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tendance de Précision du Système d'Orchestration */}
          <Card className="bg-gradient-to-br from-card to-muted/20 border-border/50 shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-full">
                  <Award className="h-4 w-4 text-primary" />
                </div>
                Impact de l'Orchestration Temporelle
              </CardTitle>
              <CardDescription>
                Évolution de la précision globale et du gain attendu
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
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
                    <Line type="monotone" dataKey="Précision" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Amélioration Attendue" stroke="hsl(var(--emerald-500))" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Historique détaillé */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" />
              Journal Historique des Ajustements d'Orchestration
            </h3>
            
            <div className="space-y-3.5">
              {history.map((record) => {
                const adjustmentCount = Object.keys(record.weight_adjustments || {}).length;
                const avgImprovement = typeof record.expected_improvement === 'number' ? record.expected_improvement : parseFloat(record.expected_improvement || '0') || 0;
                
                return (
                  <div key={record.id} className="p-4 rounded-xl border border-border/40 bg-card/30 hover:bg-card/50 transition-colors space-y-3">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="space-y-1">
                        <div className="font-semibold text-sm">
                          {new Date(record.adjustment_date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(record.adjustment_date), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </div>
                      </div>
                      <Badge variant={adjustmentCount > 0 ? "default" : "secondary"} className="text-xs">
                        {adjustmentCount} ajustement{adjustmentCount > 1 ? 's' : ''}
                      </Badge>
                    </div>

                    {adjustmentCount > 0 && (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-3 gap-2 text-[11px] bg-secondary/15 p-2 rounded-lg border border-border/20">
                          <div className="text-muted-foreground">
                            Modèles : <span className="font-semibold text-foreground">{record.trigger_metrics?.total_algorithms || 0}</span>
                          </div>
                          <div className="text-muted-foreground">
                            Précision : <span className="font-semibold text-foreground">{(typeof record.trigger_metrics?.avg_accuracy_overall === 'number' ? record.trigger_metrics.avg_accuracy_overall : parseFloat(record.trigger_metrics?.avg_accuracy_overall || '0') || 0).toFixed(1)}%</span>
                          </div>
                          <div className="text-muted-foreground">
                            Gain attendu : <span className="font-semibold text-emerald-500 font-mono">+{avgImprovement.toFixed(1)}%</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                          {Object.entries(record.weight_adjustments as Record<string, WeightAdjustment>).map(([algo, w]) => {
                            const change = w.new - w.previous;
                            const changePercent = w.previous > 0 ? (change / w.previous) * 100 : 0;
                            
                            return (
                              <div 
                                key={algo}
                                className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-secondary/10 border border-border/10 text-xs"
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-[11px] text-foreground/90">{algo}</div>
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    Poids: {typeof w?.previous === 'number' ? w.previous.toFixed(2) : '0.00'} → {typeof w?.new === 'number' ? w.new.toFixed(2) : '0.00'}
                                  </div>
                                </div>
                                
                                <Badge 
                                  variant={change > 0 ? "default" : change < 0 ? "destructive" : "secondary"}
                                  className="ml-2 font-mono text-[10px] scale-90"
                                >
                                  {change > 0 ? (
                                    <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                                  ) : change < 0 ? (
                                    <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                                  ) : (
                                    <Minus className="h-2.5 w-2.5 mr-0.5" />
                                  )}
                                  {changePercent > 0 ? '+' : ''}{(typeof changePercent === 'number' && !isNaN(changePercent)) ? changePercent.toFixed(1) : '0.0'}%
                                </Badge>
                              </div>
                            );
                          })}
                        </div>

                        {record.parameter_adjustments && Object.keys(record.parameter_adjustments).length > 0 && (
                          <div className="pt-2 border-t border-border/20 mt-2 space-y-1">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                              Ajustements des paramètres
                            </div>
                            {Object.entries(record.parameter_adjustments as Record<string, ParameterAdjustments>).map(([algo, adj]) => {
                               return (
                                 <div key={algo} className="flex flex-col py-1 px-3 rounded bg-accent/5 border border-accent/10 text-xs mt-1">
                                    <div className="font-medium text-[10px] text-foreground">{algo}</div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {Object.entries(adj).map(([param, v]) => {
                                          return (
                                            <div key={param} className="flex items-center justify-between mt-0.5">
                                              <span className="font-mono text-primary/80">{param} :</span>
                                              <span className="font-mono">{v.previous} → {v.new}</span>
                                            </div>
                                          );
                                      })}
                                    </div>
                                 </div>
                               );
                            })}
                          </div>
                        )}

                        {record.notes && (
                          <p className="text-[11px] text-muted-foreground italic bg-muted/40 p-2 rounded border-l-2 border-primary/40 mt-1 whitespace-pre-line">
                            {record.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
