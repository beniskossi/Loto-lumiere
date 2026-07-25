import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldCheck, 
  ShieldAlert,
  Info,
  BarChart3,
  Scale,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface RigorousMetricsProps {
  modelLogScore?: number;
  baselineLogScore?: number;
  skillScore?: number;
  dieboldMarianoP?: number;
  ece?: number;
  sampleSize?: number;
  algorithmName?: string;
  showDetails?: boolean;
}

export const ProfessionalConfidenceIndicator = ({
  modelLogScore = 0.521,
  baselineLogScore = 0.528,
  skillScore = -0.013,
  dieboldMarianoP = 0.42,
  ece = 0.042,
  sampleSize = 250,
  algorithmName = "FrequencyPro (Bayes Dirichlet)",
  showDetails = true
}: RigorousMetricsProps) => {
  const analysis = useMemo(() => {
    // Calculated skill score
    const isAdvantage = skillScore > 0 && dieboldMarianoP < 0.05;
    
    let verdict: string;
    let color: string;
    let bgColor: string;
    let borderColor: string;
    let icon: React.ElementType;

    if (isAdvantage) {
      verdict = "Léger avantage statistique mesuré";
      color = "text-emerald-400";
      bgColor = "bg-emerald-950/40";
      borderColor = "border-emerald-500/30";
      icon = ShieldCheck;
    } else {
      verdict = "Aucun avantage statistiquement significatif détecté";
      color = "text-amber-400";
      bgColor = "bg-amber-950/40";
      borderColor = "border-amber-500/30";
      icon = AlertTriangle;
    }

    return {
      verdict,
      color,
      bgColor,
      borderColor,
      icon,
      modelLogScore: modelLogScore.toFixed(4),
      baselineLogScore: baselineLogScore.toFixed(4),
      skillScorePct: (skillScore * 100).toFixed(2) + "%",
      dmPValue: dieboldMarianoP.toFixed(3),
      ecePct: (ece * 100).toFixed(2) + "%",
      sampleSize
    };
  }, [modelLogScore, baselineLogScore, skillScore, dieboldMarianoP, ece, sampleSize]);

  const Icon = analysis.icon;

  return (
    <Card className={cn("overflow-hidden border transition-all", analysis.bgColor, analysis.borderColor)}>
      <CardContent className="p-4 space-y-4">
        {/* Header Verdict */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border", analysis.bgColor, analysis.borderColor)}>
              <Icon className={cn("w-5 h-5", analysis.color)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">Verdict d'Évaluation Rigoureuse</span>
                <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-300">
                  {algorithmName}
                </Badge>
              </div>
              <p className={cn("font-bold text-base mt-0.5", analysis.color)}>
                « {analysis.verdict} »
              </p>
            </div>
          </div>
        </div>

        {/* Rigorous Metrics Grid */}
        <TooltipProvider>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {/* 1. Model Log-Score */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2.5 rounded-md bg-black/30 border border-white/5 space-y-1 hover:border-white/10 transition-colors">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Log-score modèle</span>
                    <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="text-base font-mono font-semibold text-white">
                    {analysis.modelLogScore}
                  </div>
                  <p className="text-[10px] text-gray-400 truncate">Qualité probabiliste brute</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Règle de score propre (Bernoulli Log-loss). Plus il est bas, meilleure est la qualité.</p>
              </TooltipContent>
            </Tooltip>

            {/* 2. Baseline Log-Score */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2.5 rounded-md bg-black/30 border border-white/5 space-y-1 hover:border-white/10 transition-colors">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Baseline Uniforme</span>
                    <Scale className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="text-base font-mono font-semibold text-white">
                    {analysis.baselineLogScore}
                  </div>
                  <p className="text-[10px] text-gray-400 truncate">Référence honnête (5/90)</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Score théorique du tirage aléatoire uniforme parfait.</p>
              </TooltipContent>
            </Tooltip>

            {/* 3. Skill Score */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2.5 rounded-md bg-black/30 border border-white/5 space-y-1 hover:border-white/10 transition-colors">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Score de compétence</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className={cn("text-base font-mono font-semibold", skillScore > 0 ? "text-emerald-400" : "text-amber-400")}>
                    {analysis.skillScorePct}
                  </div>
                  <p className="text-[10px] text-gray-400 truncate">
                    {skillScore > 0 ? "Avantage mesuré" : "Le hasard fait mieux"}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Mesure l'amélioration par rapport à la baseline. Positif = bat le hasard.</p>
              </TooltipContent>
            </Tooltip>

            {/* 4. Diebold-Mariano p-value */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2.5 rounded-md bg-black/30 border border-white/5 space-y-1 hover:border-white/10 transition-colors">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>p-value Diebold-Mariano</span>
                    <Info className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="text-base font-mono font-semibold text-white">
                    p = {analysis.dmPValue}
                  </div>
                  <p className="text-[10px] text-gray-400 truncate">Probabilité de hasard</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Test HAC Newey-West. Si p &gt; 0.05, la différence avec le hasard n'est pas significative.</p>
              </TooltipContent>
            </Tooltip>

            {/* 5. ECE (Calibration Error) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2.5 rounded-md bg-black/30 border border-white/5 space-y-1 hover:border-white/10 transition-colors">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Erreur ECE</span>
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-base font-mono font-semibold text-white">
                    {analysis.ecePct}
                  </div>
                  <p className="text-[10px] text-gray-400 truncate">Écart proba/fréquence</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Expected Calibration Error (Platt Scaling). Évalue la sincérité des probabilités affichées.</p>
              </TooltipContent>
            </Tooltip>

            {/* 6. Sample Size */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2.5 rounded-md bg-black/30 border border-white/5 space-y-1 hover:border-white/10 transition-colors">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Taille d'échantillon</span>
                    <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="text-base font-mono font-semibold text-white">
                    N = {analysis.sampleSize}
                  </div>
                  <p className="text-[10px] text-gray-400 truncate">Tirages évalués</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Nombre de tirages réels évalués en backtest walk-forward continu.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {showDetails && (
          <div className="p-3 rounded-md bg-black/40 border border-white/5 text-[11px] text-gray-400 leading-relaxed">
            <span className="font-semibold text-gray-300">Transparence Scientifique LOTO LUMIERE : </span>
            Conformément aux principes d'explicabilité et d'intégrité, nous évaluons nos modèles via des règles de score propres (Log-loss) et des tests d'hypothèses statistiques (Diebold-Mariano). Aucune fausse certitude de gain n'est communiquée.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
