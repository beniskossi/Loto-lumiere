// AI Analysis Module - Analyse avancée par IA pour prédictions
// Utilise Lovable AI (Gemini 2.5 Pro) pour analyse intelligente des patterns

import type { DrawResult, PredictionResult } from "./types.ts";
import { log } from "./utils.ts";

// ============= TYPES =============

export interface AIAnalysisResult {
  recommendedNumbers: number[];
  confidence: number;
  analysis: string;
  patterns: PatternAnalysis[];
  reasoning: string[];
  timestamp: string;
  modelUsed?: string;
  advancedInsights?: AdvancedInsight[];
}

export interface PatternAnalysis {
  type: string;
  description: string;
  strength: number;
  affectedNumbers: number[];
  icon?: string;
}

export interface AdvancedInsight {
  category: "statistical" | "temporal" | "spatial" | "behavioral";
  title: string;
  description: string;
  impact: "positive" | "neutral" | "negative";
  confidence: number;
}

export interface AIAnalysisOptions {
  drawName: string;
  predictions: PredictionResult[];
  historicalData: DrawResult[];
  includePatterns?: boolean;
  maxTokens?: number;
  useAdvancedModel?: boolean;
}

// ============= PROMPTS =============

const SYSTEM_PROMPT = `Tu es un expert mondial en analyse prédictive de loterie avec 20 ans d'expérience en machine learning et statistiques appliquées.

EXPERTISE AVANCÉE:
- Analyse statistique bayésienne et markovienne
- Détection de patterns complexes (cycles, paires chaudes, séquences, gaps)
- Analyse temporelle (jours favorables, périodicité)
- Évaluation multi-critères des algorithmes ML
- Synthèse probabiliste multi-modèles
- Théorie des jeux et mathématiques combinatoires

MÉTHODOLOGIE:
1. Analyse de fréquence pondérée temporellement
2. Détection de corrélations inter-numéros
3. Évaluation de la cohérence algorithmique
4. Calcul de la dispersion statistique optimale
5. Ajustement bayésien de la confiance

RÈGLES STRICTES:
1. TOUJOURS recommander exactement 5 numéros entre 1 et 90
2. Numéros UNIQUES triés par ordre croissant
3. Score de confiance calibré 0-100 (jamais > 85 sans consensus fort)
4. Chaque pattern doit avoir un impact mesurable
5. Justifications basées sur des métriques réelles
6. Rester prudent et transparent sur les limites

IMPORTANT: La loterie reste aléatoire. Ton rôle est d'identifier les tendances statistiques pour guider, pas garantir.`;

