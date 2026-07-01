// Tableau de bord visuel des 8 formules de prédiction avec graphiques de tendance
import { memo, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Scale, 
  Waves,
  Sparkles,
  Timer,
  Zap,
  Target,
  BarChart3
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";

export interface ExtendedScoreBreakdown {
  frequency: number;
  pairs: number;
  gap: number;
  equilibrium: number;
  echo: number;
  temporalResonance?: number;
  numericalMomentum?: number;
  spatialClustering?: number;
  composite: number;
}

interface FormulasDashboardProps {
  breakdown: ExtendedScoreBreakdown;
  narratives?: string[];
  historicalData?: Array<{
    date: string;
    [key: string]: number | string;
  }>;
}

const FORMULA_CONFIG = {
  frequency: {
    key: "frequency",
    name: "F1: Fréquence Pondérée",
    shortName: "Fréquence",
    icon: TrendingUp,
    description: "S_n = f_n × e^(-λ × d_n)",
    detail: "Analyse la fréquence avec décroissance temporelle exponentielle",
    weight: 15,
    color: "hsl(210, 90%, 55%)",
    fill: "hsl(210, 90%, 55%)",
  },
  gap: {
    key: "gap",
    name: "F2: Gap Adaptatif",
    shortName: "Gap",
    icon: Clock,
    description: "R_n = (g_n - μ_g) / σ_g",
    detail: "Détecte les numéros en retard via Z-score normalisé",
    weight: 15,
    color: "hsl(40, 90%, 55%)",
    fill: "hsl(40, 90%, 55%)",
  },
  echo: {
    key: "echo",
    name: "F3: Échos Inter-Tirages",
    shortName: "Échos",
    icon: Waves,
    description: "O = Σ(|r_k|/5) × e^(-δ × i_k)",
    detail: "Détecte les résonances entre tirages récents",
    weight: 12,
    color: "hsl(280, 70%, 60%)",
    fill: "hsl(280, 70%, 60%)",
  },
  pairs: {
    key: "pairs",
    name: "F4: Paires Récurrentes",
    shortName: "Paires",
    icon: Users,
    description: "P_{i,j} = c_{i,j} × (1 - g_{i,j}/G_max)",
    detail: "Identifie les paires de numéros fréquentes",
    weight: 10,
    color: "hsl(140, 70%, 45%)",
    fill: "hsl(140, 70%, 45%)",
  },
  equilibrium: {
    key: "equilibrium",
    name: "F5: Équilibre Somme-Parité",
    shortName: "Équilibre",
    icon: Scale,
    description: "E = w_s × |s - μ_s| + w_p × |p - m_p|",
    detail: "Vérifie l'équilibre statistique somme/parité",
    weight: 8,
    color: "hsl(350, 80%, 55%)",
    fill: "hsl(350, 80%, 55%)",
  },
  temporalResonance: {
    key: "temporalResonance",
    name: "F6: Résonance Temporelle",
    shortName: "Temporel",
    icon: Timer,
    description: "T_n = Σ cos(2π × f_k × t)",
    detail: "Analyse les patterns temporels et périodicité",
    weight: 15,
    color: "hsl(180, 70%, 50%)",
    fill: "hsl(180, 70%, 50%)",
  },
  numericalMomentum: {
    key: "numericalMomentum",
    name: "F7: Momentum Numérique",
    shortName: "Momentum",
    icon: Zap,
    description: "M_n = v_n + a_n × Δt",
    detail: "Vélocité et accélération des apparitions",
    weight: 15,
    color: "hsl(25, 90%, 55%)",
    fill: "hsl(25, 90%, 55%)",
  },
  spatialClustering: {
    key: "spatialClustering",
    name: "F8: Clustering Spatial",
    shortName: "Spatial",
    icon: Target,
    description: "C = k-means(zones)",
    detail: "Détecte les groupements spatiaux de numéros",
    weight: 10,
    color: "hsl(320, 70%, 55%)",
    fill: "hsl(320, 70%, 55%)",
  },
};

const chartConfig = Object.fromEntries(
  Object.entries(FORMULA_CONFIG).map(([key, config]) => [
    key,
    { label: config.shortName, color: config.color }
  ])
);

export const FormulasDashboard = memo<FormulasDashboardProps>(({
  breakdown,
  narratives = [],
  historicalData = [],
}) => {
  // Préparer les données pour le graphique radial
  const radialData = useMemo(() => {
    return Object.entries(FORMULA_CONFIG).map(([key, config]) => {
      const value = breakdown[key as keyof ExtendedScoreBreakdown];
      return {
        name: config.shortName,
        value: typeof value === 'number' ? Math.round(value * 100) : 0,
        fill: config.fill,
        weight: config.weight,
      };
    }).filter(d => d.value > 0);
  }, [breakdown]);

  // Données pour le bar chart comparatif
  const barData = useMemo(() => {
    return Object.entries(FORMULA_CONFIG).map(([key, config]) => {
      const value = breakdown[key as keyof ExtendedScoreBreakdown];
      return {
        name: config.shortName,
        score: typeof value === 'number' ? Math.round(value * 100) : 0,
        weight: config.weight,
        fill: config.fill,
      };
    });
  }, [breakdown]);

  // Données de tendance simulées si pas de données historiques
  const trendData = useMemo(() => {
    if (historicalData.length > 0) return historicalData;
    
    // Générer des données de tendance simulées basées sur les scores actuels
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const baseData: Record<string, number | string> = {
        date: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
      };
      
      Object.entries(FORMULA_CONFIG).forEach(([key, _]) => {
        const currentValue = breakdown[key as keyof ExtendedScoreBreakdown];
        const baseValue = typeof currentValue === 'number' ? currentValue * 100 : 50;
        // Variation aléatoire autour de la valeur actuelle
        const variation = (Math.random() - 0.5) * 20;
        baseData[key] = Math.max(0, Math.min(100, Math.round(baseValue + variation * (1 - i / 7))));
      });
      
      return baseData;
    });
  }, [breakdown, historicalData]);

  const getScoreColor = (score: number): string => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  const compositeScore = Math.round(breakdown.composite * 100);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Tableau de Bord des Formules</CardTitle>
          </div>
          <Badge className={getScoreColor(compositeScore)}>
            Score Global: {compositeScore}%
          </Badge>
        </div>
        <CardDescription>
          8 formules algorithmiques analysées en temps réel
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="trends">Tendances</TabsTrigger>
            <TabsTrigger value="details">Détails</TabsTrigger>
          </TabsList>

          {/* Vue d'ensemble avec graphique radial et barres */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Graphique en barres */}
              <div className="h-[280px]">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={70}
                      tick={{ fontSize: 11 }}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      formatter={(value) => [`${value}%`, 'Score']}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>

              {/* Score composite avec poids */}
              <div className="space-y-3">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-4xl font-bold text-primary mb-1">
                    {compositeScore}%
                  </div>
                  <div className="text-sm text-muted-foreground">Score Composite</div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Distribution des poids
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(FORMULA_CONFIG).map(([key, config]) => (
                      <Badge 
                        key={key} 
                        variant="outline" 
                        className="text-xs"
                        style={{ borderColor: config.color, color: config.color }}
                      >
                        {config.shortName}: {config.weight}%
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Graphique de tendances */}
          <TabsContent value="trends" className="space-y-4">
            <div className="h-[300px]">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  {Object.entries(FORMULA_CONFIG).slice(0, 4).map(([key, config]) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={config.shortName}
                      stroke={config.color}
                      fill={config.color}
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ChartContainer>
            </div>
            
            <div className="h-[300px]">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  {Object.entries(FORMULA_CONFIG).slice(4).map(([key, config]) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={config.shortName}
                      stroke={config.color}
                      fill={config.color}
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ChartContainer>
            </div>
          </TabsContent>

          {/* Détails des formules */}
          <TabsContent value="details" className="space-y-3">
            {Object.entries(FORMULA_CONFIG).map(([key, config]) => {
              const value = breakdown[key as keyof ExtendedScoreBreakdown];
              const score = typeof value === 'number' ? Math.round(value * 100) : 0;
              const Icon = config.icon;
              
              return (
                <div 
                  key={key}
                  className="p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="p-2 rounded-md"
                      style={{ backgroundColor: `${config.color}20` }}
                    >
                      <Icon 
                        className="h-5 w-5" 
                        style={{ color: config.color }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {config.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Poids: {config.weight}%
                          </Badge>
                          <span 
                            className="font-mono font-bold text-sm"
                            style={{ color: config.color }}
                          >
                            {score}%
                          </span>
                        </div>
                      </div>
                      <Progress 
                        value={score} 
                        className="h-2 mb-2"
                      />
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p className="font-mono">{config.description}</p>
                        <p>{config.detail}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>

        {/* Narratives/Insights */}
        {narratives.length > 0 && (
          <div className="pt-3 border-t border-border/50 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>Insights des formules</span>
            </div>
            <ul className="space-y-1.5">
              {narratives.map((narrative, index) => (
                <li 
                  key={index}
                  className="text-sm text-foreground/80 pl-4 border-l-2 border-primary/30"
                >
                  {narrative}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

FormulasDashboard.displayName = "FormulasDashboard";
