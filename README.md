# LOTO LUMIERE

**LOTO LUMIERE** est une application web de prédiction et d'analyse avancée des résultats de loterie (format 5 numéros sur 90) combinant statistiques avancées, algorithmes de Machine Learning, réseaux de neurones deep learning et formules mathématiques explicables.

---

## 🌟 Vision & Valeurs
- **Transparence & Explicabilité** : Chaque prédiction fournit des facteurs explicatifs clairs (analyse fréquentielle, récurrences, vélocité des écarts, consensus).
- **Performance Hybride ML** : Combinaison de 6 algorithmes optimaux + 1 baseline de contrôle + système de formules explicables.
- **Sécurité & Intégrité** : Moteur d'inférence déterministe, politiques RLS strictes sur Supabase, et audit forensique.

---

## 📐 Les 6 Algorithmes Optimaux + Baseline

1. **FrequencyPro** *(Statistique)* : Analyse fréquentielle avec lissage bayésien et loi de Dirichlet.
2. **Random Forest** *(Ensemble)* : Entraîne des centaines d'arbres de décision sur des caractéristiques croisées.
3. **LSTM Network** *(Deep Learning)* : Réseau neuronal récurrent capturant les dynamiques séquentielles et fenêtres temporelles.
4. **Transformer (Attention)** *(Deep Learning)* : Mécanisme de self-attention pour identifier les co-occurrences distantes.
5. **XGBoost** *(Ensemble)* : Gradient boosting optimisé sur la vélocité et la régression des écarts (gaps).
6. **Ensemble Hybride Stacking** *(Hybride)* : Méta-apprenant combinant intelligemment l'ensemble des modèles.
7. **Baseline Aléatoire** *(Contrôle)* : Générateur pseudo-aléatoire déterministe (PCG32) servant de point de comparaison.

---

## 🛠️ Tech Stack

- **Frontend** : React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts, Framer Motion, PWA.
- **Backend** : Supabase (PostgreSQL, 22 Edge Functions en Deno, Auth, RLS, Materialized Views).
- **Data & ML** : Implémentations locales en Edge Functions Deno/TypeScript, moteur de calibration & backtesting.

---

## 🚀 Démarrage Rapide

```sh
# Installation des dépendances
npm install

# Lancement du serveur de développement
npm run dev

# Tests & Validation
npm run test
npm run lint

# Déploiement du schéma et des Edge Functions Supabase
npm run supabase:deploy
```

---

## 📁 Structure du Projet

- `/src` : Application React (Composants UI, Dashboards, Hooks, Registre frontend `src/lib/algorithms/registry.ts`).
- `/supabase/functions` : 22 Edge Functions Deno & modules partagés (`_shared/`).
- `/supabase/migrations` : Migrations PostgreSQL idempotent et schéma principal `20260101000000_master_schema (3).sql`.