function buildUserPrompt(options: AIAnalysisOptions): string {
  const { drawName, predictions, historicalData } = options;
  
  // Résumer les prédictions avec plus de détails
  const predictionsSummary = predictions.map((p, i) => {
    const factors = p.factors?.slice(0, 3).join(', ') || 'Non spécifié';
    return `${i+1}. ${p.algorithm}:
   - Numéros: [${p.numbers.join(', ')}]
   - Confiance: ${(p.confidence*100).toFixed(1)}%
   - Score: ${p.score.toFixed(3)}
   - Facteurs: ${factors}`;
  }).join('\n');
  
  // Analyse statistique des 20 derniers tirages
  const recentNumbers = new Map<number, number>();
  const pairFrequency = new Map<string, number>();
  
  historicalData.slice(0, 20).forEach(r => {
    r.winning_numbers.forEach((n, i) => {
      recentNumbers.set(n, (recentNumbers.get(n) || 0) + 1);
      // Analyser les paires
      for (let j = i + 1; j < r.winning_numbers.length; j++) {
        const pair = [n, r.winning_numbers[j]].sort((a, b) => a - b).join('-');
        pairFrequency.set(pair, (pairFrequency.get(pair) || 0) + 1);
      }
    });
  });
  
  const topRecent = Array.from(recentNumbers.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([n, c]) => `${n}(${c}x)`);
  
  const coldNumbers = Array.from({length: 90}, (_, i) => i + 1)
    .filter(n => !recentNumbers.has(n) || (recentNumbers.get(n) || 0) <= 1)
    .slice(0, 10);
  
  const hotPairs = Array.from(pairFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([p, c]) => `${p}(${c}x)`);
  
  // Consensus entre algorithmes
  const commonNumbers = new Map<number, string[]>();
  predictions.forEach(p => {
    p.numbers.forEach(n => {
      const algos = commonNumbers.get(n) || [];
      algos.push(p.algorithm);
      commonNumbers.set(n, algos);
    });
  });
  const consensus = Array.from(commonNumbers.entries())
    .filter(([, algos]) => algos.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([n, algos]) => `${n}(${algos.length} algos: ${algos.join(', ')})`)
    .slice(0, 8);
  
  // Analyse de la distribution
  const avgSum = historicalData.slice(0, 20).reduce((sum, r) => 
    sum + r.winning_numbers.reduce((a, b) => a + b, 0), 0) / 20;
  const avgParity = historicalData.slice(0, 20).reduce((sum, r) => 
    sum + r.winning_numbers.filter(n => n % 2 === 0).length, 0) / 20;
  
  return `TIRAGE: ${drawName}
DATE ANALYSE: ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}
HISTORIQUE DISPONIBLE: ${historicalData.length} tirages

═══════════════════════════════════════
PRÉDICTIONS DES ALGORITHMES ML (${predictions.length} modèles):
═══════════════════════════════════════
${predictionsSummary}

═══════════════════════════════════════
STATISTIQUES RÉCENTES (20 derniers tirages):
═══════════════════════════════════════
📈 Numéros CHAUDS: ${topRecent.join(', ')}
❄️ Numéros FROIDS: ${coldNumbers.join(', ')}
🔗 Paires fréquentes: ${hotPairs.join(', ')}

═══════════════════════════════════════
MÉTRIQUES CALCULÉES:
═══════════════════════════════════════
• Somme moyenne: ${avgSum.toFixed(1)} (cible: 210-230)
• Parité moyenne: ${avgParity.toFixed(1)} pairs (cible: 2-3)
• Dispersion: Zones 0-30: ?, 31-60: ?, 61-90: ?

═══════════════════════════════════════
CONSENSUS INTER-ALGORITHMES:
═══════════════════════════════════════
${consensus.length > 0 ? consensus.join('\n') : 'Aucun consensus fort détecté - Algorithmes divergents'}

═══════════════════════════════════════
MISSION:
═══════════════════════════════════════
1. Identifier tous les patterns statistiques significatifs
2. Évaluer la cohérence et fiabilité des algorithmes
3. Calculer un score de confiance calibré et honnête
4. Recommander 5 numéros optimaux avec justification
5. Fournir des insights avancés pour l'utilisateur`;
}

// ============= TOOL DEFINITION =============

const ANALYSIS_TOOL = {
  type: "function" as const,
  function: {
    name: "provide_lottery_analysis",
    description: "Fournit une analyse structurée et détaillée des prédictions de loterie avec numéros recommandés, patterns, et insights avancés",
    parameters: {
      type: "object",
      properties: {
        numbers: {
          type: "array",
          items: { type: "number", minimum: 1, maximum: 90 },
          minItems: 5,
          maxItems: 5,
          description: "Les 5 numéros recommandés, UNIQUES et triés par ordre croissant"
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 100,
          description: "Score de confiance calibré de 0 à 100. Maximum 85 sans consensus fort."
        },
        patterns: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { 
                type: "string", 
                enum: ["consensus", "hot_streak", "cold_due", "pair", "sequence", "cycle", "spatial", "temporal"],
                description: "Type de pattern détecté" 
              },
              description: { type: "string", description: "Description claire et concise du pattern" },
              strength: { type: "number", minimum: 0, maximum: 1, description: "Force du pattern (0-1)" },
              numbers: { 
                type: "array", 
                items: { type: "number" },
                description: "Numéros concernés par ce pattern" 
              }
            },
            required: ["type", "description", "strength", "numbers"],
            additionalProperties: false
          },
          description: "Tous les patterns détectés dans les données"
        },
        reasoning: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 8,
          description: "Liste des raisons justifiant les recommandations (3-8 éléments)"
        },
        advancedInsights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { 
                type: "string", 
                enum: ["statistical", "temporal", "spatial", "behavioral"],
                description: "Catégorie de l'insight"
              },
              title: { type: "string", description: "Titre court de l'insight" },
              description: { type: "string", description: "Explication détaillée" },
              impact: { 
                type: "string", 
                enum: ["positive", "neutral", "negative"],
                description: "Impact sur la prédiction"
              },
              confidence: { type: "number", minimum: 0, maximum: 100 }
            },
            required: ["category", "title", "description", "impact", "confidence"],
            additionalProperties: false
          },
          description: "Insights avancés pour une compréhension approfondie"
        },
        summary: {
          type: "string",
          maxLength: 300,
          description: "Résumé exécutif de l'analyse (max 300 caractères)"
        }
      },
      required: ["numbers", "confidence", "patterns", "reasoning", "advancedInsights", "summary"],
      additionalProperties: false
    }
  }
};

