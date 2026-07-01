import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database, TrendingUp, Users, Activity, Calendar, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminStats {
  totalDraws: number;
  totalPredictions: number;
  totalUsers: number;
  totalAlgorithms: number;
  lastDrawDate: string;
  avgAccuracy: number;
}

export const AdminDashboardStats = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async (): Promise<AdminStats> => {
      const [draws, predictions, profiles, algorithms] = await Promise.all([
        supabase.from("draw_results").select("draw_date", { count: "exact" }),
        supabase.from("predictions").select("*", { count: "exact" }),
        supabase.from("profiles").select("*", { count: "exact" }),
        supabase.from("algorithm_config").select("*", { count: "exact" }),
      ]);

      const { data: latestDraw } = await supabase
        .from("draw_results")
        .select("draw_date")
        .order("draw_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: performance } = await supabase
        .from("algorithm_performance")
        .select("accuracy_score")
        .limit(100);

      const avgAccuracy = performance && performance.length > 0
        ? performance.reduce((sum, p) => sum + Number(p.accuracy_score), 0) / performance.length
        : 0;

      return {
        totalDraws: draws.count || 0,
        totalPredictions: predictions.count || 0,
        totalUsers: profiles.count || 0,
        totalAlgorithms: algorithms.count || 0,
        lastDrawDate: latestDraw?.draw_date || "N/A",
        avgAccuracy: Number(avgAccuracy.toFixed(2)),
      };
    },
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: "Tirages Total",
      value: stats.totalDraws,
      icon: Database,
      description: `Dernier: ${stats.lastDrawDate}`,
      color: "text-blue-600",
    },
    {
      title: "Prédictions",
      value: stats.totalPredictions,
      icon: TrendingUp,
      description: "Générées par ML",
      color: "text-purple-600",
    },
    {
      title: "Utilisateurs",
      value: stats.totalUsers,
      icon: Users,
      description: "Inscrits",
      color: "text-green-600",
    },
    {
      title: "Algorithmes",
      value: stats.totalAlgorithms,
      icon: Activity,
      description: "Actifs",
      color: "text-orange-600",
    },
    {
      title: "Précision Moy.",
      value: `${stats.avgAccuracy}%`,
      icon: Award,
      description: "Performance globale",
      color: "text-yellow-600",
    },
    {
      title: "Système",
      value: "En Ligne",
      icon: Calendar,
      description: "Tous services opérationnels",
      color: "text-teal-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="bg-gradient-to-br from-card to-muted/20 border-border/50 hover:shadow-glow transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground/80">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full bg-background/50 border border-border/50 shadow-sm ${stat.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
