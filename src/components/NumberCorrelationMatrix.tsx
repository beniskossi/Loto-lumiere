import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Grid3X3, 
  TrendingUp, 
  Link2, 
  Zap,
  Eye,
  EyeOff,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDrawResults } from "@/hooks/useDrawResults";
import { NumberBall } from "./NumberBall";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NumberCorrelationMatrixProps {
  drawName: string;
  onSelectPair?: (num1: number, num2: number) => void;
}

interface CorrelationPair {
  num1: number;
  num2: number;
  cooccurrence: number;
  correlation: number;
  expectedCooccurrence: number;
  liftRatio: number;
}

export const NumberCorrelationMatrix = ({ drawName, onSelectPair }: NumberCorrelationMatrixProps) => {
  const { data: results, isLoading } = useDrawResults(drawName, 200);
  const [showTopPairs, setShowTopPairs] = useState(true);
  const [minCorrelation, setMinCorrelation] = useState([0.3]);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);

  const correlationData = useMemo(() => {
    if (!results || results.length < 20) return null;

    const totalDraws = results.length;
    const numberFrequency: Record<number, number> = {};
    const pairFrequency: Record<string, number> = {};

    // Initialize
    for (let i = 1; i <= 90; i++) {
      numberFrequency[i] = 0;
    }

    // Count frequencies
    results.forEach(result => {
      const numbers = result.winning_numbers;
      
      // Individual frequencies
      numbers.forEach(num => {
        numberFrequency[num] = (numberFrequency[num] || 0) + 1;
      });

      // Pair frequencies
      for (let i = 0; i < numbers.length; i++) {
        for (let j = i + 1; j < numbers.length; j++) {
          const key = [numbers[i], numbers[j]].sort((a, b) => a - b).join("-");
          pairFrequency[key] = (pairFrequency[key] || 0) + 1;
        }
      }
    });

    // Calculate correlations
    const pairs: CorrelationPair[] = [];

    Object.entries(pairFrequency).forEach(([key, cooccurrence]) => {
      const [num1, num2] = key.split("-").map(Number);
      const freq1 = numberFrequency[num1] || 0;
      const freq2 = numberFrequency[num2] || 0;

      // Calculate expected co-occurrence under independence
      const prob1 = freq1 / totalDraws;
      const prob2 = freq2 / totalDraws;
      const expectedCooccurrence = prob1 * prob2 * totalDraws;

      // Lift ratio (observed / expected)
      const liftRatio = expectedCooccurrence > 0 ? cooccurrence / expectedCooccurrence : 0;

      // Phi coefficient (correlation for binary variables)
      const n = totalDraws;
      const n11 = cooccurrence;
      const n10 = freq1 - cooccurrence;
      const n01 = freq2 - cooccurrence;
      const n00 = n - n11 - n10 - n01;

      const numerator = (n11 * n00) - (n10 * n01);
      const denominator = Math.sqrt((n11 + n10) * (n01 + n00) * (n11 + n01) * (n10 + n00));
      const correlation = denominator > 0 ? numerator / denominator : 0;

      if (cooccurrence >= 2) {
        pairs.push({
          num1,
          num2,
          cooccurrence,
          correlation,
          expectedCooccurrence,
          liftRatio
        });
      }
    });

    // Sort by lift ratio (most significant positive associations)
    const topPositive = [...pairs]
      .filter(p => p.liftRatio > 1.2)
      .sort((a, b) => b.liftRatio - a.liftRatio)
      .slice(0, 20);

    // Find pairs that rarely appear together (negative association)
    const topNegative = [...pairs]
      .filter(p => p.liftRatio < 0.8 && p.cooccurrence >= 1)
      .sort((a, b) => a.liftRatio - b.liftRatio)
      .slice(0, 10);

    // Most frequent pairs overall
    const mostFrequent = [...pairs]
      .sort((a, b) => b.cooccurrence - a.cooccurrence)
      .slice(0, 15);

    // Calculate network for selected number
    const getNumberNetwork = (num: number) => {
      return pairs
        .filter(p => p.num1 === num || p.num2 === num)
        .map(p => ({
          partner: p.num1 === num ? p.num2 : p.num1,
          ...p
        }))
        .sort((a, b) => b.liftRatio - a.liftRatio)
        .slice(0, 10);
    };

    return {
      totalDraws,
      pairs,
      topPositive,
      topNegative,
      mostFrequent,
      numberFrequency,
      getNumberNetwork
    };
  }, [results]);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-48 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!correlationData) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-6 text-center">
          <Grid3X3 className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            Données insuffisantes pour l'analyse de corrélation
          </p>
        </CardContent>
      </Card>
    );
  }

  const filteredPairs = showTopPairs 
    ? correlationData.topPositive.filter(p => p.liftRatio >= 1 + minCorrelation[0])
    : correlationData.mostFrequent;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-500/10 to-primary/10 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="w-5 h-5 text-purple-500" />
            Corrélations entre Numéros
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <Grid3X3 className="w-3 h-3" />
            {correlationData.totalDraws} tirages
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={showTopPairs ? "default" : "outline"}
            size="sm"
            onClick={() => setShowTopPairs(true)}
            className="text-xs gap-1"
          >
            <TrendingUp className="w-3 h-3" />
            Associations fortes
          </Button>
          <Button
            variant={!showTopPairs ? "default" : "outline"}
            size="sm"
            onClick={() => setShowTopPairs(false)}
            className="text-xs gap-1"
          >
            <Zap className="w-3 h-3" />
            Plus fréquentes
          </Button>
          
          {showTopPairs && (
            <div className="flex items-center gap-2 flex-1 min-w-[150px]">
              <Filter className="w-3 h-3 text-muted-foreground" />
              <Slider
                value={minCorrelation}
                onValueChange={setMinCorrelation}
                min={0}
                max={1}
                step={0.1}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-12">
                ≥{(1 + minCorrelation[0]).toFixed(1)}x
              </span>
            </div>
          )}
        </div>

        {/* Pairs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <TooltipProvider>
            <AnimatePresence mode="popLayout">
              {filteredPairs.slice(0, 12).map((pair, idx) => (
                <motion.div
                  key={`${pair.num1}-${pair.num2}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50",
                    pair.liftRatio > 2 ? "bg-purple-500/10 border-purple-500/30" :
                    pair.liftRatio > 1.5 ? "bg-primary/5 border-primary/30" :
                    "bg-secondary/30 border-border/50"
                  )}
                  onClick={() => onSelectPair?.(pair.num1, pair.num2)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <NumberBall number={pair.num1} size="sm" />
                      <Link2 className="w-3 h-3 text-muted-foreground" />
                      <NumberBall number={pair.num2} size="sm" />
                    </div>
                    
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge 
                          className={cn(
                            "text-xs",
                            pair.liftRatio > 2 ? "bg-purple-500" :
                            pair.liftRatio > 1.5 ? "bg-primary" :
                            "bg-muted text-foreground"
                          )}
                        >
                          {pair.liftRatio.toFixed(2)}x
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          <strong>Lift Ratio:</strong> {pair.liftRatio.toFixed(2)}<br/>
                          <strong>Co-occurrences:</strong> {pair.cooccurrence}<br/>
                          <strong>Attendu:</strong> {pair.expectedCooccurrence.toFixed(1)}<br/>
                          <strong>Corrélation φ:</strong> {pair.correlation.toFixed(3)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{pair.cooccurrence} fois ensemble</span>
                    <span className={cn(
                      pair.liftRatio > 1.5 ? "text-success" : 
                      pair.liftRatio > 1.2 ? "text-amber-500" : ""
                    )}>
                      {pair.liftRatio > 1 ? '+' : ''}{((pair.liftRatio - 1) * 100).toFixed(0)}% vs aléatoire
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </TooltipProvider>
        </div>

        {/* Number Explorer */}
        <div className="p-3 rounded-lg border border-border/50 bg-secondary/20">
          <p className="text-xs font-medium mb-2 flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Explorer les associations d'un numéro
          </p>
          <div className="flex flex-wrap gap-1 mb-3">
            {[...Array(18)].map((_, i) => {
              const num = (i * 5) + 1;
              return (
                <Button
                  key={num}
                  variant={selectedNumber === num ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0 text-xs"
                  onClick={() => setSelectedNumber(selectedNumber === num ? null : num)}
                >
                  {num}
                </Button>
              );
            })}
          </div>
          
          <AnimatePresence>
            {selectedNumber && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2 mb-2">
                  <NumberBall number={selectedNumber} size="md" />
                  <span className="text-sm font-medium">
                    Meilleures associations
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {correlationData.getNumberNetwork(selectedNumber).slice(0, 8).map(item => (
                    <div 
                      key={item.partner}
                      className="flex items-center gap-1 p-1.5 rounded bg-muted/50"
                    >
                      <NumberBall number={item.partner} size="xs" />
                      <span className="text-[10px] text-muted-foreground">
                        {item.liftRatio.toFixed(1)}x
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Negative Correlations */}
        {correlationData.topNegative.length > 0 && (
          <div className="p-3 rounded-lg border border-orange-500/30 bg-orange-500/5">
            <p className="text-xs font-medium mb-2 flex items-center gap-1 text-orange-600 dark:text-orange-400">
              <EyeOff className="w-3 h-3" />
              Paires rares (association négative)
            </p>
            <p className="text-[10px] text-muted-foreground mb-2">
              Ces numéros apparaissent rarement ensemble - évitez ces combinaisons
            </p>
            <div className="flex flex-wrap gap-2">
              {correlationData.topNegative.slice(0, 5).map(pair => (
                <div 
                  key={`${pair.num1}-${pair.num2}`}
                  className="flex items-center gap-1 p-1.5 rounded bg-orange-500/10"
                >
                  <NumberBall number={pair.num1} size="xs" />
                  <span className="text-[10px] text-orange-500">✗</span>
                  <NumberBall number={pair.num2} size="xs" />
                  <Badge variant="outline" className="text-[8px] px-1 border-orange-500/50">
                    {pair.liftRatio.toFixed(2)}x
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
