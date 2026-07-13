import type { DrawResult, PredictionResult } from "./types.ts";
import { log } from "./utils.ts";

export interface AIOrchestrationResult {
  weights: Record<string, number>;
  reasoning: string;
}

export async function callAIForOrchestration(
  predictions: Map<string, PredictionResult>,
  historicalData: DrawResult[]
): Promise<AIOrchestrationResult | null> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('LOVABLE_API_KEY');
  if (!openAIApiKey) {
    log("warn", "No AI API key found for orchestration");
    return null;
  }

  const modelMetrics = Array.from(predictions.entries()).map(([name, pred]) => ({
    name,
    confidence: pred.confidence,
    score: pred.score,
    numbers: pred.numbers,
  }));

  const systemPrompt = `Tu es une IA spécialisée dans l'orchestration dynamique d'algorithmes de machine learning pour les prédictions de loterie.
Ta tâche est de déterminer les pondérations optimales (somme = 1.0) pour combiner les algorithmes suivants basés sur leurs scores récents, leur confiance et la diversité de leurs prédictions.`;

  const userPrompt = `Analyse ces algorithmes et propose des poids optimisés :
${JSON.stringify(modelMetrics, null, 2)}

Tiens compte de :
1. "Stacking Ensemble" et "Double Gap Sequence" ont des potentiels très élevés.
2. Les algorithmes avec des confiances > 85% méritent plus de poids.
3. Conserve de la diversité.`;

  const ORCHESTRATION_TOOL = {
    type: "function" as const,
    function: {
      name: "set_algorithm_weights",
      description: "Définit les poids optimisés pour la combinaison des algorithmes",
      parameters: {
        type: "object",
        properties: {
          weights: {
            type: "object",
            description: "Dictionnaire avec le nom de l'algorithme et son poids (0.0 à 1.0)",
            additionalProperties: { type: "number" }
          },
          reasoning: {
            type: "string",
            description: "Explication courte du choix des pondérations"
          }
        },
        required: ["weights", "reasoning"]
      }
    }
  };

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [ORCHESTRATION_TOOL],
        tool_choice: { type: "function", function: { name: "set_algorithm_weights" } },
      }),
    });

    if (!response.ok) {
      log("warn", "AI Orchestration request failed", { status: response.status });
      return null;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall && toolCall.function.name === "set_algorithm_weights") {
      const result = JSON.parse(toolCall.function.arguments);
      return result as AIOrchestrationResult;
    }
    
    return null;
  } catch (error) {
    log("error", "Error in AI Orchestration", { error: error instanceof Error ? error.message : error });
    return null;
  }
}
