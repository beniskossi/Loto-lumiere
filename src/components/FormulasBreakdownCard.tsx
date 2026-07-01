// Composant pour afficher le breakdown des 5 formules algorithmiques
import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Scale, 
  Waves,
  Sparkles,
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EnhancedScoreBreakdown, PairScore } from "@/hooks/useEnhancedPrediction";

interface FormulasBreakdownCardProps {
  breakdown: EnhancedScoreBreakdown;
  narratives: string[];
  topPairs: PairScore[];
}

const formulaInfo = {
  frequency: {
    name: "Fréquence Pondérée",
    icon: TrendingUp,
    description: "S_n = f_n × e^(-λ × d_n) - Analyse la fréquence avec décroissance temporelle",
    weight: "30%",
    color: "text-blue-500",
  },
  gap: {
    name: "Gap Adaptatif",
    icon: Clock,
    description: "R_n = (g_n - μ_g) / σ_g - Détecte les numéros en retard avec Z-score",
    weight: "25%",
    color: "text-amber-500",
  },
  echo: {
    name: "Échos Inter-Tirages",
    icon: Waves,
    description: "O = Σ(|r_k|/5) × e^(-δ × i_k) - Détecte les résonances récentes",
    weight: "20%",
    color: "text-purple-500",
  },
  pairs: {
    name: "Paires Récurrentes",
    icon: Users,
    description: "P_{i,j} = c_{i,j} × (1 - g_{i,j}/G_max) - Identifie les paires fréquentes",
    weight: "15%",
    color: "text-green-500",
  },
  equilibrium: {
    name: "Équilibre Somme-Parité",
    icon: Scale,
    description: "E = w_s × |s - μ_s| + w_p × |p - m_p| - Vérifie l'équilibre statistique",
    weight: "10%",
    color: "text-rose-500",
  },
};

export const FormulasBreakdownCard = memo<FormulasBreakdownCardProps>(({
  breakdown,
  narratives,
  topPairs,
}) => {
  const getScoreColor = (score: number): string => {
    if (score >= 0.7) return "bg-green-500";
    if (score >= 0.4) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Analyse des Formules</CardTitle>
          </div>
          <Badge variant="secondary" className="font-mono">
            Score: {(breakdown.composite * 100).toFixed(0)}%
          </Badge>
        </div>
        <CardDescription>
          5 formules algorithmiques combinées pour optimiser les prédictions
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Breakdown des scores */}
        <div className="space-y-3">
          {Object.entries(formulaInfo).map(([key, info]) => {
            const score = breakdown[key as keyof EnhancedScoreBreakdown];
            const Icon = info.icon;
            
            return (
              <TooltipProvider key={key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-1.5 cursor-help">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${info.color}`} />
                          <span className="font-medium">{info.name}</span>
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {info.weight}
                          </Badge>
                        </div>
                        <span className="font-mono text-muted-foreground">
                          {(score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress 
                        value={score * 100} 
                        className="h-2"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="font-mono text-xs">{info.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* Score composite */}
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Score Composite</span>
            <Badge className={getScoreColor(breakdown.composite)}>
              {(breakdown.composite * 100).toFixed(0)}%
            </Badge>
          </div>
          <Progress 
            value={breakdown.composite * 100} 
            className="h-3"
          />
        </div>

        {/* Narratives */}
        {narratives.length > 0 && (
          <div className="pt-3 border-t border-border/50 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>Insights détectés</span>
            </div>
            <ul className="space-y-1.5">
              {narratives.map((narrative, index) => (
                <li 
                  key={index}
                  className="text-sm text-foreground/80 pl-4 border-l-2 border-primary/30"
                >
                  {narrative}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Top Paires */}
        {topPairs.length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <span>Paires récurrentes (Top 5)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {topPairs.slice(0, 5).map((pair, index) => (
                <Badge 
                  key={index} 
                  variant="outline"
                  className="font-mono text-xs"
                >
                  {pair.numbers[0]}-{pair.numbers[1]}
                  <span className="ml-1 text-muted-foreground">
                    ({pair.count}×)
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

FormulasBreakdownCard.displayName = "FormulasBreakdownCard";
