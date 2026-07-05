import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Grid3X3, Thermometer, TrendingUp, PieChart, Binary, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { NumberBall } from "@/components/NumberBall";
import { useDrawResults } from "@/hooks/useDrawResults";
import { useNumberStatistics } from "@/hooks/useNumberStatistics";
import { cn } from "@/lib/utils";
import { getNumberColorClasses } from "@/utils/numberColors";
import { AdvancedStatsDashboard } from "@/components/AdvancedStatsDashboard";
import { NumberCorrelationMatrix } from "@/components/NumberCorrelationMatrix";

interface StatistiquesTabProps {
  drawName: string;
}

export const StatistiquesTab = ({ drawName }: StatistiquesTabProps) => {
  const { data: results, isLoading: resultsLoading } = useDrawResults(drawName, 100);
  const { data: stats, isLoading: statsLoading } = useNumberStatistics(drawName);

  const isLoading = resultsLoading || statsLoading;

  // Calculate statistics
  const computedStats = useMemo(() => {
    if (!results || !stats) return null;

    // Frequency grid (1-90)
    const frequencyGrid: { number: number; frequency: number; maxFreq: number }[] = [];
    const maxFreq = Math.max(...(stats.map(s => s.frequency) || [1]));
    
    for (let i = 1; i <= 90; i++) {
      const stat = stats.find(s => s.number === i);
      frequencyGrid.push({
        number: i,
        frequency: stat?.frequency || 0,
        maxFreq
      });
    }

    // Gap heatmap
    const gapData = stats.slice(0, 30).map(s => ({
      number: s.number,
      gap: s.days_since_last,
      frequency: s.frequency
    }));

    // Sum evolution
    const sumEvolution = results.slice(0, 20).reverse().map((r, i) => ({
      index: i,
      sum: r.winning_numbers.reduce((a, b) => a + b, 0)
    }));

    // Parity distribution
    let evenCount = 0;
    let oddCount = 0;
    results.forEach(r => {
      r.winning_numbers.forEach((n: number) => {
        if (n % 2 === 0) evenCount++;
        else oddCount++;
      });
    });
    const total = evenCount + oddCount;

    // Top pairs
    const pairCount: Record<string, number> = {};
    results.forEach(r => {
      for (let i = 0; i < r.winning_numbers.length; i++) {
        for (let j = i + 1; j < r.winning_numbers.length; j++) {
          const key = [r.winning_numbers[i], r.winning_numbers[j]].sort((a, b) => a - b).join("-");
          pairCount[key] = (pairCount[key] || 0) + 1;
        }
      }
    });
    const topPairs = Object.entries(pairCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 30)
      .map(([key, count]) => ({
        numbers: key.split("-").map(n => parseInt(n)),
        count
      }));

    return {
      frequencyGrid,
      gapData,
      sumEvolution,
      parityData: { even: evenCount / total, odd: oddCount / total },
      topPairs,
      totalDraws: results.length
    };
  }, [results, stats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (!computedStats) return null;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-bold bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent">
          Centre de Commande
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          Statistiques complètes sur {computedStats.totalDraws} tirages
        </p>
      </motion.div>

      {/* Frequency Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Grid3X3 className="w-4 h-4 text-primary" />
              Fréquence Absolue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-9 sm:grid-cols-10 gap-1">
              {computedStats.frequencyGrid.map((item) => {
                const intensity = item.frequency / item.maxFreq;
                return (
                  <div
                    key={item.number}
                    className={cn(
                      "aspect-square rounded-md flex items-center justify-center text-xs font-medium",
                      "transition-all duration-200 hover:scale-110 cursor-pointer",
                      "relative overflow-hidden animate-in fade-in zoom-in",
                      getNumberColorClasses(item.number)
                    )}
                    style={{
                      opacity: 0.4 + intensity * 0.6,
                      animationDelay: `${item.number * 0.005}s`
                    }}
                    title={`${item.number}: ${item.frequency} fois`}
                  >
                    {item.number}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
              <span>Moins fréquent</span>
              <div className="flex gap-1">
                {[0.2, 0.4, 0.6, 0.8, 1].map((o) => (
                  <div
                    key={o}
                    className="w-4 h-4 rounded bg-primary"
                    style={{ opacity: 0.3 + o * 0.7 }}
                  />
                ))}
              </div>
              <span>Plus fréquent</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Gap Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Thermometer className="w-4 h-4 text-accent" />
              Cartographie des Écarts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
              {computedStats.gapData.map((item, index) => {
                const maxGap = Math.max(...computedStats.gapData.map(d => d.gap));
                const heatIntensity = item.gap / maxGap;
                return (
                  <div
                    key={item.number}
                    className={cn(
                      "p-2 rounded-lg text-center transition-all hover:scale-105 cursor-pointer animate-in fade-in",
                      heatIntensity > 0.7 ? "bg-destructive/30" :
                      heatIntensity > 0.4 ? "bg-warning/30" :
                      "bg-success/30"
                    )}
                    style={{ animationDelay: `${index * 0.02}s` }}
                  >
                    <NumberBall 
                      number={item.number} 
                      size="sm"
                      className="w-8 h-8 text-xs mx-auto mb-1"
                    />
                    <span className={cn(
                      "text-xs font-bold",
                      heatIntensity > 0.7 ? "text-destructive" :
                      heatIntensity > 0.4 ? "text-warning" :
                      "text-success"
                    )}>
                      {item.gap}j
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sum Evolution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-info" />
              Évolution de la Somme Moyenne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-32">
              {/* Target line */}
              <div 
                className="absolute inset-x-0 h-px bg-accent/50"
                style={{ top: `${100 - ((219 - 100) / 350) * 100}%` }}
              />
              
              {/* Chart */}
              <svg viewBox="0 0 400 100" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sumGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--info))" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="hsl(var(--info))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                
                {/* Area */}
                <path
                  d={`M 0,100 ${computedStats.sumEvolution.map((d, i) => {
                    const x = (i / (computedStats.sumEvolution.length - 1)) * 400;
                    const y = 100 - ((d.sum - 100) / 350) * 100;
                    return `L ${x},${y}`;
                  }).join(" ")} L 400,100 Z`}
                  fill="url(#sumGradient)"
                />
                
                {/* Line */}
                <path
                  d={`M ${computedStats.sumEvolution.map((d, i) => {
                    const x = (i / (computedStats.sumEvolution.length - 1)) * 400;
                    const y = 100 - ((d.sum - 100) / 350) * 100;
                    return `${i === 0 ? "" : "L "}${x},${y}`;
                  }).join(" ")}`}
                  fill="none"
                  stroke="hsl(var(--info))"
                  strokeWidth="2"
                  className="animate-pulse-subtle"
                />
                
                {/* Points */}
                {computedStats.sumEvolution.map((d, i) => {
                  const x = (i / (computedStats.sumEvolution.length - 1)) * 400;
                  const y = 100 - ((d.sum - 100) / 350) * 100;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="3"
                      fill="hsl(var(--info))"
                      className="hover:r-5 transition-all"
                    />
                  );
                })}
              </svg>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Ancien</span>
              <Badge variant="outline" className="text-accent">
                Cible: 219
              </Badge>
              <span>Récent</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Parity Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="w-4 h-4 text-success" />
              Répartition Parité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {/* 3D-like pie chart using CSS */}
              <div className="relative w-32 h-32">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(
                      hsl(var(--primary)) 0deg ${computedStats.parityData.even * 360}deg,
                      hsl(var(--accent)) ${computedStats.parityData.even * 360}deg 360deg
                    )`,
                    boxShadow: "0 8px 24px hsl(var(--primary) / 0.3)"
                  }}
                />
                <div className="absolute inset-4 rounded-full bg-card flex items-center justify-center">
                  <Binary className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-3 flex-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-primary" />
                      <span className="text-sm">Pairs</span>
                    </div>
                    <span className="font-bold text-primary">
                      {Math.round(computedStats.parityData.even * 100)}%
                    </span>
                  </div>
                  <Progress value={computedStats.parityData.even * 100} className="h-1.5" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-accent" />
                      <span className="text-sm">Impairs</span>
                    </div>
                    <span className="font-bold text-accent">
                      {Math.round(computedStats.parityData.odd * 100)}%
                    </span>
                  </div>
                  <Progress value={computedStats.parityData.odd * 100} className="h-1.5 [&>div]:bg-accent" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pair Matrix */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-warning" />
              Matrice des Paires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {computedStats.topPairs.slice(0, 12).map((pair, index) => {
                const maxCount = computedStats.topPairs[0]?.count || 1;
                const intensity = pair.count / maxCount;
                return (
                  <motion.div
                    key={pair.numbers.join("-")}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg",
                      "bg-gradient-to-r from-secondary/50 to-secondary/20",
                      "border border-border/30 hover:border-warning/30 transition-all"
                    )}
                  >
                    <div className="flex gap-1">
                      {pair.numbers.map((num, idx) => (
                        <NumberBall 
                          key={`${num}-${idx}`} 
                          number={num} 
                          size="sm"
                          className="w-7 h-7 text-xs"
                        />
                      ))}
                    </div>
                    <Badge 
                      className={cn(
                        "text-xs",
                        intensity > 0.7 ? "bg-warning text-warning-foreground" :
                        intensity > 0.4 ? "bg-primary/50" : "bg-secondary"
                      )}
                    >
                      {pair.count}x
                    </Badge>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Advanced Data Science Dashboard */}
      <AdvancedStatsDashboard drawName={drawName} />
      
      {/* Number Correlation Matrix */}
      <NumberCorrelationMatrix drawName={drawName} />
    </div>
  );
};
