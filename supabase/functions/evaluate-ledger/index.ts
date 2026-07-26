import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch unevaluated predictions from the ledger
    const { data: unevaluated, error: fetchError } = await supabaseClient
      .from('prediction_ledger')
      .select('*')
      .is('evaluated_at', null);

    if (fetchError) throw fetchError;
    if (!unevaluated || unevaluated.length === 0) {
      return new Response(JSON.stringify({ message: "No unevaluated predictions." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Fetch actual results for those dates
    const datesToFetch = [...new Set(unevaluated.map(p => p.draw_date))];
    const { data: realDraws, error: drawError } = await supabaseClient
      .from('draw_results')
      .select('draw_date, winning_numbers')
      .in('draw_date', datesToFetch);

    if (drawError) throw drawError;

    const drawMap = new Map();
    realDraws?.forEach(d => drawMap.set(d.draw_date, d.winning_numbers));

    // 3. Evaluate predictions
    let evaluatedCount = 0;
    const updates = [];

    for (const pred of unevaluated) {
      const actual = drawMap.get(pred.draw_date);
      if (!actual) continue; // Draw result not yet available

      const matches = pred.predicted_numbers.filter((n: number) => actual.includes(n)).length;
      
      // Calculate Log-Score (Strict Proper Scoring Rule)
      // Log-likelihood of observing the actual outcome given the declared confidence
      // Simplified: if confidence is C for drawing a matching number...
      // P(matching exactly 'matches' numbers) - we approximate the log score for calibration
      const declaredProb = Math.max(0.01, Math.min(0.99, pred.confidence_declared));
      
      // Expected matches under uniform is 5/90 * 5 = 0.277
      // If declared confidence is higher, we expect more.
      const expectedMatches = declaredProb * 5; 
      const mse = Math.pow(matches - expectedMatches, 2);
      
      // Basic log score: reward matches proportional to confidence, penalize overconfidence
      const logScore = matches * Math.log(declaredProb) + (5 - matches) * Math.log(1 - declaredProb);

      updates.push({
        id: pred.id,
        actual_winning_numbers: actual,
        matches_count: matches,
        log_score: logScore,
        evaluated_at: new Date().toISOString()
      });
      evaluatedCount++;
    }

    // 4. Batch update ledger
    if (updates.length > 0) {
      const { error: updateError } = await supabaseClient
        .from('prediction_ledger')
        .upsert(updates);
      
      if (updateError) throw updateError;
      
      // 5. Update Algorithm Performance Table (Materialized View equivalent)
      // We calculate the historical accuracy for the calibration engine (Platt Scaling)
      const { data: allEvaluated, error: statsError } = await supabaseClient
        .from('prediction_ledger')
        .select('algorithm_name, matches_count')
        .not('evaluated_at', 'is', null);
        
      if (!statsError && allEvaluated) {
        const algoStats = new Map<string, { total: number, matches: number }>();
        allEvaluated.forEach(row => {
          const stats = algoStats.get(row.algorithm_name) || { total: 0, matches: 0 };
          stats.total += 1;
          stats.matches += (row.matches_count || 0);
          algoStats.set(row.algorithm_name, stats);
        });
        
        const perfUpdates = Array.from(algoStats.entries()).map(([algo, stats]) => {
          // Historical accuracy: average matches / 5 (max possible)
          const accuracy = stats.total > 0 ? (stats.matches / (stats.total * 5)) : (5/90);
          return {
            algorithm_name: algo,
            total_predictions: stats.total,
            average_matches: stats.matches / stats.total,
            historical_accuracy: accuracy,
            last_updated: new Date().toISOString()
          };
        });
        
        await supabaseClient.from('algorithm_calibration_metrics').upsert(perfUpdates);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      evaluated: evaluatedCount 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
