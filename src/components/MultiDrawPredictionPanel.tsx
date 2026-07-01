import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NumberBall } from "@/components/NumberBall";
import { useMultiDrawPrediction } from "@/hooks/useMultiDrawPrediction";
import { Calendar, TrendingUp, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

  return (
    <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-500" />
          Prédiction Multi-Tirages
        </CardTitle>
        <CardDescription>
          Stratégie optimisée pour {strategy.predictions.length} prochains tirages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="p-3 bg-background/50 rounded-lg text-center">
            <DollarSign className="w-4 h-4 mx-auto mb-1 text-cyan-500" />
            <p className="text-xs text-muted-foreground">Budget total</p>
            <p className="font-bold">{strategy.totalBudget} FCFA</p>
          </div>
          <div className="p-3 bg-background/50 rounded-lg text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-green-500" />
            <p className="text-xs text-muted-foreground">Retour estimé</p>
            <p className="font-bold">{strategy.expectedReturn.toFixed(0)} FCFA</p>
          </div>
          <div className="p-3 bg-background/50 rounded-lg text-center">
            <Badge variant={strategy.riskLevel === "low" ? "default" : strategy.riskLevel === "medium" ? "secondary" : "destructive"} className="w-full">
              Risque {strategy.riskLevel === "low" ? "Faible" : strategy.riskLevel === "medium" ? "Moyen" : "Élevé"}
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          {strategy.predictions.map((pred, idx) => (
            <div key={idx} className="p-4 bg-background/50 rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold">{pred.drawName}</p>
                  <p className="text-xs text-muted-foreground">{pred.strategy}</p>
                </div>
                <Badge variant={pred.confidence > 70 ? "default" : "secondary"}>
                  {pred.confidence.toFixed(0)}%
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
          <p className="text-sm font-medium text-center">{strategy.recommendation}</p>
        </div>
      </CardContent>
    </Card>
  );
};
