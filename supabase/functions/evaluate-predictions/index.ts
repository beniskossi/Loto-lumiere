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

    // For each result, find ALL predictions made before the draw date
    for (const result of results as DrawResult[]) {
      console.log("Processing draw result");
      
      // Get ALL predictions for this draw made before the result date
      const { data: predictions, error: predictionsError } = await supabase
        .from("predictions")
        .select("id, draw_name, prediction_date, predicted_numbers, model_used, confidence_score")
        .eq("draw_name", result.draw_name)
        .lte("prediction_date", result.draw_date)
        .order("prediction_date", { ascending: false });

      if (predictionsError) {
        console.error("Error fetching predictions", { error: predictionsError.message });
        continue;
      }

      if (!predictions || predictions.length === 0) {
        console.log("No predictions found for this draw");
        continue;
      }

      console.log("Found predictions to evaluate", { count: predictions.length });

      for (const prediction of predictions) {
        // Calculate matches
        const matches = prediction.predicted_numbers.filter((num: number) => 
          result.winning_numbers.includes(num)
        ).length;

        const accuracyScore = (matches / 5) * 100;
        
        // Calcul F1-score réel
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

        // Check if already evaluated
        const { data: existing } = await supabase
          .from("algorithm_performance")
          .select("id")
          .eq("draw_name", result.draw_name)
          .eq("model_used", prediction.model_used)
          .eq("prediction_date", prediction.prediction_date)
          .eq("draw_date", result.draw_date)
          .single();

        // Insert or update performance record
        const { error: insertError } = await supabase
          .from("algorithm_performance")
          .upsert({
            draw_name: result.draw_name,
            model_used: prediction.model_used,
            prediction_date: prediction.prediction_date,
            draw_date: result.draw_date,
            predicted_numbers: prediction.predicted_numbers,
            winning_numbers: result.winning_numbers,
            matches_count: matches,
            accuracy_score: accuracyScore,
            f1_score: f1Score, // Nouveau champ (ajoutez en DB si besoin)
          }, {
            onConflict: "draw_name,model_used,prediction_date,draw_date"
          });

        if (insertError) {
          console.error("Error inserting performance", { error: insertError.message });
        } else {
          evaluatedCount++;
          if (!existing) {
            newEvaluations++;
            console.log("Performance recorded", { matches, accuracy: accuracyScore.toFixed(1), f1: f1Score.toFixed(2) });
          }
        }
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