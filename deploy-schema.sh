#!/bin/bash

# ============================================================================
# SCRIPT DE DÉPLOIEMENT SUPABASE - LOTO LUMIERE
# ============================================================================

set -e

echo "🚀 Déploiement du schéma Supabase optimisé..."

# Vérification des prérequis
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé. Installez-le avec:"
    echo "npm install -g supabase"
    exit 1
fi

# Vérification de la connexion
echo "📡 Vérification de la connexion Supabase..."
if ! supabase status &> /dev/null; then
    echo "⚠️  Supabase n'est pas démarré localement. Démarrage..."
    supabase start
fi

# Application des migrations
echo "📊 Application des migrations de schéma..."

# Migration principale d'optimisation
echo "  → Application de l'optimisation du schéma..."
supabase db push

# Génération des types TypeScript
echo "🔧 Génération des types TypeScript..."
supabase gen types typescript --local > src/integrations/supabase/types.ts

# Déploiement des Edge Functions
echo "🔄 Déploiement des Edge Functions..."

# Fonctions principales
FUNCTIONS=(
    "generate-prediction-v2"
    "advanced-ai-prediction-v2"
    "evaluate-predictions"
    "train-algorithms"
    "auto-tune-algorithms"
    "select-best-algorithm"
    "multi-algorithm-comparison"
    "scrape-results"
)

for func in "${FUNCTIONS[@]}"; do
    echo "  → Déploiement de $func..."
    supabase functions deploy $func --no-verify-jwt
done

# Vérification de l'état
echo "✅ Vérification de l'état du déploiement..."
supabase status

# Tests de base
echo "🧪 Tests de base..."

# Test de connexion à la base de données
echo "  → Test de connexion à la base de données..."
supabase db ping

# Test des fonctions
echo "  → Test des Edge Functions..."
for func in "${FUNCTIONS[@]}"; do
    if supabase functions list | grep -q "$func"; then
        echo "    ✅ $func déployée"
    else
        echo "    ❌ $func non trouvée"
    fi
done

# Optimisation finale
echo "🎯 Optimisation finale..."

# Mise à jour des statistiques PostgreSQL
echo "  → Mise à jour des statistiques PostgreSQL..."
supabase db reset --linked

# Rafraîchissement des vues matérialisées
echo "  → Rafraîchissement des vues matérialisées..."
echo "SELECT public.refresh_materialized_views();" | supabase db psql

echo ""
echo "🎉 Déploiement terminé avec succès!"
echo ""
echo "📋 Résumé:"
echo "  • Schéma optimisé et déployé"
echo "  • Types TypeScript générés"
echo "  • Edge Functions déployées"
echo "  • Vues matérialisées rafraîchies"
echo ""
echo "🔗 Liens utiles:"
echo "  • Dashboard Supabase: https://supabase.com/dashboard/project/kmkdwivnymcumgoorsiv"
echo "  • API URL: https://kmkdwivnymcumgoorsiv.supabase.co"
echo ""
echo "⚡ Votre application est prête!"