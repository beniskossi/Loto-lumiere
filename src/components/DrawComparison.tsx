import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeftRight, TrendingUp, TrendingDown, Minus, 
  Flame, Snowflake, Zap, BarChart3, Target, Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import { NumberBall } from "@/components/NumberBall";
import { useDrawComparison } from "@/hooks/useDrawComparison";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { DRAW_SCHEDULE } from "@/types/lottery";

interface DrawComparisonProps {
  initialDraw1?: string;
  initialDraw2?: string;
}

// Get all unique draw names from schedule
const ALL_DRAWS = Object.values(DRAW_SCHEDULE)
  .flat()
  .map(d => d.name)
  .filter((v, i, a) => a.indexOf(v) === i)
  .sort();

export const DrawComparison = ({ initialDraw1 = "Cash", initialDraw2 = "Solution" }: DrawComparisonProps) => {
  const [draw1, setDraw1] = useState(initialDraw1);
  const [draw2, setDraw2] = useState(initialDraw2);
  
  const { comparison, isLoading } = useDrawComparison(draw1, draw2);

  const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-success" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          Comparaison de Tirages
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          Analysez les différences de patterns entre deux tirages
        </p>
      </motion.div>

      {/* Selector */}
      <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-border/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <Select value={draw1} onValueChange={setDraw1}>
              <SelectTrigger className="w-40 bg-secondary/30">
                <SelectValue placeholder="Premier tirage" />
              </SelectTrigger>
              <SelectContent>
                {ALL_DRAWS.map(name => (
                  <SelectItem key={name} value={name} disabled={name === draw2}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
              <ArrowLeftRight className="w-5 h-5 text-primary" />
            </div>

            <Select value={draw2} onValueChange={setDraw2}>
              <SelectTrigger className="w-40 bg-secondary/30">
                <SelectValue placeholder="Second tirage" />
              </SelectTrigger>
              <SelectContent>
                {ALL_DRAWS.map(name => (
                  <SelectItem key={name} value={name} disabled={name === draw1}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <ComparisonSkeleton />
      ) : comparison.draw1 && comparison.draw2 ? (
        <>
          {/* Correlation Score */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="bg-gradient-to-br from-primary/20 to-accent/10 backdrop-blur-xl border-primary/30">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Target className="w-6 h-6 text-primary" />
                  <span className="text-lg font-medium">Score de Similarité</span>
                </div>
                <div className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {comparison.correlationScore}%
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {comparison.correlationScore > 70 
                    ? "Les tirages ont des patterns très similaires" 
                    : comparison.correlationScore > 40 
                      ? "Similarité modérée entre les tirages"
                      : "Les tirages ont des patterns distincts"}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Side by Side Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Draw 1 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-border/30 h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg">{comparison.draw1.drawName}</span>
                    <div className="flex items-center gap-1">
                      <TrendIcon trend={comparison.draw1.recentTrend} />
                      <Badge variant="outline" className="text-xs">
                        {comparison.draw1.totalDraws} tirages
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatRow 
                    icon={BarChart3} 
                    label="Somme moyenne" 
                    value={comparison.draw1.avgSum.toString()}
                    highlight={comparison.draw1.avgSum > comparison.draw2.avgSum}
                  />
                  <StatRow 
                    icon={Sparkles} 
                    label="Ratio pairs" 
                    value={`${Math.round(comparison.draw1.evenRatio * 100)}%`}
                  />
                  
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-500" /> Numéros chauds
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {comparison.draw1.hotNumbers.slice(0, 6).map((num, idx) => (
                        <NumberBall 
                          key={`${num}-${idx}`} 
                          number={num} 
                          size="sm" 
                          className={cn(
                            "w-8 h-8 text-xs",
                            comparison.commonHotNumbers.includes(num) && "ring-2 ring-success"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-yellow-400" /> Top paires
                    </p>
                    <div className="space-y-1.5">
                      {comparison.draw1.topPairs.slice(0, 3).map((pair, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded bg-secondary/30">
                          <div className="flex gap-1">
                            {pair.numbers.map((n, idx) => (
                              <NumberBall key={`${n}-${idx}`} number={n} size="sm" className="w-6 h-6 text-[10px]" />
                            ))}
                          </div>
                          <Badge variant="secondary" className="text-xs">{pair.count}x</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Draw 2 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-border/30 h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg">{comparison.draw2.drawName}</span>
                    <div className="flex items-center gap-1">
                      <TrendIcon trend={comparison.draw2.recentTrend} />
                      <Badge variant="outline" className="text-xs">
                        {comparison.draw2.totalDraws} tirages
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatRow 
                    icon={BarChart3} 
                    label="Somme moyenne" 
                    value={comparison.draw2.avgSum.toString()}
                    highlight={comparison.draw2.avgSum > comparison.draw1.avgSum}
                  />
                  <StatRow 
                    icon={Sparkles} 
                    label="Ratio pairs" 
                    value={`${Math.round(comparison.draw2.evenRatio * 100)}%`}
                  />
                  
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-500" /> Numéros chauds
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {comparison.draw2.hotNumbers.slice(0, 6).map((num, idx) => (
                        <NumberBall 
                          key={`${num}-${idx}`} 
                          number={num} 
                          size="sm" 
                          className={cn(
                            "w-8 h-8 text-xs",
                            comparison.commonHotNumbers.includes(num) && "ring-2 ring-success"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-yellow-400" /> Top paires
                    </p>
                    <div className="space-y-1.5">
                      {comparison.draw2.topPairs.slice(0, 3).map((pair, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded bg-secondary/30">
                          <div className="flex gap-1">
                            {pair.numbers.map((n, idx) => (
                              <NumberBall key={`${n}-${idx}`} number={n} size="sm" className="w-6 h-6 text-[10px]" />
                            ))}
                          </div>
                          <Badge variant="secondary" className="text-xs">{pair.count}x</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Common & Unique Numbers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-border/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-primary" />
                  Analyse Comparative
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Common Hot Numbers */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-success" /> Numéros chauds communs
                    </p>
                    <Badge variant="outline" className="text-xs border-success/50 text-success">
                      {comparison.commonHotNumbers.length} en commun
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {comparison.commonHotNumbers.length > 0 ? (
                      comparison.commonHotNumbers.map((num, idx) => (
                        <motion.div
                          key={`${num}-${idx}`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="relative"
                        >
                          <div className="absolute inset-0 rounded-full bg-success/30 blur-md" />
                          <NumberBall number={num} size="sm" className="w-10 h-10 relative z-10" />
                        </motion.div>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Aucun numéro en commun</span>
                    )}
                  </div>
                </div>

                {/* Unique to First */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Unique à <span className="font-medium text-foreground">{draw1}</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {comparison.uniqueToFirst.slice(0, 5).map((num, idx) => (
                        <NumberBall 
                          key={`${num}-${idx}`} 
                          number={num} 
                          size="sm" 
                          className="w-8 h-8 text-xs opacity-80"
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Unique à <span className="font-medium text-foreground">{draw2}</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {comparison.uniqueToSecond.slice(0, 5).map((num, idx) => (
                        <NumberBall 
                          key={`${num}-${idx}`} 
                          number={num} 
                          size="sm" 
                          className="w-8 h-8 text-xs opacity-80"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stats Comparison */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/30">
                  <div className="text-center p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Différence somme</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      comparison.sumDifference < 15 ? "text-success" : comparison.sumDifference < 30 ? "text-warning" : "text-destructive"
                    )}>
                      Δ{comparison.sumDifference}
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Différence parité</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      comparison.parityDifference < 0.1 ? "text-success" : comparison.parityDifference < 0.2 ? "text-warning" : "text-destructive"
                    )}>
                      {Math.round(comparison.parityDifference * 100)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Insight Card */}
          <Card className="bg-secondary/20 border-border/20">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                <strong>💡 Insight:</strong>{" "}
                {comparison.correlationScore > 60 
                  ? `Les tirages ${draw1} et ${draw2} partagent ${comparison.commonHotNumbers.length} numéros chauds. Vous pouvez utiliser ces numéros communs pour maximiser vos chances.`
                  : `Les tirages ${draw1} et ${draw2} ont des comportements distincts. Adaptez votre stratégie selon le tirage choisi.`
                }
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="bg-card/50 backdrop-blur-xl border-border/30">
          <CardContent className="p-8 text-center">
            <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Sélectionnez deux tirages pour les comparer
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const StatRow = ({ 
  icon: Icon, 
  label, 
  value, 
  highlight 
}: { 
  icon: any; 
  label: string; 
  value: string; 
  highlight?: boolean;
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="w-4 h-4" />
      {label}
    </div>
    <span className={cn(
      "font-bold",
      highlight && "text-success"
    )}>
      {value}
    </span>
  </div>
);

const ComparisonSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-32 rounded-lg" />
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
    <Skeleton className="h-48 rounded-lg" />
  </div>
);
