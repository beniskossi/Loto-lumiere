import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { useNumberTrends } from "@/hooks/useNumberTrends";
import { Skeleton } from "@/components/ui/skeleton";

interface NumberTrendChartProps {
  drawName: string;
  numbers: number[];
  days?: number;
  title?: string;
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
];

export const NumberTrendChart = ({ 
  drawName, 
  numbers, 
  days = 30,
  title = "Tendances des Numéros"
}: NumberTrendChartProps) => {
  const { data: trendData, isLoading, error } = useNumberTrends(drawName, numbers, days);

  if (error) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
          <CardDescription className="text-destructive">
            Erreur lors du chargement des tendances
          </CardDescription>
        </CardHeader>
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
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!trendData || trendData.length === 0) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>
            Aucune donnée disponible pour cette période
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border/50 hover:shadow-glow transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Évolution des apparitions sur les {days} derniers jours
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
              label={{ value: 'Apparitions', angle: -90, position: 'insideLeft', style: { fill: "hsl(var(--foreground))", fontSize: 11 } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend 
              wrapperStyle={{ fontSize: "11px" }}
              formatter={(value) => `N° ${value.replace('num_', '')}`}
            />
            {numbers.map((num, index) => (
              <Line
                key={num}
                type="monotone"
                dataKey={`num_${num}`}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};