import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberBall } from "@/components/NumberBall";
import { usePredictions } from "@/hooks/usePredictions";
import { useDrawResults } from "@/hooks/useDrawResults";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, XCircle, Target, TrendingUp, Award, Filter, Download, Calendar, BarChart2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PredictionComparisonProps {
  drawName: string;
}

export const PredictionComparison = ({ drawName }: PredictionComparisonProps) => {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [showChart, setShowChart] = useState(true);
  
  const { data: predictions, isLoading: predictionsLoading } = usePredictions(drawName, 50);
  const { data: results, isLoading: resultsLoading } = useDrawResults(drawName, 50);

  const comparePredictionWithResult = (prediction: any, predictionDate: string) => {
    if (!results) return null;

    // Find the next draw after the prediction date
    const nextDraw = results.find(
      (result) => new Date(result.draw_date) > new Date(predictionDate)
    );

    if (!nextDraw) return null;

    const matches = prediction.predicted_numbers.filter((num: number) =>
      nextDraw.winning_numbers.includes(num)
    );

    return {
      result: nextDraw,
      matches: matches.length,
      accuracy: (matches.length / prediction.predicted_numbers.length) * 100,
      matchedNumbers: matches,
    };
  };

  // Get unique algorithms - MUST be before early returns
  const algorithms = useMemo(() => {
    if (!predictions) return [];
    const unique = [...new Set(predictions.map(p => p.model_used))];
    return unique;
  }, [predictions]);

  // Filter predictions by algorithm - MUST be before early returns
  const filteredPredictions = useMemo(() => {
    if (!predictions) return [];
    if (selectedAlgorithm === "all") return predictions;
    return predictions.filter(p => p.model_used === selectedAlgorithm);
  }, [predictions, selectedAlgorithm]);

  // Calculate overall statistics with sorting - MUST be before early returns
  const validComparisons = useMemo(() => {
    const comparisons = filteredPredictions
      ?.map(p => ({
        ...comparePredictionWithResult(p, p.prediction_date),
        prediction: p
      }))
      .filter(c => c.result) || [];

    // Sort comparisons
    if (sortBy === "accuracy") {
      return comparisons.sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0));
    } else if (sortBy === "matches") {
      return comparisons.sort((a, b) => (b.matches || 0) - (a.matches || 0));
    }
    // Default: sort by date
    return comparisons.sort((a, b) => 
      new Date(b.prediction.prediction_date).getTime() - new Date(a.prediction.prediction_date).getTime()
    );
  }, [filteredPredictions, sortBy, results]);

  const totalAccuracy = useMemo(() => 
    validComparisons.length > 0 
      ? validComparisons.reduce((sum, c) => sum + (c.accuracy || 0), 0) / validComparisons.length 
      : 0,
    [validComparisons]
  );

  const totalMatches = useMemo(() => 
    validComparisons.reduce((sum, c) => sum + (c.matches || 0), 0),
    [validComparisons]
  );

  const bestPrediction = useMemo(() => 
    validComparisons.length > 0 
      ? Math.max(...validComparisons.map(c => c.matches || 0)) 
      : 0,
    [validComparisons]
  );

  // Chart data - MUST be before early returns
  const chartData = useMemo(() => {
    return validComparisons.slice(0, 20).reverse().map((comp, idx) => ({
      name: format(new Date(comp.prediction.prediction_date), "dd/MM", { locale: fr }),
      accuracy: comp.accuracy?.toFixed(1),
      matches: comp.matches,
    }));
  }, [validComparisons]);

  // NOW we can do early returns after all hooks are called
  if (predictionsLoading || resultsLoading) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (!predictions || predictions.length === 0) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Aucune prédiction à comparer pour le moment
          </p>
        </CardContent>
      </Card>
    );
  }

  // Export function
  const handleExport = () => {
    const escapeCSV = (value: any): string => {
      const str = String(value).substring(0, 1000);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const exportData = validComparisons.map(comp => ({
      date_prediction: comp.prediction.prediction_date,
      date_tirage: comp.result?.draw_date,
      algorithme: comp.prediction.model_used?.replace(/[^a-zA-Z0-9\s-]/g, '') || 'Unknown',
      numeros_predits: comp.prediction.predicted_numbers.join(', '),
      numeros_gagnants: comp.result?.winning_numbers.join(', '),
      matches: comp.matches,
      precision: `${comp.accuracy?.toFixed(1)}%`,
      confiance: comp.prediction.confidence_score,
    }));

    const csv = [
      Object.keys(exportData[0]).join(','),
      ...exportData.map(row => Object.values(row).map(escapeCSV).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparaison-predictions-${drawName.replace(/[^a-z0-9]/gi, '_')}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Filters and controls */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtres et Options
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChart(!showChart)}
              >
                <BarChart2 className="w-4 h-4 mr-2" />
                {showChart ? "Masquer" : "Afficher"} Graphique
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={validComparisons.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="algorithm-filter">Filtrer par Algorithme</Label>
              <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
                <SelectTrigger id="algorithm-filter">
                  <SelectValue placeholder="Tous les algorithmes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les algorithmes</SelectItem>
                  {algorithms.map(algo => (
                    <SelectItem key={algo} value={algo}>
                      {algo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort-by">Trier par</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sort-by">
                  <SelectValue placeholder="Date (récent)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date (récent)</SelectItem>
                  <SelectItem value="accuracy">Précision (meilleur)</SelectItem>
                  <SelectItem value="matches">Correspondances (plus)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      {showChart && validComparisons.length > 0 && (
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5" />
              Évolution de la Précision
            </CardTitle>
            <CardDescription>
              Performance des prédictions au fil du temps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
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
                  name="Précision (%)"
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="matches" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  name="Numéros trouvés"
                  dot={{ fill: 'hsl(var(--accent))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {validComparisons.length > 0 && (
        <Card className="bg-gradient-primary text-white border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Statistiques de Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target className="w-4 h-4" />
                  <p className="text-xs opacity-80">Précision Moyenne</p>
                </div>
                <p className="text-3xl font-bold">{totalAccuracy.toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <p className="text-xs opacity-80">Meilleure Performance</p>
                </div>
                <p className="text-3xl font-bold">{bestPrediction}/5</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Award className="w-4 h-4" />
                  <p className="text-xs opacity-80">Total Numéros Trouvés</p>
                </div>
                <p className="text-3xl font-bold">{totalMatches}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle>Comparaison Détaillée des Prédictions</CardTitle>
          <CardDescription>
            Analysez la performance de nos algorithmes de prédiction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {validComparisons.map((comparison) => {
            const prediction = comparison.prediction;
            if (!comparison.result) return null;

            return (
              <div
                key={prediction.id}
                className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      Prédiction du{" "}
                      {format(new Date(prediction.prediction_date), "d MMM yyyy", {
                        locale: fr,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tirage du{" "}
                      {format(new Date(comparison.result.draw_date), "d MMM yyyy", {
                        locale: fr,
                      })}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {prediction.model_used}
                    </Badge>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-2xl font-bold text-primary">
                      {comparison.accuracy?.toFixed(0)}%
                    </p>
                    <Badge variant={comparison.matches >= 3 ? "default" : "secondary"}>
                      {comparison.matches}/5 trouvés
                    </Badge>
                    {prediction.confidence_score && (
                      <p className="text-xs text-muted-foreground">
                        Confiance: {Math.round(prediction.confidence_score * 100)}%
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Numéros Prédits
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {prediction.predicted_numbers.map((num: number, idx: number) => {
                      const isMatch = comparison.matchedNumbers.includes(num);
                      return (
                        <div key={`${num}-${idx}`} className="relative">
                          <NumberBall number={num} size="md" />
                          {isMatch ? (
                            <CheckCircle2 className="absolute -top-1 -right-1 w-5 h-5 text-success bg-background rounded-full" />
                          ) : (
                            <XCircle className="absolute -top-1 -right-1 w-5 h-5 text-destructive/60 bg-background rounded-full" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Résultat Réel - Numéros Gagnants
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {comparison.result.winning_numbers.map((num: number, idx: number) => (
                        <NumberBall key={`${num}-${idx}`} number={num} size="md" />
                      ))}
                    </div>
                  </div>
                  {comparison.result.machine_numbers && comparison.result.machine_numbers.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Numéros Machine
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {comparison.result.machine_numbers.map((num: number, idx: number) => (
                          <NumberBall key={`machine-${num}-${idx}`} number={num} size="sm" className="opacity-70" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">
                      {comparison.matches} numéro(s) correct(s) sur{" "}
                      {prediction.predicted_numbers.length}
                    </span>
                    <span className="font-medium">
                      {comparison.matches >= 3 ? "🔥 Excellent" : 
                       comparison.matches >= 2 ? "✓ Bon" : "⚠️ Faible"}
                    </span>
                  </div>
                  <Progress value={comparison.accuracy} className="h-2" />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
