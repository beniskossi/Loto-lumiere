import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlgorithmConfig {
  id: string;
  algorithm_name: string;
  weight: number;
  parameters: Record<string, any>;
}

interface AlgorithmPerformance {
  model_used: string;
  avg_accuracy: number;
  total_predictions: number;
  excellent_predictions: number;
  f1_score: number;
  overall_score: number;
}

interface TrainingHistoryEntry {
  algorithm_name: string;
  previous_weight: number;
  new_weight: number;
  previous_parameters: Record<string, any>;
  new_parameters: Record<string, any>;
  performance_improvement: number;
  training_metrics: {
    avg_performance: number;
    avg_accuracy: number;
    avg_f1_score: number;
    total_evaluations: number;
  };
}

interface ResponseData {
  success: boolean;
  trainedCount?: number;
  updatedCount?: number;
  trainingHistory?: TrainingHistoryEntry[];
  message?: string;
  error?: string;
}

// Hyperparamètres d'entraînement
const HIGH_PERF_THRESHOLD = 0.7;
const LOW_PERF_THRESHOLD = 0.4;
const LR_INCREASE_FACTOR = 1.15;
const LR_DECREASE_FACTOR = 0.85;
const WEIGHT_MOMENTUM = 0.3;
const MAX_WEIGHT_CHANGE = 0.3;
const MIN_EVALUATIONS_REQUIRED = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Vérifier l'authentification admin
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' } as ResponseData),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' } as ResponseData),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier le rôle admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin role required' } as ResponseData),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting algorithm training...");

    // Récupérer les configurations actuelles
    const { data: configs, error: configsError } = await supabase
      .from("algorithm_config")
      .select("*");

    if (configsError) throw configsError;
    if (!configs || configs.length === 0) {
      return new Response(
        JSON.stringify({ error: "No algorithm configurations found" } as ResponseData),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Rafraîchir la vue matérialisée pour avoir les dernières données
    const { error: refreshError } = await supabase.rpc("refresh_algorithm_rankings");
    if (refreshError) {
      console.warn("Failed to refresh rankings:", refreshError);
    }

    // Récupérer les performances détaillées
    const { data: rankings, error: rankingsError } = await supabase
      .from("algorithm_rankings_detailed")
      .select("*")
      .order("overall_score", { ascending: false });

    if (rankingsError) throw rankingsError;
    if (!rankings || rankings.length === 0) {
      return new Response(
        JSON.stringify({ error: "No performance data available for training" } as ResponseData),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    console.log("Found algorithm performance records", { count: rankings.length });

    const updates = [];
    const trainingHistory: TrainingHistoryEntry[] = [];

    // Pour chaque algorithme, ajuster le poids
    for (const config of configs as AlgorithmConfig[]) {
      const performances = rankings.filter((r: any) => r.model_used === config.algorithm_name) as AlgorithmPerformance[];

      const validPerformances = performances.filter(validatePerformance);
      if (validPerformances.length !== performances.length) {
        console.warn(`Invalid performances for ${config.algorithm_name}`);
        continue;
      }

      const adjustment = adjustAlgorithmConfig(config, validPerformances);
      if (adjustment) {
        console.log("Algorithm adjustment", { algorithm: config.algorithm_name, oldWeight: config.weight, newWeight: adjustment.newWeight, improvement: adjustment.improvement.toFixed(1) });

        trainingHistory.push({
          algorithm_name: config.algorithm_name,
          previous_weight: config.weight,
          new_weight: adjustment.newWeight,
          previous_parameters: config.parameters,
          new_parameters: adjustment.newParams,
          performance_improvement: adjustment.improvement,
          training_metrics: {
            avg_performance: (validPerformances.reduce((sum, p) => sum + p.avg_accuracy, 0) / validPerformances.length + validPerformances.reduce((sum, p) => sum + p.f1_score, 0) / validPerformances.length * 100) / 2 / 100,
            avg_accuracy: validPerformances.reduce((sum, p) => sum + p.avg_accuracy, 0) / validPerformances.length,
            avg_f1_score: validPerformances.reduce((sum, p) => sum + p.f1_score, 0) / validPerformances.length,
            total_evaluations: validPerformances.length,
          },
        });

        if (Math.abs(adjustment.improvement) > 1) {
          updates.push({
            id: config.id,
            weight: adjustment.newWeight,
            parameters: adjustment.newParams,
          });
        }
      }
    }

    // Enregistrer l'historique d'entraînement
    const significantHistory = trainingHistory.filter(entry => Math.abs(entry.performance_improvement) > 1);
    if (significantHistory.length > 0) {
      const { error: historyError } = await supabase
        .from("algorithm_training_history")
        .insert(significantHistory);

      if (historyError) {
        console.error("Failed to save training history:", historyError);
      }
    }

    // Appliquer les mises à jour
    const updatePromises = updates.map(update =>
      supabase
        .from("algorithm_config")
        .update({ weight: update.weight, parameters: update.parameters })
        .eq("id", update.id)
    );
    const results = await Promise.all(updatePromises);
    const updatedCount = results.filter(result => !result.error).length;

    console.log("Training complete", { updatedCount });

    return new Response(
      JSON.stringify({
        success: true,
        trainedCount: trainingHistory.length,
        updatedCount,
        trainingHistory,
        message: `Entraînement terminé. ${updatedCount} algorithmes mis à jour sur ${trainingHistory.length} analysés.`,
      } as ResponseData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in train-algorithms", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" } as ResponseData),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Valide une entrée de performance
 */
function validatePerformance(perf: AlgorithmPerformance): boolean {
  return typeof perf.avg_accuracy === 'number' && perf.avg_accuracy >= 0 && perf.avg_accuracy <= 1 &&
         typeof perf.f1_score === 'number' && perf.f1_score >= 0 && perf.f1_score <= 1;
}

/**
 * Ajuste la configuration d'un algorithme basé sur ses performances
 * Utilise une approche avancée avec momentum et contraintes de stabilité
 */
function adjustAlgorithmConfig(
  config: AlgorithmConfig,
  performances: AlgorithmPerformance[]
): { newWeight: number; newParams: Record<string, any>; improvement: number } | null {
  if (performances.length === 0) return null;

  // Vérifier qu'on a assez d'évaluations pour un entraînement fiable
  if (performances.length < MIN_EVALUATIONS_REQUIRED) {
    console.log("Insufficient evaluations for training", { algorithm: config.algorithm_name, count: performances.length, required: MIN_EVALUATIONS_REQUIRED });
    return null;
  }

  // Calculer les métriques moyennes avec pondération par récence
  const weights = performances.map((_, idx) => Math.pow(0.95, performances.length - idx - 1));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const avgAccuracy = performances.reduce((sum, p, idx) => sum + p.avg_accuracy * weights[idx], 0) / totalWeight;
  const avgF1 = performances.reduce((sum, p, idx) => sum + p.f1_score * weights[idx], 0) / totalWeight;
  const avgOverall = performances.reduce((sum, p, idx) => sum + p.overall_score * weights[idx], 0) / totalWeight;

  // Score composite pondéré
  const compositeScore = (avgAccuracy * 0.4 + avgF1 * 0.4 + avgOverall * 0.2);

  // Calculer la variance pour détecter l'instabilité
  const accuracyVariance = performances.reduce((sum, p) => {
    const diff = p.avg_accuracy - avgAccuracy;
    return sum + diff * diff;
  }, 0) / performances.length;

  const stabilityPenalty = Math.min(0.2, accuracyVariance * 5);

  // Ajustement du poids avec momentum et contraintes
  const performanceDelta = compositeScore - 0.5;
  const adjustmentFactor = performanceDelta * 0.4 * (1 - stabilityPenalty);
  
  // Limiter les changements drastiques
  const cappedAdjustment = Math.max(-MAX_WEIGHT_CHANGE, Math.min(MAX_WEIGHT_CHANGE, adjustmentFactor));
  
  // Appliquer le momentum (mélange ancien et nouveau poids)
  const targetWeight = config.weight * (1 + cappedAdjustment);
  const newWeight = config.weight * WEIGHT_MOMENTUM + targetWeight * (1 - WEIGHT_MOMENTUM);
  
  // Contraindre le poids dans des limites raisonnables
  const finalWeight = Math.min(2, Math.max(0.05, newWeight));
  const improvement = ((finalWeight - config.weight) / config.weight) * 100;

  const newParams = { ...config.parameters };
  
  // Auto-ajustement intelligent des hyperparamètres
  if (compositeScore > HIGH_PERF_THRESHOLD && accuracyVariance < 0.01) {
    // Performance élevée et stable: augmenter la capacité
    if (newParams.learningRate) {
      newParams.learningRate = Math.min(0.1, newParams.learningRate * LR_INCREASE_FACTOR);
    }
    if (newParams.numEstimators) {
      newParams.numEstimators = Math.min(100, Math.round(newParams.numEstimators * 1.1));
    }
    if (newParams.maxDepth) {
      newParams.maxDepth = Math.min(15, newParams.maxDepth + 1);
    }
  } else if (compositeScore < LOW_PERF_THRESHOLD || accuracyVariance > 0.05) {
    // Performance faible ou instable: simplifier le modèle
    if (newParams.learningRate) {
      newParams.learningRate = Math.max(0.001, newParams.learningRate * LR_DECREASE_FACTOR);
    }
    if (newParams.numEstimators) {
      newParams.numEstimators = Math.max(10, Math.round(newParams.numEstimators * 0.9));
    }
    if (newParams.maxDepth) {
      newParams.maxDepth = Math.max(3, newParams.maxDepth - 1);
    }
  }

  // Ajouter des métriques de régularisation si instable
  if (accuracyVariance > 0.03) {
    if (newParams.regularization === undefined) {
      newParams.regularization = 0.01;
    } else {
      newParams.regularization = Math.min(0.1, newParams.regularization * 1.2);
    }
  }

  return { newWeight: finalWeight, newParams, improvement };
}