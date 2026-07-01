import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Timer, TrendingUp, TrendingDown, AlertTriangle, Target, Flame, Snowflake } from "lucide-react";
import { motion } from "framer-motion";
import { NumberBall } from "@/components/NumberBall";
import { useNumberStatistics } from "@/hooks/useNumberStatistics";
import { useDrawResults } from "@/hooks/useDrawResults";
import { cn } from "@/lib/utils";

interface GapAnalysisTabProps {
  drawName: string;
}

interface GapCategory {
  label: string;
  range: string;
  min: number;
  max: number;
  color: string;
  bgColor: string;
  icon: React.ElementType;
  description: string;
}

const GAP_CATEGORIES: GapCategory[] = [
  { 
    label: "Très chauds", 
    range: "0-5 jours", 
    min: 0, 
    max: 5, 
    color: "text-red-500",
    bgColor: "bg-red-500/20",
    icon: Flame,
    description: "Sortis très récemment"
  },
  { 
    label: "Chauds", 
    range: "6-10 jours", 
    min: 6, 
    max: 10, 
    color: "text-orange-500",
    bgColor: "bg-orange-500/20",
    icon: TrendingUp,
    description: "En phase active"
  },
  { 
    label: "Optimaux", 
    range: "11-20 jours", 
    min: 11, 
    max: 20, 
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/20",
    icon: Target,
    description: "Intervalle optimal de retour"
  },
  { 
    label: "En retard", 
    range: "21-35 jours", 
    min: 21, 
    max: 35, 
    color: "text-amber-500",
    bgColor: "bg-amber-500/20",
    icon: AlertTriangle,
    description: "Début de retard"
  },
  { 
    label: "Très froids", 
    range: "36+ jours", 
    min: 36, 
    max: Infinity, 
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/20",
    icon: Snowflake,
    description: "Absents depuis longtemps"
  },
];

