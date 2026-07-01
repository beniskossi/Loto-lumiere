// Utilitaires de diagnostic pour l'application déployée

export interface DiagnosticResult {
  component: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
}

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