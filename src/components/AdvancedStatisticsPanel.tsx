import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdvancedStatistics } from "@/hooks/useAdvancedStatistics";
import { NumberBall } from "@/components/NumberBall";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Percent, Sigma, Calendar, Link2, GitBranch } from "lucide-react";

interface AdvancedStatisticsPanelProps {
  drawName: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(var(--destructive))",
  "hsl(230 60% 50%)",
  "hsl(35 90% 50%)",
  "hsl(145 55% 50%)",
  "hsl(330 70% 55%)",
  "hsl(25 90% 50%)",
];

export const AdvancedStatisticsPanel = ({ drawName }: AdvancedStatisticsPanelProps) => {
  const { data: stats, isLoading, error } = useAdvancedStatistics(drawName);

  if (error) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardContent className="pt-6">
          <p className="text-destructive">Erreur lors du chargement des statistiques</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!stats) return null;

  const evenOddData = [
    { name: "Pairs", value: stats.evenOddRatio.even, fill: COLORS[0] },
    { name: "Impairs", value: stats.evenOddRatio.odd, fill: COLORS[1] },
  ];

  const consecutiveData = [
    { name: "Avec consécutifs", value: stats.consecutiveNumbers.hasConsecutive, fill: COLORS[2] },
    { name: "Sans consécutifs", value: stats.consecutiveNumbers.noConsecutive, fill: COLORS[3] },
  ];

  const sumData = [
    { metric: "Minimum", value: stats.sumAnalysis.min },
    { metric: "Moyenne", value: Math.round(stats.sumAnalysis.average) },
    { metric: "Médiane", value: stats.sumAnalysis.median },
    { metric: "Maximum", value: stats.sumAnalysis.max },
  ];

  const radarData = stats.rangeDistribution.map(item => ({
    range: item.range,
    percentage: Math.round(item.percentage * 10) / 10,
  }));

  return (
    <div className="space-y-6">
      {/* Analyse Pairs/Impairs et Consécutifs */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-primary" />
              Répartition Pairs / Impairs
            </CardTitle>
            <CardDescription>Distribution des numéros pairs et impairs</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={evenOddData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {evenOddData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-success" />
              Numéros Consécutifs
            </CardTitle>
            <CardDescription>Présence de numéros consécutifs</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={consecutiveData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {consecutiveData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Analyse des sommes */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sigma className="w-5 h-5 text-accent" />
            Analyse des Sommes
          </CardTitle>
          <CardDescription>
            Statistiques sur la somme des 5 numéros gagnants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={sumData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="metric" 
                tick={{ fill: "hsl(var(--foreground))" }}
              />
              <YAxis tick={{ fill: "hsl(var(--foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="value" fill={COLORS[4]} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribution par tranche - Radar */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Distribution par Tranches
          </CardTitle>
          <CardDescription>
            Pourcentage d'apparition par groupe de 10 numéros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis 
                dataKey="range" 
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 'auto']}
                tick={{ fill: "hsl(var(--foreground))" }}
              />
              <Radar
                name="Pourcentage"
                dataKey="percentage"
                stroke={COLORS[0]}
                fill={COLORS[0]}
                fillOpacity={0.6}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Paires */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-success" />
            Top 10 Paires de Numéros
          </CardTitle>
          <CardDescription>
            Les combinaisons de 2 numéros les plus fréquentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.topPairs.map((pairStat, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-4 bg-success/5 border border-success/20 rounded-lg hover:bg-success/10 transition-colors"
              >
                <span className="text-2xl font-bold text-muted-foreground min-w-[2rem]">
                  #{idx + 1}
                </span>
                <div className="flex gap-2">
                  <NumberBall number={pairStat.pair[0]} size="md" />
                  <NumberBall number={pairStat.pair[1]} size="md" />
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-muted-foreground">Fréquence</p>
                  <p className="text-xl font-bold text-success">{pairStat.frequency}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Triplets */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            Top 10 Triplets de Numéros
          </CardTitle>
          <CardDescription>
            Les combinaisons de 3 numéros les plus fréquentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.topTriplets.map((tripletStat, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-4 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors"
              >
                <span className="text-2xl font-bold text-muted-foreground min-w-[2rem]">
                  #{idx + 1}
                </span>
                <div className="flex gap-2">
                  <NumberBall number={tripletStat.triplet[0]} size="md" />
                  <NumberBall number={tripletStat.triplet[1]} size="md" />
                  <NumberBall number={tripletStat.triplet[2]} size="md" />
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-muted-foreground">Fréquence</p>
                  <p className="text-xl font-bold text-primary">{tripletStat.frequency}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Patterns temporels */}
      {stats.temporalPatterns.length > 0 && (
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Patterns par Jour de la Semaine
            </CardTitle>
            <CardDescription>
              Analyse des tendances selon le jour
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.temporalPatterns.map((pattern, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-accent/5 border border-accent/20 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-lg">{pattern.day}</h4>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Somme moyenne</p>
                      <p className="text-xl font-bold text-accent">
                        {Math.round(pattern.averageSum)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Top 5 numéros - {pattern.drawCount} tirages
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {pattern.mostCommon.map((num, i) => (
                        <NumberBall key={i} number={num} size="sm" />
                      ))}
                    </div>
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
