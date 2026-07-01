import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NumberBall } from "./NumberBall";
import { Info, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Explanation {
  number: number;
  reasons: string[];
  weight: number;
  frequency: number;
  lastSeen: number;
  trend: "rising" | "stable" | "falling";
}

interface PredictionExplanationPanelProps {
  explanations: Explanation[];
}

export const PredictionExplanationPanel = ({ explanations }: PredictionExplanationPanelProps) => {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "rising": return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "falling": return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="bg-accent/10 border-accent/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Info className="w-5 h-5 text-accent" />
          Pourquoi ces numéros ?
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Explications détaillées de la prédiction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {explanations.map((exp) => (
          <div key={exp.number} className="p-3 bg-background rounded-lg border">
            <div className="flex items-start gap-3">
              <NumberBall number={exp.number} size="sm" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  {getTrendIcon(exp.trend)}
                  <Badge variant="outline" className="text-xs">
                    {(exp.frequency * 100).toFixed(1)}% fréquence
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Vu il y a {exp.lastSeen} tirages
                  </Badge>
                </div>
                <ul className="space-y-1">
                  {exp.reasons.map((reason, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
