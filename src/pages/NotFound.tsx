import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, SearchX, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full bg-gradient-card border-border/50 animate-scale-in">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <SearchX className="w-24 h-24 text-muted-foreground/30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl font-bold text-primary">404</span>
              </div>
            </div>
          </div>
          <CardTitle className="text-3xl">Page Introuvable</CardTitle>
          <CardDescription className="text-base mt-2">
            Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            onClick={() => navigate("/")} 
            className="w-full gap-2"
            size="lg"
          >
            <Home className="w-5 h-5" />
            Retour à l'accueil
          </Button>
          <Button 
            onClick={() => navigate(-1)} 
            variant="outline"
            className="w-full gap-2"
            size="lg"
          >
            <ArrowLeft className="w-5 h-5" />
            Page précédente
          </Button>
          <div className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Route demandée : <code className="text-xs bg-muted px-2 py-1 rounded">{location.pathname}</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
