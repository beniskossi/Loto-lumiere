import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RateLimiter, getClientIdentifier, createRateLimitResponse } from "../_shared/rate-limiter.ts";
import { log } from "../_shared/utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiter: 2 requêtes par minute (validation intensive)
const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 2 });

interface ValidationResult {
  service: string;
  status: "success" | "warning" | "error";
  responseTime: number;
  details: string;
  errors?: string[];
}

interface ValidationReport {
  timestamp: string;
  overallStatus: "healthy" | "degraded" | "critical";
  totalServices: number;
  successfulServices: number;
  failedServices: number;
  avgResponseTime: number;
  results: ValidationResult[];
  recommendations: string[];
}

const SERVICES_TO_TEST = [
  {
    name: "advanced-ai-prediction-v2",
    endpoint: "/advanced-ai-prediction-v2",
    payload: { drawName: "National" },
    expectedFields: ["predictions", "optimizedPrediction"],
    timeout: 30000
  },
  {
    name: "generate-prediction-v2",
    endpoint: "/generate-prediction-v2",
    payload: { drawName: "National" },
    expectedFields: ["success", "predictions"],
    timeout: 15000
  },
  {
    name: "multi-draw-prediction",
    endpoint: "/multi-draw-prediction",
    payload: { drawNames: ["National", "Prestige"] },
    expectedFields: ["predictions", "totalBudget"],
    timeout: 20000
  },
  {
    name: "personalized-prediction",
    endpoint: "/personalized-prediction",
    payload: { drawName: "National" },
    expectedFields: ["prediction"],
    timeout: 15000
  },
  {
    name: "evaluate-algorithms",
    endpoint: "/evaluate-algorithms",
    payload: { drawName: "National" },
    expectedFields: ["drawName", "evaluations"],
    timeout: 25000
  },
  {
    name: "select-best-algorithm",
    endpoint: "/select-best-algorithm",
    payload: { drawName: "National" },
    expectedFields: ["success", "recommendation"],
    timeout: 10000
  },
  {
    name: "multi-algorithm-comparison",
    endpoint: "/multi-algorithm-comparison",
    payload: { drawName: "National" },
    expectedFields: ["topAlgorithms", "consensus"],
    timeout: 15000
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérifier le rate limit
    const clientId = getClientIdentifier(req);
    const rateInfo = rateLimiter.getInfo(clientId);
    
    if (!rateInfo.allowed) {
      log("warn", "Rate limit exceeded for validation", { clientId });
      return createRateLimitResponse(rateInfo.resetIn, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    log("info", "Starting automated validation", { userId: user.id });

    const startTime = Date.now();
    const results: ValidationResult[] = [];

    // Tester chaque service
    for (const service of SERVICES_TO_TEST) {
      const result = await validateService(service, authHeader);
      results.push(result);
      
      // Petite pause entre les tests pour éviter la surcharge
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Générer le rapport
    const report = generateValidationReport(results, Date.now() - startTime);

    // Sauvegarder le rapport en base
    await saveValidationReport(supabase, report, user.id);

    log("info", "Validation completed", { 
      totalServices: report.totalServices,
      successful: report.successfulServices,
      failed: report.failedServices,
      status: report.overallStatus
    });

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    log("error", "Validation error", { error: error instanceof Error ? error.message : error });
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function validateService(
  service: {
    name: string;
    endpoint: string;
    payload: Record<string, unknown>;
    expectedFields: string[];
    timeout: number;
  },
  authHeader: string
): Promise<ValidationResult> {
  const startTime = Date.now();
  
  try {
    log("info", `Testing service: ${service.name}`);

    // Construire l'URL du service
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || '';
    const functionUrl = `${baseUrl}/functions/v1${service.endpoint}`;

    // Créer le contrôleur d'abort pour le timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), service.timeout);

    // Faire la requête
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(service.payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    // Vérifier le statut de la réponse
    if (!response.ok) {
      const errorText = await response.text();
      return {
        service: service.name,
        status: "error",
        responseTime,
        details: `HTTP ${response.status}: ${errorText}`,
        errors: [`HTTP error: ${response.status}`]
      };
    }

    // Parser la réponse JSON
    let responseData;
    try {
      responseData = await response.json();
    } catch (parseError) {
      return {
        service: service.name,
        status: "error",
        responseTime,
        details: "Invalid JSON response",
        errors: ["JSON parse error"]
      };
    }

    // Vérifier les champs attendus
    const missingFields = service.expectedFields.filter(field => 
      !(field in responseData)
    );

    if (missingFields.length > 0) {
      return {
        service: service.name,
        status: "warning",
        responseTime,
        details: `Missing expected fields: ${missingFields.join(', ')}`,
        errors: missingFields.map(field => `Missing field: ${field}`)
      };
    }

    // Vérifications spécifiques par service
    const specificValidation = validateServiceSpecific(service.name, responseData);
    if (specificValidation.errors.length > 0) {
      return {
        service: service.name,
        status: specificValidation.errors.length > 2 ? "error" : "warning",
        responseTime,
        details: specificValidation.details,
        errors: specificValidation.errors
      };
    }

    // Vérifier le temps de réponse
    let status: "success" | "warning" = "success";
    let details = "Service functioning correctly";
    
    if (responseTime > service.timeout * 0.8) {
      status = "warning";
      details = `Slow response time: ${responseTime}ms`;
    }

    return {
      service: service.name,
      status,
      responseTime,
      details
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        service: service.name,
        status: "error",
        responseTime,
        details: `Timeout after ${service.timeout}ms`,
        errors: ["Request timeout"]
      };
    }

    return {
      service: service.name,
      status: "error",
      responseTime,
      details: error instanceof Error ? error.message : 'Unknown error',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

function validateServiceSpecific(serviceName: string, responseData: Record<string, unknown>): { details: string; errors: string[] } {
  const errors: string[] = [];
  let details = "Specific validation passed";

  switch (serviceName) {
    case "advanced-ai-prediction-v2": {
      if (responseData.predictions && Array.isArray(responseData.predictions)) {
        if (responseData.predictions.length === 0) {
          errors.push("No predictions returned");
        } else {
          // Vérifier la structure des prédictions
          responseData.predictions.forEach((pred: Record<string, unknown>, index: number) => {
            if (!pred.numbers || !Array.isArray(pred.numbers) || pred.numbers.length !== 5) {
              errors.push(`Prediction ${index}: Invalid numbers array`);
            }
            if (typeof pred.confidence !== 'number' || pred.confidence < 0 || pred.confidence > 1) {
              errors.push(`Prediction ${index}: Invalid confidence value`);
            }
          });
        }
      }
      
      const optimizedPrediction = responseData.optimizedPrediction as Record<string, unknown> | undefined;
      if (optimizedPrediction) {
        if (!optimizedPrediction.numbers || (optimizedPrediction.numbers as number[]).length !== 5) {
          errors.push("Optimized prediction: Invalid numbers");
        }
        if (!optimizedPrediction.optimizationMetrics) {
          errors.push("Optimized prediction: Missing optimization metrics");
        }
      }
      break;
    }

    case "multi-draw-prediction": {
      if (responseData.predictions && Array.isArray(responseData.predictions)) {
        if (responseData.predictions.length === 0) {
          errors.push("No multi-draw predictions returned");
        }
        responseData.predictions.forEach((pred: Record<string, unknown>, index: number) => {
          if (!pred.drawName || !pred.numbers || !pred.strategy) {
            errors.push(`Multi-draw prediction ${index}: Missing required fields`);
          }
        });
      }
      
      if (typeof responseData.totalBudget !== 'number' || responseData.totalBudget <= 0) {
        errors.push("Invalid total budget");
      }
      break;
    }

    case "personalized-prediction": {
      const personalizedPrediction = responseData.prediction as Record<string, unknown> | undefined;
      if (personalizedPrediction) {
        if (!personalizedPrediction.numbers || (personalizedPrediction.numbers as number[]).length !== 5) {
          errors.push("Personalized prediction: Invalid numbers");
        }
        if (responseData.isPersonalized === undefined) {
          errors.push("Missing personalization flag");
        }
      }
      break;
    }

    case "evaluate-algorithms": {
      if (responseData.evaluations && Array.isArray(responseData.evaluations)) {
        if (responseData.evaluations.length === 0) {
          errors.push("No algorithm evaluations returned");
        }
        responseData.evaluations.forEach((evaluation: Record<string, unknown>, index: number) => {
          if (typeof evaluation.accuracy !== 'number') {
            errors.push(`Evaluation ${index}: Invalid accuracy`);
          }
        });
      }
      break;
    }

    case "select-best-algorithm":
      if (responseData.recommendation) {
        if (!responseData.recommendation.primary) {
          errors.push("Missing primary algorithm recommendation");
        }
      }
      break;

    case "multi-algorithm-comparison":
      if (responseData.topAlgorithms && Array.isArray(responseData.topAlgorithms)) {
        if (responseData.topAlgorithms.length === 0) {
          errors.push("No top algorithms returned");
        }
      }
      
      if (responseData.consensus && !responseData.consensus.numbers) {
        errors.push("Invalid consensus data");
      }
      break;
  }

  if (errors.length > 0) {
    details = `Validation issues found: ${errors.length} error(s)`;
  }

  return { details, errors };
}

function generateValidationReport(results: ValidationResult[], totalTime: number): ValidationReport {
  const successfulServices = results.filter(r => r.status === "success").length;
  const failedServices = results.filter(r => r.status === "error").length;
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

  let overallStatus: "healthy" | "degraded" | "critical" = "healthy";
  
  if (failedServices > 0) {
    overallStatus = failedServices > results.length / 2 ? "critical" : "degraded";
  } else if (results.some(r => r.status === "warning")) {
    overallStatus = "degraded";
  }

  const recommendations = generateRecommendations(results, avgResponseTime);

  return {
    timestamp: new Date().toISOString(),
    overallStatus,
    totalServices: results.length,
    successfulServices,
    failedServices,
    avgResponseTime: Math.round(avgResponseTime),
    results: results.sort((a, b) => {
      const statusOrder = { error: 3, warning: 2, success: 1 };
      return statusOrder[b.status] - statusOrder[a.status];
    }),
    recommendations
  };
}

function generateRecommendations(results: ValidationResult[], avgResponseTime: number): string[] {
  const recommendations: string[] = [];

  // Recommandations basées sur les erreurs
  const errorServices = results.filter(r => r.status === "error");
  if (errorServices.length > 0) {
    recommendations.push(`${errorServices.length} service(s) en erreur nécessitent une intervention immédiate`);
    
    const timeoutErrors = errorServices.filter(r => r.errors?.includes("Request timeout"));
    if (timeoutErrors.length > 0) {
      recommendations.push("Plusieurs services ont des timeouts - vérifier les performances serveur");
    }
  }

  // Recommandations basées sur les performances
  if (avgResponseTime > 10000) {
    recommendations.push("Temps de réponse moyen élevé - optimiser les performances");
  }

  const slowServices = results.filter(r => r.responseTime > 15000);
  if (slowServices.length > 0) {
    recommendations.push(`${slowServices.length} service(s) lent(s): ${slowServices.map(s => s.service).join(', ')}`);
  }

  // Recommandations basées sur les warnings
  const warningServices = results.filter(r => r.status === "warning");
  if (warningServices.length > 2) {
    recommendations.push("Plusieurs services ont des avertissements - révision recommandée");
  }

  // Recommandations générales
  if (results.every(r => r.status === "success")) {
    recommendations.push("Tous les services fonctionnent correctement - système en bonne santé");
  }

  return recommendations;
}

async function saveValidationReport(supabase: ReturnType<typeof createClient>, report: ValidationReport, userId: string): Promise<void> {
  try {
    // Sauvegarder le rapport principal
    const { data: reportData, error: reportError } = await supabase
      .from('validation_reports')
      .insert({
        timestamp: report.timestamp,
        overall_status: report.overallStatus,
        total_services: report.totalServices,
        successful_services: report.successfulServices,
        failed_services: report.failedServices,
        avg_response_time: report.avgResponseTime,
        recommendations: report.recommendations,
        created_by: userId
      })
      .select()
      .single();

    if (reportError) {
      log("error", "Failed to save validation report", { error: reportError });
      return;
    }

    // Sauvegarder les résultats détaillés
    const detailsToInsert = report.results.map(result => ({
      report_id: reportData.id,
      service_name: result.service,
      status: result.status,
      response_time: result.responseTime,
      details: result.details,
      errors: result.errors || []
    }));

    const { error: detailsError } = await supabase
      .from('validation_report_details')
      .insert(detailsToInsert);

    if (detailsError) {
      log("error", "Failed to save validation details", { error: detailsError });
    } else {
      log("info", "Validation report saved successfully", { reportId: reportData.id });
    }
  } catch (error) {
    log("error", "Error saving validation report", { error });
  }
}