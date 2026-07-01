import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useBacktesting, type BacktestResult } from "@/hooks/useBacktesting";
import { DRAW_SCHEDULE, DAYS_ORDER } from "@/types/lottery";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, BarChart, Bar, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell
} from "recharts";
import { 
  BarChart3, TrendingUp, Award, Loader2, Target, 
  Zap, Activity, FlaskConical, Timer, CheckCircle2
} from "lucide-react";

export const BacktestingDashboard = () => {
  const [selectedDraw, setSelectedDraw] = useState("Reveil");
  const [latestResults, setLatestResults] = useState<BacktestResult[]>([]);
  
  const { 
    runBacktest, 
    isRunning, 
    aggregateStats, 
    trendData,
    isLoadingHistory,
    lastResults
  } = useBacktesting(selectedDraw);

  const allDraws = DAYS_ORDER.flatMap(day => DRAW_SCHEDULE[day]);

  // Sync latest results from hook
  const displayResults = latestResults.length > 0 ? latestResults : (lastResults?.evaluations || []);

  const handleRunBacktest = () => {
    runBacktest({
      drawName: selectedDraw,
      validationType: 'standard',
      saveResults: true
    });
  };

  const radarData = useMemo(() => {
    if (!displayResults.length) return [];
    
    return displayResults.slice(0, 6).map((result) => ({
      algorithm: result.algorithm.replace(/\s+/g, "\n"),
      precision: result.accuracy,
      consistance: Math.max(0, 100 - result.consistency * 20),
      meilleur: (result.bestMatch / 5) * 100,
      moyenne: (result.avgMatches / 5) * 100,
    }));
  }, [displayResults]);

  const comparisonData = useMemo(() => {
    if (!displayResults.length) return [];
    
    return displayResults.map((result) => ({
      name: result.algorithm,
      accuracy: result.accuracy,
      avgMatches: result.avgMatches,
      consistency: Math.max(0, 100 - result.consistency * 20),
    }));
  }, [displayResults]);

  const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FlaskConical className="w-6 h-6 text-primary" />
                Backtesting Professionnel
              </CardTitle>
              <CardDescription className="mt-1">
                Évaluation de la performance historique des algorithmes de prédiction
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <Timer className="w-3 h-3" />
              Data Science
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedDraw} onValueChange={setSelectedDraw}>
              <SelectTrigger className="w-full sm:w-[200px]">
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
            <Button 
              onClick={handleRunBacktest} 
              disabled={isRunning}
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Lancer le Backtesting
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="results" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="results" className="gap-2">
            <Target className="w-4 h-4" />
            Résultats
          </TabsTrigger>
          <TabsTrigger value="comparison" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Comparaison
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Tendances
          </TabsTrigger>
        </TabsList>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {isRunning && (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  <p className="text-muted-foreground">Évaluation des algorithmes en cours...</p>
                  <Progress value={33} className="w-64" />
                </div>
              </CardContent>
            </Card>
          )}

          {!isRunning && displayResults.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayResults.map((result, idx) => (
                <Card 
                  key={result.algorithm}
                  className={`transition-all hover:shadow-md ${
                    idx === 0 ? "border-primary bg-primary/5 ring-1 ring-primary/20" : ""
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {idx === 0 && <Award className="w-5 h-5 text-primary" />}
                        <CardTitle className="text-base">{result.algorithm}</CardTitle>
                      </div>
                      <Badge variant={idx === 0 ? "default" : "secondary"}>
                        #{idx + 1}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Accuracy Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Précision</span>
                        <span className="font-bold text-primary">
                          {result.accuracy.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={result.accuracy} 
                        className="h-2"
                      />
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-muted-foreground text-xs">Moy. matchs</p>
                        <p className="font-bold">{result.avgMatches.toFixed(2)}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-muted-foreground text-xs">Meilleur</p>
                        <p className="font-bold text-green-600">{result.bestMatch}/5</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-muted-foreground text-xs">Pire</p>
                        <p className="font-bold text-red-500">{result.worstMatch}/5</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-muted-foreground text-xs">Consistance</p>
                        <p className="font-bold">±{result.consistency.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t">
                      <CheckCircle2 className="w-3 h-3" />
                      {result.totalTests} tests effectués
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isRunning && displayResults.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Activity className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium mb-2">Aucun résultat de backtesting</h3>
                  <p className="text-sm">
                    Sélectionnez un tirage et lancez l'évaluation pour voir les performances
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-4">
          {displayResults.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Comparaison des Précisions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparisonData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(1)}%`, "Précision"]}
                      />
                      <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                        {comparisonData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Radar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Analyse Multi-Critères</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis 
                        dataKey="algorithm" 
                        tick={{ fontSize: 10 }}
                      />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar
                        name="Précision"
                        dataKey="precision"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                      />
                      <Radar
                        name="Consistance"
                        dataKey="consistance"
                        stroke="hsl(var(--chart-2))"
                        fill="hsl(var(--chart-2))"
                        fillOpacity={0.3}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Lancez un backtesting pour voir la comparaison</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          {isLoadingHistory ? (
            <Card>
              <CardContent className="py-8">
                <div className="space-y-4">
                  <Skeleton className="h-[300px] w-full" />
                </div>
              </CardContent>
            </Card>
          ) : trendData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Évolution des Performances</CardTitle>
                <CardDescription>
                  Historique des précisions par algorithme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }}
                      tickFormatter={(date) => new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(date) => new Date(date).toLocaleDateString("fr-FR")}
                      formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                    />
                    <Legend />
                    {aggregateStats?.slice(0, 5).map((stat, idx) => (
                      <Line
                        key={stat.algorithm}
                        type="monotone"
                        dataKey={stat.algorithm}
                        stroke={COLORS[idx]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Pas assez de données historiques pour afficher les tendances</p>
              </CardContent>
            </Card>
          )}

          {/* Aggregate Stats */}
          {aggregateStats && aggregateStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Statistiques Agrégées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Algorithme</th>
                        <th className="text-right py-2 px-3">Précision Moy.</th>
                        <th className="text-right py-2 px-3">Matchs Moy.</th>
                        <th className="text-right py-2 px-3">Sharpe</th>
                        <th className="text-right py-2 px-3">Tests</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aggregateStats.map((stat, idx) => (
                        <tr 
                          key={stat.algorithm}
                          className={`border-b ${idx === 0 ? "bg-primary/5" : ""}`}
                        >
                          <td className="py-2 px-3 font-medium">
                            {idx === 0 && <Award className="w-4 h-4 inline mr-1 text-primary" />}
                            {stat.algorithm}
                          </td>
                          <td className="text-right py-2 px-3 font-bold text-primary">
                            {stat.avgAccuracy.toFixed(1)}%
                          </td>
                          <td className="text-right py-2 px-3">
                            {stat.avgMatches.toFixed(2)}
                          </td>
                          <td className="text-right py-2 px-3">
                            <span className={stat.sharpeRatio > 1 ? "text-green-600" : "text-muted-foreground"}>
                              {stat.sharpeRatio.toFixed(2)}
                            </span>
                          </td>
                          <td className="text-right py-2 px-3 text-muted-foreground">
                            {stat.totalTests}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
