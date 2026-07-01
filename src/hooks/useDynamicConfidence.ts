import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ConfidenceMetrics {
  currentConfidence: number;
  trend: "up" | "down" | "stable";
  recentAccuracy: number;
  reliability: "high" | "medium" | "low";
  shouldAlert: boolean;
  message: string;
}

export const useDynamicConfidence = (drawName: string) => {
  return useQuery({
    queryKey: ["dynamic-confidence", drawName],
    queryFn: async (): Promise<ConfidenceMetrics> => {
      const { data: recentPerf } = await supabase
        .from("algorithm_performance")
        .select("accuracy_score, matches_count, created_at")
        .eq("draw_name", drawName)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!recentPerf || recentPerf.length === 0) {
        return {
          currentConfidence: 50,
          trend: "stable",
          recentAccuracy: 0,
          reliability: "low",
          shouldAlert: true,
          message: "Données insuffisantes pour évaluer la confiance"
        };
      }

      const avgAccuracy = recentPerf.reduce((sum, p) => sum + p.accuracy_score, 0) / recentPerf.length;
      const recentAvg = recentPerf.slice(0, 5).reduce((sum, p) => sum + p.accuracy_score, 0) / Math.min(5, recentPerf.length);
      const olderAvg = recentPerf.slice(5).reduce((sum, p) => sum + p.accuracy_score, 0) / Math.max(1, recentPerf.length - 5);

      const trend = recentAvg > olderAvg + 5 ? "up" : recentAvg < olderAvg - 5 ? "down" : "stable";
      const reliability = avgAccuracy >= 70 ? "high" : avgAccuracy >= 50 ? "medium" : "low";
      const shouldAlert = avgAccuracy < 60;

      let message = "";
      if (avgAccuracy >= 70) message = "🔥 Performance excellente";
      else if (avgAccuracy >= 60) message = "✓ Performance stable";
      else if (avgAccuracy >= 50) message = "⚠️ Performance modérée";
      else message = "❌ Performance faible - Révision nécessaire";

      return {
        currentConfidence: Math.round(avgAccuracy),
        trend,
        recentAccuracy: Math.round(recentAvg),
        reliability,
        shouldAlert,
        message
      };
    },
    staleTime: 2 * 60 * 1000,
  });
};
