import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberBall } from "./NumberBall";
import { 
  Lightbulb, 
  TrendingUp, 
  Clock, 
  Flame,
  Snowflake,
  Target,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNumberStatistics } from "@/hooks/useNumberStatistics";
import { useDrawResults } from "@/hooks/useDrawResults";

interface SmartRecommendationsProps {
  drawName: string;
  onSelectNumber?: (num: number) => void;
}

interface Recommendation {
  type: 'hot' | 'due' | 'pattern' | 'balanced';
  title: string;
  description: string;
  numbers: number[];
  confidence: number;
  icon: React.ElementType;
  color: string;
}

export const SmartRecommendations = ({ drawName, onSelectNumber }: SmartRecommendationsProps) => {
  const { data: stats } = useNumberStatistics(drawName);
  const { data: results } = useDrawResults(drawName, 50);

  const recommendations = useMemo((): Recommendation[] => {
    if (!stats || !results || stats.length === 0) return [];

    const recs: Recommendation[] = [];

    // Hot Numbers (most frequent in recent draws)
    const recentFrequency: Record<number, number> = {};
    results.slice(0, 20).forEach(r => {
      r.winning_numbers.forEach(n => {
        recentFrequency[n] = (recentFrequency[n] || 0) + 1;
      });
    });
    
    const hotNumbers = Object.entries(recentFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([num]) => parseInt(num));

    if (hotNumbers.length >= 3) {
      recs.push({
        type: 'hot',
        title: 'Numéros Chauds',
        description: 'Fréquents dans les 20 derniers tirages',
        numbers: hotNumbers,
        confidence: 0.75,
        icon: Flame,
        color: 'text-orange-500',
      });
    }

    // Due Numbers (high gap, haven't appeared recently)
    const dueNumbers = stats
      .filter(s => s.days_since_last >= 10)
      .sort((a, b) => b.days_since_last - a.days_since_last)
      .slice(0, 5)
      .map(s => s.number);

    if (dueNumbers.length >= 3) {
      recs.push({
        type: 'due',
        title: 'Numéros en Retard',
        description: 'Absents depuis longtemps, probabilité accrue',
        numbers: dueNumbers,
        confidence: 0.65,
        icon: Snowflake,
        color: 'text-blue-500',
      });
    }

    // Balanced Selection (mix of hot and due)
    const balancedNumbers = [
      ...hotNumbers.slice(0, 2),
      ...dueNumbers.slice(0, 2),
      stats[Math.floor(stats.length / 2)]?.number || 45,
    ].filter((n, i, arr) => arr.indexOf(n) === i).slice(0, 5);

    if (balancedNumbers.length >= 5) {
      recs.push({
        type: 'balanced',
        title: 'Sélection Équilibrée',
        description: 'Combinaison optimale chauds + froids',
        numbers: balancedNumbers.sort((a, b) => a - b),
        confidence: 0.80,
        icon: Target,
        color: 'text-primary',
      });
    }

    // Pattern-based (pairs that appear together)
    const pairCount: Record<string, number> = {};
    results.slice(0, 30).forEach(r => {
      for (let i = 0; i < r.winning_numbers.length; i++) {
        for (let j = i + 1; j < r.winning_numbers.length; j++) {
          const key = [r.winning_numbers[i], r.winning_numbers[j]].sort((a, b) => a - b).join("-");
          pairCount[key] = (pairCount[key] || 0) + 1;
        }
      }
    });

    const topPairs = Object.entries(pairCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .flatMap(([key]) => key.split("-").map(n => parseInt(n)));
    
    const patternNumbers = [...new Set(topPairs)].slice(0, 5);

    if (patternNumbers.length >= 4) {
      // Complete to 5 numbers if needed
      while (patternNumbers.length < 5) {
        const candidate = hotNumbers.find(n => !patternNumbers.includes(n));
        if (candidate) patternNumbers.push(candidate);
        else break;
      }

      recs.push({
        type: 'pattern',
        title: 'Patterns Détectés',
        description: 'Basé sur les paires fréquentes',
        numbers: patternNumbers.sort((a, b) => a - b),
        confidence: 0.70,
        icon: TrendingUp,
        color: 'text-purple-500',
      });
    }

    return recs;
  }, [stats, results]);

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          Recommandations Intelligentes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, idx) => (
          <motion.div
            key={rec.type}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-3 rounded-lg border border-border/50 bg-gradient-to-r from-secondary/20 to-transparent hover:border-primary/30 transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <rec.icon className={cn("w-4 h-4", rec.color)} />
                <span className="font-medium text-sm">{rec.title}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {Math.round(rec.confidence * 100)}%
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground mb-3">
              {rec.description}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {rec.numbers.map((num) => (
                  <NumberBall 
                    key={num} 
                    number={num} 
                    size="sm"
                    className="w-8 h-8 text-xs cursor-pointer hover:scale-110 transition-transform"
                    onClick={() => onSelectNumber?.(num)}
                  />
                ))}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => {
                  const text = rec.numbers.join(" - ");
                  navigator.clipboard.writeText(text);
                }}
              >
                <Sparkles className="w-3 h-3" />
                Utiliser
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
};
