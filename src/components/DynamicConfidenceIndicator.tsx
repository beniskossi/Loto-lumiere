import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDynamicConfidence } from "@/hooks/useDynamicConfidence";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";

interface DynamicConfidenceIndicatorProps {
  drawName: string;
}

export const DynamicConfidenceIndicator = ({ drawName }: DynamicConfidenceIndicatorProps) => {
  const { data: confidence, isLoading } = useDynamicConfidence(drawName);

  if (isLoading || !confidence) return null;

  const TrendIcon = confidence.trend === "up" ? TrendingUp : confidence.trend === "down" ? TrendingDown : Minus;
  const trendColor = confidence.trend === "up" ? "text-green-500" : confidence.trend === "down" ? "text-red-500" : "text-gray-500";

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendIcon className={`w-5 h-5 ${trendColor}`} />
            <span className="font-semibold">Confiance Dynamique</span>
          </div>
          <Badge variant={confidence.reliability === "high" ? "default" : confidence.reliability === "medium" ? "secondary" : "destructive"}>
            {confidence.reliability === "high" ? "Élevée" : confidence.reliability === "medium" ? "Moyenne" : "Faible"}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Niveau actuel</span>
            <span className="font-bold">{confidence.currentConfidence}%</span>
          </div>
          <Progress value={confidence.currentConfidence} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-2 bg-background/50 rounded">
            <p className="text-muted-foreground text-xs">Précision récente</p>
            <p className="font-bold">{confidence.recentAccuracy}%</p>
          </div>
          <div className="p-2 bg-background/50 rounded">
            <p className="text-muted-foreground text-xs">Tendance</p>
            <p className="font-bold capitalize">{confidence.trend === "up" ? "↗ Hausse" : confidence.trend === "down" ? "↘ Baisse" : "→ Stable"}</p>
          </div>
        </div>

        {confidence.shouldAlert && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Performance sous le seuil de 60%. Recommandation: Vérifier les algorithmes
            </AlertDescription>
          </Alert>
        )}

        <p className="text-sm text-center font-medium">{confidence.message}</p>
      </CardContent>
    </Card>
  );
};
