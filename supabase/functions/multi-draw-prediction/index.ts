import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RateLimiter, getClientIdentifier, createRateLimitResponse } from "../_shared/rate-limiter.ts";
import { multiDrawPredictionRequestSchema, validateRequest } from "../_shared/validation.ts";
import { predictionOptimizer } from "../_shared/prediction-optimizer.ts";
import { analyzeCrossDrawCorrelation, predictFromCrossDrawAnalysis } from "../_shared/cross-draw-analysis.ts";
import { log } from "../_shared/utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiter: 3 requêtes par minute par client (opération coûteuse)
const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 3 });

interface DrawPrediction {
  drawName: string;
  drawTime: string;
  numbers: number[];
  confidence: number;
  strategy: string;
  correlations?: any[];
  riskAssessment?: any;
}

interface MultiDrawStrategy {
  predictions: DrawPrediction[];
  totalBudget: number;
  expectedReturn: number;
  riskLevel: "low" | "medium" | "high";
  recommendation: string;
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
    const validation = validateRequest(multiDrawPredictionRequestSchema, body);
    if (!validation.success) {
      console.error("Multi-draw validation failed:", validation.error);
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { drawNames, budgetPerDraw } = validation.data;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const predictions: DrawPrediction[] = [];

    // Analyser chaque tirage avec optimisation avancée
    for (const drawName of drawNames.slice(0, 3)) {
      const { data: results } = await supabase
        .from("draw_results")
        .select("*")
        .eq("draw_name", drawName)
        .order("draw_date", { ascending: false })
        .limit(100);

      if (!results || results.length < 10) {
        log("warn", `Insufficient data for ${drawName}`, { count: results?.length || 0 });
        continue;
      }

      try {
        const { data: configs } = await supabase.from('algorithm_config').select('parameters').limit(10);
        let lessons: string[] = [];
        let patterns: any = null;
        if (configs) {
          for (const conf of configs) {
            if (conf.parameters?.draw_specific?.[drawName]?.lessons) {
              lessons.push(...conf.parameters.draw_specific[drawName].lessons);
            }
            if (conf.parameters?.draw_specific?.[drawName]?.patterns) {
              patterns = conf.parameters.draw_specific[drawName].patterns;
            }
          }
          lessons = Array.from(new Set(lessons)).slice(0, 5); // Unique lessons
        }

        // Utiliser l'optimiseur de prédictions
        const optimizedPrediction = await predictionOptimizer.optimizePrediction(results, {
          riskLevel: "balanced",
          targetConfidence: 0.75,
          useEnsemble: true,
          useAnalytics: true,
          diversityWeight: 0.25,
          stabilityWeight: 0.35,
          drawSpecificLessons: lessons,
          drawSpecificPatterns: patterns,
          generateAlternatives: false
        });

        // Analyser les corrélations avec d'autres tirages
        const correlations = [];
        for (const otherDrawName of drawNames) {
          if (otherDrawName !== drawName) {
            const { data: otherResults } = await supabase
              .from("draw_results")
              .select("*")
              .eq("draw_name", otherDrawName)
              .order("draw_date", { ascending: false })
              .limit(50);

            if (otherResults && otherResults.length >= 10) {
              const correlation = analyzeCrossDrawCorrelation(results, otherResults);
              correlations.push({
                withDraw: otherDrawName,
                correlation: correlation.slice(0, 5)
              });
            }
          }
        }

        // Calculer le prochain horaire de tirage
        const nextDrawTime = calculateNextDrawTime(drawName);

        predictions.push({
          drawName,
          drawTime: nextDrawTime,
          numbers: optimizedPrediction.numbers,
          confidence: optimizedPrediction.confidence,
          strategy: determineStrategy(optimizedPrediction.confidence, optimizedPrediction.riskAssessment),
          correlations,
          riskAssessment: optimizedPrediction.riskAssessment
        });
      } catch (error) {
        log("error", `Error processing ${drawName}`, { error });
        // Fallback vers l'ancienne méthode
        const fallbackPrediction = await generateFallbackPrediction(drawName, results);
        predictions.push(fallbackPrediction);
      }
    }

    if (predictions.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Insufficient data",
          message: "Pas assez de données pour générer des prédictions"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculer la stratégie globale optimisée
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
    const totalBudget = calculateOptimalBudget(predictions);
    const expectedReturn = calculateExpectedReturn(predictions, totalBudget);
    const riskLevel = calculateGlobalRiskLevel(predictions);
    const recommendation = generateSmartRecommendation(predictions, riskLevel, avgConfidence);

    const strategy: MultiDrawStrategy = {
      predictions,
      totalBudget,
      expectedReturn,
      riskLevel,
      recommendation
    };

    return new Response(
      JSON.stringify(strategy),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log("error", "Multi-draw prediction error", { error });
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Fonctions utilitaires améliorées
function calculateNextDrawTime(drawName: string): string {
  const drawSchedule: Record<string, { days: number[]; time: string }> = {
    "Reveil": { days: [1], time: "10:00" },
    "Etoile": { days: [1], time: "13:00" },
    "Akwaba": { days: [1], time: "16:00" },
    "Monday Special": { days: [1], time: "18:15" },
    "La Matinale": { days: [2], time: "10:00" },
    "Emergence": { days: [2], time: "13:00" },
    "Sika": { days: [2], time: "16:00" },
    "Lucky Tuesday": { days: [2], time: "18:15" },
    "Premiere Heure": { days: [3], time: "10:00" },
    "Fortune": { days: [3], time: "13:00" },
    "Baraka": { days: [3], time: "16:00" },
    "Midweek": { days: [3], time: "18:15" },
    "Kado": { days: [4], time: "10:00" },
    "Privilege": { days: [4], time: "13:00" },
    "Monni": { days: [4], time: "16:00" },
    "Fortune Thursday": { days: [4], time: "18:15" },
    "Cash": { days: [5], time: "10:00" },
    "Solution": { days: [5], time: "13:00" },
    "Wari": { days: [5], time: "16:00" },
    "Friday Bonanza": { days: [5], time: "18:15" },
    "Soutra": { days: [6], time: "10:00" },
    "Diamant": { days: [6], time: "13:00" },
    "Moaye": { days: [6], time: "16:00" },
    "National": { days: [6], time: "18:15" },
    "Benediction": { days: [0], time: "10:00" },
    "Prestige": { days: [0], time: "13:00" },
    "Awale": { days: [0], time: "16:00" },
    "Espoir": { days: [0], time: "18:15" }
  };

  const schedule = drawSchedule[drawName];
  if (!schedule) return "Horaire non défini";

  const now = new Date();
  const currentDay = now.getDay();
  const [hours, minutes] = schedule.time.split(":").map(Number);

  // Trouver le prochain jour de tirage
  let nextDay = schedule.days.find(day => {
    if (day > currentDay) return true;
    if (day === currentDay) {
      const drawTime = new Date(now);
      drawTime.setHours(hours, minutes, 0, 0);
      return drawTime > now;
    }
    return false;
  });

  if (!nextDay) {
    nextDay = schedule.days[0]; // Prochaine semaine
  }

  const daysUntil = nextDay <= currentDay ? 7 - currentDay + nextDay : nextDay - currentDay;
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysUntil);
  nextDate.setHours(hours, minutes, 0, 0);

  return nextDate.toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function determineStrategy(confidence: number, riskAssessment: any): string {
  const riskLevel = riskAssessment?.overallRisk || "medium";
  
  if (confidence > 0.8 && riskLevel === "low") {
    return "Agressif - Haute confiance, faible risque";
  } else if (confidence > 0.7) {
    return "Équilibré - Bonne confiance";
  } else if (confidence > 0.6) {
    return "Conservateur - Confiance modérée";
  } else {
    return "Prudent - Confiance faible";
  }
}

function calculateOptimalBudget(predictions: DrawPrediction[]): number {
  let totalBudget = 0;
  
  predictions.forEach(pred => {
    const baseAmount = 500; // Mise de base
    const confidenceMultiplier = pred.confidence;
    const riskAdjustment = pred.riskAssessment?.overallRisk === "low" ? 1.2 : 
                          pred.riskAssessment?.overallRisk === "high" ? 0.8 : 1.0;
    
    totalBudget += baseAmount * confidenceMultiplier * riskAdjustment;
  });
  
  return Math.round(totalBudget);
}

function calculateExpectedReturn(predictions: DrawPrediction[], budget: number): number {
  const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
  const riskAdjustment = predictions.every(p => p.riskAssessment?.overallRisk === "low") ? 1.3 : 1.0;
  
  return Math.round(budget * avgConfidence * 2.5 * riskAdjustment);
}

function calculateGlobalRiskLevel(predictions: DrawPrediction[]): "low" | "medium" | "high" {
  const riskScores = predictions.map(p => {
    switch (p.riskAssessment?.overallRisk) {
      case "low": return 1;
      case "medium": return 2;
      case "high": return 3;
      default: return 2;
    }
  });
  
  const avgRisk = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;
  
  if (avgRisk <= 1.5) return "low";
  if (avgRisk <= 2.5) return "medium";
  return "high";
}

function generateSmartRecommendation(
  predictions: DrawPrediction[], 
  riskLevel: "low" | "medium" | "high", 
  avgConfidence: number
): string {
  const topPredictions = predictions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 2);
  
  if (riskLevel === "low" && avgConfidence > 0.75) {
    return `Stratégie optimale: Jouer tous les tirages. Focus sur ${topPredictions[0]?.drawName} (${(topPredictions[0]?.confidence * 100).toFixed(1)}% confiance)`;
  } else if (riskLevel === "medium" && avgConfidence > 0.65) {
    return `Stratégie équilibrée: Concentrer sur les 2 meilleurs tirages (${topPredictions.map(p => p.drawName).join(", ")})`;
  } else if (avgConfidence > 0.55) {
    return `Stratégie prudente: Jouer uniquement ${topPredictions[0]?.drawName} avec mise réduite`;
  } else {
    return "Stratégie d'attente: Conditions non optimales, reporter les mises importantes";
  }
}

async function generateFallbackPrediction(drawName: string, results: any[]): Promise<DrawPrediction> {
  // Méthode de fallback simple
  const frequency: Record<number, number> = {};
  for (let i = 1; i <= 90; i++) {
    frequency[i] = 0;
  }
  
  results.forEach((r, idx) => {
    const weight = Math.exp(-idx * 0.1);
    r.winning_numbers?.forEach((num: number) => {
      frequency[num] += weight;
    });
  });

  const topNumbers = Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([num]) => parseInt(num));

  return {
    drawName,
    drawTime: calculateNextDrawTime(drawName),
    numbers: topNumbers,
    confidence: 0.5,
    strategy: "Fallback - Fréquence simple",
    riskAssessment: {
      overallRisk: "medium",
      riskFactors: ["Méthode de fallback"],
      mitigationSuggestions: ["Utiliser des données plus complètes"],
      expectedVariance: 0.3
    }
  };
}
