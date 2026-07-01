import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  TrendingUp,
  Activity,
  Target,
  Info,
  Sparkles,
  BarChart3
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConfidenceFactors {
  dataQuality: number;
  dataFreshness: number;
  algorithmConsensus: number;
  historicalAccuracy: number;
  patternStrength: number;
}

interface ProfessionalConfidenceIndicatorProps {
  confidence: number;
  factors?: Partial<ConfidenceFactors>;
  algorithmName?: string;
  dataPoints?: number;
  showDetails?: boolean;
}

export const ProfessionalConfidenceIndicator = ({
  confidence,
  factors,
  algorithmName,
  dataPoints,
  showDetails = true
}: ProfessionalConfidenceIndicatorProps) => {
  const analysis = useMemo(() => {
    const normalizedConfidence = Math.min(0.95, Math.max(0, confidence));
    
    // Calculate confidence components
    const defaultFactors: ConfidenceFactors = {
      dataQuality: factors?.dataQuality ?? 0.7,
      dataFreshness: factors?.dataFreshness ?? 0.8,
      algorithmConsensus: factors?.algorithmConsensus ?? 0.6,
      historicalAccuracy: factors?.historicalAccuracy ?? 0.5,
      patternStrength: factors?.patternStrength ?? 0.65
    };

    // Weighted confidence calculation
    const weights = {
      dataQuality: 0.25,
      dataFreshness: 0.15,
      algorithmConsensus: 0.25,
      historicalAccuracy: 0.20,
      patternStrength: 0.15
    };

    const calculatedConfidence = Object.entries(defaultFactors).reduce(
      (sum, [key, value]) => sum + value * weights[key as keyof ConfidenceFactors],
      0
    );

    // Determine confidence level
    let level: 'high' | 'medium' | 'low' | 'very-low';
    let color: string;
    let bgColor: string;
    let icon: React.ElementType;
    let label: string;
    let description: string;

    if (normalizedConfidence >= 0.75) {
      level = 'high';
      color = 'text-success';
      bgColor = 'bg-success/10';
      icon = ShieldCheck;
      label = 'Confiance Élevée';
      description = 'Prédiction fiable basée sur des données solides';
    } else if (normalizedConfidence >= 0.55) {
      level = 'medium';
      color = 'text-amber-500';
      bgColor = 'bg-amber-500/10';
      icon = Shield;
      label = 'Confiance Modérée';
      description = 'Prédiction avec incertitude modérée';
    } else if (normalizedConfidence >= 0.35) {
      level = 'low';
      color = 'text-orange-500';
      bgColor = 'bg-orange-500/10';
      icon = ShieldAlert;
      label = 'Confiance Faible';
      description = 'Données insuffisantes, prudence recommandée';
    } else {
      level = 'very-low';
      color = 'text-destructive';
      bgColor = 'bg-destructive/10';
      icon = ShieldAlert;
      label = 'Confiance Très Faible';
      description = 'Prédiction exploratoire uniquement';
    }

    // Calculate margin of error (based on confidence interval)
    const marginOfError = ((1 - normalizedConfidence) * 100 / 2).toFixed(1);

    // Reliability score (0-100)
    const reliabilityScore = Math.round(normalizedConfidence * 100);

    return {
      confidence: normalizedConfidence,
      calculatedConfidence,
      factors: defaultFactors,
      level,
      color,
      bgColor,
      icon,
      label,
      description,
      marginOfError,
      reliabilityScore
    };
  }, [confidence, factors]);

  const Icon = analysis.icon;

  return (
    <Card className={cn("overflow-hidden", analysis.bgColor)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              analysis.bgColor,
              "border-2",
              analysis.level === 'high' ? "border-success" :
              analysis.level === 'medium' ? "border-amber-500" :
              analysis.level === 'low' ? "border-orange-500" :
              "border-destructive"
            )}>
              <Icon className={cn("w-5 h-5", analysis.color)} />
            </div>
            <div>
              <p className={cn("font-semibold text-sm", analysis.color)}>
                {analysis.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {analysis.description}
              </p>
            </div>
          </div>
          
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-right"
          >
            <p className={cn("text-3xl font-bold", analysis.color)}>
              {analysis.reliabilityScore}%
            </p>
            <p className="text-[10px] text-muted-foreground">
              ±{analysis.marginOfError}% marge
            </p>
          </motion.div>
        </div>

        {/* Main confidence bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Score de fiabilité</span>
            <span className="font-medium">{analysis.reliabilityScore}/100</span>
          </div>
          <div className="relative">
            <Progress 
              value={analysis.reliabilityScore} 
              className={cn(
                "h-3",
                analysis.level === 'high' ? "[&>div]:bg-success" :
                analysis.level === 'medium' ? "[&>div]:bg-amber-500" :
                analysis.level === 'low' ? "[&>div]:bg-orange-500" :
                "[&>div]:bg-destructive"
              )}
            />
            {/* Threshold markers */}
            <div className="absolute top-0 left-[35%] w-px h-3 bg-muted-foreground/30" />
            <div className="absolute top-0 left-[55%] w-px h-3 bg-muted-foreground/30" />
            <div className="absolute top-0 left-[75%] w-px h-3 bg-muted-foreground/30" />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
            <span>Faible</span>
            <span>Modéré</span>
            <span>Élevé</span>
          </div>
        </div>

        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3"
          >
            {/* Confidence Factors */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <BarChart3 className="w-3 h-3" />
                Facteurs de confiance
              </p>
              
              <TooltipProvider>
                <div className="grid grid-cols-2 gap-2">
                  <FactorBar 
                    label="Qualité données" 
                    value={analysis.factors.dataQuality}
                    tooltip="Complétude et cohérence des données historiques"
                  />
                  <FactorBar 
                    label="Fraîcheur" 
                    value={analysis.factors.dataFreshness}
                    tooltip="Récence des données utilisées"
                  />
                  <FactorBar 
                    label="Consensus algos" 
                    value={analysis.factors.algorithmConsensus}
                    tooltip="Accord entre les différents algorithmes"
                  />
                  <FactorBar 
                    label="Précision hist." 
                    value={analysis.factors.historicalAccuracy}
                    tooltip="Performance historique de l'algorithme"
                  />
                </div>
              </TooltipProvider>
            </div>

            {/* Algorithm & Data Info */}
            <div className="flex flex-wrap gap-2">
              {algorithmName && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Activity className="w-3 h-3" />
                  {algorithmName}
                </Badge>
              )}
              {dataPoints && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Target className="w-3 h-3" />
                  {dataPoints} tirages
                </Badge>
              )}
            </div>

            {/* Interpretation Guide */}
            <div className={cn(
              "p-2 rounded text-xs",
              analysis.level === 'high' ? "bg-success/5 border border-success/20" :
              analysis.level === 'medium' ? "bg-amber-500/5 border border-amber-500/20" :
              "bg-orange-500/5 border border-orange-500/20"
            )}>
              <div className="flex items-start gap-2">
                <Sparkles className={cn("w-3 h-3 mt-0.5", analysis.color)} />
                <p className="text-muted-foreground">
                  {analysis.level === 'high' ? (
                    "Cette prédiction bénéficie d'un fort consensus algorithmique et de données de qualité. Les numéros suggérés sont statistiquement optimisés."
                  ) : analysis.level === 'medium' ? (
                    "Confiance modérée. Considérez cette prédiction comme une suggestion éclairée, mais gardez une approche prudente."
                  ) : (
                    "Données limitées ou divergence algorithmique. Cette prédiction est exploratoire et ne doit pas être suivie aveuglément."
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

const FactorBar = ({ 
  label, 
  value, 
  tooltip 
}: { 
  label: string; 
  value: number; 
  tooltip: string;
}) => {
  const percentage = Math.round(value * 100);
  const color = value >= 0.7 ? "bg-success" : value >= 0.5 ? "bg-amber-500" : "bg-orange-500";
  
  return (
    <Tooltip>
      <TooltipTrigger className="w-full">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{percentage}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={cn("h-full rounded-full", color)}
            />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
};
