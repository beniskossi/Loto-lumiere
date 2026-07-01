import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNumberCorrelation } from "@/hooks/useNumberTrends";
import { Skeleton } from "@/components/ui/skeleton";
import { GitMerge } from "lucide-react";
import { NumberBall } from "./NumberBall";

interface NumberCorrelationHeatmapProps {
  drawName: string;
}

export const NumberCorrelationHeatmap = ({ drawName }: NumberCorrelationHeatmapProps) => {
  const { data: correlationData, isLoading, error } = useNumberCorrelation(drawName);

  if (error) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardContent className="pt-6">
          <p className="text-destructive">Erreur lors du chargement des corrélations</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!correlationData || correlationData.topCorrelations.length === 0) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-primary" />
            Corrélations entre Numéros
          </CardTitle>
          <CardDescription>
            Aucune donnée de corrélation disponible
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const maxCount = correlationData.topCorrelations[0]?.count || 1;

  return (
    <Card className="bg-gradient-card border-border/50 hover:shadow-glow transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <GitMerge className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Corrélations entre Numéros
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Top 20 des paires de numéros sortant souvent ensemble
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 sm:space-y-3">
          {correlationData.topCorrelations.slice(0, 20).map((correlation, index) => {
            const percentage = (correlation.count / maxCount) * 100;
            
            return (
              <div
                key={`${correlation.number1}-${correlation.number2}`}
                className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-card/50 border border-border/50 hover:bg-card transition-all"
              >
                <div className="flex items-center justify-center min-w-6 sm:min-w-8 text-xs sm:text-sm font-semibold text-muted-foreground">
                  #{index + 1}
                </div>
                
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <NumberBall number={correlation.number1} size="sm" />
                  <span className="text-xs sm:text-sm text-muted-foreground">+</span>
                  <NumberBall number={correlation.number2} size="sm" />
                </div>

                <div className="flex-1 ml-2 sm:ml-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm font-medium">
                      {correlation.count} fois ensemble
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};