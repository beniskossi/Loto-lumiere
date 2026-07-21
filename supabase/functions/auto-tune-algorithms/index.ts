import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { autoTuneRequestSchema, validateRequest } from "../_shared/validation.ts";

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

interface AlgorithmPerformance {
  model_used: string;
  avg_accuracy: number;
  total_predictions: number;
  best_match: number;
  excellent_predictions: number;
}

interface HyperparameterConfig {
  embeddingDim?: number;
  temperature?: number;
  decayRate?: number;
  minDataPoints?: number;
  numTrees?: number;
  learningRate?: number;
  window_size?: number;
  cadence_depth?: number;
}

// Les algorithmes valides uniquement
const VALID_ALGORITHMS = [
  "FrequencyPro",
  "Arbres Heuristiques", 
  "Séquences Récurrentes",
  "Attention Spatiale",
  "Double Gap Sequence",
  "Gap Cadence",
  "Ensemble Hybride Stacking"
];

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier l'authentification admin (strictement obligatoire)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé : Token d'authentification manquant." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé : Session invalide ou expirée." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier le rôle administrateur de l'utilisateur
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    const isAdmin = !!roleData && roleData.role === 'admin';
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Accès refusé : Privilèges administrateur requis." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    
    // Validate input
    const validation = validateRequest(autoTuneRequestSchema, body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: "Format de requête invalide", details: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { drawName } = validation.data;

    console.log("Starting auto-tuning for algorithms");

    // 1. Récupérer les performances de tous les algorithmes
    const { data: performances, error: perfError } = await supabase
      .from('algorithm_rankings')
      .select('*')
      .order('avg_accuracy', { ascending: false });

    if (perfError) throw perfError;

    if (!performances || performances.length === 0) {
      return new Response(JSON.stringify({ 
        success: false,
        message: "Aucune donnée de performance disponible pour l'auto-tuning"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("Analysing algorithm performances", { count: performances.length });

    const tuningResults = [];

    // 2. Pour chaque algorithme valide, calculer les nouveaux hyperparamètres
    for (const perf of performances) {
      const algoName = perf.model_used;
      
      // Ignorer les algorithmes non valides
      if (!VALID_ALGORITHMS.includes(algoName)) {
        console.log(`Skipping invalid algorithm: ${algoName}`);
        continue;
      }
      
      // Récupérer la config actuelle
      const { data: currentConfig } = await supabase
        .from('algorithm_config')
        .select('*')
        .eq('algorithm_name', algoName)
        .single();

      const currentParams = currentConfig?.parameters || {};
      const currentWeight = currentConfig?.weight || 1.0;

      // Calculer les nouveaux paramètres basés sur la performance
      const newParams = calculateOptimalParameters(
        algoName,
        perf as AlgorithmPerformance,
        currentParams
      );

      // Calculer le nouveau poids basé sur la performance
      const newWeight = calculateOptimalWeight(perf as AlgorithmPerformance);

      // Calculer l'amélioration
      const improvement = perf.avg_accuracy ? 
        ((newWeight - currentWeight) / Math.max(currentWeight, 0.01)) * 100 : 0;

      // Mettre à jour ou créer la configuration
      /* disabled configError update */
      const configError = null;

      if (configError) {
        console.error(`Error updating config for ${algoName}:`, configError);
        continue;
      }

      // Enregistrer l'historique de training (en mode simulation sécurisée)
      const { error: historyError } = await supabase
        .from('algorithm_training_history')
        .insert({
          algorithm_name: algoName,
          previous_parameters: currentParams,
          new_parameters: newParams,
          previous_weight: currentWeight,
          new_weight: newWeight,
          performance_improvement: improvement,
          training_metrics: {
            avg_accuracy: perf.avg_accuracy,
            total_predictions: perf.total_predictions,
            best_match: perf.best_match,
            excellent_predictions: perf.excellent_predictions,
            simulation_mode: true
          },
        });

      if (historyError) {
        console.error(`Error saving history for ${algoName}:`, historyError);
      }

      tuningResults.push({
        algorithm: algoName,
        previousWeight: currentWeight,
        newWeight: newWeight,
        improvement: improvement,
        parametersChanged: Object.keys(newParams).length,
        parametersProposed: newParams,
        performance: {
          avgAccuracy: perf.avg_accuracy,
          totalPredictions: perf.total_predictions,
          bestMatch: perf.best_match,
        }
      });

      console.log(`[auto-tune] Simulated tuning logged for ${algoName}: oldWeight=${currentWeight}, proposedWeight=${newWeight}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Simulation d'auto-tuning terminée avec succès pour ${tuningResults.length} algorithmes. Les configurations ont été loggées à des fins d'analyse (RGPD & Intégrité respectées).`,
      results: tuningResults,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in auto-tune-algorithms:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateOptimalParameters(
  algorithmName: string,
  performance: AlgorithmPerformance,
  currentParams: HyperparameterConfig
): HyperparameterConfig {
  const avgAccuracy = performance.avg_accuracy || 0;
  const bestMatch = performance.best_match || 0;

  // Score de performance global (0-1)
  const performanceScore = (avgAccuracy / 100 + bestMatch / 5) / 2;

  const newParams: HyperparameterConfig = { ...currentParams };

  switch (algorithmName) {
    case 'Attention Spatiale':
      newParams.embeddingDim = Math.max(4, Math.min(16, 
        Math.floor(8 + performanceScore * 8)
      ));
      newParams.temperature = Math.max(0.5, Math.min(1.5, 
        0.8 + (performanceScore - 0.5) * 0.4
      ));
      newParams.decayRate = Math.max(0.02, Math.min(0.06, 0.04 * (1 - performanceScore * 0.3)));
      break;

    case 'Séquences Récurrentes':
      newParams.embeddingDim = Math.max(4, Math.min(12, 
        Math.floor(6 + performanceScore * 6)
      ));
      newParams.decayRate = Math.max(0.02, Math.min(0.05, 0.035 * (1 - performanceScore * 0.3)));
      break;

    case 'Arbres Heuristiques':
      newParams.numTrees = Math.max(5, Math.min(30, 
        Math.floor(10 + performanceScore * 20)
      ));
      newParams.minDataPoints = Math.max(5, Math.min(15, 
        Math.floor(10 - performanceScore * 5)
      ));
      break;

    case 'FrequencyPro':
      newParams.decayRate = Math.max(0.02, Math.min(0.08, 
        0.05 * (1 - performanceScore * 0.4)
      ));
      newParams.minDataPoints = Math.max(5, Math.min(20, 
        Math.floor(10 - performanceScore * 5)
      ));
      break;

    case 'Double Gap Sequence':
      newParams.window_size = Math.max(5, Math.min(30, 
        Math.floor(10 + performanceScore * 20)
      ));
      break;

    case 'Gap Cadence':
      newParams.cadence_depth = Math.max(2, Math.min(15, 
        Math.floor(5 + performanceScore * 10)
      ));
      break;

    case 'Ensemble Hybride Stacking':
      newParams.temperature = Math.max(0.6, Math.min(1.2, 
        0.9 + (performanceScore - 0.5) * 0.3
      ));
      break;
  }

  return newParams;
}

function calculateOptimalWeight(performance: AlgorithmPerformance): number {
  const avgAccuracy = performance.avg_accuracy || 0;
  const totalPredictions = performance.total_predictions || 0;
  const bestMatch = performance.best_match || 0;
  const excellentPredictions = performance.excellent_predictions || 0;

  // Facteur de confiance basé sur le nombre de prédictions
  const confidenceFactor = Math.min(1, totalPredictions / 50);

  // Score basé sur la précision (0-1)
  const accuracyScore = avgAccuracy / 100;

  // Score basé sur les meilleurs matchs (0-1)
  const matchScore = bestMatch / 5;

  // Score basé sur les prédictions excellentes
  const excellenceScore = totalPredictions > 0 
    ? excellentPredictions / totalPredictions 
    : 0;

  // Poids combiné (0.1 à 2.0)
  const baseWeight = (
    accuracyScore * 0.4 +
    matchScore * 0.3 +
    excellenceScore * 0.3
  );

  // Appliquer le facteur de confiance
  const finalWeight = Math.max(0.1, Math.min(2.0, 
    0.5 + baseWeight * 1.5 * confidenceFactor
  ));

  return Math.round(finalWeight * 100) / 100;
}
