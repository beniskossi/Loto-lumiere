import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Target, Zap, Award, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlgorithmComparison } from "@/hooks/useAlgorithmComparison";

interface AdvancedMetricsDashboardProps {
  drawName?: string;
}

export const AdvancedMetricsDashboard = ({ drawName }: AdvancedMetricsDashboardProps) => {
  const { data: rankings, isLoading } = useAlgorithmComparison(drawName);

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!rankings || rankings.length === 0) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle>Métriques Avancées</CardTitle>
          <CardDescription>Aucune donnée disponible - Lancez des prédictions pour voir les statistiques</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Préparer les données pour les graphiques
  const performanceData = rankings.map(r => ({
    name: r.model_used?.substring(0, 20) || "Unknown",
    precision: r.avg_accuracy,
    taux_excellence: r.total_predictions > 0 
      ? ((r.excellent_predictions || 0) / r.total_predictions * 100) 
      : 0,
    meilleur_match: r.best_accuracy || 0,
    predictions: r.total_predictions,
  }));

  // Données pour le radar chart (normalisation des métriques)
  const radarData = rankings.slice(0, 5).map(r => ({
    algorithm: r.model_used?.substring(0, 15) || "Unknown",
    Précision: r.avg_accuracy || 0,
    Excellence: r.total_predictions > 0 
      ? ((r.excellent_predictions || 0) / r.total_predictions * 100) 
      : 0,
    Consistance: r.consistency_score || 0,
    Volume: Math.min(100, (r.total_predictions || 0) / 50 * 100),
  }));

  // Données de stabilité
  const stabilityData = rankings.map(r => ({
    name: r.model_used?.substring(0, 15) || "Unknown",
    accuracy: r.avg_accuracy || 0,
    stability: r.consistency_score || 0,
  }));

  // Matrice de performance
  const confusionData = rankings.slice(0, 8).map(r => ({
    algorithm: r.model_used?.substring(0, 12) || "Unknown",
    correct: r.excellent_predictions || 0,
    good: r.good_predictions || 0,
    total: r.total_predictions || 0,
    accuracy: r.avg_accuracy || 0,
  }));

  const bestAlgorithm = rankings[0];
  const mostPredictions = rankings.reduce((max, r) => r.total_predictions > max.total_predictions ? r : max, rankings[0]);
  const avgExcellence = rankings.length > 0 
    ? rankings.reduce((acc, r) => acc + (r.total_predictions > 0 ? ((r.excellent_predictions || 0) / r.total_predictions * 100) : 0), 0) / rankings.length
    : 0;

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Dashboard Analytics Avancé
        </CardTitle>
        <CardDescription>
          Analyse détaillée des performances et métriques des algorithmes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="radar">Comparaison</TabsTrigger>
            <TabsTrigger value="stability">Stabilité</TabsTrigger>
            <TabsTrigger value="matrix">Matrice</TabsTrigger>
          </TabsList>

          {/* Performance Overview */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-secondary/20">
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Meilleure Précision
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {bestAlgorithm?.avg_accuracy?.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {bestAlgorithm?.model_used}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-secondary/20">
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Plus de Prédictions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {mostPredictions?.total_predictions || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {mostPredictions?.model_used}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-secondary/20">
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Taux Excellence Moyen
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {avgExcellence.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sur tous les algorithmes
                  </p>
                </CardContent>
              </Card>
            </div>

            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="precision" fill="hsl(var(--primary))" name="Précision %" />
                <Bar dataKey="taux_excellence" fill="hsl(var(--accent))" name="Taux Excellence %" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Radar Comparison */}
          <TabsContent value="radar" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Comparaison multidimensionnelle des 5 meilleurs algorithmes
            </div>
            <ResponsiveContainer width="100%" height={450}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis 
                  dataKey="algorithm" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" />
                <Radar 
                  name="Métriques" 
                  dataKey="Précision" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.3} 
                />
                <Radar 
                  name="Excellence" 
                  dataKey="Excellence" 
                  stroke="hsl(var(--accent))" 
                  fill="hsl(var(--accent))" 
                  fillOpacity={0.3} 
                />
                <Legend />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Stability Analysis */}
          <TabsContent value="stability" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Analyse de la stabilité et consistance des prédictions
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={stabilityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Précision Moyenne"
                />
                <Line 
                  type="monotone" 
                  dataKey="stability" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  name="Score de Stabilité"
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Performance Matrix */}
          <TabsContent value="matrix" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Matrice de performance : prédictions correctes vs totales
            </div>
            <div className="space-y-3">
              {confusionData.map((item, idx) => {
                const accuracyPercent = item.accuracy;
                const excellenceRate = item.total > 0 ? (item.correct / item.total * 100) : 0;
                
                return (
                  <div key={idx} className="p-4 bg-secondary/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{item.algorithm}</span>
                      <div className="flex gap-2">
                        <Badge variant="default">{accuracyPercent.toFixed(1)}%</Badge>
                        <Badge variant="outline">{item.total} total</Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-primary h-full transition-all duration-500"
                            style={{ width: `${accuracyPercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-16 text-right">
                          Précision
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-accent h-full transition-all duration-500"
                            style={{ width: `${excellenceRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-16 text-right">
                          Excellence
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>✓ Excellentes: {item.correct}</span>
                      <span>◐ Bonnes: {item.good}</span>
                      <span>Total: {item.total}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
