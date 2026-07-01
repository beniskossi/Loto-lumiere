import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from "recharts";
import { useDrawResults } from "@/hooks/useDrawResults";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, BarChart3 } from "lucide-react";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface NumberRegularityChartProps {
  drawName: string;
}

export const NumberRegularityChart = ({ drawName }: NumberRegularityChartProps) => {
  const [selectedNumber, setSelectedNumber] = useState<number>(1);
  const { data: results, isLoading } = useDrawResults(drawName, 50);

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

  if (!results || results.length === 0) {
    return null;
  }

  // Calculer les apparitions du numéro sélectionné
  const appearanceData = results
    .map((result, index) => ({
      date: format(parseISO(result.draw_date), 'dd/MM', { locale: fr }),
      appeared: result.winning_numbers.includes(selectedNumber) ? 1 : 0,
      index: results.length - index,
      fullDate: result.draw_date
    }))
    .reverse();

  // Calculer l'écart entre apparitions
  const gapData: Array<{ draw: number; gap: number; date: string }> = [];
  let lastAppearance = -1;
  
  appearanceData.forEach((item, index) => {
    if (item.appeared === 1) {
      if (lastAppearance !== -1) {
        gapData.push({
          draw: index + 1,
          gap: index - lastAppearance,
          date: item.date
        });
      }
      lastAppearance = index;
    }
  });

  // Calculer la probabilité basée sur l'écart actuel
  const currentGap = lastAppearance !== -1 ? appearanceData.length - lastAppearance - 1 : appearanceData.length;
  const avgGap = gapData.length > 0 
    ? gapData.reduce((sum, d) => sum + d.gap, 0) / gapData.length 
    : 0;
  
  const probability = avgGap > 0 
    ? Math.min((currentGap / avgGap) * 10, 100).toFixed(1)
    : "0.0";

  // Données de fréquence cumulée
  const cumulativeData = appearanceData.map((item, index) => {
    const appearances = appearanceData.slice(0, index + 1).filter(d => d.appeared === 1).length;
    return {
      date: item.date,
      frequency: ((appearances / (index + 1)) * 100).toFixed(1),
      index: index + 1
    };
  });

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Graphique de Régularité
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Historique des apparitions sur les 50 derniers tirages
              </CardDescription>
            </div>
            <Select 
              value={selectedNumber.toString()} 
              onValueChange={(val) => setSelectedNumber(parseInt(val))}
            >
              <SelectTrigger className="w-[180px] touch-target">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Array.from({ length: 90 }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    Numéro {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={appearanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                domain={[0, 1]}
                ticks={[0, 1]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [value === 1 ? "Sorti" : "Absent", "État"]}
              />
              <Line 
                type="stepAfter" 
                dataKey="appeared" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ r: 4, fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Apparitions</p>
              <p className="text-xl sm:text-2xl font-bold text-primary">
                {appearanceData.filter(d => d.appeared === 1).length}
              </p>
            </div>
            <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Écart actuel</p>
              <p className="text-xl sm:text-2xl font-bold text-accent">{currentGap}</p>
            </div>
            <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Écart moyen</p>
              <p className="text-xl sm:text-2xl font-bold text-success">
                {avgGap > 0 ? avgGap.toFixed(1) : "-"}
              </p>
            </div>
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Probabilité</p>
              <p className="text-xl sm:text-2xl font-bold text-destructive">{probability}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {gapData.length > 0 && (
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
              Analyse des Écarts
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Nombre de tirages entre chaque apparition du numéro {selectedNumber}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  type="number" 
                  dataKey="draw" 
                  name="Tirage"
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                  label={{ value: 'Position du tirage', position: 'insideBottom', offset: -10, style: { fill: "hsl(var(--foreground))", fontSize: 11 } }}
                />
                <YAxis 
                  type="number" 
                  dataKey="gap" 
                  name="Écart"
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                  label={{ value: 'Écart (tirages)', angle: -90, position: 'insideLeft', style: { fill: "hsl(var(--foreground))", fontSize: 11 } }}
                />
                <ZAxis range={[50, 200]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value: number, name: string) => [
                    name === "gap" ? `${value} tirages` : value,
                    name === "gap" ? "Écart" : "Tirage"
                  ]}
                />
                <Legend />
                <Scatter 
                  name="Écarts entre apparitions" 
                  data={gapData} 
                  fill="hsl(var(--accent))"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
            Fréquence Cumulée
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Évolution du taux d'apparition au fil des tirages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cumulativeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                label={{ value: 'Fréquence (%)', angle: -90, position: 'insideLeft', style: { fill: "hsl(var(--foreground))", fontSize: 11 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: string) => [`${value}%`, "Fréquence"]}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="frequency" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                dot={{ r: 2 }}
                name="Taux d'apparition (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};