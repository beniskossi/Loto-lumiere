import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types for Forensic Audit
export interface AlgorithmForensicMetrics {
  algorithm: string;
  predictions: number;
  totalMatches: number;
  averageMatches: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  calibrationError: number;
  overconfidence: boolean;
  trend: "improving" | "declining" | "stable";
  recentPerformance: number;
  historicalPerformance: number;
  suggestedWeightAdjustment: number;
}

export interface CalibrationAdjustment {
  algorithm: string;
  previousWeight: number;
  newWeight: number;
  changePercent: number;
  reason: string;
  previousParams?: Record<string, number>;
  newParams?: Record<string, number>;
}

export interface ForensicInsight {
  type: "pattern" | "anomaly" | "correlation" | "warning" | "recommendation";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  affectedAlgorithms: string[];
  suggestedAction?: string;
}

export interface ConfidenceCalibration {
  averageConfidence: number;
  actualAccuracy: number;
  calibrationError: number;
  isOverconfident: boolean;
  suggestedConfidenceMultiplier: number;
}

export interface PerformanceTrend {
  direction: "improving" | "declining" | "stable";
  recentAverage: number;
  historicalAverage: number;
  volatility: number;
  bestPerformingPeriod: string;
  worstPerformingPeriod: string;
}

export interface ForensicAuditResult {
  auditId: string;
  auditDate: string;
  drawName: string;
  periodStart: string;
  periodEnd: string;
  totalPredictions: number;
  totalMatches: number;
  averageAccuracy: number;
  algorithmPerformance: AlgorithmForensicMetrics[];
  calibrationAdjustments: CalibrationAdjustment[];
  insights: ForensicInsight[];
  recommendations: string[];
  confidenceCalibration: ConfidenceCalibration;
  performanceTrend: PerformanceTrend;
}

export interface GeminiForensicAnalysis {
  healthScore: number;
  criticalIssues: string[];
  recommendations: Array<{
    priority: "haute" | "moyenne" | "basse";
    action: string;
    impact: string;
  }>;
  algorithmAssessment?: Record<string, {
    status: "excellent" | "bon" | "attention" | "critique";
    recommendation: string;
  }>;
  summary: string;
}

export interface ForensicAuditResponse {
  success: boolean;
  audit: ForensicAuditResult;
  appliedAdjustments: number;
  geminiAnalysis: GeminiForensicAnalysis | null;
  executionTime: number;
  message: string;
}

interface RunForensicAuditParams {
  drawName?: string;
  days?: number;
  applyAdjustments?: boolean;
  runGeminiAnalysis?: boolean;
}

/**
 * Hook pour exécuter un audit forensic
 */
export const useRunForensicAudit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RunForensicAuditParams): Promise<ForensicAuditResponse> => {
      const { data, error } = await supabase.functions.invoke('forensic-audit', {
        body: params
      });

      if (error) {
        throw new Error(error.message || "Erreur lors de l'audit forensic");
      }

      return data as ForensicAuditResponse;
    },
    onSuccess: (data) => {
      // Invalider les caches pertinents
      queryClient.invalidateQueries({ queryKey: ["algorithm-config"] });
      queryClient.invalidateQueries({ queryKey: ["algorithm-performance"] });
      queryClient.invalidateQueries({ queryKey: ["orchestration-history"] });
      
      if (data.appliedAdjustments > 0) {
        toast.success("Audit forensic terminé", {
          description: `${data.appliedAdjustments} ajustement(s) appliqué(s)`
        });
      } else {
        toast.success("Audit forensic terminé", {
          description: `${data.audit.calibrationAdjustments.length} recommandation(s)`
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Erreur audit forensic", {
        description: error.message
      });
    }
  });
};

/**
 * Hook pour récupérer l'historique des audits forensic
 */
export const useForensicHistory = (drawName?: string, limit: number = 10) => {
  return useQuery({
    queryKey: ["forensic-history", drawName, limit],
    queryFn: async () => {
      let query = supabase
        .from("orchestration_history")
        .select("id, draw_name, draw_date, adjustment_date, trigger_metrics, algorithms_analyzed, weight_adjustments, parameter_adjustments, expected_improvement, adjustment_strategy, notes, created_at")
        .eq("adjustment_strategy", "forensic_audit")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (drawName && drawName !== "all") {
        query = query.eq("draw_name", drawName);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook pour récupérer les métriques de performance agrégées
 */
export const usePerformanceMetrics = (drawName?: string, days: number = 30) => {
  return useQuery({
    queryKey: ["performance-metrics", drawName, days],
    queryFn: async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      let query = supabase
        .from("algorithm_performance")
        .select("model_used, matches_count, accuracy_score, confidence_score, draw_date")
        .gte("draw_date", cutoffDate.toISOString().split('T')[0])
        .order("draw_date", { ascending: false });

      if (drawName && drawName !== "all") {
        query = query.eq("draw_name", drawName);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          totalPredictions: 0,
          averageAccuracy: 0,
          averageMatches: 0,
          byAlgorithm: {}
        };
      }

      // Agrégation
      const byAlgorithm: Record<string, { count: number; matches: number; accuracy: number }> = {};
      
      data.forEach(record => {
        if (!byAlgorithm[record.model_used]) {
          byAlgorithm[record.model_used] = { count: 0, matches: 0, accuracy: 0 };
        }
        byAlgorithm[record.model_used].count++;
        byAlgorithm[record.model_used].matches += record.matches_count;
        byAlgorithm[record.model_used].accuracy += record.accuracy_score;
      });

      // Calculer les moyennes
      Object.keys(byAlgorithm).forEach(algo => {
        byAlgorithm[algo].accuracy = byAlgorithm[algo].accuracy / byAlgorithm[algo].count;
      });

      const totalMatches = data.reduce((sum, r) => sum + r.matches_count, 0);
      const averageAccuracy = data.reduce((sum, r) => sum + r.accuracy_score, 0) / data.length;

      return {
        totalPredictions: data.length,
        averageAccuracy,
        averageMatches: totalMatches / data.length,
        byAlgorithm
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
