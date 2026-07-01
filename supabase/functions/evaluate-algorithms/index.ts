import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import type { DrawResult } from "../_shared/types.ts";
import { backtestAlgorithm, backtestWithCrossValidation, walkForwardOptimization } from "../_shared/backtesting.ts";
import {
  frequencyProAlgorithm,
  randomForestAlgorithm,
  lstmAlgorithm,
} from "../_shared/algorithms.ts";
import { transformerAlgorithm } from "../_shared/transformer.ts";
import { xgboostAlgorithm } from "../_shared/xgboost.ts";
import { stackingEnsemble } from "../_shared/stacking.ts";
import { RateLimiter, getClientIdentifier, createRateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  validationType: z.enum(['standard', 'kfold', 'walkforward']).optional().default('standard'),
  kFolds: z.number().min(3).max(10).optional().default(5),
}).strict();

// Noms des algorithmes conformes à la configuration
const ALGORITHM_DISPLAY_NAMES: Record<string, string> = {
  "Optimiseur MCMC": "Optimiseur MCMC (Monte Carlo)",
  "FrequencyPro": "FrequencyPro",
  "Random Forest": "Random Forest",
  "LSTM": "LSTM Network",
  "Transformer": "Transformer (Attention)",
  "XGBoost": "XGBoost",
  "Stacking Ensemble": "Stacking Ensemble",
};

serve(async (req) => {
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
    
    console.log(`[evaluate-algorithms] Starting ${validationType} evaluation for ${drawName}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    // Les algorithmes du système
    const algorithms = [
      { name: "Optimiseur MCMC", fn: async (historicalResults) => {
        const { predictionOptimizer } = await import("../_shared/prediction-optimizer.ts");
        const prediction = await predictionOptimizer.optimizePrediction(historicalResults);
        return { numbers: prediction.numbers, confidence: prediction.confidence };
      }},
      { name: "Stacking Ensemble", fn: stackingEnsemble },
      { name: "Transformer", fn: transformerAlgorithm },
      { name: "XGBoost", fn: xgboostAlgorithm },
      { name: "FrequencyPro", fn: frequencyProAlgorithm },
      { name: "Random Forest", fn: randomForestAlgorithm },
      { name: "LSTM", fn: lstmAlgorithm },
    ];

    let evaluations;
    let crossValidationResults = null;

    if (validationType === 'kfold') {
      // K-Fold Cross Validation
      const cvResults = await Promise.all(
        algorithms.map(async algo => {
          const result = await backtestWithCrossValidation(
            algo.fn,
            algo.name,
            results as DrawResult[],
            kFolds
          );
          return {
            ...result.aggregated,
            crossValidation: {
              standardError: result.standardError,
              confidenceInterval: result.confidenceInterval,
              foldResults: result.folds.map(f => ({
                accuracy: f.accuracy,
                winRate: f.winRate,
                sharpeRatio: f.sharpeRatio
              }))
            }
          };
        })
      );
      evaluations = cvResults;
      crossValidationResults = cvResults.map(r => ({
        algorithm: r.algorithm,
        confidenceInterval: r.crossValidation?.confidenceInterval,
        standardError: r.crossValidation?.standardError
      }));
    } else if (validationType === 'walkforward') {
      // Walk-Forward Optimization
      const wfResults = await Promise.all(
        algorithms.map(async algo => {
          const windowResults = await walkForwardOptimization(
            algo.fn,
            algo.name,
            results as DrawResult[],
            60,
            15,
            10
          );
          
          // Aggregate walk-forward results
          const avgAccuracy = windowResults.reduce((sum, r) => sum + r.accuracy, 0) / windowResults.length;
          const avgWinRate = windowResults.reduce((sum, r) => sum + r.winRate, 0) / windowResults.length;
          const avgSharpe = windowResults.reduce((sum, r) => sum + r.sharpeRatio, 0) / windowResults.length;
          
          return {
            algorithm: algo.name,
            accuracy: avgAccuracy,
            avgMatches: avgAccuracy / 20,
            bestMatch: Math.max(...windowResults.map(r => r.bestMatch)),
            worstMatch: Math.min(...windowResults.map(r => r.worstMatch)),
            consistency: Math.sqrt(windowResults.reduce((sum, r) => sum + Math.pow(r.accuracy - avgAccuracy, 2), 0) / windowResults.length),
            totalTests: windowResults.reduce((sum, r) => sum + r.totalTests, 0),
            sharpeRatio: avgSharpe,
            maxDrawdown: Math.max(...windowResults.map(r => r.maxDrawdown)),
            winRate: avgWinRate,
            profitFactor: windowResults.reduce((sum, r) => sum + r.profitFactor, 0) / windowResults.length,
            matchDistribution: windowResults.reduce((acc, r) => {
              for (let i = 0; i <= 5; i++) {
                acc[i] = (acc[i] || 0) + (r.matchDistribution[i] || 0);
              }
              return acc;
            }, {} as Record<number, number>),
            windowCount: windowResults.length
          };
        })
      );
      evaluations = wfResults;
    } else {
      // Standard backtesting
      evaluations = await Promise.all(
        algorithms.map(algo => 
          backtestAlgorithm(algo.fn, algo.name, results as DrawResult[], undefined, 50)
        )
      );
    }

    console.log(`[evaluate-algorithms] Evaluations completed:`, evaluations.map(e => `${e.algorithm}: ${e.accuracy.toFixed(1)}%`));

    // Sauvegarder les résultats dans algorithm_performance si demandé
    if (saveResults) {
      const today = new Date().toISOString().split('T')[0];
      const performanceRecords = evaluations.map(eval_ => ({
        model_used: ALGORITHM_DISPLAY_NAMES[eval_.algorithm] || eval_.algorithm,
        draw_name: drawName,
        prediction_date: today,
        draw_date: today,
        predicted_numbers: [1, 2, 3, 4, 5], // Placeholder - backtesting agrégé
        winning_numbers: results[0].winning_numbers,
        matches_count: Math.round(eval_.avgMatches),
        accuracy_score: eval_.accuracy / 100,
        f1_score: eval_.winRate || eval_.accuracy / 100,
        data_points_used: results.length,
        confidence_score: eval_.sharpeRatio > 0 ? Math.min(0.95, 0.5 + eval_.sharpeRatio * 0.2) : 0.5,
        factors: [
          `Backtesting ${validationType}: ${eval_.totalTests} tests`,
          `Win Rate: ${((eval_.winRate || 0) * 100).toFixed(1)}%`,
          `Sharpe: ${(eval_.sharpeRatio || 0).toFixed(2)}`,
          `Max Drawdown: ${(eval_.maxDrawdown || 0).toFixed(1)}`
        ],
      }));

      const { error: insertError } = await supabase
        .from('algorithm_performance')
        .insert(performanceRecords);

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
      historicalCount: results.length,
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
