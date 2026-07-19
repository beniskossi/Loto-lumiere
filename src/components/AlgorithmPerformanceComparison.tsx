import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Target,
  Activity,
  Crown,
} from "lucide-react";
import { useAlgorithmComparison, useAlgorithmTrends } from "@/hooks/useAlgorithmComparison";
import { DRAW_SCHEDULE } from "@/types/lottery";

import { ALGORITHMS, getAlgorithm } from "@/lib/algorithms/registry";

// Couleurs dérivées du registre centralisé (source unique de vérité).
// Inclut des alias pour les variantes courtes que la DB peut retourner.
const ALGORITHM_COLORS: Record<string, string> = Object.fromEntries(
  Object.values(ALGORITHMS).map((a) => [a.name, a.color])
);
// Alias historiques
ALGORITHM_COLORS["LSTM"] = ALGORITHMS["Séquences Récurrentes"].color;
ALGORITHM_COLORS["Transformer"] = ALGORITHMS["Attention Spatiale"].color;

export const AlgorithmPerformanceComparison = () => {
  const allDraws = Object.values(DRAW_SCHEDULE).flat();
  const [selectedDraw, setSelectedDraw] = useState<string>(allDraws.length > 0 ? allDraws[0].name : "Etoile");
  const { data: comparisonData, isLoading: isLoadingComparison } = useAlgorithmComparison(selectedDraw);
  const { data: trendsData, isLoading: isLoadingTrends } = useAlgorithmTrends(selectedDraw, 100);

  const getTrendIcon = (trend: "improving" | "stable" | "declining") => {
    if (trend === "improving") return <TrendingUp className="w-4 h-4 text-success" />;
    if (trend === "declining") return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendBadge = (trend: "improving" | "stable" | "declining", value: number) => {
    const variant = trend === "improving" ? "default" : trend === "declining" ? "destructive" : "secondary";
    const sign = value > 0 ? "+" : "";
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {getTrendIcon(trend)}
        {sign}{value.toFixed(1)}%
      </Badge>
    );
  };

  const getModelColor = (modelName: string): string => {
    for (const [key, color] of Object.entries(ALGORITHM_COLORS)) {
      if (modelName.includes(key)) return color;
    }
    return "hsl(var(--muted-foreground))";
  };

  if (isLoadingComparison || isLoadingTrends) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!comparisonData || comparisonData.length === 0) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Aucune donnée de performance disponible
          </p>
        </CardContent>
      </Card>
    );
  }

  // Identifier le meilleur algorithme global
  const bestAlgorithm = comparisonData[0];

  // Préparer les données pour le graphique de tendances
  const trendChartData = trendsData?.reduce((acc, item) => {
    const existingDate = acc.find(d => d.date === item.date);
    if (existingDate) {
      existingDate[item.model_used] = item.accuracy_score;
    } else {
      acc.push({
        date: item.date,
        [item.model_used]: item.accuracy_score,
      });
    }
    return acc;
  }, [] as Record<string, unknown>[]) || [];

  // Préparer les données pour le graphique de barres (comparaison globale)
  const barChartData = comparisonData.slice(0, 10).map(alg => ({
    name: alg.model_used.split(" ")[0],
    accuracy: alg.avg_accuracy,
    matches: alg.avg_matches,
    consistency: alg.consistency_score,
  }));

  // Préparer les données pour le radar chart (Top 3 algorithmes)
  const top3Algorithms = comparisonData.slice(0, 3);
  const radarData = [
    { metric: "Précision" },
    { metric: "Consistance" },
    { metric: "Bons (3+)" },
    { metric: "Excellents (4+)" },
    { metric: "Matches Moy." }
  ];

  top3Algorithms.forEach(alg => {
    const algName = alg.model_used.split(" ")[0];
    const goodPlusRate = ((alg.good_predictions + alg.excellent_predictions + alg.perfect_predictions) / alg.total_predictions) * 100;
    const excellentPlusRate = ((alg.excellent_predictions + alg.perfect_predictions) / alg.total_predictions) * 100;

    radarData[0][algName] = alg.avg_accuracy;
    radarData[1][algName] = alg.consistency_score;
    radarData[2][algName] = Number(goodPlusRate.toFixed(1));
    radarData[3][algName] = Number((excellentPlusRate * 10).toFixed(1)); // Boosted for visibility
    radarData[4][algName] = Number((alg.avg_matches * 20).toFixed(1)); // Scaled to 100
  });

  const uniqueModels = [...new Set(trendsData?.map(t => t.model_used) || [])];

  return (
    <div className="space-y-6">
      {/* En-tête avec filtre */}
      <Card className="bg-card border-border/50 shadow-sm animate-fade-in hover:shadow-glow transition-all duration-300">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Award className="w-5 h-5 text-primary" />
                </div>
                Comparaison des Performances des Algorithmes
              </CardTitle>
              <CardDescription className="text-base mt-1">
                Analyse comparative complète avec tendances et métriques avancées
              </CardDescription>
            </div>
            <Select value={selectedDraw} onValueChange={setSelectedDraw}>
              <SelectTrigger className="w-[200px] h-11">
                <SelectValue placeholder="Sélectionner un tirage" />
              </SelectTrigger>
              <SelectContent>
                {allDraws.map((draw) => (
                  <SelectItem key={draw.name} value={draw.name}>
                    {draw.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Meilleur algorithme mis en avant */}
      <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-border/50 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Crown className="w-6 h-6 text-yellow-300" />
            Meilleur Algorithme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm font-medium opacity-80">Algorithme</p>
              <p className="text-3xl font-bold mt-1 tracking-tight">{bestAlgorithm.model_used}</p>
              <p className="text-sm font-medium opacity-80 mt-1">{bestAlgorithm.draw_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium opacity-80">Précision Moyenne</p>
              <p className="text-3xl font-bold mt-1 tracking-tight">{bestAlgorithm.avg_accuracy}%</p>
            </div>
            <div>
              <p className="text-sm font-medium opacity-80">Matches Moyens</p>
              <p className="text-3xl font-bold mt-1 tracking-tight">{bestAlgorithm.avg_matches}/5</p>
            </div>
            <div>
              <p className="text-sm font-medium opacity-80">Score de Consistance</p>
              <p className="text-3xl font-bold mt-1 tracking-tight">{bestAlgorithm.consistency_score}%</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-transparent hover:bg-primary-foreground/30 px-3 py-1">
              {bestAlgorithm.perfect_predictions} parfaites (5/5)
            </Badge>
            <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-transparent hover:bg-primary-foreground/30 px-3 py-1">
              {bestAlgorithm.excellent_predictions} excellentes (4/5)
            </Badge>
            <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-transparent hover:bg-primary-foreground/30 px-3 py-1">
              {bestAlgorithm.good_predictions} bonnes (3/5)
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Graphique de tendances temporelles */}
      <Card className="bg-card border-border/50 shadow-sm hover:shadow-glow transition-all duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            Tendances de Précision dans le Temps
          </CardTitle>
          <CardDescription className="text-base mt-1">
            Évolution de la précision de chaque algorithme sur les dernières prédictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                tickFormatter={(date) => new Date(date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
              />
              <YAxis
                tick={{ fill: "hsl(var(--foreground))" }}
                label={{ value: 'Précision (%)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelFormatter={(date) => new Date(date).toLocaleDateString('fr-FR')}
              />
              <Legend />
              {uniqueModels.map((model) => (
                <Line
                  key={model}
                  type="monotone"
                  dataKey={model}
                  stroke={getModelColor(model)}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Graphique de comparaison globale */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-card to-muted/20 border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 bg-accent/10 rounded-full">
                <Target className="w-4 h-4 text-accent" />
              </div>
              Comparaison Globale des Performances
            </CardTitle>
            <CardDescription className="text-xs">
              Top 10 par précision et consistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
                />
                <YAxis tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="accuracy" fill="hsl(var(--primary))" name="Précision (%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="consistency" fill="hsl(var(--accent))" name="Consistance (%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-muted/20 border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 bg-primary/10 rounded-full">
                <Activity className="w-4 h-4 text-primary" />
              </div>
              Empreinte de Performance (Top 3)
            </CardTitle>
            <CardDescription className="text-xs">
              Analyse multidimensionnelle des meilleurs modèles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                {top3Algorithms.map((alg, index) => {
                  const algName = alg.model_used.split(" ")[0];
                  // Utiliser des couleurs distinctes pour le top 3 (Primary, Accent, Success/Destructive)
                  const color = index === 0 ? "hsl(var(--primary))" : index === 1 ? "hsl(var(--accent))" : "hsl(var(--emerald-500))";
                  return (
                    <Radar
                      key={algName}
                      name={algName}
                      dataKey={algName}
                      stroke={color}
                      fill={color}
                      fillOpacity={0.3}
                    />
                  );
                })}
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tableau détaillé */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle>Tableau Comparatif Détaillé</CardTitle>
          <CardDescription>
            Toutes les métriques de performance pour chaque algorithme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Algorithme</TableHead>
                  <TableHead className="text-center">Précision Moy.</TableHead>
                  <TableHead className="text-center">Matches Moy.</TableHead>
                  <TableHead className="text-center">Consistance</TableHead>
                  <TableHead className="text-center">Parfaites</TableHead>
                  <TableHead className="text-center">Excellentes</TableHead>
                  <TableHead className="text-center">Bonnes</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Tendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonData.map((alg, index) => (
                  <TableRow key={`${alg.model_used}-${alg.draw_name}-${index}`} className="hover:bg-accent/5">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                        <span>{alg.model_used}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={alg.avg_accuracy >= 25 ? "default" : alg.avg_accuracy >= 20 ? "secondary" : "outline"}>
                        {alg.avg_accuracy}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {alg.avg_matches}/5
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={alg.consistency_score >= 80 ? "default" : "outline"}>
                        {alg.consistency_score}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-success font-semibold">{alg.perfect_predictions}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-primary font-semibold">{alg.excellent_predictions}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-accent font-semibold">{alg.good_predictions}</span>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {alg.total_predictions}
                    </TableCell>
                    <TableCell className="text-center">
                      {getTrendBadge(alg.recent_trend, alg.trend_value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
