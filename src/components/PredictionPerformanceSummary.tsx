import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Target, 
  Award, 
  Zap, 
  BarChart3,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PerformanceStats {
  totalPredictions: number;
  totalMatches: number;
  avgMatchesPerPrediction: number;
  bestMatch: number;
  perfectPredictions: number;
  excellentPredictions: number;
  goodPredictions: number;
  recentTrend: 'up' | 'down' | 'stable';
  algorithms: {
    name: string;
    avgAccuracy: number;
    predictions: number;
  }[];
}

interface PredictionPerformanceSummaryProps {
  drawName?: string;
}

export const PredictionPerformanceSummary = ({ drawName }: PredictionPerformanceSummaryProps) => {
  const { data: performanceData, isLoading } = useQuery({
    queryKey: ["performance-summary", drawName],
    queryFn: async () => {
      let query = supabase
        .from("algorithm_performance")
        .select("id, matches_count, accuracy_score, model_used")
        .order("created_at", { ascending: false })
        .limit(100);

      if (drawName) {
        query = query.eq("draw_name", drawName);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats: PerformanceStats | null = useMemo(() => {
    if (!performanceData || performanceData.length === 0) return null;

    const totalPredictions = performanceData.length;
    const totalMatches = performanceData.reduce((sum, p) => sum + (p.matches_count || 0), 0);
    const avgMatchesPerPrediction = totalMatches / totalPredictions;
    const bestMatch = Math.max(...performanceData.map(p => p.matches_count || 0));
    
    const perfectPredictions = performanceData.filter(p => (p.matches_count || 0) === 5).length;
    const excellentPredictions = performanceData.filter(p => (p.matches_count || 0) >= 4).length;
    const goodPredictions = performanceData.filter(p => (p.matches_count || 0) >= 3).length;

    // Calculate recent trend (last 10 vs previous 10)
    const recent10 = performanceData.slice(0, 10);
    const previous10 = performanceData.slice(10, 20);
    
    const recentAvg = recent10.reduce((sum, p) => sum + (p.matches_count || 0), 0) / (recent10.length || 1);
    const previousAvg = previous10.length > 0 
      ? previous10.reduce((sum, p) => sum + (p.matches_count || 0), 0) / previous10.length 
      : recentAvg;
    
    const recentTrend: 'up' | 'down' | 'stable' = 
      recentAvg > previousAvg + 0.2 ? 'up' : 
      recentAvg < previousAvg - 0.2 ? 'down' : 'stable';

    // Group by algorithm
    const algorithmMap = new Map<string, { total: number; matches: number; count: number }>();
    performanceData.forEach(p => {
      const existing = algorithmMap.get(p.model_used) || { total: 0, matches: 0, count: 0 };
      algorithmMap.set(p.model_used, {
        total: existing.total + (p.accuracy_score || 0),
        matches: existing.matches + (p.matches_count || 0),
        count: existing.count + 1,
      });
    });

    const algorithms = Array.from(algorithmMap.entries())
      .map(([name, data]) => ({
        name,
        avgAccuracy: data.total / data.count,
        predictions: data.count,
      }))
      .sort((a, b) => b.avgAccuracy - a.avgAccuracy)
      .slice(0, 5);

    return {
      totalPredictions,
      totalMatches,
      avgMatchesPerPrediction,
      bestMatch,
      perfectPredictions,
      excellentPredictions,
      goodPredictions,
      recentTrend,
      algorithms,
    };
  }, [performanceData]);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-6 text-center">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            Pas encore de données de performance
          </p>
        </CardContent>
      </Card>
    );
  }

  const accuracyPercent = (stats.avgMatchesPerPrediction / 5) * 100;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 pb-4">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Performance des Prédictions
          {drawName && (
            <Badge variant="outline" className="ml-2">
              {drawName}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-primary/10 text-center"
          >
            <Target className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-primary">{stats.totalPredictions}</p>
            <p className="text-xs text-muted-foreground">Prédictions</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-3 rounded-lg bg-success/10 text-center"
          >
            <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-success" />
            <p className="text-2xl font-bold text-success">{stats.avgMatchesPerPrediction.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Moy. correspondances</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-3 rounded-lg bg-accent/10 text-center"
          >
            <Award className="w-5 h-5 mx-auto mb-1 text-accent" />
            <p className="text-2xl font-bold text-accent">{stats.bestMatch}</p>
            <p className="text-xs text-muted-foreground">Meilleur score</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={cn(
              "p-3 rounded-lg text-center",
              stats.recentTrend === 'up' ? "bg-success/10" : 
              stats.recentTrend === 'down' ? "bg-destructive/10" : "bg-muted"
            )}
          >
            <TrendingUp className={cn(
              "w-5 h-5 mx-auto mb-1",
              stats.recentTrend === 'up' ? "text-success" : 
              stats.recentTrend === 'down' ? "text-destructive rotate-180" : "text-muted-foreground"
            )} />
            <p className={cn(
              "text-sm font-bold",
              stats.recentTrend === 'up' ? "text-success" : 
              stats.recentTrend === 'down' ? "text-destructive" : "text-muted-foreground"
            )}>
              {stats.recentTrend === 'up' ? "En hausse" : 
               stats.recentTrend === 'down' ? "En baisse" : "Stable"}
            </p>
            <p className="text-xs text-muted-foreground">Tendance récente</p>
          </motion.div>
        </div>

        {/* Accuracy Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Taux de précision global</span>
            <span className="font-bold text-primary">{accuracyPercent.toFixed(1)}%</span>
          </div>
          <Progress value={accuracyPercent} className="h-2" />
        </div>

        {/* Match Distribution */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded bg-amber-500/10">
            <Zap className="w-4 h-4 mx-auto text-amber-500 mb-1" />
            <p className="text-lg font-bold text-amber-600">{stats.perfectPredictions}</p>
            <p className="text-[10px] text-muted-foreground">5/5 Parfaits</p>
          </div>
          <div className="p-2 rounded bg-success/10">
            <CheckCircle2 className="w-4 h-4 mx-auto text-success mb-1" />
            <p className="text-lg font-bold text-success">{stats.excellentPredictions}</p>
            <p className="text-[10px] text-muted-foreground">4+ Excellents</p>
          </div>
          <div className="p-2 rounded bg-primary/10">
            <Target className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold text-primary">{stats.goodPredictions}</p>
            <p className="text-[10px] text-muted-foreground">3+ Bons</p>
          </div>
        </div>

        {/* Top Algorithms */}
        {stats.algorithms.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Top Algorithmes</p>
            <div className="space-y-1.5">
              {stats.algorithms.slice(0, 3).map((algo, idx) => (
                <div 
                  key={`${algo.name}-${idx}`}
                  className="flex items-center justify-between p-2 rounded bg-secondary/30"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-5 h-5 p-0 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </Badge>
                    <span className="text-sm truncate max-w-[150px]">{algo.name}</span>
                  </div>
                  <Badge className={cn(
                    "text-xs",
                    algo.avgAccuracy >= 40 ? "bg-success/20 text-success" : "bg-muted"
                  )}>
                    {algo.avgAccuracy.toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
