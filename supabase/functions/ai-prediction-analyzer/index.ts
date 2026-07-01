// AI Prediction Analyzer - Analyse avancée par IA avec tool calling structuré
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { predictionRequestSchema, validateRequest } from "../_shared/validation.ts";
import { RateLimiter, getClientIdentifier, createRateLimitResponse } from "../_shared/rate-limiter.ts";
import { callAIForAnalysis, performQuickAnalysis, enrichAnalysis } from "../_shared/ai-analysis.ts";
import type { DrawResult, PredictionResult } from "../_shared/types.ts";
import { log } from "../_shared/utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiter: 5 requêtes par minute
const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 5 });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Create Supabase client for auth verification
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    );

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('[ai-prediction-analyzer] Unauthorized access attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier le rate limit
    const clientId = getClientIdentifier(req);
    const rateInfo = rateLimiter.getInfo(clientId);
    
    if (!rateInfo.allowed) {
      log("warn", "Rate limit exceeded for AI analyzer", { clientId });
      return createRateLimitResponse(rateInfo.resetIn, corsHeaders);
    }

    const body = await req.json();
    
    // Validation du drawName uniquement (le schéma strict rejette les clés inconnues)
    const validation = validateRequest(predictionRequestSchema, { drawName: body?.drawName });
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { drawName } = validation.data;
    const { predictions, useQuickAnalysis = false } = body;

    if (!predictions || !Array.isArray(predictions) || predictions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Prédictions invalides - tableau vide ou manquant" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log("info", "AI Analyzer started", { drawName, predictionsCount: predictions.length, userId: user.id });

    // Use service role client for database operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: historicalData, error: histError } = await serviceClient
      .from('draw_results')
      .select('draw_name, draw_date, winning_numbers')
      .eq('draw_name', drawName)
      .order('draw_date', { ascending: false })
      .limit(50);

    if (histError) {
      log("warn", "Could not fetch historical data", { error: histError.message });
    }

    const history = (historicalData as DrawResult[]) || [];

    let analysisResult;

    // Mode analyse rapide (sans appel IA)
    if (useQuickAnalysis || !Deno.env.get('LOVABLE_API_KEY')) {
      log("info", "Using quick analysis mode");
      analysisResult = performQuickAnalysis(predictions as PredictionResult[], history);
      analysisResult = enrichAnalysis(analysisResult, history);
    } else {
      // Analyse IA complète avec tool calling
      try {
        analysisResult = await callAIForAnalysis({
          drawName,
          predictions: predictions as PredictionResult[],
          historicalData: history,
          includePatterns: true,
        });
        analysisResult = enrichAnalysis(analysisResult, history);
      } catch (aiError) {
        const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error';
        
        if (errorMessage === 'RATE_LIMIT_EXCEEDED') {
          return new Response(
            JSON.stringify({ error: "Limite de requêtes IA atteinte. Réessayez dans quelques instants." }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (errorMessage === 'CREDITS_EXHAUSTED') {
          return new Response(
            JSON.stringify({ error: "Crédits AI épuisés. Veuillez recharger votre compte." }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Fallback vers analyse rapide
        log("warn", "AI analysis failed, falling back to quick analysis", { error: errorMessage });
        analysisResult = performQuickAnalysis(predictions as PredictionResult[], history);
        analysisResult = enrichAnalysis(analysisResult, history);
        analysisResult.reasoning.unshift("Analyse de secours (API IA indisponible)");
      }
    }

    const executionTime = Date.now() - startTime;
    
    log("info", "AI Analysis completed", { 
      drawName,
      userId: user.id,
      confidence: analysisResult.confidence,
      patternsFound: analysisResult.patterns.length,
      executionTime,
    });

    return new Response(
      JSON.stringify({
        recommendedNumbers: analysisResult.recommendedNumbers,
        analysis: analysisResult.analysis,
        confidenceScore: analysisResult.confidence,
        patterns: analysisResult.patterns,
        reasoning: analysisResult.reasoning,
        timestamp: analysisResult.timestamp,
        executionTime,
        mode: useQuickAnalysis ? 'quick' : 'ai',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    log("error", "AI Analyzer error", { error: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
