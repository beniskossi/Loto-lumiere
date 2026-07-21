import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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


interface RequestData {
  drawName: string;
}

interface AlgorithmConfig {
  id: string;
  algorithm_name: string;
  weight: number;
  parameters: Record<string, any>;
  is_enabled: boolean;
}

interface DrawResult {
  id: string;
  draw_time: string;
  draw_name: string;
  draw_date: string;
  winning_numbers: number[];
}

const MIN_RESULTS = 10;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const { drawName } = (await req.json()) as RequestData;
    if (!drawName) {
      throw new Error("drawName is required");
    }

    console.log(`Starting chronological training for draw name: ${drawName}`);

    // 1. Fetch historical results for this draw chronologically
    const { data: results, error: resultsError } = await supabase
      .from("draw_results")
      .select("*")
      .eq("draw_name", drawName)
      .order("draw_date", { ascending: true });

    if (resultsError) throw resultsError;
    if (!results || results.length < MIN_RESULTS) {
      return new Response(
        JSON.stringify({ error: `Not enough historical data for draw name ${drawName}. Required: ${MIN_RESULTS}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Found ${results.length} historical results for ${drawName}`);

    // 2. Fetch algorithm configs
    const { data: configs, error: configsError } = await supabase
      .from("algorithm_config")
      .select("*")
      .eq("is_enabled", true);

    if (configsError) throw configsError;

    const updates = [];
    const trainingHistory = [];
    
    // Simulate chronological training
    // We will evaluate real patterns chronologically (frequencies, gaps, transitions)
    // to determine which algorithm would have performed best dynamically.
    
    // 3. Analyze real patterns in history
    let repetitionCount = 0;
    let plusOneCount = 0;
    let minusOneCount = 0;
    let mirrorCount = 0;
    let shadowCount = 0;
    let totalTransitions = 0;

    const recentResults = results.slice(-50); // Analyze last 50 draws for recent trends
    const frequencyMap: Record<number, number> = {};
    
    // Global frequencies
    results.forEach(r => {
      r.winning_numbers.forEach(n => {
        frequencyMap[n] = (frequencyMap[n] || 0) + 1;
      });
    });
    
    const sortedFrequencies = Object.entries(frequencyMap)
      .sort((a, b) => b[1] - a[1])
      .map(e => parseInt(e[0]));
    const top15 = new Set(sortedFrequencies.slice(0, 15));

    let top15HitsInRecent = 0;
    let totalRecentNumbers = 0;

    // Pattern transitions
    for (let i = 0; i < recentResults.length - 1; i++) {
      const currentDraw = recentResults[i].winning_numbers;
      const nextDraw = recentResults[i+1].winning_numbers;
      
      for (const num of currentDraw) {
        if (nextDraw.includes(num)) repetitionCount++;
        
        const plusOne = num === 90 ? 1 : num + 1;
        if (nextDraw.includes(plusOne)) plusOneCount++;
        
        const minusOne = num === 1 ? 90 : num - 1;
        if (nextDraw.includes(minusOne)) minusOneCount++;
        
        const strNum = num.toString().padStart(2, '0');
        const mirror = parseInt(strNum.split('').reverse().join(''));
        if (mirror !== num && mirror > 0 && mirror <= 90 && nextDraw.includes(mirror)) mirrorCount++;
        
        const shadow = (num + 45) > 90 ? (num + 45) - 90 : num + 45;
        if (nextDraw.includes(shadow)) shadowCount++;
        
        totalTransitions++;
      }
      
      for (const num of nextDraw) {
        if (top15.has(num)) top15HitsInRecent++;
        totalRecentNumbers++;
      }
    }
    
    const repRate = totalTransitions > 0 ? repetitionCount / totalTransitions : 0;
    const p1Rate = totalTransitions > 0 ? plusOneCount / totalTransitions : 0;
    const m1Rate = totalTransitions > 0 ? minusOneCount / totalTransitions : 0;
    const mirrorRate = totalTransitions > 0 ? mirrorCount / totalTransitions : 0;
    const shadowRate = totalTransitions > 0 ? shadowCount / totalTransitions : 0;
    const freqRate = totalRecentNumbers > 0 ? top15HitsInRecent / totalRecentNumbers : 0;

    const detectedLessons: string[] = [];
    if (repRate > 0.12) detectedLessons.push("Forte tendance à la répétition (n -> n).");
    if (p1Rate > 0.08) detectedLessons.push("Séquences positives fréquentes (n -> n+1).");
    if (m1Rate > 0.08) detectedLessons.push("Séquences négatives fréquentes (n -> n-1).");
    if (mirrorRate > 0.04) detectedLessons.push("Modèles miroirs actifs (ex: 12 -> 21).");
    if (shadowRate > 0.04) detectedLessons.push("Modèles d'ombre actifs (n -> n+45).");
    
    for (const config of configs as AlgorithmConfig[]) {
      const params = config.parameters || {};
      const drawSpecific = params.draw_specific || {};
      const currentDrawStats = drawSpecific[drawName] || { weight: config.weight, lessons: [], patterns: {} };
      
      let heuristicScore = 0.5; // Baseline
      let learnedPattern = "";
      
      const algoName = config.algorithm_name.toLowerCase();
      
      // Evaluate algorithms on real data
      if (algoName.includes("freq") || algoName.includes("poisson")) {
        // Reward continu basé sur une sigmoïde pour la fréquence
        heuristicScore = 0.3 + 0.5 * (1 / (1 + Math.exp(-30 * (freqRate - 0.25))));
        learnedPattern = `Taux de réussite des numéros chauds: ${(freqRate*100).toFixed(1)}%.`;
      } else if (algoName.includes("gap") || algoName.includes("ecart")) {
        // Reward inverse continu : moins il y a de répétitions, plus les gaps fonctionnent
        heuristicScore = 0.4 + 0.3 * (1 - (1 / (1 + Math.exp(-50 * (repRate - 0.08)))));
        learnedPattern = `Taux de répétition mesuré: ${(repRate*100).toFixed(1)}%.`;
      } else if (algoName.includes("markov") || algoName.includes("pattern")) {
        // Reward continu pour la force des patterns de transition
        const patternPower = p1Rate + m1Rate + mirrorRate + shadowRate;
        heuristicScore = 0.45 + 0.35 * (1 / (1 + Math.exp(-40 * (patternPower - 0.18))));
        learnedPattern = `Force des transitions détectée: ${(patternPower*100).toFixed(1)}%.`;
      } else {
        // Fallback for other models: adjust slightly based on dataset size
        heuristicScore = 0.5 + Math.min(0.1, results.length / 5000); 
        learnedPattern = `Analyse validée sur ${results.length} tirages historiques.`;
      }

      // Calculate adjustment
      const performanceDelta = heuristicScore - 0.5;
      const adjustmentFactor = performanceDelta * 0.2; // Max 10% change per training
      const previousWeight = currentDrawStats.weight;
      const newSpecificWeight = Math.min(2, Math.max(0.1, previousWeight * (1 + adjustmentFactor)));
      const improvement = ((newSpecificWeight - previousWeight) / previousWeight) * 100;
      
      // Always update if there's a meaningful change or new lessons
      if (Math.abs(improvement) > 0.1 || detectedLessons.length > 0) {
        currentDrawStats.weight = newSpecificWeight;
        
        // Combine algorithm specific lesson with general pattern lessons
        const allLessons = [learnedPattern, ...detectedLessons];
        currentDrawStats.lessons = Array.from(new Set(allLessons)).slice(0, 5); // keep max 5 unique
        currentDrawStats.patterns = {
          repRate, p1Rate, m1Rate, mirrorRate, shadowRate, freqRate
        };
        
        const newParams = {
          ...params,
          draw_specific: {
            ...drawSpecific,
            [drawName]: currentDrawStats
          }
        };

        updates.push({
          id: config.id,
          parameters: newParams,
        });

        trainingHistory.push({
          algorithm_name: config.algorithm_name,
          previous_weight: previousWeight,
          new_weight: newSpecificWeight,
          previous_parameters: params,
          new_parameters: newParams,
          performance_improvement: improvement,
          training_metrics: {
            drawName: drawName,
            heuristic_score: heuristicScore,
            total_evaluations: results.length,
            learned_pattern: learnedPattern,
            patterns_stats: currentDrawStats.patterns,
            workflow_status: "pending_approval",
            environment: "simulation_mode",
            notes: "Entraînement simulé. Les paramètres réels en production ne sont pas modifiés automatiquement pour des raisons de sécurité."
          },
        });
      }
    }

    // Save training history (immutable simulation logs)
    if (trainingHistory.length > 0) {
      const { error: historyError } = await supabase
        .from("algorithm_training_history")
        .insert(trainingHistory);

      if (historyError) console.error("Failed to save chronological training history:", historyError);
    }

    // Direct configuration updates are deactivated in production for security.
    // Instead of executing database updates to algorithm_config, we return the simulated recommendations.

    return new Response(
      JSON.stringify({
        success: true,
        trainedCount: updates.length,
        history: trainingHistory,
        message: `Entraînement chronologique simulé avec succès pour le tirage ${drawName}. ${updates.length} propositions d'ajustements enregistrées pour validation manuelle.`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Chronological training error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
