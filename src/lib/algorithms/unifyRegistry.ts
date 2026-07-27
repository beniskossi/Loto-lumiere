/**
 * Script & module idempotent de migration et unification des algorithmes
 * pour LOTO LUMIERE.
 *
 * Assure la cohérence stricte des noms d'algorithmes entre:
 * - Frontend (src/lib/algorithms/registry.ts)
 * - Backend Edge Functions (supabase/functions/_shared/algorithm-registry.ts)
 * - Base de données Supabase (table algorithm_config)
 */

import { ALGORITHMS, ALGORITHM_NAMES, AlgorithmName, AlgorithmDefinition } from './registry';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Mapping d'équivalence entre les anciens alias/noms legacy et les noms canoniques.
 */
export const ALGORITHM_NAME_MAPPINGS: Record<string, AlgorithmName> = {
  // Aliases legacy français / verbeux
  'Arbres Heuristiques': 'Random Forest',
  'Séquences Récurrentes': 'LSTM Network',
  'Attention Spatiale': 'Transformer (Attention)',
  'Transformer': 'Transformer (Attention)',
  'Ensemble Stacking': 'Ensemble Hybride Stacking',
  'RandomForest': 'Random Forest',
  'LSTM': 'LSTM Network',
  'XGBoost Algorithm': 'XGBoost',
  'Baseline Uniforme (Théorique)': 'Baseline Aléatoire',
  'Baseline Uniforme': 'Baseline Aléatoire',
  'Baseline Fréquence Historique': 'FrequencyPro',
  'Baseline Dernière Période': 'FrequencyPro',

  // Canonical names mapping to themselves
  'FrequencyPro': 'FrequencyPro',
  'Random Forest': 'Random Forest',
  'LSTM Network': 'LSTM Network',
  'Transformer (Attention)': 'Transformer (Attention)',
  'XGBoost': 'XGBoost',
  'Ensemble Hybride Stacking': 'Ensemble Hybride Stacking',
  'Baseline Aléatoire': 'Baseline Aléatoire',
};

/**
 * Normalise un nom d'algorithme vers sa forme canonique unifiée.
 * Idempotent : retourne le même nom s'il est déjà canonique.
 */
export function normalizeAlgorithmName(rawName: string): AlgorithmName {
  if (!rawName) return 'FrequencyPro';
  const trimmed = rawName.trim();
  if (trimmed in ALGORITHM_NAME_MAPPINGS) {
    return ALGORITHM_NAME_MAPPINGS[trimmed];
  }
  // fallback lookup
  const matched = ALGORITHM_NAMES.find(
    (name) => name.toLowerCase() === trimmed.toLowerCase()
  );
  return matched || 'FrequencyPro';
}

/**
 * Mappe une définition du registre vers la structure de la table `algorithm_config`.
 */
export function mapDefinitionToConfigRow(def: AlgorithmDefinition) {
  return {
    algorithm_name: def.name,
    description: def.description,
    is_enabled: true,
    weight: def.defaultWeight,
    category: def.category,
    parameters: Object.entries(def.parametersSchema).reduce((acc, [key, param]) => {
      acc[key] = param.default;
      return acc;
    }, {} as Record<string, unknown>),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Synchronise et migre de façon idempotente la table `algorithm_config` dans Supabase.
 * - Met à jour ou insère les 7 algorithmes canoniques.
 * - Migre les enregistrements existants utilisant d'anciens noms (ex: 'Arbres Heuristiques').
 */
export async function syncAlgorithmRegistryInDB(supabase: SupabaseClient): Promise<{
  success: boolean;
  migratedLegacyCount: number;
  upsertedCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let migratedLegacyCount = 0;
  let upsertedCount = 0;

  try {
    // 1. Migration des anciens noms dans algorithm_config s'ils existent
    for (const [legacyName, canonicalName] of Object.entries(ALGORITHM_NAME_MAPPINGS)) {
      if (legacyName === canonicalName) continue;

      const { data: legacyRows } = await supabase
        .from('algorithm_config')
        .select('id, algorithm_name')
        .eq('algorithm_name', legacyName);

      if (legacyRows && legacyRows.length > 0) {
        for (const row of legacyRows) {
          // Vérifier si la version canonique existe déjà
          const { data: canonicalRow } = await supabase
            .from('algorithm_config')
            .select('id')
            .eq('algorithm_name', canonicalName)
            .maybeSingle();

          if (canonicalRow) {
            // Supprimer la ligne obsolète
            await supabase.from('algorithm_config').delete().eq('id', row.id);
          } else {
            // Renommer vers le nom canonique
            await supabase
              .from('algorithm_config')
              .update({ algorithm_name: canonicalName, updated_at: new Date().toISOString() })
              .eq('id', row.id);
          }
          migratedLegacyCount++;
        }
      }
    }

    // 2. Upsert idempotent des 7 algorithmes canoniques
    for (const name of ALGORITHM_NAMES) {
      const def = ALGORITHMS[name];
      if (!def) continue;

      const payload = mapDefinitionToConfigRow(def);

      const { error } = await supabase
        .from('algorithm_config')
        .upsert(payload, { onConflict: 'algorithm_name' });

      if (error) {
        errors.push(`Erreur upsert pour ${name}: ${error.message}`);
      } else {
        upsertedCount++;
      }
    }

    return {
      success: errors.length === 0,
      migratedLegacyCount,
      upsertedCount,
      errors,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`Exception globale lors de la synchronisation: ${message}`);
    return {
      success: false,
      migratedLegacyCount,
      upsertedCount,
      errors,
    };
  }
}
