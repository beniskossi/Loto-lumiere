# Tests Unitaires des Algorithmes de Prédiction

Ce répertoire contient les tests unitaires automatisés pour tous les algorithmes de prédiction du système LOTO LUMIERE.

## Structure des Tests

### Tests Backend (Edge Functions)

- **algorithms.test.ts** - Tests des algorithmes de base
  - FrequencyPro (Analyse fréquentielle)
  - Random Forest (Forêt aléatoire)
  - LSTM (Réseau récurrent)

- **transformer.test.ts** - Tests de l'algorithme Transformer
  - Mécanisme d'attention multi-têtes
  - Encodage positionnel
  - Cohérence des embeddings

- **xgboost.test.ts** - Tests de l'algorithme XGBoost
  - Gradient boosting
  - Régularisation L2
  - Feature engineering

- **stacking.test.ts** - Tests de l'ensemble Stacking
  - Meta-learner
  - Optimisation des poids
  - Performance globale

- **smart-ensemble.test.ts** - Tests du Smart Ensemble
  - Sélection adaptative des 5 algorithmes
  - Poids dynamiques
  - Performance tracking
  - Statistiques d'ensemble

- **enhanced-prediction.test.ts** - Tests des formules améliorées
  - Fréquence pondérée par récence
  - Détection de paires récurrentes
  - Prédicteur de gap adaptatif
  - Équilibre somme-parité
  - Échos inter-tirages
  - Score composite

- **prediction-engine.test.ts** - Tests du moteur de prédiction
  - Sélection intelligente d'algorithmes
  - Mode multi-algorithmes
  - Métriques de qualité

- **utils.test.ts** - Tests des utilitaires
  - Génération aléatoire
  - Sélection équilibrée
  - Calcul de qualité/fraîcheur

### Tests Frontend (React Hooks)

- **useAdvancedPrediction.test.tsx** - Tests du hook de prédiction
  - Récupération des prédictions
  - Gestion des erreurs
  - Caching

## Exécution des Tests

### Tests Backend (Deno)

```bash
# Exécuter tous les tests
deno test --allow-all supabase/functions/_shared/tests/

# Exécuter un fichier de test spécifique
deno test --allow-all supabase/functions/_shared/tests/algorithms.test.ts

# Avec couverture
deno test --allow-all --coverage=coverage supabase/functions/_shared/tests/
deno coverage coverage
```

### Tests Frontend (Vitest)

```bash
# Exécuter tous les tests
npm run test

# Mode watch
npm run test:watch

# Avec couverture
npm run test:coverage

# Interface UI
npm run test:ui
```

## Critères de Validation

Chaque test vérifie :

1. **Structure des prédictions**
   - 5 numéros uniques
   - Numéros entre 1 et 90
   - Numéros triés

2. **Métadonnées**
   - Nom d'algorithme correct
   - Catégorie appropriée
   - Facteurs d'analyse présents

3. **Qualité des prédictions**
   - Confiance dans la plage [0, 1]
   - Score cohérent avec la confiance
   - Données suffisantes pour prédictions fiables

4. **Performance**
   - Temps d'exécution raisonnable
   - Pas de dépassement mémoire
   - Déterminisme (même entrée → même sortie)

## Ajout de Nouveaux Tests

Pour ajouter un nouveau test :

1. Créer un fichier `*.test.ts` dans le répertoire approprié
2. Importer les fonctions à tester
3. Utiliser `Deno.test()` pour les tests backend
4. Utiliser `describe()` et `it()` pour les tests frontend
5. Vérifier les assertions avec `assertEquals`, `assertExists`, `expect()`

### Exemple de Test Backend

```typescript
Deno.test("Mon Algorithme - Test Basique", () => {
  const mockResults = generateMockDrawResults(50);
  const prediction = monAlgorithme(mockResults);
  
  assertEquals(prediction.numbers.length, 5);
  assertEquals(prediction.category, "ma-categorie");
});
```

### Exemple de Test Frontend

```typescript
it('should handle success case', async () => {
  const { result } = renderHook(() => useMyHook(), {
    wrapper: createWrapper(),
  });
  
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeDefined();
});
```

## Couverture de Code

Objectifs de couverture :
- **Algorithmes** : > 80%
- **Moteur de prédiction** : > 85%
- **Utilitaires** : > 90%
- **Hooks React** : > 75%

## CI/CD

Les tests sont automatiquement exécutés :
- À chaque push sur la branche principale
- À chaque pull request
- Avant chaque déploiement

## Documentation

Pour plus d'informations :
- [Documentation Deno Testing](https://deno.land/manual/testing)
- [Documentation Vitest](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
