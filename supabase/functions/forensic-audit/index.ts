// =====================================================
// FORENSIC AUDIT EDGE FUNCTION
// Audit automatique des prédictions vs résultats réels
// avec auto-calibration des algorithmes
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { forensicEngine, type PerformanceRecord, type ForensicAuditResult } from "../_shared/forensic-engine.ts";
import { log } from "../_shared/utils.ts";

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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

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

    const body = await req.json();
    const { 
      drawName, 
      applyAdjustments = false, 
      days = 30,
      runGeminiAnalysis = false
    } = body;

    // Borner les jours de recherche pour éviter les surcharges de calcul
    const safeDays = Math.min(Math.max(1, days), 90);

    log("info", "Forensic audit started (Admin Only)", { drawName, days: safeDays, isAdmin, applyAdjustments });

    // 1. Récupérer les données de performance
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - safeDays);

    let performanceQuery = supabase
      .from("algorithm_performance")
      .select("*")
      .gte("draw_date", cutoffDate.toISOString().split('T')[0])
      .order("draw_date", { ascending: false });

    if (drawName && drawName !== "all") {
      performanceQuery = performanceQuery.eq("draw_name", drawName);
    }

    const { data: performanceData, error: perfError } = await performanceQuery;

    if (perfError) {
      throw new Error(`Erreur récupération performances: ${perfError.message}`);
    }

    log("info", "Performance data fetched", { count: performanceData?.length || 0 });

    // 2. Récupérer les configurations actuelles des algorithmes
    const { data: algorithmConfigs, error: configError } = await supabase
      .from("algorithm_config")
      .select("algorithm_name, weight, parameters, is_enabled");

    if (configError) {
      throw new Error(`Erreur récupération config: ${configError.message}`);
    }

    const currentWeights = new Map<string, number>();
    const currentParams = new Map<string, Record<string, number>>();

    (algorithmConfigs || []).forEach((config: Record<string, unknown>) => {
      const algoName = config.algorithm_name as string;
      const weight = config.weight as number;
      
      currentWeights.set(algoName, weight);
      if (config.parameters) {
        currentParams.set(algoName, config.parameters as Record<string, number>);
      }
    });

    // 3. Exécuter l'audit forensic
    const auditResult = await forensicEngine.runForensicAudit(
      (performanceData || []) as PerformanceRecord[],
      currentWeights,
      currentParams
    );

    log("info", "Forensic audit completed", {
      totalPredictions: auditResult.totalPredictions,
      averageAccuracy: auditResult.averageAccuracy.toFixed(2),
      adjustmentsCount: auditResult.calibrationAdjustments.length,
      insightsCount: auditResult.insights.length,
    });

    // 4. Appliquer les ajustements (Mode simulation avec approbation requis)
    let appliedAdjustments = 0;
    
    if (applyAdjustments && isAdmin && auditResult.calibrationAdjustments.length > 0) {
      log("info", "Simulating calibration adjustments (direct database update deactivated for safety)", { count: auditResult.calibrationAdjustments.length });

      for (const adjustment of auditResult.calibrationAdjustments) {
        // Au lieu de mettre à jour la configuration réelle en production (ce qui présente un risque),
        // nous enregistrons les ajustements dans l'historique d'entraînement comme "simulé et en attente d'approbation".
        // Cela permet de valider d'abord le modèle avant la mise en production.
        appliedAdjustments++;

        // Enregistrer la proposition d'ajustement dans l'historique d'entraînement (notre journal d'audit)
        await supabase.from("algorithm_training_history").insert({
          algorithm_name: adjustment.algorithm,
          previous_weight: adjustment.previousWeight,
          new_weight: adjustment.newWeight,
          previous_parameters: adjustment.previousParams || null,
          new_parameters: adjustment.newParams || null,
          performance_improvement: null,
          training_metrics: {
            forensic_audit_id: auditResult.auditId,
            reason: adjustment.reason,
            change_percent: adjustment.changePercent,
            workflow_status: "pending_approval",
            environment: "simulation_mode",
            notes: "Ajustement automatique désactivé en production pour sécurité. En attente de validation manuelle."
          },
        });
      }

      log("info", "Calibration adjustments simulated and logged", { appliedAdjustments });
    }

    // 5. Analyse Gemini optionnelle (si demandée et disponible)
    let geminiAnalysis = null;
    
    if (runGeminiAnalysis && Deno.env.get('LOVABLE_API_KEY')) {
      try {
        geminiAnalysis = await runGeminiForensicAnalysis(auditResult);
        log("info", "Gemini forensic analysis completed");
      } catch (geminiError) {
        log("warn", "Gemini analysis failed", { 
          error: geminiError instanceof Error ? geminiError.message : 'Unknown' 
        });
      }
    }

    // 6. Sauvegarder le rapport d'audit
    const { error: saveError } = await supabase
      .from("orchestration_history")
      .insert({
        draw_name: drawName || "all",
        draw_date: new Date().toISOString().split('T')[0],
        adjustment_strategy: "forensic_audit",
        trigger_metrics: {
          totalPredictions: auditResult.totalPredictions,
          averageAccuracy: auditResult.averageAccuracy,
          calibrationError: auditResult.confidenceCalibration.calibrationError,
          performanceTrend: auditResult.performanceTrend.direction,
        },
        algorithms_analyzed: auditResult.algorithmPerformance.map(a => ({
          name: a.algorithm,
          accuracy: a.accuracy,
          f1Score: a.f1Score,
          trend: a.trend,
        })),
        weight_adjustments: auditResult.calibrationAdjustments.map(a => ({
          algorithm: a.algorithm,
          previousWeight: a.previousWeight,
          newWeight: a.newWeight,
          changePercent: a.changePercent,
          applied: applyAdjustments && isAdmin,
        })),
        parameter_adjustments: auditResult.calibrationAdjustments
          .filter(a => a.newParams)
          .map(a => ({
            algorithm: a.algorithm,
            changes: a.newParams,
          })),
        expected_improvement: auditResult.performanceTrend.direction === "improving" ? 5 : 
                             auditResult.performanceTrend.direction === "declining" ? -5 : 0,
        notes: JSON.stringify({
          insights: auditResult.insights,
          recommendations: auditResult.recommendations,
          geminiAnalysis: geminiAnalysis,
        }),
      });

    if (saveError) {
      log("warn", "Failed to save audit history", { error: saveError.message });
    }

    const executionTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        audit: auditResult,
        appliedAdjustments,
        geminiAnalysis,
        executionTime,
        message: applyAdjustments && isAdmin
          ? `Audit forensic terminé en mode simulation. ${appliedAdjustments} proposition(s) d'ajustement enregistrée(s) pour validation manuelle.`
          : `Audit forensic terminé. ${auditResult.calibrationAdjustments.length} ajustement(s) recommandé(s) en simulation.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log("error", "Forensic audit error", { error: errorMessage });

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

/**
 * Analyse Gemini des résultats forensic
 */
async function runGeminiForensicAnalysis(auditResult: ForensicAuditResult): Promise<Record<string, unknown>> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const prompt = `Tu es un expert en data science spécialisé dans l'évaluation de modèles prédictifs.

