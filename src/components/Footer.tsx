import { Link } from "react-router-dom";
import { Settings, Heart, BarChart3, History as HistoryIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";

export const Footer = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdminRole(user?.id);

  return (
    <footer className="bg-gradient-card border-t border-border/50 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-bold text-foreground mb-3">Loto Lumière</h3>
            <p className="text-sm text-muted-foreground">
              Application d'analyse avancée des résultats de loterie avec statistiques 
              et prédictions intelligentes.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-foreground mb-3">Liens Rapides</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <Link to="/statistiques" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  Statistiques
                </Link>
              </li>
              <li>
                <Link to="/historique" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                  <HistoryIcon className="w-3 h-3" />
                  Historique
                </Link>
              </li>
              {isAdmin && (
                <li>
                  <Link to="/admin" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    Administration
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-foreground mb-3">À Propos</h3>
            <p className="text-sm text-muted-foreground mb-3">
              PWA moderne avec support hors ligne, statistiques en temps réel et prédictions ML.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Heart className="w-3 h-3 text-destructive" />
              <span>Fait avec passion</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Loto Lumière. Tous droits réservés.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ La loterie est un jeu de hasard. Jouez de manière responsable.
          </p>
        </div>
      </div>
    </footer>
  );
};
