import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useConditionalPredictions } from "@/hooks/useConditionalPredictions";
import { GitBranch, Sparkles, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ConditionalPredictionsProps {
  drawName: string;
}

export const ConditionalPredictions = ({ drawName }: ConditionalPredictionsProps) => {
  const { data, isLoading } = useConditionalPredictions(drawName);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || (data.rules.length === 0 && data.combinations.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-4">
      {data.rules.length > 0 && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-purple-500" />
              Règles Conditionnelles
            </CardTitle>
            <CardDescription>
              Si le numéro X sort, alors Y a de fortes chances de sortir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.rules.slice(0, 5).map((rule, idx) => (
                <div key={idx} className="p-3 bg-background/50 rounded-lg border border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                      {rule.condition}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold">
                      {rule.consequence}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={rule.confidence === "high" ? "default" : rule.confidence === "medium" ? "secondary" : "outline"}>
                      {rule.probability.toFixed(0)}%
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {rule.occurrences} fois
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.combinations.length > 0 && (
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              Combinaisons Gagnantes
            </CardTitle>
            <CardDescription>
              Paires de numéros qui sortent fréquemment ensemble
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.combinations.map((combo, idx) => (
                <div key={idx} className="p-3 bg-background/50 rounded-lg border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-2">
                      {combo.numbers.map((num, i) => (
                        <div key={i} className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                          {num}
                        </div>
                      ))}
                    </div>
                    <Badge variant="secondary">
                      {combo.frequency}×
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Dernière fois</span>
                    <span>{format(new Date(combo.lastSeen), "d MMM", { locale: fr })}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
