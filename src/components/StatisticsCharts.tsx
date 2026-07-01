import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberStatistic } from "@/hooks/useNumberStatistics";
import { NumberBall } from "@/components/NumberBall";
import { Progress } from "@/components/ui/progress";

interface StatisticsChartsProps {
  mostFrequent: NumberStatistic[];
  leastFrequent: NumberStatistic[];
  drawName: string;
}

export const StatisticsCharts = ({ mostFrequent, leastFrequent, drawName }: StatisticsChartsProps) => {
  // Distribution par tranche de 10
  const rangeDistribution = Array.from({ length: 9 }, (_, i) => {
    const start = i * 10 + 1;
    const end = i === 8 ? 90 : (i + 1) * 10;
    const range = `${start}-${end}`;
    
    const count = mostFrequent.filter(stat => {
      return stat.number >= start && stat.number <= end;
    }).reduce((sum, stat) => sum + stat.frequency, 0);

    return { range, count };
  });

  const maxCount = Math.max(...rangeDistribution.map(r => r.count), 1);

  return (
    <div className="space-y-6">
      {/* Fréquence des Numéros les Plus Sortis */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle>Fréquence des Numéros les Plus Sortis</CardTitle>
          <CardDescription>
            Top 10 des numéros qui apparaissent le plus souvent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
            {mostFrequent.map((stat, index) => (
              <div key={stat.number} className="flex flex-col items-center gap-1">
                <NumberBall number={stat.number} size="md" />
                <span className="text-xs text-muted-foreground font-medium">
                  {stat.frequency}x
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distribution par Tranche */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle>Distribution par Tranche</CardTitle>
          <CardDescription>
            Répartition des apparitions par groupe de 10 numéros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rangeDistribution.map((item) => (
              <div key={item.range} className="flex items-center gap-3">
                <span className="text-sm font-medium w-16 text-muted-foreground">
                  {item.range}
                </span>
                <div className="flex-1">
                  <Progress 
                    value={(item.count / maxCount) * 100} 
                    className="h-3"
                  />
                </div>
                <span className="text-sm font-bold w-12 text-right">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};