import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Snowflake, Zap, Sparkles, Waves, Scale, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NumberBall } from "@/components/NumberBall";
import { useDrawResults } from "@/hooks/useDrawResults";
import { cn } from "@/lib/utils";

interface AnalysesTabProps {
  drawName: string;
}

interface AnalysisCard {
  id: string;
  title: string;
  icon: React.ElementType;
  iconColor: string;
  glowColor: string;
  description: string;
}

export const AnalysesTab = ({ drawName }: AnalysesTabProps) => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const { data: results, isLoading } = useDrawResults(drawName, 50);

  // Calculate analytics from results
  const analytics = calculateAnalytics(results || []);

  const cards: AnalysisCard[] = [
    { id: "hot", title: "Numéros en feu", icon: Flame, iconColor: "text-orange-500", glowColor: "shadow-orange-500/30", description: "Les 10 numéros les plus chauds" },
    { id: "cold", title: "Numéros glacés", icon: Snowflake, iconColor: "text-cyan-400", glowColor: "shadow-cyan-400/30", description: "Les 10 numéros les plus en retard" },
    { id: "pairs", title: "Paires explosives", icon: Zap, iconColor: "text-yellow-400", glowColor: "shadow-yellow-400/30", description: "Top 8 paires récurrentes" },
    { id: "triplets", title: "Triplets magiques", icon: Sparkles, iconColor: "text-purple-400", glowColor: "shadow-purple-400/30", description: "Top 5 triplets historiques" },
    { id: "echo", title: "Échos inter-tirages", icon: Waves, iconColor: "text-blue-400", glowColor: "shadow-blue-400/30", description: "Numéros 7-21 jours après" },
    { id: "balance", title: "Somme & Parité", icon: Scale, iconColor: "text-emerald-400", glowColor: "shadow-emerald-400/30", description: "Répartition idéale vs actuelle" }
  ];

  const getCardData = (id: string) => {
    switch (id) {
      case "hot": return { type: "numbers" as const, data: analytics.hotNumbers, isHot: true };
      case "cold": return { type: "numbers" as const, data: analytics.coldNumbers, isCold: true };
      case "pairs": return { type: "pairs" as const, data: analytics.explosivePairs };
      case "triplets": return { type: "pairs" as const, data: analytics.magicTriplets };
      case "echo": return { type: "numbers" as const, data: analytics.echoNumbers };
      case "balance": return { type: "balance" as const, data: analytics.balanceData };
      default: return { type: "numbers" as const, data: [] };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          Le Laboratoire Secret
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          Analyses avancées basées sur {results?.length || 0} tirages
        </p>
      </motion.div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={cn(
                "relative overflow-hidden cursor-pointer transition-all duration-300",
                "bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl",
                "border border-border/30 hover:border-border/60",
                "group",
                expandedCard === card.id && "ring-2 ring-primary/50"
              )}
              onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
            >
              {/* Glass reflection effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
              
              {/* Glow effect on hover */}
              <div className={cn(
                "absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl",
                card.glowColor
              )} />

              <CardContent className="relative p-5">
                {/* Card Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      "bg-secondary/50 backdrop-blur-sm",
                      "group-hover:scale-110 transition-transform duration-300"
                    )}>
                      <card.icon className={cn("w-5 h-5", card.iconColor)} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{card.title}</h3>
                      <p className="text-xs text-muted-foreground">{card.description}</p>
                    </div>
                  </div>
                  <ArrowRight className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-300",
                    expandedCard === card.id && "rotate-90"
                  )} />
                </div>

                {/* Card Content */}
                {isLoading ? (
                  <div className="flex gap-2 justify-center py-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-secondary/50 animate-pulse" />
                    ))}
                  </div>
                ) : (() => {
                  const cardData = getCardData(card.id);
                  if (cardData.type === "balance") return (
                    <BalanceDisplay data={cardData.data as any} />
                  );
                  if (cardData.type === "pairs") return (
                    <PairsDisplay data={cardData.data as any} expanded={expandedCard === card.id} />
                  );
                  return (
                    <NumbersDisplay 
                      numbers={cardData.data as number[]} 
                      expanded={expandedCard === card.id}
                      isHot={(cardData as any).isHot}
                      isCold={(cardData as any).isCold}
                    />
                  );
                })()}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Numbers display component with expansion