// ============= API CALL =============

/**
 * Appelle l'API Lovable AI (Gemini) pour analyse avancée
 * Utilise gemini-2.5-pro pour les analyses complexes, flash pour les rapides
 */
export async function callAIForAnalysis(options: AIAnalysisOptions): Promise<AIAnalysisResult> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }
  
  const userPrompt = buildUserPrompt(options);
  
  // Utiliser le modèle pro pour les analyses avancées
  const model = options.useAdvancedModel 
    ? 'google/gemini-2.5-pro' 
    : 'google/gemini-2.5-flash';
  
  log("info", "Calling Lovable AI for analysis", { 
    drawName: options.drawName, 
    model,
    predictionsCount: options.predictions.length 
  });
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: "function", function: { name: "provide_lottery_analysis" } },
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    log("error", "Lovable AI error", { status: response.status, error: errorText });
    
    if (response.status === 429) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
    if (response.status === 402) {
      throw new Error("CREDITS_EXHAUSTED");
    }
    throw new Error(`AI_ERROR: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Extraire le résultat du tool call
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall || toolCall.function.name !== "provide_lottery_analysis") {
    log("warn", "No tool call in response, parsing content");
    return parseTextResponse(data.choices?.[0]?.message?.content || "", options.predictions, model);
  }
  
  try {
    const result = JSON.parse(toolCall.function.arguments);
    
    // Valider et normaliser les numéros
    const uniqueNumbers = [...new Set(result.numbers as number[])];
    const validNumbers = uniqueNumbers
      .filter((n: number) => n >= 1 && n <= 90)
      .slice(0, 5)
      .sort((a: number, b: number) => a - b);
    
    if (validNumbers.length !== 5) {
      log("warn", "Invalid numbers count from AI, supplementing", { got: validNumbers.length });
      // Compléter avec des numéros du consensus si nécessaire
      const allNumbers = options.predictions.flatMap(p => p.numbers);
      const numberCounts = new Map<number, number>();
      allNumbers.forEach(n => numberCounts.set(n, (numberCounts.get(n) || 0) + 1));
      const topNumbers = Array.from(numberCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([n]) => n)
        .filter(n => !validNumbers.includes(n));
      
      while (validNumbers.length < 5 && topNumbers.length > 0) {
        validNumbers.push(topNumbers.shift()!);
      }
      validNumbers.sort((a, b) => a - b);
    }
    
    // Mapper les patterns avec icônes
    const patternIcons: Record<string, string> = {
      consensus: "🤝",
      hot_streak: "🔥",
      cold_due: "❄️",
      pair: "🔗",
      sequence: "📈",
      cycle: "🔄",
      spatial: "📊",
      temporal: "⏰",
    };
    
    interface AIPatternResponse {
      type: string;
      description: string;
      strength: number;
      numbers?: number[];
    }
    
    const patterns: PatternAnalysis[] = (result.patterns || []).map((p: AIPatternResponse) => ({
      type: p.type,
      description: p.description,
      strength: Math.min(1, Math.max(0, p.strength)),
      affectedNumbers: p.numbers || [],
      icon: patternIcons[p.type] || "📌",
    }));
    
    return {
      recommendedNumbers: validNumbers,
      confidence: Math.min(100, Math.max(0, result.confidence)),
      analysis: result.summary,
      patterns,
      reasoning: result.reasoning || [],
      advancedInsights: result.advancedInsights || [],
      timestamp: new Date().toISOString(),
      modelUsed: model,
    };
    
  } catch (parseError) {
    log("error", "Failed to parse tool call", { error: parseError });
    return parseTextResponse(data.choices?.[0]?.message?.content || "", options.predictions, model);
  }
}

/**
 * Parse une réponse texte si le tool call échoue
 */
function parseTextResponse(text: string, predictions: PredictionResult[], model: string): AIAnalysisResult {
  // Essayer d'extraire des numéros du texte
  const numbersMatch = text.match(/\b([1-9]|[1-8][0-9]|90)\b/g);
  const uniqueNumbers = numbersMatch 
    ? Array.from(new Set(numbersMatch.map(Number))).filter(n => n >= 1 && n <= 90)
    : [];
  
  const recommendedNumbers = uniqueNumbers.length >= 5
    ? uniqueNumbers.slice(0, 5).sort((a, b) => a - b)
    : predictions[0]?.numbers || [5, 23, 42, 61, 78];
  
  // Extraire confiance
  const confidenceMatch = text.match(/(\d+)\s*%/);
  const confidence = confidenceMatch ? Math.min(85, parseInt(confidenceMatch[1])) : 65;
  
  return {
    recommendedNumbers,
    confidence,
    analysis: text.slice(0, 500) || "Analyse textuelle générée par l'IA.",
    patterns: [],
    reasoning: ["Analyse textuelle (mode fallback)", "Données extraites de la réponse IA"],
    advancedInsights: [],
    timestamp: new Date().toISOString(),
    modelUsed: model,
  };
}


// ============= ANALYSIS HELPERS =============

/**
 * Analyse rapide sans appel IA (pour fallback ou économie)
 */
export function performQuickAnalysis(
  predictions: PredictionResult[],
  historicalData: DrawResult[]
): AIAnalysisResult {
  // Fusion par vote pondéré avec bonus de position
  const numberVotes = new Map<number, number>();
  
  predictions.forEach(pred => {
    pred.numbers.forEach((num, idx) => {
      const positionWeight = (5 - idx) / 15;
      const confidenceWeight = pred.confidence;
      const scoreWeight = pred.score / 10;
      const vote = positionWeight + confidenceWeight + scoreWeight;
      numberVotes.set(num, (numberVotes.get(num) || 0) + vote);
    });
  });
  
  // Top 5 par votes
  const sortedNumbers = Array.from(numberVotes.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([num]) => num);
  
  const recommendedNumbers = sortedNumbers.slice(0, 5).sort((a, b) => a - b);
  
  // Calculer confiance basée sur consensus
  const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
  const consensusNumbers = sortedNumbers.filter(n => 
    predictions.filter(p => p.numbers.includes(n)).length >= 2
  );
  const consensusBonus = consensusNumbers.length * 0.03;
  
  // Plafonner la confiance à 80% pour l'analyse rapide
  const confidence = Math.min(80, (avgConfidence * 100) + (consensusBonus * 100));
  
  // Détecter patterns
  const patterns: PatternAnalysis[] = [];
  
  // Pattern: consensus fort
  const strongConsensus = recommendedNumbers.filter(n =>
    predictions.filter(p => p.numbers.includes(n)).length >= 3
  );
  if (strongConsensus.length > 0) {
    patterns.push({
      type: "consensus",
      description: `${strongConsensus.length} numéros recommandés par 3+ algorithmes`,
      strength: strongConsensus.length / 5,
      affectedNumbers: strongConsensus,
      icon: "🤝",
    });
  }
  
  // Pattern: numéros chauds
  const recentHot = new Set<number>();
  historicalData.slice(0, 5).forEach(r => {
    r.winning_numbers.forEach(n => recentHot.add(n));
  });
  const hotInPrediction = recommendedNumbers.filter(n => recentHot.has(n));
  if (hotInPrediction.length >= 2) {
    patterns.push({
      type: "hot_streak",
      description: `${hotInPrediction.length} numéros "chauds" des 5 derniers tirages`,
      strength: hotInPrediction.length / 5,
      affectedNumbers: hotInPrediction,
      icon: "🔥",
    });
  }
  
  // Pattern: numéros froids (retard)
  const allRecent = new Set<number>();
  historicalData.slice(0, 15).forEach(r => {
    r.winning_numbers.forEach(n => allRecent.add(n));
  });
  const coldNumbers = recommendedNumbers.filter(n => !allRecent.has(n));
  if (coldNumbers.length >= 1) {
    patterns.push({
      type: "cold_due",
      description: `${coldNumbers.length} numéros en retard (absents des 15 derniers tirages)`,
      strength: coldNumbers.length / 3,
      affectedNumbers: coldNumbers,
      icon: "❄️",
    });
  }
  
  // Pattern: distribution spatiale
  const zones = new Set(recommendedNumbers.map(n => Math.floor((n - 1) / 30)));
  if (zones.size >= 3) {
    patterns.push({
      type: "spatial",
      description: `Excellente distribution sur ${zones.size} zones (1-30, 31-60, 61-90)`,
      strength: zones.size / 3,
      affectedNumbers: recommendedNumbers,
      icon: "📊",
    });
  }
  
  // Insights avancés basiques
  const advancedInsights: AdvancedInsight[] = [
    {
      category: "statistical",
      title: "Fusion multi-algorithmes",
      description: `Analyse synthétique de ${predictions.length} algorithmes ML avec vote pondéré`,
      impact: avgConfidence > 0.7 ? "positive" : "neutral",
      confidence: avgConfidence * 100,
    },
  ];
  
  if (consensusNumbers.length >= 3) {
    advancedInsights.push({
      category: "behavioral",
      title: "Fort consensus détecté",
      description: `${consensusNumbers.length} numéros présents dans plusieurs prédictions indépendantes`,
      impact: "positive",
      confidence: 75,
    });
  }
  
  return {
    recommendedNumbers,
    confidence,
    analysis: `Analyse synthétique de ${predictions.length} algorithmes ML. ${patterns.length} patterns statistiques identifiés. Confiance calibrée: ${confidence.toFixed(1)}%.`,
    patterns,
    reasoning: [
      `Fusion pondérée de ${predictions.length} prédictions algorithmiques`,
      `Confiance moyenne des modèles: ${(avgConfidence * 100).toFixed(1)}%`,
      patterns.length > 0 ? `${patterns.length} patterns significatifs détectés` : "Distribution équilibrée sans pattern dominant",
      `Historique analysé: ${historicalData.length} tirages`,
    ],
    advancedInsights,
    timestamp: new Date().toISOString(),
    modelUsed: "quick-analysis",
  };
}

/**
 * Enrichit une analyse avec des données supplémentaires
 */
export function enrichAnalysis(
  baseAnalysis: AIAnalysisResult,
  historicalData: DrawResult[]
): AIAnalysisResult {
  const enrichedPatterns = [...baseAnalysis.patterns];
  const enrichedReasoning = [...baseAnalysis.reasoning];
  const enrichedInsights = [...(baseAnalysis.advancedInsights || [])];
  
  // Vérifier la régularité des numéros recommandés
  const numberRegularity = baseAnalysis.recommendedNumbers.map(num => {
    const appearances = historicalData.filter(r => r.winning_numbers.includes(num)).length;
    return { num, rate: appearances / historicalData.length };
  });
  
  const highRegularity = numberRegularity.filter(n => n.rate > 0.08);
  if (highRegularity.length > 0 && !enrichedPatterns.some(p => p.type === "regularity")) {
    enrichedPatterns.push({
      type: "cycle",
      description: `${highRegularity.length} numéros avec régularité élevée (>8% historique)`,
      strength: highRegularity.length / 5,
      affectedNumbers: highRegularity.map(n => n.num),
      icon: "🔄",
    });
    enrichedReasoning.push(`Régularité historique validée pour ${highRegularity.length} numéros`);
  }
  
  // Vérifier la distribution spatiale
  const zones = baseAnalysis.recommendedNumbers.map(n => Math.floor((n - 1) / 30));
  const uniqueZones = new Set(zones);
  if (uniqueZones.size >= 3 && !enrichedPatterns.some(p => p.type === "spatial")) {
    enrichedInsights.push({
      category: "spatial",
      title: "Distribution optimale",
      description: `Les numéros couvrent ${uniqueZones.size} zones distinctes, assurant une diversité spatiale`,
      impact: "positive",
      confidence: 80,
    });
  }
  
  // Vérifier la somme et parité
  const sum = baseAnalysis.recommendedNumbers.reduce((a, b) => a + b, 0);
  const evenCount = baseAnalysis.recommendedNumbers.filter(n => n % 2 === 0).length;
  
  if (sum >= 180 && sum <= 260 && evenCount >= 2 && evenCount <= 3) {
    enrichedInsights.push({
      category: "statistical",
      title: "Équilibre mathématique",
      description: `Somme (${sum}) et parité (${evenCount} pairs) dans les plages optimales historiques`,
      impact: "positive",
      confidence: 70,
    });
  }
  
  return {
    ...baseAnalysis,
    patterns: enrichedPatterns,
    reasoning: enrichedReasoning,
    advancedInsights: enrichedInsights,
  };
}
