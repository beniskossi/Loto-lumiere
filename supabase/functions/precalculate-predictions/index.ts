import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import type { DrawResult } from "../_shared/types.ts";
import { log } from "../_shared/utils.ts";
import { generatePredictions, generateExplanations } from "../_shared/prediction-engine.ts";
import { recordPredictionsToLedger } from "../_shared/ledger.ts";
import { RateLimiter, getClientIdentifier, createRateLimitResponse } from "../_shared/rate-limiter.ts";
import { initializeConfig } from "../_shared/enhanced-prediction.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiter: 1 request per minute (very restrictive for expensive operation)
const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 1 });

// Draw names will be fetched dynamically from the database

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Security: Verify authorization
  const authHeader = req.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const cronSecret = Deno.env.get('CRON_SECRET');
  
  // Allow if valid cron secret, service role key, or authenticated admin
  const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isServiceRole = authHeader?.includes(supabaseServiceKey);
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const isAnonCall = authHeader === `Bearer ${anonKey}`;
  
  // Check for authenticated admin user
  let isAdmin = false;
  if (!isCronCall && !isServiceRole && authHeader) {
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAuth.auth.getUser(token);
    if (user) {
      const { data: roleData } = await supabaseAuth
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      isAdmin = !!roleData;
    }
  }
  
  if (!isCronCall && !isServiceRole && !isAdmin && !isAnonCall) {
    log("warn", "Unauthorized access attempt to precalculate-predictions");
    return new Response(JSON.stringify({ 
      error: 'Unauthorized. Requires cron secret, service role key, or admin role.' 
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Rate limiting check (still useful as additional protection)
  const clientId = getClientIdentifier(req);
  const rateInfo = rateLimiter.getInfo(clientId);
  if (!rateLimiter.check(clientId)) {
    log("warn", `Rate limit exceeded for ${clientId}`);
    return createRateLimitResponse(rateInfo.resetIn, corsHeaders);
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    log("info", "Starting precalculation of predictions for all draws");

    // Initialize configuration from database
    await initializeConfig();
    log("info", "Prediction configuration loaded from database");

    // Fetch actual draw names from database
    const { data: drawNamesData, error: drawNamesError } = await supabase
      .from('draw_results')
      .select('draw_name')
      .order('draw_date', { ascending: false });

    if (drawNamesError) {
      throw new Error(`Error fetching draw names: ${drawNamesError.message}`);
    }

    const DRAW_NAMES = [...new Set((drawNamesData || []).map((d: Record<string, unknown>) => d.draw_name as string))];
    log("info", `Found ${DRAW_NAMES.length} unique draws in database`);

    let successCount = 0;
    let errorCount = 0;
    const results: Record<string, Record<string, unknown>> = {};

    // Process each draw
    for (const drawName of DRAW_NAMES) {
      try {
        log("info", `Precalculating predictions for ${drawName}`);

        // Fetch historical data
        const { data: drawResults, error: fetchError } = await supabase
          .from('draw_results')
          .select('draw_name, draw_date, winning_numbers')
          .eq('draw_name', drawName)
          .order('draw_date', { ascending: false })
          .limit(100);

        if (fetchError) {
          log("error", `Error fetching data for ${drawName}`, { error: fetchError.message });
          errorCount++;
          results[drawName] = { error: fetchError.message };
          continue;
        }

        if (!drawResults || drawResults.length === 0) {
          log("warn", `No data for ${drawName}`);
          errorCount++;
          results[drawName] = { error: "No historical data" };
          continue;
        }

        const historicalData = drawResults as DrawResult[];

        // Utiliser le moteur de prédiction intelligent
        const predictionResult = await generatePredictions(historicalData, {
          drawName,
          multiAlgorithm: true,
        });

        // Générer les explications
        const explanations = generateExplanations(predictionResult, historicalData);

        // Déterminer l'avertissement
        let warning: string | undefined;
        if (predictionResult.dataMetrics.historicalCount < 20) {
          warning = `Données limitées (${predictionResult.dataMetrics.historicalCount} tirages) - Prédictions avec confiance réduite`;
        } else if (predictionResult.dataMetrics.quality < 0.5) {
          warning = `Qualité des données faible (${(predictionResult.dataMetrics.quality * 100).toFixed(0)}%) - Résultats moins fiables`;
        } else if (predictionResult.dataMetrics.freshness < 0.5) {
          warning = `Données anciennes - Prédictions moins précises`;
        }

        // Enregistrer la prédiction optimisée dans le ledger (pour walk-forward)
        await recordPredictionsToLedger([predictionResult.optimizedPrediction], new Date().toISOString().split("T")[0]);

        // Stocker dans la base de données
        const { error: insertError } = await supabase
          .from('precalculated_predictions')
          .insert({
            draw_name: drawName,
            predictions: predictionResult.predictions,
            optimized_prediction: predictionResult.optimizedPrediction,
            selected_algorithm: predictionResult.selectedAlgorithm,
            algorithm_reason: predictionResult.algorithmReason,
            explanations: {
              summary: explanations.summary,
              strengths: explanations.strengths,
              weaknesses: explanations.weaknesses,
              recommendation: explanations.recommendation,
            },
            warning: warning,
            data_quality: predictionResult.dataMetrics.quality,
            freshness: predictionResult.dataMetrics.freshness,
            historical_count: predictionResult.dataMetrics.historicalCount,
            expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
          });

        if (insertError) {
          log("error", `Error storing predictions for ${drawName}`, { error: insertError.message });
          errorCount++;
          results[drawName] = { error: insertError.message };
        } else {
          log("info", `Successfully precalculated predictions for ${drawName}`, { 
            count: predictionResult.predictions.length,
            algorithm: predictionResult.selectedAlgorithm
          });
          successCount++;
          results[drawName] = { 
            success: true, 
            predictions: predictionResult.predictions.length,
            algorithm: predictionResult.selectedAlgorithm
          };
        }

      } catch (error) {
        log("error", `Exception processing ${drawName}`, { error: error instanceof Error ? error.message : error });
        errorCount++;
        results[drawName] = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    // Cleanup expired predictions
    try {
      await supabase.rpc('cleanup_expired_predictions');
      log("info", "Cleaned up expired predictions");
    } catch (cleanupError) {
      log("warn", "Error cleaning up expired predictions", { error: cleanupError });
    }

    const elapsed = Date.now() - startTime;
    log("info", "Precalculation completed", { 
      successCount, 
      errorCount, 
      elapsed,
      totalDraws: DRAW_NAMES.length
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Precalculated predictions for ${successCount}/${DRAW_NAMES.length} draws`,
      successCount,
      errorCount,
      results,
      elapsed
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    log("error", "Precalculation error", { error: error instanceof Error ? error.message : error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

