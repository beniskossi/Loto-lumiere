import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar, Hash, PieChart, Activity } from "lucide-react";
import { DrawResult } from "@/hooks/useDrawResults";
import { useHistoryStats } from "@/hooks/useHistoryStats";
import { NumberBall } from "@/components/NumberBall";

interface HistorySummaryStatsProps {
  results: DrawResult[];
}

export const HistorySummaryStats = ({ results }: HistorySummaryStatsProps) => {
  const stats = useHistoryStats(results);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const topDraws = Object.entries(stats.drawBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <Card className="bg-gradient-card border-border/50 animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Résumé de l'Historique
        </CardTitle>
        <CardDescription>
          Vue d'ensemble rapide de vos données historiques
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Tirages */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium">
                  Total Tirages
                </p>
                <p className="text-3xl font-bold text-primary">
                  {stats.totalDraws}
                </p>
              </div>
              <Hash className="w-8 h-8 text-primary/40" />
            </div>
          </div>

          {/* Plage de Dates */}
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">
                Période Couverte
              </p>
              <Calendar className="w-5 h-5 text-accent/40" />
            </div>
            <div className="space-y-1">
              <p className="text-xs">
                <span className="text-muted-foreground">Du:</span>{" "}
                <span className="font-semibold">{formatDate(stats.dateRange.earliest)}</span>
              </p>
              <p className="text-xs">
                <span className="text-muted-foreground">Au:</span>{" "}
                <span className="font-semibold">{formatDate(stats.dateRange.latest)}</span>
              </p>
            </div>
          </div>

          {/* Numéro le Plus Fréquent */}
          <div className="bg-success/5 border border-success/20 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">
                N° Plus Fréquent
              </p>
              <TrendingUp className="w-5 h-5 text-success/40" />
            </div>
            {stats.mostFrequentNumber ? (
              <div className="flex items-center gap-3">
                <NumberBall 
                  number={stats.mostFrequentNumber.number} 
                  size="md" 
                />
                <div>
                  <p className="text-2xl font-bold text-success">
                    {stats.mostFrequentNumber.count}
                  </p>
                  <p className="text-xs text-muted-foreground">apparitions</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune donnée</p>
            )}
          </div>

          {/* Activité Récente */}
          <div className="bg-warning/5 border border-warning/20 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">
                Activité Récente
              </p>
              <Activity className="w-5 h-5 text-warning/40" />
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">7 derniers jours</p>
                <p className="text-xl font-bold text-warning">
                  {stats.recentActivity.last7Days}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">30 derniers jours</p>
                <p className="text-lg font-semibold">
                  {stats.recentActivity.last30Days}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Répartition par Tirage */}
        {topDraws.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Top 3 Tirages</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topDraws.map(([drawName, count], idx) => (
                <div
                  key={drawName}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium truncate max-w-[120px]">
                      {drawName}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-primary">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
