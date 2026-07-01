import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Target,
  Zap,
  Activity,
  PieChart,
  Calculator,
  Sigma,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Info,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNumberStatistics } from "@/hooks/useNumberStatistics";
import { useDrawResults } from "@/hooks/useDrawResults";
import { NumberBall } from "./NumberBall";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Constantes empiriques et de calibration
const MAX_NUMBERS = 90;
const NUMBERS_PER_DRAW = 5;
const MIN_DRAWS_FOR_ANALYSIS = 10;
const HISTORY_LIMIT = 200;
const RECENT_WINDOW = 30;
const MOMENTUM_WINDOW = 20;
const HOT_ZSCORE_THRESHOLD = 1.5;
const COLD_ZSCORE_THRESHOLD = -1.5;
const OUTLIER_ZSCORE_THRESHOLD = 2.0;
const DUE_PERCENTAGE_THRESHOLD = 0.15; // 15% of total draws

interface AdvancedStatsDashboardProps {
  drawName: string;
}

interface StatisticalInsight {
  metric: string;
  value: number | string;
  trend: 'up' | 'down' | 'stable';
  description: string;
  significance: 'high' | 'medium' | 'low';
}

interface NumberAnalysis {
  number: number;
  frequency: number;
  lastSeen: number;
  zScore: number;
  expectedFrequency: number;
  deviation: number;
  momentum: number;
  category: 'hot' | 'cold' | 'neutral' | 'due';
}

