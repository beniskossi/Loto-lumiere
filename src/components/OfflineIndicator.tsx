import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WifiOff, Wifi, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";

interface OfflineDataStructure {
  lastUpdate: string;
  note: string;
}

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [offlineData, setOfflineData] = useState<OfflineDataStructure | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
      toast.success("Connexion rétablie!");
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
      toast.error("Connexion perdue - Mode hors ligne activé");
      loadOfflineData();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Vérifier l'état initial
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadOfflineData = () => {
    try {
      const cached = localStorage.getItem('loto-lumiere-offline-data');
      if (cached) {
        setOfflineData(JSON.parse(cached));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données hors ligne:', error);
    }
  };

  const syncData = async () => {
    if (!isOnline) {
      toast.error("Impossible de synchroniser - pas de connexion");
      return;
    }

    // Recharger la page pour obtenir les dernières données
    window.location.reload();
  };

  const downloadForOffline = async () => {
    toast.info("Le cache du Service Worker gère automatiquement les données hors ligne. Naviguez sur les pages que vous souhaitez consulter hors ligne.");
    
    const essentialData = {
      lastUpdate: new Date().toISOString(),
      note: "Les données sont mises en cache automatiquement par le Service Worker PWA"
    };
    
    localStorage.setItem('loto-lumiere-offline-data', JSON.stringify(essentialData));
    setOfflineData(essentialData);
  };

  if (!showOfflineMessage && isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className={`border-2 ${isOnline ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-green-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-orange-600" />
              )}
              <Badge variant={isOnline ? "default" : "secondary"}>
                {isOnline ? "En ligne" : "Hors ligne"}
              </Badge>
            </div>
          </div>

          {!isOnline && (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                Fonctionnalités limitées en mode hors ligne
              </p>
              
              {offlineData && (
                <p className="text-xs text-muted-foreground">
                  Dernière sync: {new Date(offlineData.lastUpdate).toLocaleString()}
                </p>
              )}

              <div className="flex gap-2">
                {!offlineData && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={downloadForOffline}
                    className="gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Télécharger
                  </Button>
                )}
                
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={syncData}
                  disabled={!isOnline}
                  className="gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Sync
                </Button>
              </div>
            </div>
          )}

          {isOnline && showOfflineMessage && (
            <div className="mt-3">
              <p className="text-sm text-green-800 dark:text-green-200">
                Connexion rétablie - Toutes les fonctionnalités sont disponibles
              </p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowOfflineMessage(false)}
                className="mt-2"
              >
                Masquer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};