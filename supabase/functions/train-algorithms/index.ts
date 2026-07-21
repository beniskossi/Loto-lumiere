import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://ais-dev-pi4cbnvbnhvhgdeu26bzu4-755915034440.europe-west2.run.app",
  "https://ais-pre-pi4cbnvbnhvhgdeu26bzu4-755915034440.europe-west2.run.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : "https://ais-pre-pi4cbnvbnhvhgdeu26bzu4-755915034440.europe-west2.run.app";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
  };
}

interface AlgorithmConfig {
  id: string;
  algorithm_name: string;
  weight: number;
  parameters: Record<string, unknown>;
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
  previous_parameters: Record<string, unknown>;
  new_parameters: Record<string, unknown>;
  performance_improvement: number;
  training_metrics: {
    avg_performance: number;
    avg_accuracy: number;
    avg_f1_score: number;
    total_evaluations: number;
    simulation_mode?: boolean;
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

// Dérivation dynamique des hyperparamètres d'entraînement
function deriveTrainingParams(performances: AlgorithmPerformance[]) {
  if (performances.length === 0) {
    return {
      highPerfThreshold: 0.7,
      lowPerfThreshold: 0.4,
      lrIncreaseFactor: 1.15,
      lrDecreaseFactor: 0.85,
      weightMomentum: 0.3,
      maxWeightChange: 0.3,
      minEvaluationsRequired: 5
    };
  }

  // Trier les scores globaux pour trouver les quartiles
  const scores = performances.map(p => p.overall_score).sort((a, b) => a - b);
  const q1 = scores[Math.floor(scores.length * 0.25)] || 0.4;
  const q3 = scores[scores.length - 1] || 0.7; // fallback clean

  // Calcul de la variance pour ajuster dynamiquement l'inertie
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  
  // Plus la variance est grande, plus on augmente le momentum (inertie) pour éviter les sur-réactions
  const weightMomentum = Math.max(0.1, Math.min(0.8, variance * 10));

  return {
    highPerfThreshold: q3,
    lowPerfThreshold: q1,
    lrIncreaseFactor: 1.1 + (q3 * 0.1),
    lrDecreaseFactor: 0.9 - (q1 * 0.1),
    weightMomentum,
    maxWeightChange: Math.max(0.1, Math.min(0.5, (q3 - q1))),
    minEvaluationsRequired: 5
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
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
        JSON.stringify({ error: "Non autorisé : Token d'authentification manquant." } as ResponseData),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé : Session invalide ou expirée." } as ResponseData),
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

    const isAdmin = !!roleData && roleData.role === 'admin';
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Accès refusé : Rôle administrateur requis." } as ResponseData),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Analyse du mode simulation vs production commit
    let commit = false;
    try {
      const body = await req.json();
      commit = !!body?.commit;
    } catch {
      // Pas de body JSON, simulation par défaut pour préserver l'intégrité
    }

    console.log(`Starting algorithm training (commit=${commit})...`);

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
    const allValidPerformances = (rankings as AlgorithmPerformance[]).filter(validatePerformance);
    const trainingParams = deriveTrainingParams(allValidPerformances);

    // Pour chaque algorithme, ajuster le poids
    for (const config of configs as AlgorithmConfig[]) {
      const performances = rankings.filter((r: Record<string, unknown>) => r.model_used === config.algorithm_name) as AlgorithmPerformance[];

      const validPerformances = performances.filter(validatePerformance);
      if (validPerformances.length !== performances.length) {
        console.warn(`Invalid performances for ${config.algorithm_name}`);
        continue;
      }

      const adjustment = adjustAlgorithmConfig(config, validPerformances, trainingParams);
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
            simulation_mode: !commit,
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

    // Enregistrer l'historique d'entraînement (utile même en simulation pour auditer les progrès d'ajustements)
    const significantHistory = trainingHistory.filter(entry => Math.abs(entry.performance_improvement) > 1);
    if (significantHistory.length > 0) {
      const { error: historyError } = await supabase
        .from("algorithm_training_history")
        .insert(significantHistory);

      if (historyError) {
        console.error("Failed to save training history:", historyError);
      }
    }

    // N'appliquer les mises à jour en base que si commit=true est explicite
    let updatedCount = 0;
    if (commit && updates.length > 0) {
      const updatePromises = updates.map(update =>
        supabase
          .from("algorithm_config")
          .update({ weight: update.weight, parameters: update.parameters })
          .eq("id", update.id)
      );
      const results = await Promise.all(updatePromises);
      updatedCount = results.filter(result => !result.error).length;
      console.log("Training complete (committed to live config)", { updatedCount });
    } else {
      console.log("Training complete (simulation mode, live config left untouched)", { proposedUpdates: updates.length });
    }

    return new Response(
      JSON.stringify({
        success: true,
        trainedCount: trainingHistory.length,
        updatedCount,
        trainingHistory,
        message: commit 
          ? `Entraînement terminé. ${updatedCount} algorithmes mis à jour avec succès en production.`
          : `Simulation d'entraînement réussie. ${updates.length} ajustements d'algorithmes ont été calculés et loggés pour analyse (aucune modification en production).`,
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
  performances: AlgorithmPerformance[],
  params: ReturnType<typeof deriveTrainingParams>
): { newWeight: number; newParams: Record<string, unknown>; improvement: number } | null {
  if (performances.length === 0) return null;

  // Vérifier qu'on a assez d'évaluations pour un entraînement fiable
  if (performances.length < params.minEvaluationsRequired) {
    console.log("Insufficient evaluations for training", { algorithm: config.algorithm_name, count: performances.length, required: params.minEvaluationsRequired });
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
  const cappedAdjustment = Math.max(-params.maxWeightChange, Math.min(params.maxWeightChange, adjustmentFactor));
  
  // Appliquer le momentum (mélange ancien et nouveau poids)
  const targetWeight = config.weight * (1 + cappedAdjustment);
  const newWeight = config.weight * params.weightMomentum + targetWeight * (1 - params.weightMomentum);
  
  // Contraindre le poids dans des limites raisonnables
  const finalWeight = Math.min(2, Math.max(0.05, newWeight));
  const improvement = ((finalWeight - config.weight) / config.weight) * 100;

  const newParams = { ...config.parameters } as Record<string, number | undefined>;
  
  // Auto-ajustement intelligent des hyperparamètres avec des fonctions sigmoïdes continues
  // sigmoid mapping: transforms compositeScore to [-1, 1] smooth curve
  const capacityAdjustment = (2 / (1 + Math.exp(-15 * (compositeScore - 0.5)))) - 1; 
  // variance penalty: high variance approaches 1
  const variancePenalty = 1 - (1 / (1 + Math.exp(-40 * (0.02 - accuracyVariance)))); 
  
  // netAdjustment > 0 means increase capacity, < 0 means decrease capacity
  const netAdjustment = capacityAdjustment - variancePenalty;

  if (typeof newParams.learningRate === 'number') {
    const lrMultiplier = Math.exp(netAdjustment * Math.log(params.lrIncreaseFactor));
    newParams.learningRate = Math.max(0.001, Math.min(0.1, newParams.learningRate * lrMultiplier));
  }
  
  if (typeof newParams.numEstimators === 'number') {
    const estimatorsMultiplier = Math.exp(netAdjustment * Math.log(1.1)); // ~10% variation
    newParams.numEstimators = Math.max(10, Math.min(150, Math.round(newParams.numEstimators * estimatorsMultiplier)));
  }
  
  if (typeof newParams.maxDepth === 'number') {
    const depthChange = netAdjustment * 2; // up to +/- 2 depth per training
    newParams.maxDepth = Math.max(3, Math.min(20, Math.round(newParams.maxDepth + depthChange)));
  }

  // Ajustement continu de la régularisation en fonction de l'instabilité (variance)
  // Mapping sigmoid de la variance sur un ajustement [-1, 1] de régularisation
  const regAdjustment = (2 / (1 + Math.exp(-50 * (accuracyVariance - 0.02)))) - 1; 
  
  if (typeof newParams.regularization !== 'number') {
      // Régularisation de base si absente, proportionnelle au besoin
      newParams.regularization = 0.01 * (1 + Math.max(0, regAdjustment));
  } else {
      // Ajustement continu et proportionnel multiplicatif (1.2 ^ regAdjustment)
      // Si regAdjustment > 0 (instable), multiplier jusqu'à x1.2
      // Si regAdjustment < 0 (stable), diviser (jusqu'à x0.83)
      const regMultiplier = Math.exp(regAdjustment * Math.log(1.2));
      newParams.regularization = Math.max(0.001, Math.min(0.2, newParams.regularization * regMultiplier));
  }

  return { newWeight: finalWeight, newParams: newParams as Record<string, unknown>, improvement };
}