const NumbersDisplay = ({ 
  numbers, 
  expanded, 
  isHot, 
  isCold 
}: { 
  numbers: number[]; 
  expanded: boolean;
  isHot?: boolean;
  isCold?: boolean;
}) => {
  const displayCount = expanded ? numbers.length : 5;
  const displayNumbers = numbers.slice(0, displayCount);

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <AnimatePresence mode="popLayout">
        {displayNumbers.map((num, index) => (
          <motion.div
            key={`${num}-${index}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative group/ball"
          >
            {/* Number glow */}
            <div className={cn(
              "absolute inset-0 rounded-full blur-md transition-all duration-300",
              isHot && "bg-orange-500/40 group-hover/ball:bg-orange-500/60",
              isCold && "bg-cyan-400/40 group-hover/ball:bg-cyan-400/60",
              !isHot && !isCold && "bg-primary/30 group-hover/ball:bg-primary/50"
            )} />
            <NumberBall 
              number={num} 
              size="sm"
              className="relative z-10 w-10 h-10 text-sm transition-transform duration-200 group-hover/ball:scale-110"
            />
            {/* Trend indicator */}
            {isHot && index < 3 && (
              <TrendingUp className="absolute -top-1 -right-1 w-3 h-3 text-orange-500" />
            )}
            {isCold && index < 3 && (
              <TrendingDown className="absolute -top-1 -right-1 w-3 h-3 text-cyan-400" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      {!expanded && numbers.length > 5 && (
        <Badge variant="outline" className="text-xs self-center">
          +{numbers.length - 5}
        </Badge>
      )}
    </div>
  );
};

// Pairs/Triplets display
const PairsDisplay = ({ 
  data, 
  expanded 
}: { 
  data: { numbers: number[]; count: number }[];
  expanded: boolean;
}) => {
  const displayCount = expanded ? data.length : 4;
  const displayData = data.slice(0, displayCount);

  return (
    <div className="space-y-2">
      {displayData.map((item, index) => (
        <motion.div
          key={item.numbers.join("-")}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
        >
          <div className="flex gap-1">
            {item.numbers.map((num, idx) => (
              <NumberBall 
                key={`${num}-${idx}`} 
                number={num} 
                size="sm"
                className="w-8 h-8 text-xs"
              />
            ))}
          </div>
          <Badge variant="secondary" className="text-xs">
            {item.count}x
          </Badge>
        </motion.div>
      ))}
    </div>
  );
};

// Balance display (Sum & Parity)
const BalanceDisplay = ({ data }: { data: { avgSum: number; targetSum: number; evenRatio: number } }) => {
  const sumDiff = Math.abs(data.avgSum - data.targetSum);
  const isBalanced = sumDiff < 30;

  return (
    <div className="space-y-3">
      {/* Sum indicator */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Somme moyenne</span>
        <div className="flex items-center gap-2">
          <span className="font-bold">{data.avgSum}</span>
          <span className="text-xs text-muted-foreground">/ {data.targetSum}</span>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              isBalanced ? "text-success border-success/30" : "text-warning border-warning/30"
            )}
          >
            {isBalanced ? "Équilibré" : `Δ${sumDiff}`}
          </Badge>
        </div>
      </div>

      {/* Parity bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Pairs</span>
          <span>Impairs</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden flex">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${data.evenRatio * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="bg-gradient-to-r from-primary to-primary/70"
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-primary font-medium">
            {Math.round(data.evenRatio * 100)}%
          </span>
          <span className="text-accent font-medium">
            {Math.round((1 - data.evenRatio) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};

// Analytics calculation function
function calculateAnalytics(results: any[]) {
  if (results.length === 0) {
    return {
      hotNumbers: [],
      coldNumbers: [],
      explosivePairs: [],
      magicTriplets: [],
      echoNumbers: [],
      balanceData: { avgSum: 0, targetSum: 219, evenRatio: 0.5 }
    };
  }

  // Calculate frequency of each number
  const frequency: Record<number, number> = {};
  const lastSeen: Record<number, number> = {};
  const pairFrequency: Record<string, number> = {};
  const tripletFrequency: Record<string, number> = {};
  let totalSum = 0;
  let totalEven = 0;
  let totalNumbers = 0;

  results.forEach((result, drawIndex) => {
    const numbers = result.winning_numbers;
    if (!numbers || !Array.isArray(numbers)) return;

    // Sum and parity
    numbers.forEach((num: number) => {
      totalSum += num;
      if (num % 2 === 0) totalEven++;
      totalNumbers++;

      // Frequency
      frequency[num] = (frequency[num] || 0) + 1;
      
      // Last seen (only if not set yet, to get most recent)
      if (lastSeen[num] === undefined) {
        lastSeen[num] = drawIndex;
      }
    });

    // Pairs
    for (let i = 0; i < numbers.length; i++) {
      for (let j = i + 1; j < numbers.length; j++) {
        const key = [numbers[i], numbers[j]].sort((a, b) => a - b).join("-");
        pairFrequency[key] = (pairFrequency[key] || 0) + 1;
      }
    }

    // Triplets
    for (let i = 0; i < numbers.length; i++) {
      for (let j = i + 1; j < numbers.length; j++) {
        for (let k = j + 1; k < numbers.length; k++) {
          const key = [numbers[i], numbers[j], numbers[k]].sort((a, b) => a - b).join("-");
          tripletFrequency[key] = (tripletFrequency[key] || 0) + 1;
        }
      }
    }
  });

  // Calculate average frequency
  const freqValues = Object.values(frequency);
  const avgFreq = freqValues.length > 0 ? freqValues.reduce((a, b) => a + b, 0) / freqValues.length : 0;
  const variance = freqValues.length > 0 ? freqValues.reduce((sum, f) => sum + Math.pow(f - avgFreq, 2), 0) / freqValues.length : 0;
  const stdDev = variance > 0 ? Math.sqrt(variance) : 1;

  // Hot numbers (z-score > 1.2)
  const hotNumbers = Object.entries(frequency)
    .filter(([_, f]) => {
      const z = (f - avgFreq) / stdDev;
      return !isNaN(z) && isFinite(z) && z > 1.2;
    })
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([num]) => parseInt(num));

  // Cold numbers (longest gap)
  const coldNumbers = Object.entries(lastSeen)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([num]) => parseInt(num));

  // Explosive pairs
  const explosivePairs = Object.entries(pairFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([key, count]) => ({
      numbers: key.split("-").map(n => parseInt(n)),
      count
    }));

  // Magic triplets
  const magicTriplets = Object.entries(tripletFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([key, count]) => ({
      numbers: key.split("-").map(n => parseInt(n)),
      count
    }));

  // Echo numbers (appeared recently after gap of 7-21)
  const echoNumbers = Object.entries(lastSeen)
    .filter(([num, idx]) => idx === 0 && lastSeen[num as any] !== undefined)
    .slice(0, 10)
    .map(([num]) => parseInt(num));

  // Fill with most frequent if not enough echoes
  if (echoNumbers.length < 10) {
    const extras = Object.entries(frequency)
      .filter(([num]) => !echoNumbers.includes(parseInt(num)))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10 - echoNumbers.length)
      .map(([num]) => parseInt(num));
    echoNumbers.push(...extras);
  }

  return {
    hotNumbers,
    coldNumbers,
    explosivePairs,
    magicTriplets,
    echoNumbers,
    balanceData: {
      avgSum: totalNumbers > 0 ? Math.round(totalSum / (totalNumbers / 5)) : 0,
      targetSum: 219,
      evenRatio: totalNumbers > 0 ? totalEven / totalNumbers : 0.5
    }
  };
}
