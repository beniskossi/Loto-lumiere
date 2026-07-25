import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { log } from './utils.ts';
import type { PredictionResult } from './types.ts';

// Initialiser le client Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Enregistre les prédictions générées dans le Ledger immuable
 */
export async function recordPredictionsToLedger(
  predictions: PredictionResult[],
  targetDrawDate: string
): Promise<void> {
  if (!supabaseUrl || !supabaseKey) return;

  try {
    const records = predictions.map(p => ({
      draw_date: targetDrawDate,
      algorithm_name: p.algorithm,
      predicted_numbers: p.numbers,
      confidence_declared: p.confidence
    }));

    const { error } = await supabase
      .from('prediction_ledger')
      .insert(records);

    if (error) throw error;
    log('info', 'Prédictions enregistrées dans le Ledger', { count: records.length, date: targetDrawDate });
  } catch (err) {
    log('error', 'Erreur lors de l\'enregistrement dans le Ledger', { err });
  }
}

/**
 * Récupère les performances historiques depuis le Ledger pour la Calibration (Platt Scaling)
 */
export async function getHistoricalPerformanceMap(): Promise<Map<string, number>> {
  const performanceMap = new Map<string, number>();
  
  if (!supabaseUrl || !supabaseKey) return performanceMap;

  try {
    const { data, error } = await supabase
      .from('algorithm_performance')
      .select('algorithm_name, historical_accuracy');

    if (error) throw error;

    if (data) {
      for (const row of data) {
        performanceMap.set(row.algorithm_name, Number(row.historical_accuracy));
      }
    }
  } catch (err) {
    log('warn', 'Impossible de charger les perfs du Ledger, fallback sur baseline', { err });
  }

  return performanceMap;
}
