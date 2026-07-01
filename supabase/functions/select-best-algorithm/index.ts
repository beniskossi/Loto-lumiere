import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { bestAlgorithmRequestSchema, validateRequest } from "../_shared/validation.ts";
import { RateLimiter, getClientIdentifier, createRateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiter: 5 requêtes par minute par client (protection contre les abus)
const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 5 });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérifier le rate limit
    const clientId = getClientIdentifier(req);
    const rateInfo = rateLimiter.getInfo(clientId);
    
    if (!rateInfo.allowed) {
      console.log("Rate limit exceeded for client:", clientId);
      return createRateLimitResponse(rateInfo.resetIn, corsHeaders);
    }

    const body = await req.json();
    
    // Validate input with strict schema
    const validation = validateRequest(bestAlgorithmRequestSchema, body);
    if (!validation.success) {
      console.error("Validation failed:", validation.error);
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { drawName, minPredictions } = validation.data;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log("Selecting best algorithm for draw");

    // 1. Récupérer les performances pour ce tirage
    const { data: performances, error: perfError } = await supabase
      .from('algorithm_rankings')
      .select('*')
      .eq('draw_name', drawName)
      .order('avg_accuracy', { ascending: false });

    if (perfError) throw perfError;

    // Si pas de données spécifiques, utiliser les performances globales
    let bestAlgorithms = performances;
    let usingGlobal = false;

    if (!performances || performances.length === 0) {
      console.log("No specific data found, using global rankings");
      const { data: globalPerf } = await supabase
        .from('algorithm_rankings')
        .select('*')
        .is('draw_name', null)
        .order('avg_accuracy', { ascending: false });
      
      bestAlgorithms = globalPerf || [];
      usingGlobal = true;
    }

    if (bestAlgorithms.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "Aucune donnée de performance disponible",
        recommendation: null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Récupérer les configurations et poids
    const { data: configs } = await supabase
      .from('algorithm_config')
      .select('*')
      .eq('is_enabled', true);

    const configMap = new Map(
      configs?.map(c => [c.algorithm_name, c]) || []
    );

    // 3. Calculer un score pondéré pour chaque algorithme
    const scoredAlgorithms = bestAlgorithms.map(perf => {
      const config = Array.from(configMap.values()).find(c => 
        perf.model_used?.includes(c.algorithm_name) ||
        c.algorithm_name === perf.model_used?.toLowerCase()
      );

      const weight = config?.weight || 1.0;
      const avgAccuracy = perf.avg_accuracy || 0;
      const totalPredictions = perf.total_predictions || 0;
      const bestMatch = perf.best_match || 0;
      const excellentPredictions = perf.excellent_predictions || 0;

      // Score composite
      const accuracyScore = avgAccuracy / 100;
      const matchScore = bestMatch / 5;
      const excellenceRate = totalPredictions > 0 ? excellentPredictions / totalPredictions : 0;
      const confidenceFactor = Math.min(1, totalPredictions / 30);

      const compositeScore = (
        accuracyScore * 0.35 +
        matchScore * 0.30 +
        excellenceRate * 0.20 +
        confidenceFactor * 0.15
      ) * weight;

      return {
        algorithm: perf.model_used,
        score: compositeScore,
        weight: weight,
        metrics: {
          avgAccuracy,
          totalPredictions,
          bestMatch,
          excellentPredictions,
        },
        config: config ? {
          parameters: config.parameters,
          enabled: config.is_enabled,
        } : null,
      };
    });

    // 4. Trier par score et sélectionner le top 3
    scoredAlgorithms.sort((a, b) => b.score - a.score);
    const top3 = scoredAlgorithms.slice(0, 3);
    const best = top3[0];

    console.log("Best algorithm selected", { algorithm: best.algorithm, score: best.score.toFixed(3) });

    // 5. Préparer la réponse
    return new Response(JSON.stringify({
      success: true,
      drawName,
      recommendation: {
        primary: best,
        alternatives: top3.slice(1),
      },
      usingGlobalData: usingGlobal,
      totalAlgorithmsAnalyzed: scoredAlgorithms.length,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in select-best-algorithm', { error: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
