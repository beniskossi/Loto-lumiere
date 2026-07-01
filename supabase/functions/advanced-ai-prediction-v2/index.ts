import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { DrawResult } from "../_shared/types.ts";
import { dataCache, predictionCache } from "../_shared/cache.ts";
import { log } from "../_shared/utils.ts";
import { predictionRequestSchema, validateRequest } from "../_shared/validation.ts";
import { generatePredictions, generateExplanations } from "../_shared/prediction-engine.ts";
import { RateLimiter, getClientIdentifier, createRateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DATA_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const PREDICTION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiter: 10 requêtes par minute par client
const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 10 });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Vérifier le rate limit
  const clientId = getClientIdentifier(req);
  const rateInfo = rateLimiter.getInfo(clientId);
  
  if (!rateInfo.allowed) {
    log("warn", "Rate limit exceeded", { clientId });
    return createRateLimitResponse(rateInfo.resetIn, corsHeaders);
  }

  const startTime = Date.now();

  try {
    const body = await req.json();

    // Validate input
    const validation = validateRequest(predictionRequestSchema, body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { drawName, useSmartEnsemble, analysisDepth } = validation.data;

    log("info", `Generating advanced predictions for ${drawName}`, { drawName, useSmartEnsemble, analysisDepth });

    // Vérifier d'abord les prédictions pré-calculées
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: precalculated, error: precalcError } = await supabase
      .from('precalculated_predictions')
      .select('*')
      .eq('draw_name', drawName)
      .gt('expires_at', new Date().toISOString())
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!precalcError && precalculated) {
      log("info", `Using precalculated predictions for ${drawName}`, { 
        drawName, 
        calculatedAt: precalculated.calculated_at,
        elapsed: Date.now() - startTime 
      });
      
      return new Response(JSON.stringify({
        predictions: precalculated.predictions,
        optimizedPrediction: precalculated.optimized_prediction,
        explanations: precalculated.explanations,
        warning: precalculated.warning,
        selectedAlgorithm: precalculated.selected_algorithm,
        algorithmReason: precalculated.algorithm_reason,
        dataMetrics: {
          quality: precalculated.data_quality,
          freshness: precalculated.freshness,
          historicalCount: precalculated.historical_count,
        },
        isPrecalculated: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    log("info", `No valid precalculated predictions found for ${drawName}, generating fresh ones`);

    // Vérifier le cache mémoire ensuite (inclure useSmartEnsemble et analysisDepth dans la clé)
    const cacheKey = `predictions_${drawName}_${useSmartEnsemble ? 'smart' : 'stacking'}_${analysisDepth}_v3`;
    const cached = predictionCache.get(cacheKey);
    if (cached) {
      log("info", `Cache hit for predictions for ${drawName}`, { drawName, elapsed: Date.now() - startTime });
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Récupérer les données historiques avec la profondeur d'analyse spécifiée
    const results = await fetchHistoricalData(drawName, supabase, analysisDepth);
    
    if (!results || results.length === 0) {
      log("warn", `No data available for ${drawName}`, { drawName });
      return new Response(JSON.stringify({
        predictions: [],
        warning: "Aucune donnée historique disponible pour ce tirage"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    log("info", `Data fetched for ${drawName}`, { drawName, count: results.length });

    // Utiliser le moteur de prédiction intelligent
    const predictionResult = await generatePredictions(results, {
      drawName,
      multiAlgorithm: true, // Génère plusieurs algorithmes pour comparaison
      useSmartEnsemble: useSmartEnsemble || false,
    });

    // Générer les explications
    const explanations = generateExplanations(predictionResult, results);

    // Construire la réponse enrichie
    const response = {
      predictions: predictionResult.predictions,
      optimizedPrediction: predictionResult.optimizedPrediction,
      selectedAlgorithm: predictionResult.selectedAlgorithm,
      algorithmReason: predictionResult.algorithmReason,
      explanations: {
        summary: explanations.summary,
        strengths: explanations.strengths,
        weaknesses: explanations.weaknesses,
        recommendation: explanations.recommendation,
      },
      algorithmInfo: explanations.algorithmInfo,
      dataMetrics: predictionResult.dataMetrics,
      executionTime: predictionResult.executionTime,
      warning: generateWarning(predictionResult.dataMetrics),
    };

    // Mettre en cache
    predictionCache.set(cacheKey, response, PREDICTION_CACHE_TTL);

    log("info", `Predictions generated for ${drawName}`, { 
      drawName, 
      count: response.predictions.length,
      algorithm: response.selectedAlgorithm,
      elapsed: predictionResult.executionTime
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    log("error", "Prediction error", { error: error instanceof Error ? error.message : error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Génère un avertissement si nécessaire
 */
function generateWarning(metrics: { quality: number; freshness: number; historicalCount: number }): string | undefined {
  if (metrics.historicalCount < 20) {
    return `Données limitées (${metrics.historicalCount} tirages) - Prédictions avec confiance réduite`;
  } else if (metrics.quality < 0.5) {
    return `Qualité des données faible (${(metrics.quality * 100).toFixed(0)}%) - Résultats moins fiables`;
  } else if (metrics.freshness < 0.5) {
    return `Données anciennes - Prédictions moins précises`;
  }
  return undefined;
}

/**
 * Récupère les données historiques depuis Supabase avec cache
 * @param drawName - Nom du tirage
 * @param supabase - Client Supabase
 * @param analysisDepth - Nombre de tirages à analyser (10-1000, défaut 100)
 */
async function fetchHistoricalData(
  drawName: string, 
  supabase: any, 
  analysisDepth: number = 100
): Promise<DrawResult[]> {
  const cacheKey = `data_${drawName}_${analysisDepth}_v2`;
  const cached = dataCache.get(cacheKey);
  if (cached) {
    log("info", `Cache hit for data for ${drawName}`, { drawName, analysisDepth });
    return cached;
  }

  // Utiliser analysisDepth comme limite (min 10, max 500 pour économiser la mémoire)
  const effectiveLimit = Math.min(Math.max(analysisDepth, 10), 500);
  
  const { data: results, error } = await supabase
    .from('draw_results')
    .select('draw_name, draw_date, winning_numbers')
    .eq('draw_name', drawName)
    .order('draw_date', { ascending: false })
    .limit(effectiveLimit);

  if (error) {
    log("error", `Database error for ${drawName}`, { drawName, error: error.message });
    throw error;
  }

  const drawResults = (results || []) as DrawResult[];
  
  log("info", `Fetched ${drawResults.length} draws for ${drawName}`, { 
    drawName, 
    requested: analysisDepth, 
    effective: effectiveLimit,
    returned: drawResults.length 
  });
  
  // Mettre en cache
  dataCache.set(cacheKey, drawResults, DATA_CACHE_TTL);

  return drawResults;
}