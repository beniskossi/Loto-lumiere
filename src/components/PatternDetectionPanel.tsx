import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NumberBall } from "./NumberBall";
import { Sparkles, TrendingUp, Flame, Snowflake } from "lucide-react";

interface Pattern {
  type: "pair" | "triplet" | "cycle" | "hot" | "cold";
  numbers: number[];
  frequency: number;
  confidence: number;
  lastSeen: number;
  description: string;
}

interface PatternDetectionPanelProps {
  patterns: Pattern[];
}

export const PatternDetectionPanel = ({ patterns }: PatternDetectionPanelProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case "hot": return <Flame className="w-4 h-4 text-orange-500" />;
      case "cold": return <Snowflake className="w-4 h-4 text-blue-500" />;
      case "cycle": return <TrendingUp className="w-4 h-4 text-purple-500" />;
      default: return <Sparkles className="w-4 h-4 text-primary" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      pair: "Paire",
      triplet: "Triplet",
      cycle: "Cycle",
      hot: "Chaud",
      cold: "Froid",
    };
    return labels[type] || type;
  };

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Patterns Détectés
        </CardTitle>
        <CardDescription>
          Tendances et corrélations dans les tirages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {patterns.map((pattern, idx) => (
          <div key={idx} className="p-3 bg-background rounded-lg border">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getIcon(pattern.type)}
                <span className="font-semibold text-sm">{pattern.description}</span>
              </div>
              <Badge variant="outline">
                {getTypeLabel(pattern.type)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mb-2">
              {pattern.numbers.map(num => (
                <NumberBall key={num} number={num} size="sm" />
              ))}
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>Confiance: {(pattern.confidence * 100).toFixed(0)}%</span>
              <span>•</span>
              <span>Fréq: {(pattern.frequency * 100).toFixed(1)}%</span>
            </div>
          </div>
        ))}
        {patterns.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            Aucun pattern détecté
          </p>
        )}
      </CardContent>
    </Card>
  );
};
