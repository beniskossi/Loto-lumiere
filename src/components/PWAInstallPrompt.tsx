import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Vérifier si l'utilisateur a déjà vu le prompt
      const hasSeenPrompt = localStorage.getItem("pwa-prompt-dismissed");
      if (!hasSeenPrompt) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      toast({
        title: "✓ Application installée",
        description: "LOTO LUMIERE est maintenant disponible sur votre appareil",
      });
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed", "true");
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-fade-in">
      <Card className="bg-gradient-primary text-white border-white/20 shadow-glow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-1">
                Installer LOTO LUMIERE
              </CardTitle>
              <CardDescription className="text-white/80 text-sm">
                Accédez rapidement à l'app depuis votre écran d'accueil
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="text-white hover:bg-white/20 -mt-1 -mr-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            onClick={handleInstall}
            className="w-full gap-2 bg-white text-primary hover:bg-white/90"
            size="lg"
          >
            <Download className="w-5 h-5" />
            Installer maintenant
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            className="w-full text-white hover:bg-white/20"
            size="sm"
          >
            Peut-être plus tard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
