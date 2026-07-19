import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { evaluatePredictionsRequestSchema, validateRequest } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DrawResult {
  id: string;
  draw_name: string;
  draw_date: string;
  winning_numbers: number[];
}

interface Prediction {
  id: string;
  draw_name: string;
  prediction_date: string;
  predicted_numbers: number[];
  model_used: string;
}

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
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
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
        JSON.stringify({ error: 'Forbidden - Admin role required' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    
    // Validate input
    const validation = validateRequest(evaluatePredictionsRequestSchema, body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { drawName } = validation.data;

    console.log("Evaluating predictions for draw");

    // Get all draw results sorted by date (most recent first)
    let resultsQuery = supabase
      .from("draw_results")
      .select("id, draw_name, draw_date, winning_numbers")
      .order("draw_date", { ascending: false });

    if (drawName) {
      resultsQuery = resultsQuery.eq("draw_name", drawName);
    }

    const { data: results, error: resultsError } = await resultsQuery;

    if (resultsError) throw resultsError;
    if (!results || results.length === 0) {
      return new Response(
        JSON.stringify({ message: "No results found to evaluate" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found draw results to evaluate", { count: results.length });

    
    let evaluatedCount = 0;
    let newEvaluations = 0;
    const algorithmStats: Record<string, { evaluated: number; bestMatch: number }> = {};

    // Get all predictions that have target_draw_date or draw_name
    const { data: predictions, error: predictionsError } = await supabase
      .from("predictions")
      .select("id, draw_name, prediction_date, target_draw_date, target_draw_id, predicted_numbers, model_used, confidence_score")
      .order("prediction_date", { ascending: false });

    if (predictionsError) throw predictionsError;

    for (const prediction of predictions) {
      let result;

      // Find strict result matching target_draw_id or target_draw_date
      if (prediction.target_draw_id) {
        result = results.find((r: any) => r.id === prediction.target_draw_id);
      } else if (prediction.target_draw_date) {
        result = results.find((r: any) => r.draw_date === prediction.target_draw_date && r.draw_name === prediction.draw_name);
      } else {
        // Fallback for legacy predictions: find the *first* result that occurred after prediction_date
        const validResults = results.filter((r: any) => r.draw_name === prediction.draw_name && r.draw_date >= prediction.prediction_date);
        validResults.sort((a: any, b: any) => new Date(a.draw_date).getTime() - new Date(b.draw_date).getTime());
        result = validResults[0];
      }

      if (!result) continue; // Draw hasn't happened yet or not found

      // Calculate matches
      const matches = prediction.predicted_numbers.filter((num: number) => 
        result.winning_numbers.includes(num)
      ).length;

      // Unités compatibles : accuracy_score en base 0 à 1
      const accuracyScore = matches / 5;
      
      const precision = matches / 5;
      const recall = matches / result.winning_numbers.length;
      const f1Score = precision + recall > 0 
        ? (2 * precision * recall) / (precision + recall) 
        : 0;

      // Update stats
      if (!algorithmStats[prediction.model_used]) {
        algorithmStats[prediction.model_used] = { evaluated: 0, bestMatch: 0 };
      }
      algorithmStats[prediction.model_used].evaluated++;
      algorithmStats[prediction.model_used].bestMatch = Math.max(
        algorithmStats[prediction.model_used].bestMatch,
        matches
      );

      // Check if already evaluated with specific constraints
      const { data: existing } = await supabase
        .from("algorithm_performance")
        .select("id")
        .eq("prediction_id", prediction.id)
        .maybeSingle();

      if (existing) {
        if (!forceRebuild) continue;
        
        // If forceRebuild is true, delete existing
        await supabase.from("algorithm_performance").delete().eq("prediction_id", prediction.id);
      }

      const { error: insertError } = await supabase
        .from("algorithm_performance")
        .insert({
          prediction_id: prediction.id,
          draw_result_id: result.id,
          draw_name: result.draw_name,
          model_used: prediction.model_used,
          prediction_date: prediction.prediction_date,
          draw_date: result.draw_date,
          predicted_numbers: prediction.predicted_numbers,
          winning_numbers: result.winning_numbers,
          matches_count: matches,
          accuracy_score: accuracyScore,
          f1_score: f1Score,
        });

      if (insertError) {
        console.error("Error inserting performance", { error: insertError.message });
      } else {
        evaluatedCount++;
        newEvaluations++;
      }
    }
// Refresh materialized views to update rankings
    console.log("\n🔄 Refreshing algorithm rankings...");
    const { error: refreshError } = await supabase.rpc("refresh_algorithm_rankings");
    if (refreshError) {
      console.error("Warning: Could not refresh rankings", { error: refreshError.message });
    } else {
      console.log("✅ Rankings refreshed successfully");
    }

    // Log summary by algorithm
    console.log("\n📊 Evaluation Summary by Algorithm:");
    Object.entries(algorithmStats).forEach(([algo, stats]) => {
      console.log("Algorithm stats", { algorithm: algo, evaluated: stats.evaluated, bestMatch: stats.bestMatch });
    });

    console.log("Successfully evaluated predictions", { total: evaluatedCount, new: newEvaluations });

    return new Response(
      JSON.stringify({
        success: true,
        evaluatedCount,
        newEvaluations,
        algorithmStats,
        message: `Evaluated ${evaluatedCount} predictions (${newEvaluations} new)`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in evaluate-predictions", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});