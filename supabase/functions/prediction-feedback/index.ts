import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { smartEnsemble } from "../_shared/smart-ensemble.ts";
import { predictionFeedbackRequestSchema, validateRequest } from "../_shared/validation.ts";
import { RateLimiter, getClientIdentifier, createRateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 5 });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
      console.log('[prediction-feedback] Unauthorized access attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check
    const clientIp = getClientIdentifier(req);
    const rateInfo = rateLimiter.getInfo(clientIp);
    
    if (!rateInfo.allowed) {
      return createRateLimitResponse(rateInfo.resetIn, corsHeaders);
    }

    // Input validation
    const body = await req.json();
    const validation = validateRequest(predictionFeedbackRequestSchema, body);
    
    if (!validation.success) {
      console.error("Feedback validation failed:", validation.error);
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { predictionId, actualNumbers, userRating } = validation.data;

    // Use service role client for database operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer la prédiction
    const { data: prediction } = await serviceClient
      .from('predictions')
      .select('*')
      .eq('id', predictionId)
      .single();

    if (!prediction) {
      return new Response(JSON.stringify({ error: "Prediction not found" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculer les matches
    const matches = prediction.predicted_numbers.filter((num: number) => 
      actualNumbers.includes(num)
    ).length;

    // Sauvegarder le feedback avec l'ID utilisateur authentifié
    await serviceClient.from('user_prediction_feedback').insert({
      prediction_id: predictionId,
      user_id: user.id,
      matches: matches,
      rating: userRating,
      comments: null,
    });

    // Mettre à jour la performance du modèle dans l'ensemble intelligent
    if (prediction.model_used) {
      smartEnsemble.updatePerformance(prediction.model_used, matches);
    }

    return new Response(JSON.stringify({
      success: true,
      matches,
      accuracy: (matches / 5) * 100,
      message: `${matches}/5 numéros corrects`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[prediction-feedback] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
