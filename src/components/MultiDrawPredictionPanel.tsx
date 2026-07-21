import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NumberBall } from "@/components/NumberBall";
import { useMultiDrawPrediction } from "@/hooks/useMultiDrawPrediction";
import { Calendar, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MultiDrawPredictionPanelProps {
  drawNames: string[];
}

export const MultiDrawPredictionPanel = ({ drawNames }: MultiDrawPredictionPanelProps) => {
  const { data: strategy, isLoading } = useMultiDrawPrediction(drawNames);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!strategy || strategy.predictions.length === 0) return null;

  // C(90, 5) = 43,949,268 possible combinations
  const totalCombinations = 43949268;
  const coveredGrids = strategy.predictions.length;
  const coverageProportion = (coveredGrids / totalCombinations * 100).toFixed(6);

  // Calculate average overlap
  let totalOverlap = 0;
  let pairs = 0;
  for (let i = 0; i < strategy.predictions.length; i++) {
    for (let j = i + 1; j < strategy.predictions.length; j++) {
      const setA = new Set(strategy.predictions[i].numbers);
      const setB = new Set(strategy.predictions[j].numbers);
      const overlap = [...setA].filter(x => setB.has(x)).length;
      totalOverlap += overlap;
      pairs++;
    }
  }
  const avgOverlap = pairs > 0 ? (totalOverlap / pairs).toFixed(1) : "0.0";

  return (
    <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-500" />
          Portefeuille de Tirages
        </CardTitle>
        <CardDescription>
          Combinaisons diversifiées pour {strategy.predictions.length} prochains tirages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="p-3 bg-background/50 rounded-lg text-center">
            <DollarSign className="w-4 h-4 mx-auto mb-1 text-cyan-500" />
            <p className="text-xs text-muted-foreground">Coût total</p>
            <p className="font-bold">{strategy.totalBudget} FCFA</p>
          </div>
          <div className="p-3 bg-background/50 rounded-lg text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
            <p className="text-xs text-muted-foreground">Recouvrement moy.</p>
            <p className="font-bold">{avgOverlap} / 5</p>
          </div>
          <div className="p-3 bg-background/50 rounded-lg text-center col-span-2">
            <p className="text-xs text-muted-foreground">Proportion couverte</p>
            <p className="font-bold">{coveredGrids} / 43.9M ({coverageProportion}%)</p>
          </div>
        </div>

        <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Avertissement</AlertTitle>
          <AlertDescription className="text-xs mt-1 leading-relaxed">
            Acheter plusieurs grilles augmente mécaniquement vos dépenses, mais l'espérance de gain globale reste strictement la même. Les tirages sont indépendants et aléatoires.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {strategy.predictions.map((pred, idx) => (
            <div key={idx} className="p-4 bg-background/50 rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold">{pred.drawName}</p>
                  <p className="text-xs text-muted-foreground">Génération diversifiée</p>
                </div>
                <Badge variant={pred.confidence > 70 ? "default" : "secondary"}>
                  Indice {pred.confidence.toFixed(0)}%
                </Badge>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                {pred.numbers.map((num, i) => (
                  <NumberBall key={i} number={num} size="md" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
          <p className="text-sm font-medium text-center">{strategy.recommendation.replace("Stratégie", "Recommandation")}</p>
        </div>
      </CardContent>
    </Card>
  );
};