Analyse ce rapport d'audit forensic de prédictions de loterie:

═══════════════════════════════════════
RÉSUMÉ DE L'AUDIT
═══════════════════════════════════════
- Période: ${auditResult.periodStart} à ${auditResult.periodEnd}
- Total prédictions: ${auditResult.totalPredictions}
- Précision moyenne: ${auditResult.averageAccuracy.toFixed(2)}%
- Tendance: ${auditResult.performanceTrend.direction}
- Volatilité: ${auditResult.performanceTrend.volatility.toFixed(2)}

═══════════════════════════════════════
PERFORMANCE PAR ALGORITHME
═══════════════════════════════════════
${auditResult.algorithmPerformance.map(a => 
  `• ${a.algorithm}: ${a.accuracy.toFixed(1)}% précision, F1=${a.f1Score.toFixed(2)}, trend=${a.trend}`
).join('\n')}

═══════════════════════════════════════
CALIBRATION DE CONFIANCE
═══════════════════════════════════════
- Confiance moyenne annoncée: ${(auditResult.confidenceCalibration.averageConfidence * 100).toFixed(1)}%
- Précision réelle: ${(auditResult.confidenceCalibration.actualAccuracy * 100).toFixed(1)}%
- Erreur de calibration: ${(auditResult.confidenceCalibration.calibrationError * 100).toFixed(1)}%
- Surconfiance: ${auditResult.confidenceCalibration.isOverconfident ? 'OUI' : 'NON'}

═══════════════════════════════════════
INSIGHTS DÉTECTÉS
═══════════════════════════════════════
${auditResult.insights.map(i => `[${i.severity.toUpperCase()}] ${i.title}: ${i.description}`).join('\n')}

Fournis une analyse experte avec:
1. Évaluation de la santé globale du système
2. Identification des problèmes critiques
3. Recommandations prioritaires
4. Plan d'action concret`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { 
          role: 'system', 
          content: 'Tu es un expert en évaluation de modèles ML, spécialisé en systèmes prédictifs. Réponds de manière structurée et actionnable.' 
        },
        { role: 'user', content: prompt }
      ],
      tools: [{
        type: "function",
        function: {
          name: "provide_forensic_analysis",
          description: "Fournit une analyse forensic structurée du système de prédiction",
          parameters: {
            type: "object",
            properties: {
              healthScore: {
                type: "number",
                minimum: 0,
                maximum: 100,
                description: "Score de santé global du système (0-100)"
              },
              criticalIssues: {
                type: "array",
                items: { type: "string" },
                description: "Liste des problèmes critiques identifiés"
              },
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    priority: { type: "string", enum: ["haute", "moyenne", "basse"] },
                    action: { type: "string" },
                    impact: { type: "string" }
                  },
                  required: ["priority", "action", "impact"]
                },
                description: "Recommandations priorisées"
              },
              algorithmAssessment: {
                type: "object",
                additionalProperties: {
                  type: "object",
                  properties: {
                    status: { type: "string", enum: ["excellent", "bon", "attention", "critique"] },
                    recommendation: { type: "string" }
                  }
                },
                description: "Évaluation de chaque algorithme"
              },
              summary: {
                type: "string",
                maxLength: 500,
                description: "Résumé exécutif de l'analyse"
              }
            },
            required: ["healthScore", "criticalIssues", "recommendations", "summary"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "provide_forensic_analysis" } },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

  if (toolCall && toolCall.function.name === "provide_forensic_analysis") {
    return JSON.parse(toolCall.function.arguments);
  }

  // Fallback to text response
  return {
    summary: data.choices?.[0]?.message?.content || "Analyse non disponible",
    healthScore: 50,
    criticalIssues: [],
    recommendations: []
  };
}
