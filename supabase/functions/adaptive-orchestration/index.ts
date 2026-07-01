// Adaptive Orchestration - Orchestration adaptative avancée avec analyse de performance
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { adaptiveOrchestrationRequestSchema, validateRequest } from "../_shared/validation.ts";
import { RateLimiter, getClientIdentifier, createRateLimitResponse } from "../_shared/rate-limiter.ts";
import { 
  runOrchestration, 
  validateOrchestrationResult,
  calculateAlgorithmMetrics,
} from "../_shared/orchestration-engine.ts";
import { log } from "../_shared/utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiter: 5 requests per minute
const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 5 });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  // Rate limiting check
  const clientId = getClientIdentifier(req);
  const rateLimitInfo = rateLimiter.getInfo(clientId);
  
  if (!rateLimiter.check(clientId)) {
    log("warn", "Rate limit exceeded", { clientId });
    return createRateLimitResponse(rateLimitInfo.resetIn, corsHeaders);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    
    // Validate input
    const validation = validateRequest(adaptiveOrchestrationRequestSchema, body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { drawName, drawDate, forceAdjustment } = validation.data;
    
    log("info", "Starting adaptive orchestration", { drawName, drawDate, forceAdjustment });

    // 1. Récupérer les performances récentes (5 derniers tirages par algorithme)
    const { data: performances, error: perfError } = await supabase
      .from('algorithm_performance')
      .select('*')
      .eq('draw_name', drawName)
      .order('draw_date', { ascending: false })
      .limit(30); // 5 tirages x 6 algorithmes

    if (perfError) {
      throw new Error(`Performance fetch error: ${perfError.message}`);
    }

    if (!performances || performances.length < 5) {
      log("warn", "Not enough performance data", { count: performances?.length || 0 });
      return new Response(JSON.stringify({ 
        success: false,
        message: "Pas assez de données pour l'orchestration adaptative",
        dataPoints: performances?.length || 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    log("info", "Performance data fetched", { count: performances.length });

    // 2. Organiser les données par algorithme
    const performanceByAlgo = new Map<string, Array<{
      accuracy_score: number;
      matches_count: number;
      draw_date: string;
      confidence_score?: number;
    }>>();

    for (const perf of performances) {
      const algo = perf.model_used;
      if (!performanceByAlgo.has(algo)) {
        performanceByAlgo.set(algo, []);
      }
      performanceByAlgo.get(algo)!.push({
        accuracy_score: perf.accuracy_score,
        matches_count: perf.matches_count,
        draw_date: perf.draw_date,
        confidence_score: perf.confidence_score,
      });
    }

    // 3. Récupérer les configurations actuelles
    const { data: configs, error: configError } = await supabase
      .from('algorithm_config')
      .select('*');

    if (configError) {
      throw new Error(`Config fetch error: ${configError.message}`);
    }

    // Construire les maps de poids et paramètres actuels
    const currentWeights = new Map<string, number>();
    const currentParams = new Map<string, Record<string, number | string>>();
    
    configs?.forEach(config => {
      currentWeights.set(config.algorithm_name, config.weight);
      currentParams.set(config.algorithm_name, config.parameters || {});
    });

    // 4. Exécuter l'orchestration
    let orchestrationResult = runOrchestration(
      performanceByAlgo,
      currentWeights,
      currentParams,
      { forceAdjustment, minDataPoints: 10 }
    );

    // Valider les résultats
    orchestrationResult = validateOrchestrationResult(orchestrationResult);

    log("info", "Orchestration completed", {
      strategy: orchestrationResult.strategy,
      weightAdjustments: orchestrationResult.weightAdjustments.length,
      parameterAdjustments: orchestrationResult.parameterAdjustments.length,
    });

    // 5. Appliquer les ajustements de poids
    let appliedWeightCount = 0;
    for (const adj of orchestrationResult.weightAdjustments) {
      const config = configs?.find(c => c.algorithm_name === adj.algorithm);
      if (!config) continue;

      const { error: updateError } = await supabase
        .from('algorithm_config')
        .update({ 
          weight: adj.newWeight,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      if (!updateError) {
        appliedWeightCount++;
        log("info", `Weight updated: ${adj.algorithm}`, {
          previous: adj.previousWeight,
          new: adj.newWeight,
        });
      } else {
        log("error", `Weight update failed: ${adj.algorithm}`, { error: updateError.message });
      }
    }

    // 6. Appliquer les ajustements de paramètres
    let appliedParamCount = 0;
    for (const adj of orchestrationResult.parameterAdjustments) {
      const config = configs?.find(c => c.algorithm_name === adj.algorithm);
      if (!config) continue;

      const newParams = {
        ...(config.parameters || {}),
        [adj.parameter]: adj.newValue,
      };

      const { error: updateError } = await supabase
        .from('algorithm_config')
        .update({ 
          parameters: newParams,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      if (!updateError) {
        appliedParamCount++;
        log("info", `Parameter updated: ${adj.algorithm}.${adj.parameter}`, {
          previous: adj.previousValue,
          new: adj.newValue,
        });
      }
    }

    // 7. Enregistrer l'historique (Mettre à jour l'entrée pending_analysis ou en créer une nouvelle)
    const historyData = {
      draw_name: drawName,
      draw_date: drawDate || new Date().toISOString().split('T')[0],
      trigger_metrics: {
        total_algorithms: orchestrationResult.metrics.length,
        total_data_points: performances.length,
        weight_adjustments: orchestrationResult.weightAdjustments.length,
        param_adjustments: orchestrationResult.parameterAdjustments.length,
        applied_weights: appliedWeightCount,
        applied_params: appliedParamCount,
      },
      algorithms_analyzed: orchestrationResult.metrics.map(m => ({
        name: m.name,
        avgAccuracy: m.avgAccuracy,
        recentAccuracy: m.recentAccuracy,
        trend: m.trend,
        consistency: m.consistency,
        momentum: m.momentum,
        dataPoints: m.dataPoints,
      })),
      weight_adjustments: Object.fromEntries(
        orchestrationResult.weightAdjustments.map(a => [
          a.algorithm,
          { previous: a.previousWeight, new: a.newWeight, confidence: a.confidence }
        ])
      ),
      parameter_adjustments: Object.fromEntries(
        orchestrationResult.parameterAdjustments.map(a => [
          `${a.algorithm}.${a.parameter}`,
          { previous: a.previousValue, new: a.newValue }
        ])
      ),
      expected_improvement: orchestrationResult.expectedImprovement,
      adjustment_strategy: orchestrationResult.strategy,
      notes: orchestrationResult.notes.join(' | '),
    };

    // Chercher une entrée en attente
    const { data: pendingEntries } = await supabase
      .from('orchestration_history')
      .select('id')
      .eq('draw_name', drawName)
      .eq('adjustment_strategy', 'pending_analysis')
      .order('created_at', { ascending: false })
      .limit(1);

    let historyError;
    if (pendingEntries && pendingEntries.length > 0) {
      // Mettre à jour l'entrée existante
      const { error } = await supabase
        .from('orchestration_history')
        .update(historyData)
        .eq('id', pendingEntries[0].id);
      historyError = error;
    } else {
      // Insérer une nouvelle entrée
      const { error } = await supabase
        .from('orchestration_history')
        .insert(historyData);
      historyError = error;
    }

    if (historyError) {
      log("warn", "Could not save orchestration history", { error: historyError.message });
    }

    // 8. Rafraîchir les vues matérialisées
    try {
      await supabase.rpc('refresh_algorithm_rankings');
      log("info", "Algorithm rankings refreshed");
    } catch (refreshError) {
      log("warn", "Could not refresh rankings", { error: refreshError });
    }

    const executionTime = Date.now() - startTime;

    return new Response(JSON.stringify({
      success: true,
      strategy: orchestrationResult.strategy,
      metrics: orchestrationResult.metrics,
      weightAdjustments: orchestrationResult.weightAdjustments,
      parameterAdjustments: orchestrationResult.parameterAdjustments,
      applied: {
        weights: appliedWeightCount,
        parameters: appliedParamCount,
      },
      expectedImprovement: orchestrationResult.expectedImprovement,
      notes: orchestrationResult.notes,
      executionTime,
      message: `Orchestration ${orchestrationResult.strategy}: ${appliedWeightCount} poids et ${appliedParamCount} paramètres ajustés`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log("error", "Orchestration error", { error: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
