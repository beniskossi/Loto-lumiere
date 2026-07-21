import { Shield, Sparkles } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="w-full border-t border-border/35 bg-background/30 backdrop-blur-md mt-16 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row text-center md:text-left">
          {/* Brand and Description */}
          <div className="flex flex-col md:flex-row items-center gap-2.5 text-muted-foreground">
            <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs sm:text-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span>LOTO LUMIÈRE</span>
            </div>
            <span className="hidden md:inline text-border/60">|</span>
            <p className="text-[11px] sm:text-xs">
              Analyse stochastique & simulations algorithmiques de loterie. Les tirages sont indépendants et purement aléatoires. Aucun modèle ou calcul ne peut garantir des gains ou prédire l'avenir.
            </p>
          </div>

          {/* Responsible Gaming Badge & Text */}
          <div className="flex flex-col sm:flex-row items-center gap-2 bg-amber-500/10 border border-amber-500/25 px-4 py-2 rounded-xl max-w-sm sm:max-w-none">
            <span className="flex items-center gap-1 text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              Avertissement Légal & Responsabilité
            </span>
            <span className="hidden sm:inline text-amber-500/40">•</span>
            <p className="text-[10px] text-amber-400 font-medium text-center sm:text-left leading-relaxed">
              Le loto est un jeu de hasard pur. Jouez avec modération. Le jeu comporte des risques (dépendance, isolement, endettement). Appelez le 09 74 75 13 13 (appel non surtaxé, confidentiel).
            </p>
          </div>
        </div>

        {/* Divider and Copyright */}
        <div className="mt-6 pt-5 border-t border-border/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-mono text-muted-foreground/75">
          <p>© {new Date().getFullYear()} LOTO LUMIÈRE. Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <span>Version 2.4.0 (Stable)</span>
            <span>•</span>
            <span>Mode Hors-ligne Actif</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

