#!/usr/bin/env node

/**
 * Script de validation du schéma Supabase optimisé
 * Vérifie la cohérence et les performances après optimisation
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Tests de validation
const tests = [
  {
    name: 'Connexion à Supabase',
    test: async () => {
      const { data, error } = await supabase.from('draw_results').select('count').limit(1);
      if (error) throw error;
      return true;
    }
  },
  {
    name: 'Tables principales existantes',
    test: async () => {
      const tables = [
        'draw_results',
        'predictions', 
        'algorithm_performance',
        'number_statistics',
        'user_profiles',
        'user_preferences',
        'algorithm_configurations'
      ];
      
      for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) throw new Error(`Table ${table} inaccessible: ${error.message}`);
      }
      return true;
    }
  },
  {
    name: 'Vues matérialisées',
    test: async () => {
      const { data, error } = await supabase.from('mv_algorithm_stats').select('*').limit(1);
      if (error) throw error;
      return true;
    }
  },
  {
    name: 'Fonctions PostgreSQL',
    test: async () => {
      const { data, error } = await supabase.rpc('get_global_statistics');
      if (error) throw error;
      return true;
    }
  },
  {
    name: 'Index de performance',
    test: async () => {
      // Test de performance sur une requête complexe
      const start = Date.now();
      const { data, error } = await supabase
        .from('draw_results')
        .select('*')
        .order('draw_date', { ascending: false })
        .limit(100);
      
      const duration = Date.now() - start;
      if (error) throw error;
      if (duration > 1000) throw new Error(`Requête trop lente: ${duration}ms`);
      return true;
    }
  },
  {
    name: 'Politiques RLS',
    test: async () => {
      // Test d'accès aux données publiques
      const { data, error } = await supabase
        .from('draw_results')
        .select('*')
        .limit(1);
      
      if (error) throw error;
      return true;
    }
  },
  {
    name: 'Configuration des algorithmes',
    test: async () => {
      const { data, error } = await supabase
        .from('algorithm_configurations')
        .select('*')
        .eq('is_enabled', true);
      
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Aucune configuration d\'algorithme trouvée');
      }
      return true;
    }
  },
  {
    name: 'Données de référence',
    test: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*');
      
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Aucun achievement trouvé');
      }
      return true;
    }
  }
];

// Fonction principale de validation
async function validateSchema() {
  console.log('🔍 Validation du schéma Supabase optimisé...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`⏳ ${test.name}...`);
      await test.test();
      console.log(`✅ ${test.name} - OK`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name} - ÉCHEC`);
      console.log(`   Erreur: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n📊 Résultats de validation:');
  console.log(`✅ Tests réussis: ${passed}`);
  console.log(`❌ Tests échoués: ${failed}`);
  console.log(`📈 Taux de réussite: ${Math.round((passed / tests.length) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 Tous les tests sont passés ! Le schéma est optimisé et fonctionnel.');
  } else {
    console.log('\n⚠️  Certains tests ont échoué. Vérifiez les erreurs ci-dessus.');
    process.exit(1);
  }
}

// Tests de performance supplémentaires
async function performanceTests() {
  console.log('\n🚀 Tests de performance...\n');
  
  const perfTests = [
    {
      name: 'Chargement des statistiques',
      test: async () => {
        const start = Date.now();
        await supabase.from('number_statistics').select('*').limit(90);
        return Date.now() - start;
      },
      threshold: 500
    },
    {
      name: 'Requête des prédictions récentes',
      test: async () => {
        const start = Date.now();
        await supabase
          .from('predictions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        return Date.now() - start;
      },
      threshold: 300
    },
    {
      name: 'Performance des algorithmes',
      test: async () => {
        const start = Date.now();
        await supabase.from('mv_algorithm_stats').select('*');
        return Date.now() - start;
      },
      threshold: 200
    }
  ];
  
  for (const test of perfTests) {
    try {
      const duration = await test.test();
      const status = duration <= test.threshold ? '✅' : '⚠️';
      console.log(`${status} ${test.name}: ${duration}ms (seuil: ${test.threshold}ms)`);
    } catch (error) {
      console.log(`❌ ${test.name}: Erreur - ${error.message}`);
    }
  }
}

// Exécution
async function main() {
  try {
    await validateSchema();
    await performanceTests();
    
    console.log('\n🎯 Validation terminée avec succès !');
    console.log('📚 Consultez SUPABASE_OPTIMIZATION.md pour plus de détails.');
    
  } catch (error) {
    console.error('💥 Erreur lors de la validation:', error.message);
    process.exit(1);
  }
}

main();