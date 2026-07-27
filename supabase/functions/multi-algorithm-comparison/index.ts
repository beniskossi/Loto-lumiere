import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { RateLimiter, getClientIdentifier, createRateLimitResponse } from "../_shared/rate-limiter.ts";
import { algorithmComparisonRequestSchema, validateRequest } from "../_shared/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiter: 5 requêtes par minute par client (protection contre les abus)
const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 5 });

interface AlgorithmPrediction {
  algorithm: string;
  numbers: number[];
  confidence: number;
  recentAccuracy: number;
  rank: number;
}

interface ConsensusResult {
  numbers: number[];
  confidence: number;
  agreementScore: number;
}

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
    const validation = validateRequest(algorithmComparisonRequestSchema, body);
    if (!validation.success) {
      console.error("Algorithm comparison validation failed:", validation.error);
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { drawName, includeMetrics } = validation.data;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer les dernières prédictions
    const { data: predictions } = await supabase
      .from("predictions")
      .select("*")
      .eq("draw_name", drawName)
      .order("created_at", { ascending: false })
      .limit(10);

    // Récupérer les performances des algorithmes
    const { data: performance } = await supabase
      .from("algorithm_performance")
      .select("model_used, accuracy_score")
      .eq("draw_name", drawName)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!performance || performance.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Insufficient data",
          message: "Pas assez de données de performance pour ce tirage"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculer les statistiques par algorithme
    const algoStats: Record<string, number[]> = {};
    performance.forEach(p => {
      if (!algoStats[p.model_used]) {
        algoStats[p.model_used] = [];
      }
      algoStats[p.model_used].push(p.accuracy_score);
    });

    // Créer le classement des algorithmes
    const topAlgorithms: AlgorithmPrediction[] = Object.entries(algoStats)
      .map(([algo, scores]) => {
        const avgAccuracy = scores.reduce((a, b) => a + b, 0) / scores.length;
        const pred = predictions?.find(p => p.model_used === algo);
        return {
          algorithm: algo,
          numbers: pred?.predicted_numbers || [],
          confidence: pred?.confidence_score || 0,
          recentAccuracy: avgAccuracy,
          rank: 0
        };
      })
      .sort((a, b) => b.recentAccuracy - a.recentAccuracy)
      .slice(0, 3)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // Calculer le consensus
    const consensus = calculateConsensus(topAlgorithms);

    return new Response(
      JSON.stringify({ topAlgorithms, consensus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Multi-algorithm comparison error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateConsensus(algorithms: AlgorithmPrediction[]): ConsensusResult {
  const votes: Record<number, number> = {};
  
  // Voter avec pondération par précision
  algorithms.forEach(algo => {
    algo.numbers.forEach(num => {
      votes[num] = (votes[num] || 0) + algo.recentAccuracy;
    });
  });

  // Sélectionner les 5 numéros les plus votés
  const consensusNumbers = Object.entries(votes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([num]) => parseInt(num));

  // Calculer le score d'accord
  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
  const topVotes = consensusNumbers.reduce((sum, num) => sum + votes[num], 0);
  const agreementScore = (topVotes / totalVotes) * 100;

  // Confiance moyenne
  const avgConfidence = algorithms.reduce((sum, a) => sum + a.recentAccuracy, 0) / algorithms.length;

  return {
    numbers: consensusNumbers,
    confidence: avgConfidence,
    agreementScore
  };
}
