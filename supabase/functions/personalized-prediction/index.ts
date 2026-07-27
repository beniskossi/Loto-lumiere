import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import type { DrawResult } from "../_shared/types.ts";
import { frequencyProAlgorithm } from "../_shared/algorithms.ts";
import { log, DeterministicLCG } from "../_shared/utils.ts";
import { RateLimiter, getClientIdentifier, createRateLimitResponse } from "../_shared/rate-limiter.ts";
import { personalizedPredictionRequestSchema, validateRequest } from "../_shared/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiter: 10 requêtes par minute par client
const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 10 });

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
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    
    let user;
    const isServiceRole = token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (isServiceRole) {
      user = { id: "00000000-0000-0000-0000-000000000000", email: "user@local.test" };
    } else {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        console.log('[personalized-prediction] Unauthorized access attempt');
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      user = authUser;
    }

    // Vérifier le rate limit
    const clientId = getClientIdentifier(req);
    const rateInfo = rateLimiter.getInfo(clientId);
    
    if (!rateInfo.allowed) {
      console.log("Rate limit exceeded for client:", clientId);
      return createRateLimitResponse(rateInfo.resetIn, corsHeaders);
    }

    const body = await req.json();
    
    // Validate input with strict schema
    const validation = validateRequest(personalizedPredictionRequestSchema, body);
    if (!validation.success) {
      console.error("Personalized validation failed:", validation.error);
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { drawName, analysisDepth } = validation.data;
    
    // Use the authenticated user's ID instead of the one from request body
    const userId = user.id;

    // Use service role client for database operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Charger seulement les 30 derniers tirages pour rapidité
    const { data: results } = await serviceClient
      .from('draw_results')
      .select('*')
      .eq('draw_name', drawName)
      .order('draw_date', { ascending: false })
      .limit(30);

    if (!results || results.length < 10) {
      return new Response(JSON.stringify({ 
        error: "Données insuffisantes" 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Générer une prédiction rapide avec UN SEUL algorithme léger
    const basePrediction = frequencyProAlgorithm(results as DrawResult[]);
    
    // 3. Charger les données utilisateur (limité)
    const [favoritesResult, preferencesResult] = await Promise.all([
      serviceClient.from('user_favorites')
        .select('favorite_numbers')
        .eq('user_id', userId)
        .limit(5), // Limiter à 5 favoris max
      serviceClient.from('user_preferences')
        .select('preferred_algorithm, theme_primary_color')
        .eq('user_id', userId)
        .maybeSingle()
    ]);

    const favorites = favoritesResult.data || [];
    const userPreferences = preferencesResult.data;

    // 4. Personnalisation SIMPLE et RAPIDE
    const favoriteNumbers = favorites
      .flatMap(f => f.favorite_numbers || [])
      .slice(0, 3); // Max 3 numéros favoris

    const personalizedNumbers = personalizeNumbers(
      basePrediction.numbers,
      favoriteNumbers
    );

    const riskProfile = determineSimpleRiskProfile(userPreferences);

    // 5. Retourner IMMÉDIATEMENT la réponse
    const response = {
      prediction: {
        numbers: personalizedNumbers,
        confidence: adjustConfidenceForRisk(basePrediction.confidence || 0.7, riskProfile),
        algorithm: `${basePrediction.algorithm} (Personnalisé)`,
        factors: [
          ...(basePrediction.factors || []),
          favoriteNumbers.length > 0 ? "Numéros favoris" : "Préférences utilisateur"
        ],
        category: basePrediction.category
      },
      userProfile: {
        riskProfile,
        favoritesCount: favoriteNumbers.length,
        hasFavorites: favoriteNumbers.length > 0
      },
      recommendations: generateQuickRecommendations(personalizedNumbers, favoriteNumbers),
      isPersonalized: true
    };

    // 6. Tâche en arrière-plan: sauvegarder l'utilisation (NON-BLOQUANT)
    logUserPredictionUsage(serviceClient, userId, drawName, personalizedNumbers)
      .catch(err => console.error("Background task error:", err));

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    log("error", "Personalized prediction error", { error });
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ===== FONCTIONS OPTIMISÉES POUR RAPIDITÉ =====

/**
 * Personnalise les numéros en intégrant les favoris de l'utilisateur
 * Complexité: O(n) - très rapide
 */
function personalizeNumbers(baseNumbers: number[], favoriteNumbers: number[]): number[] {
  if (favoriteNumbers.length === 0) {
    return baseNumbers;
  }

  const result = [...baseNumbers];
  const usedFavorites = new Set<number>();

  // Seed déterministe dérivé de la somme des numéros de base et favoris
  const baseSum = baseNumbers.reduce((a, b) => a + b, 0);
  const favSum = favoriteNumbers.reduce((a, b) => a + b, 0);
  const lcg = new DeterministicLCG(baseSum + favSum);

  // Remplacer jusqu'à 2 numéros par des favoris (qui ne sont pas déjà présents)
  let replacements = 0;
  for (const fav of favoriteNumbers) {
    if (replacements >= 2) break;
    if (!result.includes(fav) && !usedFavorites.has(fav)) {
      // Remplacer un numéro déterministe
      const indexToReplace = Math.floor(lcg.next() * result.length);
      result[indexToReplace] = fav;
      usedFavorites.add(fav);
      replacements++;
    }
  }

  // S'assurer que les numéros sont triés et uniques
  return [...new Set(result)].sort((a, b) => a - b).slice(0, 5);
}

/**
 * Détermine le profil de risque de manière simple
 * Basé uniquement sur les 6 algorithmes valides
 */
function determineSimpleRiskProfile(userPreferences: Record<string, unknown> | null): "conservative" | "balanced" | "aggressive" {
  if (!userPreferences) return "balanced";

  const prefAlgo = userPreferences.preferred_algorithm?.toLowerCase() || "";
  
  // FrequencyPro et Arbres Heuristiques = conservateur
  if (prefAlgo.includes("frequency") || prefAlgo.includes("forest")) {
    return "conservative";
  }
  // Transformer, LSTM, Stacking = agressif
  if (prefAlgo.includes("transformer") || prefAlgo.includes("lstm") || prefAlgo.includes("stacking")) {
    return "aggressive";
  }
  
  return "balanced";
}

/**
 * Ajuste la confiance en fonction du profil de risque
 */
function adjustConfidenceForRisk(baseConfidence: number, riskProfile: string): number {
  switch (riskProfile) {
    case "conservative":
      return Math.min(0.95, baseConfidence * 1.1);
    case "aggressive":
      return Math.max(0.5, baseConfidence * 0.9);
    default:
      return baseConfidence;
  }
}

/**
 * Génère des recommandations rapides
 */
function generateQuickRecommendations(prediction: number[], favoriteNumbers: number[]): string[] {
  const recommendations: string[] = [];

  if (favoriteNumbers.length > 0) {
    const favoritesInPrediction = prediction.filter(num => 
      favoriteNumbers.includes(num)
    ).length;
    
    if (favoritesInPrediction > 0) {
      recommendations.push(`✓ ${favoritesInPrediction} de vos numéros favoris inclus`);
    } else {
      recommendations.push("Prédiction optimisée avec vos préférences");
    }
  } else {
    recommendations.push("Prédiction basée sur l'analyse statistique");
  }

  // Vérifier la distribution des numéros
  const avg = prediction.reduce((sum, n) => sum + n, 0) / prediction.length;
  if (avg < 30) {
    recommendations.push("📊 Distribution favorisant les petits numéros");
  } else if (avg > 60) {
    recommendations.push("📊 Distribution favorisant les grands numéros");
  } else {
    recommendations.push("📊 Distribution équilibrée");
  }

  return recommendations;
}

/**
 * Tâche en arrière-plan: Logger l'utilisation (NON-BLOQUANT)
 */
async function logUserPredictionUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  drawName: string,
  numbers: number[]
): Promise<void> {
  try {
    await supabase
      .from('prediction_tracking')
      .insert({
        user_id: userId,
        draw_name: drawName,
        predicted_numbers: numbers,
        prediction_date: new Date().toISOString().split('T')[0]
      });
    
    console.log("✓ User prediction logged in background");
  } catch (error) {
    console.error("Background logging failed:", error);
  }
}

addEventListener('beforeunload', () => {
  console.log('Function shutting down - background tasks will complete');
});
