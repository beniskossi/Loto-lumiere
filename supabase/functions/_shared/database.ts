import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { Database } from './types.ts';

// Client Supabase optimisé pour les Edge Functions
export const createSupabaseClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  });
};

// Fonctions utilitaires pour la base de données
export class DatabaseHelper {
  private supabase;

  constructor() {
    this.supabase = createSupabaseClient();
  }

  // Récupérer les résultats de tirage avec cache
  async getDrawResults(drawName?: string, limit = 100) {
    let query = this.supabase
      .from('draw_results')
      .select('*')
      .order('draw_date', { ascending: false })
      .limit(limit);

    if (drawName) {
      query = query.eq('draw_name', drawName);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // Récupérer les statistiques des numéros
  async getNumberStatistics(drawName?: string) {
    let query = this.supabase
      .from('number_statistics')
      .select('*')
      .order('frequency', { ascending: false });

    if (drawName) {
      query = query.eq('draw_name', drawName);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // Sauvegarder une prédiction
  async savePrediction(prediction: {
    draw_name: string;
    prediction_date: string;
    predicted_numbers: number[];
    confidence_score: number;
    model_used: string;
    model_metadata: Record<string, unknown>;
  }) {
    const { data, error } = await this.supabase
      .from('predictions')
      .insert(prediction)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Sauvegarder les performances d'algorithme
  async saveAlgorithmPerformance(performance: {
    draw_name: string;
    draw_date: string;
    prediction_date: string;
    model_used: string;
    predicted_numbers: number[];
    winning_numbers: number[];
    matches_count: number;
    accuracy_score: number;
    confidence_score?: number;
    precision_score?: number;
    recall_score?: number;
    f1_score?: number;
  }) {
    const { data, error } = await this.supabase
      .from('algorithm_performance')
      .insert(performance)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Récupérer les configurations d'algorithmes
  async getAlgorithmConfigurations() {
    const { data, error } = await this.supabase
      .from('algorithm_config')
      .select('*')
      .eq('is_enabled', true)
      .order('weight', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Mettre à jour la configuration d'un algorithme
  async updateAlgorithmConfiguration(
    algorithmName: string, 
    updates: { weight?: number; parameters?: Record<string, unknown>; is_enabled?: boolean }
  ) {
    const { data, error } = await this.supabase
      .from('algorithm_config')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('algorithm_name', algorithmName)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Récupérer les performances récentes des algorithmes
  async getRecentAlgorithmPerformance(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('algorithm_performance')
      .select('*')
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Calculer les métriques d'un algorithme
  calculateAlgorithmMetrics(performances: { accuracy_score: number; matches_count: number }[]) {
    if (!performances.length) return null;

    const totalPredictions = performances.length;
    const avgAccuracy = performances.reduce((sum, p) => sum + p.accuracy_score, 0) / totalPredictions;
    const avgMatches = performances.reduce((sum, p) => sum + p.matches_count, 0) / totalPredictions;
    const perfectPredictions = performances.filter(p => p.matches_count === 5).length;
    const goodPredictions = performances.filter(p => p.matches_count >= 3).length;

    return {
      totalPredictions,
      avgAccuracy: Math.round(avgAccuracy * 100) / 100,
      avgMatches: Math.round(avgMatches * 100) / 100,
      perfectPredictions,
      goodPredictions,
      successRate: Math.round((goodPredictions / totalPredictions) * 100),
      consistency: this.calculateConsistency(performances)
    };
  }

  private calculateConsistency(performances: { accuracy_score: number }[]) {
    if (performances.length < 2) return 100;
    
    const accuracies = performances.map(p => p.accuracy_score);
    const mean = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - mean, 2), 0) / accuracies.length;
    const stdDev = Math.sqrt(variance);
    
    // Consistance inversement proportionnelle à l'écart-type
    return Math.max(0, Math.round((1 - (stdDev / mean)) * 100));
  }

  // Nettoyer les anciennes données
  async cleanupOldData(daysToKeep = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // Nettoyer les anciennes performances
    await this.supabase
      .from('algorithm_performance')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    // Nettoyer les anciennes prédictions
    await this.supabase
      .from('predictions')
      .delete()
      .lt('created_at', cutoffDate.toISOString());
  }
}