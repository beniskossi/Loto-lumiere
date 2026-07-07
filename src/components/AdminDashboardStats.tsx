import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database, TrendingUp, Users, Activity, Calendar, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatToFrenchDate } from "@/utils/dateUtils";

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
      description: `Dernier: ${formatToFrenchDate(stats.lastDrawDate)}`,
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
          <Card key={index} className="bg-card border-border/50 hover:shadow-glow transition-all duration-300 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-current to-transparent opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 rounded-bl-full pointer-events-none ${stat.color}`} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10 relative">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2.5 rounded-xl bg-background/50 border border-border/50 shadow-sm transition-transform duration-300 group-hover:scale-110 ${stat.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="text-3xl font-bold tracking-tight mb-1">{stat.value}</div>
              <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${stat.color.replace('text-', 'bg-')}`}></span>
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