export const GapAnalysisTab = ({ drawName }: GapAnalysisTabProps) => {
  const { data: statistics, isLoading: statsLoading } = useNumberStatistics(drawName);
  const { data: results, isLoading: resultsLoading } = useDrawResults(drawName, 100);

  const isLoading = statsLoading || resultsLoading;

  // Categorize numbers by gap
  const categorizedNumbers = useMemo(() => {
    if (!statistics) return GAP_CATEGORIES.map(cat => ({ ...cat, numbers: [] as { number: number; gap: number; frequency: number }[] }));

    return GAP_CATEGORIES.map(category => ({
      ...category,
      numbers: statistics
        .filter(s => s.days_since_last >= category.min && s.days_since_last <= category.max)
        .map(s => ({
          number: s.number,
          gap: s.days_since_last,
          frequency: s.frequency
        }))
        .sort((a, b) => b.gap - a.gap)
    }));
  }, [statistics]);

  // Calculate gap statistics
  const gapStats = useMemo(() => {
    if (!statistics || statistics.length === 0) return null;

    const gaps = statistics.map(s => s.days_since_last);
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const maxGap = Math.max(...gaps);
    const minGap = Math.min(...gaps);
    
    // Numbers in optimal range (11-20)
    const optimalCount = statistics.filter(s => s.days_since_last >= 11 && s.days_since_last <= 20).length;
    const overdueCount = statistics.filter(s => s.days_since_last > 20).length;

    // Most overdue numbers
    const mostOverdue = statistics
      .filter(s => s.days_since_last > 20)
      .sort((a, b) => b.days_since_last - a.days_since_last)
      .slice(0, 5);

    return {
      avgGap: Math.round(avgGap),
      maxGap,
      minGap,
      optimalCount,
      overdueCount,
      mostOverdue
    };
  }, [statistics]);

  // Gap heatmap data
  const heatmapData = useMemo(() => {
    if (!statistics) return [];
    
    return Array.from({ length: 90 }, (_, i) => {
      const num = i + 1;
      const stat = statistics.find(s => s.number === num);
      return {
        number: num,
        gap: stat?.days_since_last || 0,
        frequency: stat?.frequency || 0
      };
    });
  }, [statistics]);

  const maxGapInHeatmap = Math.max(...heatmapData.map(d => d.gap), 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Analyse des écarts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold bg-gradient-to-r from-warning via-destructive to-warning bg-clip-text text-transparent">
          Analyse des Écarts
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          Identifiez les numéros en retard et ceux dans l'intervalle optimal
        </p>
      </motion.div>

      {/* Quick Stats */}
      {gapStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-card/50 border-border/30">
              <CardContent className="p-4 text-center">
                <Timer className="w-5 h-5 mx-auto mb-2 text-info" />
                <p className="text-2xl font-bold">{gapStats.avgGap}</p>
                <p className="text-xs text-muted-foreground">Écart moyen</p>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 border-border/30">
              <CardContent className="p-4 text-center">
                <TrendingDown className="w-5 h-5 mx-auto mb-2 text-cyan-400" />
                <p className="text-2xl font-bold">{gapStats.maxGap}</p>
                <p className="text-xs text-muted-foreground">Écart max</p>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 border-border/30">
              <CardContent className="p-4 text-center">
                <Target className="w-5 h-5 mx-auto mb-2 text-emerald-500" />
                <p className="text-2xl font-bold">{gapStats.optimalCount}</p>
                <p className="text-xs text-muted-foreground">Optimaux (11-20j)</p>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 border-border/30">
              <CardContent className="p-4 text-center">
                <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-warning" />
                <p className="text-2xl font-bold">{gapStats.overdueCount}</p>
                <p className="text-xs text-muted-foreground">En retard (20+j)</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Most Overdue Alert */}
      {gapStats && gapStats.mostOverdue.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="bg-gradient-to-r from-warning/20 to-destructive/10 border-warning/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-warning">
                <AlertTriangle className="w-4 h-4" />
                Numéros les Plus en Retard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 justify-center">
                {gapStats.mostOverdue.map((stat, idx) => (
                  <motion.div
                    key={stat.number}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="relative">
                      <NumberBall number={stat.number} size="md" className="w-12 h-12 shadow-lg" />
                      <Badge 
                        className="absolute -bottom-2 -right-2 text-[9px] px-1.5 py-0 bg-warning text-warning-foreground"
                      >
                        {stat.days_since_last}j
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Gap Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Timer className="w-4 h-4 text-warning" />
              Cartographie des Écarts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-9 sm:grid-cols-10 gap-1">
              {heatmapData.map((item) => {
                const heatIntensity = item.gap / maxGapInHeatmap;
                const category = GAP_CATEGORIES.find(c => item.gap >= c.min && item.gap <= c.max);
                
                return (
                  <motion.div
                    key={item.number}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: item.number * 0.003 }}
                    className={cn(
                      "aspect-square rounded-md flex flex-col items-center justify-center text-[10px] font-medium",
                      "transition-all duration-200 hover:scale-110 cursor-pointer relative group",
                      category?.bgColor || "bg-secondary/50"
                    )}
                    title={`${item.number}: ${item.gap} jours`}
                  >
                    <span className={cn("font-bold", category?.color)}>{item.number}</span>
                    <span className="text-[8px] text-muted-foreground">{item.gap}j</span>
                  </motion.div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {GAP_CATEGORIES.map((cat) => (
                <div key={cat.label} className="flex items-center gap-1.5">
                  <div className={cn("w-3 h-3 rounded", cat.bgColor)} />
                  <span className={cn("text-xs", cat.color)}>{cat.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Categorized Lists */}
      <div className="space-y-4">
        {categorizedNumbers.map((category, catIdx) => (
          category.numbers.length > 0 && (
            <motion.div
              key={category.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + catIdx * 0.05 }}
            >
              <Card className={cn("border-border/30 backdrop-blur-sm", category.bgColor)}>
                <CardHeader className="pb-2">
                  <CardTitle className={cn("flex items-center justify-between text-sm", category.color)}>
                    <div className="flex items-center gap-2">
                      <category.icon className="w-4 h-4" />
                      {category.label}
                      <Badge variant="outline" className={cn("text-xs", category.color)}>
                        {category.range}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {category.numbers.length} numéro{category.numbers.length > 1 ? 's' : ''}
                    </span>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {category.numbers.slice(0, 15).map((item, idx) => (
                      <motion.div
                        key={item.number}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="relative"
                      >
                        <NumberBall 
                          number={item.number} 
                          size="sm" 
                          className="w-9 h-9 text-xs"
                        />
                        <span className={cn(
                          "absolute -bottom-1 -right-1 text-[8px] font-bold px-1 rounded",
                          category.bgColor, category.color
                        )}>
                          {item.gap}j
                        </span>
                      </motion.div>
                    ))}
                    {category.numbers.length > 15 && (
                      <Badge variant="outline" className="text-xs self-center">
                        +{category.numbers.length - 15}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        ))}
      </div>

      {/* Recommendation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-primary mb-1">Recommandation</h4>
                <p className="text-xs text-muted-foreground">
                  Privilégiez les numéros dans l'intervalle <strong className="text-emerald-500">optimal (11-20 jours)</strong> car ils ont statistiquement plus de chances de réapparaître. 
                  Les numéros <strong className="text-cyan-400">très froids</strong> peuvent également présenter un intérêt pour les joueurs qui croient aux cycles de retour.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
