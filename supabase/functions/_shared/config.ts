// Configuration dynamique chargée depuis la base de données
// Valeurs par défaut utilisées si la config n'est pas disponible

import { createClient } from "npm:@supabase/supabase-js@2";
import { log } from "./utils.ts";

export interface OptimalGapConfig {
  min: number;
  max: number;
  boost: number;
}

export interface GapThresholdConfig {
  zscore: number;
}

export interface WeightsConfig {
  frequency: number;
  gap: number;
  echo: number;
  pairs: number;
  equilibrium: number;
  temporal: number;
  momentum: number;
  spatial: number;
}

// Valeurs par défaut OPTIMISÉES (basées sur analyse data science)
// Gap optimal élargi: μ ± σ typique = 10-22 au lieu de 11-20
const DEFAULT_OPTIMAL_GAP: OptimalGapConfig = {
  min: 10,
  max: 22,
  boost: 0.40, // Boost augmenté de 35% à 40%
};

const DEFAULT_GAP_THRESHOLD: GapThresholdConfig = {
  zscore: 1.0, // Seuil réduit de 1.2 à 1.0 pour capturer plus de candidats
};

// Pondérations OPTIMISÉES pour score composite
// Gap: 30% (↑ de 20%), Echo: 15% (↓ de 20%), Equilibrium: 10% (↓)
const DEFAULT_WEIGHTS: WeightsConfig = {
  frequency: 0.25,      // Inchangé - indicateur fondamental
  gap: 0.30,            // ↑ Augmenté: gap 10-22 = meilleur prédicteur
  echo: 0.12,           // ↓ Réduit: corrélation faible observée
  pairs: 0.12,          // Inchangé - patterns stables
  equilibrium: 0.06,    // ↓ Réduit: contrainte plutôt qu'indicateur
  temporal: 0.06,       // Légèrement réduit
  momentum: 0.05,       // Légèrement réduit
  spatial: 0.04,        // Légèrement réduit
};

// Cache pour éviter les appels répétés
let configCache: Map<string, unknown> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Charge la configuration depuis la base de données
 */
export async function loadPredictionConfig(): Promise<{
  optimalGap: OptimalGapConfig;
  gapThreshold: GapThresholdConfig;
  weights: WeightsConfig;
}> {
  // Vérifier le cache
  if (configCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return {
      optimalGap: (configCache.get("optimal_gap") as OptimalGapConfig) || DEFAULT_OPTIMAL_GAP,
      gapThreshold: (configCache.get("gap_threshold") as GapThresholdConfig) || DEFAULT_GAP_THRESHOLD,
      weights: (configCache.get("weights") as WeightsConfig) || DEFAULT_WEIGHTS,
    };
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      log("warn", "Supabase credentials not available, using default config");
      return {
        optimalGap: DEFAULT_OPTIMAL_GAP,
        gapThreshold: DEFAULT_GAP_THRESHOLD,
        weights: DEFAULT_WEIGHTS,
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("prediction_config")
      .select("config_key, config_value");

    if (error) {
      log("warn", "Failed to load prediction config", { error: error.message });
      return {
        optimalGap: DEFAULT_OPTIMAL_GAP,
        gapThreshold: DEFAULT_GAP_THRESHOLD,
        weights: DEFAULT_WEIGHTS,
      };
    }

    // Mettre à jour le cache
    configCache = new Map();
    data?.forEach((item: { config_key: string; config_value: unknown }) => {
      configCache!.set(item.config_key, item.config_value);
    });
    cacheTimestamp = Date.now();

    log("info", "Prediction config loaded from database", {
      keys: data?.map((d: { config_key: string }) => d.config_key),
    });

    return {
      optimalGap: (configCache.get("optimal_gap") as OptimalGapConfig) || DEFAULT_OPTIMAL_GAP,
      gapThreshold: (configCache.get("gap_threshold") as GapThresholdConfig) || DEFAULT_GAP_THRESHOLD,
      weights: (configCache.get("weights") as WeightsConfig) || DEFAULT_WEIGHTS,
    };
  } catch (error) {
    log("error", "Error loading prediction config", { error });
    return {
      optimalGap: DEFAULT_OPTIMAL_GAP,
      gapThreshold: DEFAULT_GAP_THRESHOLD,
      weights: DEFAULT_WEIGHTS,
    };
  }
}

/**
 * Invalide le cache de configuration
 */
export function invalidateConfigCache(): void {
  configCache = null;
  cacheTimestamp = 0;
}

// Export des valeurs par défaut pour utilisation synchrone
export { DEFAULT_OPTIMAL_GAP, DEFAULT_GAP_THRESHOLD, DEFAULT_WEIGHTS };
