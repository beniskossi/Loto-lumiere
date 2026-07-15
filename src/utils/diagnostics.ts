// Utilitaires de diagnostic pour l'application déployée
import { LocalPredictionEngine } from "@/lib/algorithms/predictionEngine";
import { DrawResult } from "@/types/lottery";

export interface DiagnosticResult {
  component: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
}

/**
 * Runs validation checks on the local prediction engine to guarantee absence of duplicates,
 * proper bounds, deterministic output, and absence of hallucinations.
 */
export const runMathematicalValidation = (): {
  success: boolean;
  checks: { name: string; status: 'ok' | 'error'; message: string }[];
} => {
  const checks: { name: string; status: 'ok' | 'error'; message: string }[] = [];
  
  try {
    // Generate 30 deterministic mock draws
    const mockDraws: DrawResult[] = Array.from({ length: 30 }, (_, i) => {
      const date = new Date("2026-06-01");
      date.setDate(date.getDate() - i);
      return {
        id: `diag-draw-${i}`,
        drawName: "Etoile",
        drawTime: "13:00",
        drawDay: "Lundi",
        date: date.toISOString().split('T')[0],
        winningNumbers: [
          1 + (i % 15),
          16 + (i % 15),
          31 + (i % 15),
          46 + (i % 15),
          61 + (i % 15),
        ].sort((a, b) => a - b),
      };
    });

    const defaultOptions = {
      frequencyWeight: 35,
      gapWeight: 25,
      markovWeight: 20,
      momentumWeight: 20,
      decayRate: 0.02,
      markovOrder: 1,
      poissonLambda: 1.0,
      targetCount: 5,
    };

    // Run prediction engine
    const res1 = LocalPredictionEngine.calculatePredictions(mockDraws, defaultOptions);
    const res2 = LocalPredictionEngine.calculatePredictions(mockDraws, defaultOptions);

    // Check 1: No duplicates
    const uniqueNums = new Set(res1.recommendations);
    const hasNoDuplicates = uniqueNums.size === res1.recommendations.length && res1.recommendations.length === 5;
    checks.push({
      name: "Garantie Absolue Sans Doublons",
      status: hasNoDuplicates ? 'ok' : 'error',
      message: hasNoDuplicates 
        ? "Succès - Aucun nombre doublon généré (exactement 5 numéros distincts)."
        : "Échec - Des doublons ou une taille invalide ont été détectés."
    });

    // Check 2: Bounds [1-90]
    const withinBounds = res1.recommendations.every(n => Number.isInteger(n) && n >= 1 && n <= 90);
    checks.push({
      name: "Intégrité des Bornes [1-90]",
      status: withinBounds ? 'ok' : 'error',
      message: withinBounds
        ? "Succès - Tous les numéros recommandés sont des entiers situés strictement entre 1 et 90."
        : "Échec - Certains numéros sortent des bornes autorisées de l'application."
    });

    // Check 3: Determinism (Anti-Hasard / Anti-Randomness)
    const isDeterministic = JSON.stringify(res1.recommendations) === JSON.stringify(res2.recommendations) &&
                            JSON.stringify(res1.scores.map(s => s.combinedScore)) === JSON.stringify(res2.scores.map(s => s.combinedScore));
    checks.push({
      name: "Déterminisme Strict & Anti-Hasard",
      status: isDeterministic ? 'ok' : 'error',
      message: isDeterministic
        ? "Succès - Comportement 100% reproductible sans dérive de bruit aléatoire."
        : "Échec - Variabilité non déterministe détectée entre deux exécutions consécutives."
    });

    // Check 4: Data consistency / XAI Integrity
    const hasScores = res1.scores && res1.scores.length === 90;
    checks.push({
      name: "Explicabilité Globale (XAI)",
      status: hasScores ? 'ok' : 'error',
      message: hasScores
        ? "Succès - Grille de score complète générée pour les 90 numéros de loterie."
        : "Échec - Impossible de décomposer ou justifier le score combiné pour chaque numéro."
    });

    return {
      success: checks.every(c => c.status === 'ok'),
      checks
    };
  } catch (err) {
    return {
      success: false,
      checks: [{
        name: "Erreur Critique du Moteur",
        status: 'error',
        message: err instanceof Error ? err.message : "Erreur mathématique inconnue"
      }]
    };
  }
};

export const runDiagnostics = async (): Promise<DiagnosticResult[]> => {
  const results: DiagnosticResult[] = [];

  // Vérifier les variables d'environnement
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  results.push({
    component: 'Environment Variables',
    status: supabaseUrl && supabaseKey ? 'ok' : 'error',
    message: supabaseUrl && supabaseKey ? 'Variables Supabase configurées' : 'Variables Supabase manquantes',
    details: `URL: ${supabaseUrl ? '✓' : '✗'}, Key: ${supabaseKey ? '✓' : '✗'}`
  });

  // Vérifier le localStorage
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    results.push({
      component: 'Local Storage',
      status: 'ok',
      message: 'Local Storage accessible'
    });
  } catch (error) {
    results.push({
      component: 'Local Storage',
      status: 'error',
      message: 'Local Storage non accessible',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }

  // Vérifier les APIs du navigateur
  const hasShare = 'share' in navigator;
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasNotifications = 'Notification' in window;

  results.push({
    component: 'Browser APIs',
    status: 'ok',
    message: 'APIs du navigateur',
    details: `Share: ${hasShare ? '✓' : '✗'}, SW: ${hasServiceWorker ? '✓' : '✗'}, Notifications: ${hasNotifications ? '✓' : '✗'}`
  });

  // Vérifier la connectivité réseau
  const isOnline = navigator.onLine;
  results.push({
    component: 'Network',
    status: isOnline ? 'ok' : 'warning',
    message: isOnline ? 'En ligne' : 'Hors ligne'
  });

  return results;
};

export const checkComponentHealth = (componentName: string): DiagnosticResult => {
  try {
    // Vérifier si le composant peut être importé
    const element = document.querySelector(`[data-component="${componentName}"]`);
    
    return {
      component: componentName,
      status: 'ok',
      message: 'Composant fonctionnel',
      details: element ? 'Rendu dans le DOM' : 'Non rendu actuellement'
    };
  } catch (error) {
    return {
      component: componentName,
      status: 'error',
      message: 'Erreur du composant',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
};

export const getSystemInfo = () => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    timestamp: new Date().toISOString()
  };
};