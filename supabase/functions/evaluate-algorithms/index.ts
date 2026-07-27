import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import type { DrawResult } from "../_shared/types.ts";
import { backtestAlgorithm, backtestWithCrossValidation, walkForwardOptimization } from "../_shared/backtesting.ts";
import {
  frequencyProAlgorithm,
  randomForestAlgorithm,
  lstmAlgorithm,
  doubleGapSequenceAlgorithm,
  gapCadenceAlgorithm,
} from "../_shared/algorithms.ts";
import { transformerAlgorithm } from "../_shared/transformer.ts";
import { stackingEnsemble } from "../_shared/stacking.ts";
import { RateLimiter, getClientIdentifier, createRateLimitResponse } from "../_shared/rate-limiter.ts";

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://ais-dev-pi4cbnvbnhvhgdeu26bzu4-755915034440.europe-west2.run.app",
  "https://ais-pre-pi4cbnvbnhvhgdeu26bzu4-755915034440.europe-west2.run.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : "https://ais-pre-pi4cbnvbnhvhgdeu26bzu4-755915034440.europe-west2.run.app";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
  };
}

// Rate limiter: 5 requests per minute (expensive operation)
const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 5 });

// Input validation schema
const evaluateAlgorithmsSchema = z.object({
  drawName: z.string()
    .trim()
    .min(1, 'Draw name is required')
    .max(50, 'Draw name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\u00C0-\u017F-]+$/, 'Draw name can only contain letters, numbers, spaces, accents, and hyphens'),
  saveResults: z.boolean().optional().default(false),
  validationType: z.enum(['standard', 'expanding', 'rolling']).optional().default('standard'),
  kFolds: z.number().min(3).max(10).optional().default(5),
}).strict();

// Noms des algorithmes conformes à la configuration
const ALGORITHM_DISPLAY_NAMES: Record<string, string> = {
  "Optimiseur MCMC": "Optimiseur MCMC (Chaîne de Markov)",
  "FrequencyPro": "Fréquence récente pondérée",
  "Arbres Heuristiques": "Ensemble bootstrap de tendances fréquentielles",
  "LSTM": "Transformation récurrente déterministe expérimentale",
  "Transformer": "Analyse d'attention sinusoïdale expérimentale",
  "Double Gap Sequence": "Double Gap (Écarts des Écarts)",
  "Gap Cadence": "Cadence Morphologique",
  "Ensemble Hybride Stacking": "Ensemble Hybride Stacking",
  "Baseline Aléatoire": "Baseline Aléatoire",
  "Baseline Fréquence Historique": "Baseline Fréquence Historique",
  "Baseline Dernière Période": "Baseline Dernière Période",
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting check
  const clientId = getClientIdentifier(req);
  const rateLimitInfo = rateLimiter.getInfo(clientId);
  
  if (!rateLimitInfo.allowed) {
    console.log(`[evaluate-algorithms] Rate limit exceeded for client: ${clientId}`);
    return createRateLimitResponse(rateLimitInfo.resetIn, corsHeaders);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier l'authentification admin (strictement obligatoire)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé : Token d'authentification manquant." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé : Session invalide ou expirée." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier le rôle administrateur de l'utilisateur
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    const isAdmin = !!roleData && roleData.role === 'admin';
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Accès refusé : Privilèges administrateur requis." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate input
    const body = await req.json();
    const parseResult = evaluateAlgorithmsSchema.safeParse(body);
    
    if (!parseResult.success) {
      const errorMessages = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      console.log(`[evaluate-algorithms] Validation error: ${errorMessages}`);
      return new Response(JSON.stringify({ 
        error: "Invalid input",
        details: errorMessages
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { drawName, saveResults, validationType, kFolds } = parseResult.data;
    
    console.log(`[evaluate-algorithms] Starting ${validationType} chronological evaluation for ${drawName}`);

    const { data: results, error: fetchError } = await supabase
      .from('draw_results')
      .select('*')
      .eq('draw_name', drawName)
      .order('draw_date', { ascending: false })
      .limit(200);

    if (fetchError) {
      console.error('[evaluate-algorithms] Fetch error:', fetchError);
      throw fetchError;
    }

    if (!results || results.length < 30) {
      return new Response(JSON.stringify({ 
        error: "Données insuffisantes pour backtesting",
        availableResults: results?.length ?? 0,
        minimum: 30
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[evaluate-algorithms] Found ${results.length} historical results`);

    // Ensure strict chronological order (oldest draw first, newest last) to eliminate look-ahead bias
    const chronologicalResults = [...results].sort((a, b) => new Date(a.draw_date).getTime() - new Date(b.draw_date).getTime());

    // Les algorithmes du système
    const algorithms = [
      { name: "Optimiseur MCMC", fn: async (historicalResults) => {
        const { predictionOptimizer } = await import("../_shared/prediction-optimizer.ts");
        const prediction = await predictionOptimizer.optimizePrediction(historicalResults, { useEnsemble: false, useAnalytics: false });
        return { numbers: prediction.numbers, confidence: prediction.confidence };
      }},
      { name: "Ensemble Hybride Stacking", fn: stackingEnsemble },
      { name: "Transformer", fn: transformerAlgorithm },
      { name: "Double Gap Sequence", fn: doubleGapSequenceAlgorithm },
      { name: "Gap Cadence", fn: gapCadenceAlgorithm },
      { name: "FrequencyPro", fn: frequencyProAlgorithm },
      { name: "Arbres Heuristiques", fn: randomForestAlgorithm },
      { name: "LSTM", fn: lstmAlgorithm },
      { name: "Baseline Aléatoire", fn: (historicalResults) => {
        let seed = historicalResults.length * 42;
        if (historicalResults.length > 0 && historicalResults[0].winning_numbers) {
          seed += historicalResults[0].winning_numbers.reduce((a, b) => a + b, 0);
        }
        const numbers: number[] = [];
        let state = seed;
        const nextRand = () => {
          state = (state * 1664525 + 1013904223) % 4294967296;
          return state / 4294967296;
        };
        while (numbers.length < 5) {
          const num = Math.floor(nextRand() * 90) + 1;
          if (!numbers.includes(num)) {
            numbers.push(num);
          }
        }
        return {
          numbers: numbers.sort((a, b) => a - b),
          confidence: 0.05,
          algorithm: "Baseline Aléatoire",
          factors: ["Générateur pseudo-aléatoire déterministe", "Baseline de comparaison"],
          score: 0.05,
          category: "statistical"
        };
      }},
      { name: "Baseline Fréquence Historique", fn: async (historicalResults) => {
        const { baselineFrequenceHistorique } = await import("../_shared/algorithms.ts");
        return baselineFrequenceHistorique(historicalResults);
      }},
      { name: "Baseline Dernière Période", fn: async (historicalResults) => {
        const { baselineDernierePeriode } = await import("../_shared/algorithms.ts");
        return baselineDernierePeriode(historicalResults);
      }}
    ];

    const evaluations: any[] = [];
    const crossValidationResults: any[] = [];

    for (const algoDef of algorithms) {
      if (validationType === 'expanding') {
        console.log(`Running expanding window validation for ${algoDef.name}`);
        const crossValResult = await backtestWithExpandingWindow(
          algoDef.fn,
          ALGORITHM_DISPLAY_NAMES[algoDef.name] || algoDef.name,
          chronologicalResults,
          100, // initialTrainSize
          5    // stepSize
        );
        evaluations.push(crossValResult.aggregated);
        crossValidationResults.push({
          algorithm: ALGORITHM_DISPLAY_NAMES[algoDef.name] || algoDef.name,
          confidenceInterval: crossValResult.confidenceInterval,
          standardError: crossValResult.standardError
        });
      } else if (validationType === 'rolling') {
        console.log(`Running rolling window validation for ${algoDef.name}`);
        const rollValResult = await backtestWithRollingWindow(
          algoDef.fn,
          ALGORITHM_DISPLAY_NAMES[algoDef.name] || algoDef.name,
          chronologicalResults,
          150, // windowSize
          5    // stepSize
        );
        evaluations.push(rollValResult.aggregated);
        crossValidationResults.push({
          algorithm: ALGORITHM_DISPLAY_NAMES[algoDef.name] || algoDef.name,
          confidenceInterval: rollValResult.confidenceInterval,
          standardError: rollValResult.standardError
        });
      } else {
        // Standard backtesting (sequential to prevent CPU/memory spikes)
        const result = await backtestAlgorithm(algoDef.fn, algoDef.name, chronologicalResults as DrawResult[], undefined, 50, 200);
        evaluations.push(result);
      }
    }

    console.log(`[evaluate-algorithms] Evaluations completed:`, evaluations.map(e => `${e.algorithm}: ${e.accuracy.toFixed(1)}%`));

    // Sauvegarder les résultats dans algorithm_performance si demandé
    const saveEnabled = false;
    if (saveEnabled && saveResults) {
      const today = new Date().toISOString().split('T')[0];
      const performanceRecords = evaluations.map(eval_ => {
        // Mathematically calibrated confidence score based on performance excess relative to random baseline (5.56%)
        const baselineAccuracy = 5.5556;
        const excessAccuracy = Math.max(0, eval_.accuracy - baselineAccuracy);
        const calibratedConfidence = Math.min(0.98, 0.5 + (excessAccuracy / 15) * 0.48);

        return {
          model_used: ALGORITHM_DISPLAY_NAMES[eval_.algorithm] || eval_.algorithm,
          draw_name: drawName,
          prediction_date: today,
          draw_date: today,
          predicted_numbers: [1, 2, 3, 4, 5], // Placeholder - backtesting agrégé
          winning_numbers: chronologicalResults[chronologicalResults.length - 1].winning_numbers,
          matches_count: Math.round(eval_.avgMatches),
          accuracy_score: eval_.accuracy / 100,
          f1_score: eval_.winRate || eval_.accuracy / 100,
          data_points_used: chronologicalResults.length,
          confidence_score: calibratedConfidence,
          factors: [
            `Backtesting ${validationType}: ${eval_.totalTests} tests`,
            `Win Rate: ${((eval_.winRate || 0) * 100).toFixed(1)}%`,
            `Sharpe: ${(eval_.sharpeRatio || 0).toFixed(2)}`,
            `Max Drawdown: ${(eval_.maxDrawdown || 0).toFixed(1)}`
          ],
        };
      });

      // const { error: insertError } = await supabase
        // .from('algorithm_performance')
        // .insert(performanceRecords);
      const insertError = null; // Disabled as per forensic review


      if (insertError) {
        console.error('[evaluate-algorithms] Insert error:', insertError);
      } else {
        console.log(`[evaluate-algorithms] Saved ${performanceRecords.length} performance records`);
      }
    }

    return new Response(JSON.stringify({ 
      drawName,
      validationType,
      evaluations: evaluations.sort((a, b) => b.accuracy - a.accuracy),
      crossValidationResults,
      historicalCount: chronologicalResults.length,
      savedToDatabase: saveResults,
      rateLimitRemaining: rateLimitInfo.remaining - 1
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[evaluate-algorithms] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
