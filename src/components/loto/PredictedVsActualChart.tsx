import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { useAlgorithmTrends } from "@/hooks/useAlgorithmComparison";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";

interface PredictedVsActualChartProps {
  drawName?: string;
}

export const PredictedVsActualChart = ({ drawName }: PredictedVsActualChartProps) => {
  // Fetch trend data
  const { data: trendsData, isLoading } = useAlgorithmTrends(drawName === "all" ? undefined : drawName, 30);

  const chartData = useMemo(() => {
    if (!trendsData) return [];
    
    // Group by date
    const grouped = trendsData.reduce((acc, curr) => {
      const dateStr = new Date(curr.date).toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
      if (!acc[dateStr]) {
        acc[dateStr] = { date: dateStr, originalDate: curr.date };
      }
      
      // Filter specifically for spectral and fractal algorithms or fallback to available
      if (curr.model_used.toLowerCase().includes("spectral")) {
        acc[dateStr]["Spectral"] = curr.accuracy_score;
      } else if (curr.model_used.toLowerCase().includes("fractal")) {
        acc[dateStr]["Fractal"] = curr.accuracy_score;
      } else {
        // If we want to show whatever is available just in case
        const nameParts = curr.model_used.split(" ");
        const shortName = nameParts[0];
        acc[dateStr][shortName] = curr.accuracy_score;
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    // Sort chronologically
    return Object.values(grouped).sort((a, b) => new Date(a.originalDate).getTime() - new Date(b.originalDate).getTime());
  }, [trendsData]);

  if (isLoading) {
    return (
      <Card className="border-border/60 bg-secondary/10 shadow-sm h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return null; // Don't show if no data
  }

  return (
    <Card className="border-border/60 bg-secondary/10 shadow-sm h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-1.5 bg-primary/10 rounded-md">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          Précision des Prédictions
        </CardTitle>
        <CardDescription>
          Évolution de l'exactitude (Spectral vs Fractal)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [`${value}%`, undefined]}
              />
              <Legend 
                wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                iconType="circle"
                iconSize={8}
              />
              <Line 
                type="monotone" 
                dataKey="Spectral" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2.5}
                dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
                connectNulls
              />
              <Line 
                type="monotone" 
                dataKey="Fractal" 
                stroke="hsl(var(--accent))" 
                strokeWidth={2.5}
                dot={{ r: 3, fill: "hsl(var(--accent))", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