export const AdvancedStatsDashboard = ({ drawName }: AdvancedStatsDashboardProps) => {
  const { data: stats, isLoading: statsLoading } = useNumberStatistics(drawName);
  const { data: results, isLoading: resultsLoading } = useDrawResults(drawName, HISTORY_LIMIT);
  const [selectedTab, setSelectedTab] = useState("overview");

  // Statistical Analysis
  const analysis = useMemo(() => {
    if (!stats || !results || results.length < MIN_DRAWS_FOR_ANALYSIS) return null;

    const totalDraws = results.length;
    const expectedFrequency = (totalDraws * NUMBERS_PER_DRAW) / MAX_NUMBERS;

    // Calculate frequencies and Z-scores
    const frequencies: Record<number, number> = {};
    const lastAppearance: Record<number, number> = {};
    const recentFrequency: Record<number, number> = {};
    const momentum: Record<number, number> = {};

    // Initialize all numbers
    for (let i = 1; i <= MAX_NUMBERS; i++) {
      frequencies[i] = 0;
      lastAppearance[i] = Infinity;
      recentFrequency[i] = 0;
      momentum[i] = 0;
    }

    // Calculate frequencies
    results.forEach((result, idx) => {
      result.winning_numbers.forEach(num => {
        frequencies[num] = (frequencies[num] || 0) + 1;
        if (lastAppearance[num] === Infinity) {
          lastAppearance[num] = idx;
        }
        // Recent frequency
        if (idx < RECENT_WINDOW) {
          recentFrequency[num] = (recentFrequency[num] || 0) + 1;
        }
        // Momentum (compare recent vs previous window)
        if (idx < MOMENTUM_WINDOW) {
          momentum[num] = (momentum[num] || 0) + 1;
        } else if (idx >= MOMENTUM_WINDOW && idx < (MOMENTUM_WINDOW * 2)) {
          momentum[num] = (momentum[num] || 0) - 1;
        }
      });
    });

    // Calculate standard deviation
    const freqValues = Object.values(frequencies);
    const mean = freqValues.reduce((a, b) => a + b, 0) / freqValues.length;
    const variance = freqValues.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / freqValues.length;
    const stdDev = Math.sqrt(variance);

    // Number analysis with categories
    const numberAnalysis: NumberAnalysis[] = [];
    
    for (let num = 1; num <= MAX_NUMBERS; num++) {
      const freq = frequencies[num] || 0;
      const zScore = stdDev > 0 ? (freq - mean) / stdDev : 0;
      const deviation = expectedFrequency > 0 ? ((freq - expectedFrequency) / expectedFrequency) * 100 : 0;
      const mom = momentum[num] || 0;
      const lastSeenIdx = lastAppearance[num];

      let category: 'hot' | 'cold' | 'neutral' | 'due' = 'neutral';
      if (zScore > HOT_ZSCORE_THRESHOLD) category = 'hot';
      else if (zScore < COLD_ZSCORE_THRESHOLD) category = 'cold';
      else if (lastSeenIdx > totalDraws * DUE_PERCENTAGE_THRESHOLD) category = 'due';

      numberAnalysis.push({
        number: num,
        frequency: freq,
        lastSeen: lastSeenIdx,
        zScore,
        expectedFrequency,
        deviation,
        momentum: mom,
        category
      });
    }

    // Sort by different criteria
    const hotNumbers = [...numberAnalysis].sort((a, b) => b.zScore - a.zScore).slice(0, 10);
    const coldNumbers = [...numberAnalysis].sort((a, b) => a.zScore - b.zScore).slice(0, 10);
    const dueNumbers = [...numberAnalysis]
      .filter(n => n.lastSeen !== Infinity)
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, 10);
    const momentumLeaders = [...numberAnalysis]
      .sort((a, b) => b.momentum - a.momentum)
      .slice(0, 10);

    // Statistical insights
    const insights: StatisticalInsight[] = [
      {
        metric: "Écart-type des fréquences",
        value: stdDev.toFixed(2),
        trend: stdDev > mean * 0.3 ? 'up' : 'stable',
        description: "Dispersion des fréquences d'apparition",
        significance: stdDev > mean * 0.4 ? 'high' : 'medium'
      },
      {
        metric: "Entropie de distribution",
        value: calculateEntropy(freqValues).toFixed(3),
        trend: 'stable',
        description: "Mesure du caractère aléatoire de la distribution",
        significance: 'medium'
      },
      {
        metric: "Coefficient de variation",
        value: `${mean > 0 ? ((stdDev / mean) * 100).toFixed(1) : 0}%`,
        trend: 'stable',
        description: "Variabilité relative des fréquences",
        significance: mean > 0 && (stdDev / mean) > 0.3 ? 'high' : 'low'
      },
      {
        metric: "Numéros hors norme",
        value: numberAnalysis.filter(n => Math.abs(n.zScore) > OUTLIER_ZSCORE_THRESHOLD).length,
        trend: numberAnalysis.filter(n => Math.abs(n.zScore) > OUTLIER_ZSCORE_THRESHOLD).length > (MAX_NUMBERS * 0.1) ? 'up' : 'stable',
        description: `Numéros avec Z-score > |${OUTLIER_ZSCORE_THRESHOLD}|`,
        significance: 'high'
      }
    ];

    // Sum distribution analysis
    const sumDistribution = results.map(r => 
      r.winning_numbers.reduce((a, b) => a + b, 0)
    );
    const avgSum = sumDistribution.reduce((a, b) => a + b, 0) / sumDistribution.length;
    const sumStdDev = Math.sqrt(
      sumDistribution.reduce((sum, s) => sum + Math.pow(s - avgSum, 2), 0) / sumDistribution.length
    );

    // Parity analysis
    const parityDistribution = results.map(r => 
      r.winning_numbers.filter(n => n % 2 === 0).length
    );
    const avgParity = parityDistribution.reduce((a, b) => a + b, 0) / parityDistribution.length;

    // Consecutive number analysis
    const consecutiveCount = results.map(r => {
      const sorted = [...r.winning_numbers].sort((a, b) => a - b);
      let consecutive = 0;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] - sorted[i-1] === 1) consecutive++;
      }
      return consecutive;
    });
    const avgConsecutive = consecutiveCount.reduce((a, b) => a + b, 0) / consecutiveCount.length;

    return {
      totalDraws,
      expectedFrequency,
      mean,
      stdDev,
      variance,
      numberAnalysis,
      hotNumbers,
      coldNumbers,
      dueNumbers,
      momentumLeaders,
      insights,
      sumStats: { avg: avgSum, stdDev: sumStdDev },
      parityStats: { avg: avgParity },
      consecutiveStats: { avg: avgConsecutive }
    };
  }, [stats, results]);

  if (statsLoading || resultsLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-64 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-6 text-center">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            Données insuffisantes pour l'analyse statistique avancée
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sigma className="w-5 h-5 text-primary" />
            Analyse Statistique Avancée
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <Activity className="w-3 h-3" />
            {analysis.totalDraws} tirages analysés
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="overview" className="text-xs">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="distribution" className="text-xs">Distribution</TabsTrigger>
            <TabsTrigger value="momentum" className="text-xs">Momentum</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">Insights</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="overview" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Key Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard
                    icon={Calculator}
                    label="Fréquence moyenne"
                    value={analysis.mean.toFixed(1)}
                    subtext="par numéro"
                    color="primary"
                  />
                  <MetricCard
                    icon={Activity}
                    label="Écart-type"
                    value={analysis.stdDev.toFixed(2)}
                    subtext="dispersion"
                    color="accent"
                  />
                  <MetricCard
                    icon={PieChart}
                    label="Parité moyenne"
                    value={`${analysis.parityStats.avg.toFixed(1)}/5`}
                    subtext="pairs"
                    color="success"
                  />
                  <MetricCard
                    icon={LineChart}
                    label="Somme moyenne"
                    value={analysis.sumStats.avg.toFixed(0)}
                    subtext={`±${analysis.sumStats.stdDev.toFixed(0)}`}
                    color="warning"
                  />
                </div>

                {/* Hot & Cold Numbers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NumberCategoryCard
                    title="Numéros Chauds"
                    description="Z-score positif élevé"
                    numbers={analysis.hotNumbers.slice(0, 5)}
                    icon={TrendingUp}
                    color="text-orange-500"
                    bgColor="bg-orange-500/10"
                  />
                  <NumberCategoryCard
                    title="Numéros Froids"
                    description="Z-score négatif"
                    numbers={analysis.coldNumbers.slice(0, 5)}
                    icon={TrendingDown}
                    color="text-blue-500"
                    bgColor="bg-blue-500/10"
                  />
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="distribution" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Z-Score Distribution */}
                <div className="p-4 rounded-lg border border-border/50 bg-secondary/20">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Distribution des Z-scores
                  </h4>
                  <div className="grid grid-cols-5 gap-2">
                    <ZScoreBar 
                      label="< -2" 
                      count={analysis.numberAnalysis.filter(n => n.zScore < -2).length}
                      total={90}
                      color="bg-blue-600"
                    />
                    <ZScoreBar 
                      label="-2 à -1" 
                      count={analysis.numberAnalysis.filter(n => n.zScore >= -2 && n.zScore < -1).length}
                      total={90}
                      color="bg-blue-400"
                    />
                    <ZScoreBar 
                      label="-1 à 1" 
                      count={analysis.numberAnalysis.filter(n => n.zScore >= -1 && n.zScore <= 1).length}
                      total={90}
                      color="bg-gray-400"
                    />
                    <ZScoreBar 
                      label="1 à 2" 
                      count={analysis.numberAnalysis.filter(n => n.zScore > 1 && n.zScore <= 2).length}
                      total={90}
                      color="bg-orange-400"
                    />
                    <ZScoreBar 
                      label="> 2" 
                      count={analysis.numberAnalysis.filter(n => n.zScore > 2).length}
                      total={90}
                      color="bg-orange-600"
                    />
                  </div>
                </div>

                {/* Due Numbers */}
                <NumberCategoryCard
                  title="Numéros en Retard"
                  description="Absents depuis longtemps"
                  numbers={analysis.dueNumbers.slice(0, 8)}
                  icon={Target}
                  color="text-purple-500"
                  bgColor="bg-purple-500/10"
                  showLastSeen
                />

                {/* Sum Range */}
                <div className="p-4 rounded-lg border border-border/50 bg-secondary/20">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Sigma className="w-4 h-4 text-primary" />
                    Intervalle optimal de somme
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{Math.round(analysis.sumStats.avg - analysis.sumStats.stdDev)}</span>
                        <span className="font-bold text-primary">{Math.round(analysis.sumStats.avg)}</span>
                        <span>{Math.round(analysis.sumStats.avg + analysis.sumStats.stdDev)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full relative">
                        <div 
                          className="absolute h-full bg-gradient-to-r from-blue-500 via-primary to-orange-500 rounded-full"
                          style={{ 
                            left: '15%', 
                            right: '15%'
                          }}
                        />
                        <div 
                          className="absolute w-1 h-4 -top-1 bg-primary rounded"
                          style={{ left: '50%', transform: 'translateX(-50%)' }}
                        />
                      </div>
                    </div>
                    <Badge className="bg-primary/20 text-primary">
                      μ = {Math.round(analysis.sumStats.avg)}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="momentum" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-lg border border-border/50 bg-secondary/20">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Momentum (20 derniers vs précédents 20)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">En hausse ↑</p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.momentumLeaders
                          .filter(n => n.momentum > 0)
                          .slice(0, 8)
                          .map(n => (
                            <div key={n.number} className="relative">
                              <NumberBall number={n.number} size="sm" />
                              <Badge 
                                className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center text-[8px] bg-success"
                              >
                                +{n.momentum}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">En baisse ↓</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[...analysis.momentumLeaders]
                          .sort((a, b) => a.momentum - b.momentum)
                          .filter(n => n.momentum < 0)
                          .slice(0, 8)
                          .map(n => (
                            <div key={n.number} className="relative">
                              <NumberBall number={n.number} size="sm" />
                              <Badge 
                                className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center text-[8px] bg-destructive"
                              >
                                {n.momentum}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Consecutive Numbers Stats */}
                <div className="p-4 rounded-lg border border-border/50 bg-secondary/20">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <LineChart className="w-4 h-4 text-primary" />
                    Numéros consécutifs
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    En moyenne <span className="font-bold text-primary">{analysis.consecutiveStats.avg.toFixed(2)}</span> paires consécutives par tirage
                  </p>
                  <Progress value={analysis.consecutiveStats.avg / 4 * 100} className="h-2" />
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="insights" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {analysis.insights.map((insight, idx) => (
                  <motion.div
                    key={insight.metric}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={cn(
                      "p-3 rounded-lg border flex items-center justify-between",
                      insight.significance === 'high' ? "border-primary/50 bg-primary/5" :
                      insight.significance === 'medium' ? "border-border/50 bg-secondary/20" :
                      "border-border/30 bg-muted/20"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        insight.significance === 'high' ? "bg-primary/20" : "bg-muted"
                      )}>
                        {insight.trend === 'up' ? (
                          <ArrowUpRight className="w-4 h-4 text-success" />
                        ) : insight.trend === 'down' ? (
                          <ArrowDownRight className="w-4 h-4 text-destructive" />
                        ) : (
                          <Minus className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{insight.metric}</p>
                        <p className="text-xs text-muted-foreground">{insight.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{insight.value}</p>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px]",
                          insight.significance === 'high' ? "border-primary text-primary" : ""
                        )}
                      >
                        {insight.significance === 'high' ? 'Important' : 
                         insight.significance === 'medium' ? 'Modéré' : 'Faible'}
                      </Badge>
                    </div>
                  </motion.div>
                ))}

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        Recommandation Data Science
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Basé sur l'analyse de {analysis.totalDraws} tirages, privilégiez les numéros 
                        avec un Z-score entre -1 et +2 et une tendance momentum positive pour 
                        un équilibre optimal entre fréquence et potentiel.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Helper Components
const MetricCard = ({ 
  icon: Icon, 
  label, 
  value, 
  subtext, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  subtext: string;
  color: string;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className={cn(
      "p-3 rounded-lg text-center",
      color === 'primary' ? "bg-primary/10" :
      color === 'accent' ? "bg-accent/10" :
      color === 'success' ? "bg-success/10" :
      "bg-amber-500/10"
    )}
  >
    <Icon className={cn(
      "w-4 h-4 mx-auto mb-1",
      color === 'primary' ? "text-primary" :
      color === 'accent' ? "text-accent" :
      color === 'success' ? "text-success" :
      "text-amber-500"
    )} />
    <p className={cn(
      "text-xl font-bold",
      color === 'primary' ? "text-primary" :
      color === 'accent' ? "text-accent" :
      color === 'success' ? "text-success" :
      "text-amber-500"
    )}>{value}</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className="text-[9px] text-muted-foreground/70">{subtext}</p>
  </motion.div>
);

const NumberCategoryCard = ({
  title,
  description,
  numbers,
  icon: Icon,
  color,
  bgColor,
  showLastSeen = false
}: {
  title: string;
  description: string;
  numbers: NumberAnalysis[];
  icon: React.ElementType;
  color: string;
  bgColor: string;
  showLastSeen?: boolean;
}) => (
  <div className={cn("p-4 rounded-lg border border-border/50", bgColor)}>
    <div className="flex items-center gap-2 mb-2">
      <Icon className={cn("w-4 h-4", color)} />
      <span className="text-sm font-medium">{title}</span>
    </div>
    <p className="text-xs text-muted-foreground mb-3">{description}</p>
    <div className="flex flex-wrap gap-2">
      <TooltipProvider>
        {numbers.map(n => (
          <Tooltip key={n.number}>
            <TooltipTrigger>
              <div className="relative">
                <NumberBall number={n.number} size="sm" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                Z-score: <strong>{n.zScore.toFixed(2)}</strong>
                <br />
                Fréquence: <strong>{n.frequency}</strong>
                {showLastSeen && (
                  <>
                    <br />
                    Absent depuis: <strong>{n.lastSeen}</strong> tirages
                  </>
                )}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  </div>
);

const ZScoreBar = ({
  label,
  count,
  total,
  color
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) => {
  const percentage = (count / total) * 100;
  return (
    <div className="text-center">
      <div className="h-20 bg-muted/50 rounded relative mb-1 flex items-end">
        <div 
          className={cn("w-full rounded transition-all", color)}
          style={{ height: `${Math.max(percentage * 2, 5)}%` }}
        />
      </div>
      <p className="text-[10px] font-medium">{count}</p>
      <p className="text-[8px] text-muted-foreground">{label}</p>
    </div>
  );
};

// Helper function
function calculateEntropy(frequencies: number[]): number {
  const total = frequencies.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  
  return -frequencies.reduce((entropy, freq) => {
    if (freq === 0) return entropy;
    const p = freq / total;
    return entropy + p * Math.log2(p);
  }, 0);
}
