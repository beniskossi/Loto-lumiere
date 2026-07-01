# Guide des Tests Unitaires - LOTO LUMIERE

Ce document explique comment exécuter et maintenir les tests unitaires du système de prédiction LOTO LUMIERE.

## 📋 Vue d'ensemble

Le projet contient deux types de tests :

### Tests Backend (Edge Functions - Deno)
- **Localisation** : `supabase/functions/_shared/tests/`
- **Framework** : Deno Test
- **Couverture** : Algorithmes de prédiction, moteur de prédiction, utilitaires

### Tests Frontend (React - Vitest)
- **Localisation** : `src/test/`
- **Framework** : Vitest + Testing Library
- **Couverture** : Hooks React, composants

## 🚀 Installation

Les dépendances de test sont déjà installées :
- `vitest` - Framework de test pour React
- `@testing-library/react` - Utilitaires de test React
- `@testing-library/jest-dom` - Assertions DOM
- `@vitest/ui` - Interface UI pour les tests

## ▶️ Exécution des Tests

### Tests Frontend (Vitest)

```bash
# Exécuter tous les tests
npm run test

# Mode watch (relance automatiquement)
npm run test:watch

# Interface UI interactive
npm run test:ui

# Avec rapport de couverture
npm run test:coverage
```

### Tests Backend (Deno)

```bash
# Exécuter tous les tests backend
npm run test:backend

# Ou directement avec Deno
deno test --allow-all supabase/functions/_shared/tests/

# Exécuter un fichier spécifique
deno test --allow-all supabase/functions/_shared/tests/algorithms.test.ts

# Avec couverture de code
deno test --allow-all --coverage=coverage supabase/functions/_shared/tests/
deno coverage coverage
```

## 📊 Couverture des Tests

### Algorithmes Testés

#### ✅ FrequencyPro (Analyse Fréquentielle)
- Génération avec données suffisantes
- Comportement avec données insuffisantes
- Validation des numéros (1-90, uniques, triés)
- Confiance et score

#### ✅ Random Forest
- Bootstrap sampling
- Construction d'arbres de décision
- Vote majoritaire
- Performance

#### ✅ LSTM (Réseau Récurrent)
- Gates (forget, input, output)
- États cachés et cellulaires
- Traitement de séquences
- Précision

#### ✅ Transformer
- Mécanisme d'attention multi-têtes
- Encodage positionnel
- Embedding de numéros
- Déterminisme

#### ✅ XGBoost
- Gradient boosting
- Régularisation L2
- Feature engineering
- Convergence

#### ✅ Stacking Ensemble
- Exécution des 5 modèles niveau 1
- Meta-learner
- Optimisation des poids
- Amélioration de la confiance

### Moteur de Prédiction

- ✅ Mode single algorithme
- ✅ Mode multi-algorithmes
- ✅ Sélection intelligente selon volume de données
- ✅ Calcul de métriques (qualité, fraîcheur)
- ✅ Génération d'explications
- ✅ Tracking du temps d'exécution

### Utilitaires

- ✅ Génération aléatoire de prédictions
- ✅ Sélection équilibrée de numéros
- ✅ Calcul de qualité des données
- ✅ Calcul de fraîcheur des données

### Hooks React

- ✅ useAdvancedPrediction
  - Récupération des prédictions
  - Gestion des erreurs (WORKER_LIMIT)
  - Nettoyage des numéros invalides
  - Caching et optimisations

## 📝 Structure des Tests

### Test Backend (Deno)
```typescript
Deno.test("Nom du test", () => {
  // Arrange
  const mockData = generateMockDrawResults(50);
  
  // Act
  const result = myAlgorithm(mockData);
  
  // Assert
  assertEquals(result.numbers.length, 5);
  assertEquals(result.algorithm, "MonAlgo");
});
```

### Test Frontend (Vitest)
```typescript
describe('MyComponent', () => {
  it('should render correctly', async () => {
    // Arrange
    const { result } = renderHook(() => useMyHook());
    
    // Act
    await vi.waitFor(() => {
      // Assert
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
```

## 🎯 Critères de Validation

Chaque test vérifie :

### Structure des Prédictions
- ✅ Exactement 5 numéros
- ✅ Numéros entre 1 et 90
- ✅ Numéros uniques
- ✅ Numéros triés (ordre croissant)

### Métadonnées
- ✅ Nom d'algorithme correct
- ✅ Catégorie appropriée
- ✅ Facteurs d'analyse présents
- ✅ Confiance dans [0, 1]
- ✅ Score cohérent avec confiance

### Performance
- ✅ Temps d'exécution < 5 secondes
- ✅ Pas de dépassement mémoire
- ✅ Déterminisme (même input → même output)

### Qualité
- ✅ Comportement gracieux avec peu de données
- ✅ Amélioration avec plus de données
- ✅ Gestion d'erreurs robuste

## 🔍 Debugging

### Afficher les logs pendant les tests

```typescript
// Backend
Deno.test("Mon test", () => {
  console.log("Debug info");
  // ...
});

// Frontend
it('mon test', () => {
  console.log("Debug info");
  // ...
});
```

### Exécuter un seul test

```bash
# Backend
deno test --allow-all --filter="FrequencyPro" supabase/functions/_shared/tests/

# Frontend
npm run test -- algorithms.test
```

## 📈 Objectifs de Couverture

| Composant | Objectif | Actuel |
|-----------|----------|--------|
| Algorithmes | 80% | ✅ |
| Moteur | 85% | ✅ |
| Utilitaires | 90% | ✅ |
| Hooks React | 75% | ✅ |

## 🛠️ Maintenance

### Ajouter un nouveau test

1. Créer un fichier `*.test.ts` (backend) ou `*.test.tsx` (frontend)
2. Importer les fonctions à tester
3. Écrire les cas de test
4. Vérifier la couverture

### Mettre à jour les tests

Après modification d'un algorithme :
1. Exécuter les tests existants
2. Corriger les tests qui échouent
3. Ajouter de nouveaux tests si nécessaire
4. Vérifier la couverture globale

## 🚨 CI/CD

Les tests sont automatiquement exécutés :
- ✅ À chaque push sur main
- ✅ À chaque pull request
- ✅ Avant chaque déploiement

## 📚 Ressources

- [Documentation Deno Testing](https://deno.land/manual/testing)
- [Documentation Vitest](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Mocking avec Vitest](https://vitest.dev/guide/mocking.html)

## 💡 Bonnes Pratiques

1. **Tests indépendants** : Chaque test doit pouvoir s'exécuter seul
2. **Données mockées** : Utiliser des données de test, pas de vraies données
3. **Assertions claires** : Messages d'erreur explicites
4. **Nettoyage** : Réinitialiser l'état après chaque test
5. **Performance** : Tests rapides (< 1s par test)
6. **Couverture** : Couvrir les cas normaux ET les cas limites

## 🐛 Résolution de Problèmes

### Les tests backend échouent
```bash
# Vérifier les permissions
deno test --allow-all supabase/functions/_shared/tests/

# Nettoyer le cache
deno cache --reload supabase/functions/_shared/tests/*.ts
```

### Les tests frontend échouent
```bash
# Nettoyer node_modules
rm -rf node_modules
npm install

# Nettoyer le cache de Vitest
npm run test -- --clearCache
```

### Problèmes de timeout
```typescript
// Augmenter le timeout dans le test
it('long test', async () => {
  // ...
}, 10000); // 10 secondes
```
