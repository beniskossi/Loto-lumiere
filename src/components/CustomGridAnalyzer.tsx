import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { NumberBall } from "./NumberBall";
import { Slider } from "@/components/ui/slider";
import { 
  Sparkles, 
  HelpCircle, 
  RefreshCw, 
  Flame, 
  Scale, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  Compass,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CustomGridAnalyzerProps {
  drawName: string;
  formulasBreakdown?: any;
}

export const CustomGridAnalyzer = ({ drawName, formulasBreakdown }: CustomGridAnalyzerProps) => {
  const { toast } = useToast();
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([12, 27, 45, 68, 83]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  // Quick Pick IA (100% Déterministe via LCG)
  const handleQuickPick = () => {
    // Calculer un seed stable basé sur le nom du tirage
    let seed = 123456789;
    if (drawName) {
      seed = Array.from(drawName).reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0);
    }
    
    // Simple LCG interne déterministe
    let state = Math.abs(seed) >>> 0;
    const lcgNext = () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296;
    };
    
    const nums: number[] = [];
    while (nums.length < 5) {
      const rand = Math.floor(lcgNext() * 90) + 1;
      if (!nums.includes(rand)) {
        nums.push(rand);
      }
    }
    nums.sort((a, b) => a - b);
    setSelectedNumbers(nums);
    setAnalysisResult(null);
    toast({
      title: "Quick Pick IA Généré",
      description: "Une combinaison équilibrée de 5 numéros a été suggérée.",
    });
  };

  const handleNumberChange = (index: number, val: number) => {
    const next = [...selectedNumbers];
    next[index] = val;
    setSelectedNumbers(next);
    setAnalysisResult(null);
  };

  // Run detailed probabilistic audit
  const runAIAudit = () => {
    setIsAnalyzing(true);
    
    // Check for duplicates
    const unique = new Set(selectedNumbers);
    if (unique.size !== 5) {
      toast({
        title: "Numéros invalides",
        description: "Veuillez sélectionner 5 numéros uniques (sans doublon).",
        variant: "destructive",
      });
      setIsAnalyzing(false);
      return;
    }

    setTimeout(() => {
      const sorted = [...selectedNumbers].sort((a, b) => a - b);
      const sum = sorted.reduce((acc, curr) => acc + curr, 0);
      
      // 1. Parity analysis
      const evens = sorted.filter(n => n % 2 === 0).length;
      const odds = 5 - evens;
      let parityScore = 100;
      let parityDesc = "Équilibre parfait (3:2 / 2:3)";
      if (evens === 5 || odds === 5) {
        parityScore = 30;
        parityDesc = "Extrême (5:0 / 0:5) - Statistiquement très rare (moins de 3% des tirages)";
      } else if (evens === 4 || odds === 4) {
        parityScore = 75;
        parityDesc = "Légèrement déséquilibré (4:1) - Fréquent mais non optimal";
      }

      // 2. Sum Range Analysis (ideal sum for 5/90 is ~180-270, average is 227.5)
      let sumScore = 100;
      let sumDesc = "Somme optimale (située dans l'intervalle d'équilibre 180-270)";
      if (sum < 120 || sum > 330) {
        sumScore = 20;
        sumDesc = "Somme excentrique (extrêmement faible ou élevée)";
      } else if (sum < 180 || sum > 270) {
        sumScore = 65;
        sumDesc = "Somme modérée (légèrement hors de la cloche de Gauss principale)";
      }

      // 3. Spatial Dispersion Analysis
      let dispersionScore = 100;
      let dispersionDesc = "Excellente dispersion spatiale sur l'ensemble de la grille (1-90)";
      
      const gaps = [];
      for (let i = 0; i < sorted.length - 1; i++) {
        gaps.push(sorted[i + 1] - sorted[i]);
      }
      const minGap = Math.min(...gaps);
      const consecutiveCount = gaps.filter(g => g === 1).length;

      if (consecutiveCount >= 2 || minGap === 1) {
        dispersionScore = 50;
        dispersionDesc = "Clustering spatial détecté (plusieurs numéros consécutifs ou très proches)";
      }

      // 4. Score overall composite calculation
      const compositeScore = Math.round((parityScore * 0.3) + (sumScore * 0.4) + (dispersionScore * 0.3));

      // Dynamic feedback advice
      let advice = "Cette combinaison présente d'excellents paramètres de parité et de dispersion de somme. Recommandée pour le prochain tirage !";
      if (compositeScore < 50) {
        advice = "Cette combinaison comporte des anomalies de répartition statistique majeures (nombres trop regroupés ou somme excessive). Nous vous conseillons d'ajuster pour élargir l'intervalle.";
      } else if (compositeScore < 80) {
        advice = "Bonne combinaison globale, mais pourrait être optimisée en ajustant un ou deux numéros pour parfaire l'équilibre pair/impair ou recentrer la somme totale.";
      }

      setAnalysisResult({
        compositeScore,
        sum,
        evens,
        odds,
        parityDesc,
        sumDesc,
        dispersionDesc,
        advice,
        gaps
      });
      setIsAnalyzing(false);
      
      toast({
        title: "Audit IA Terminé",
        description: `Score de compatibilité calculé : ${compositeScore}/100`,
      });
    }, 850);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-card border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Compass className="w-5 h-5 text-primary" />
                Analyseur de Combinaisons Personnalisées
              </CardTitle>
              <CardDescription className="text-xs">
                Saisissez ou générez vos numéros favoris pour évaluer instantanément leur robustesse mathématique
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleQuickPick}
              className="border-primary/30 hover:bg-primary/5 text-primary gap-1.5 h-8 font-semibold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Quick Pick IA
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Saisie des numéros */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Vos 5 numéros sélectionnés (1 - 90)
            </label>
            <div className="flex flex-wrap justify-center gap-3 py-2">
              {selectedNumbers.map((num, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <NumberBall number={num} size="lg" />
                  <select
                    value={num}
                    onChange={(e) => handleNumberChange(idx, parseInt(e.target.value) || 1)}
                    className="bg-secondary/25 hover:bg-secondary/40 border border-border/40 rounded-lg text-xs font-mono font-bold px-2 py-1 outline-none text-foreground/90 transition-colors cursor-pointer"
                  >
                    {Array.from({ length: 90 }, (_, i) => i + 1).map((val) => (
                      <option key={val} value={val}>
                        {val < 10 ? `0${val}` : val}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={runAIAudit} 
            disabled={isAnalyzing} 
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-95 text-primary-foreground font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Analyse IA en cours...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Calculer la Compatibilité IA
              </>
            )}
          </Button>

          {/* Résultats de l'audit */}
          {analysisResult && (
            <div className="pt-4 border-t border-border/30 space-y-5 animate-fade-in">
              
              {/* Score Général */}
              <div className="p-4 rounded-xl border bg-secondary/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1.5 text-center sm:text-left">
                  <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Score de Compatibilité Globale
                  </span>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Mesure l'alignement de vos numéros avec les lois probabilistes de la loterie à 90 boules.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="relative flex items-center justify-center">
                    <span className="text-3xl font-extrabold tracking-tight text-primary">
                      {analysisResult.compositeScore}
                    </span>
                    <span className="text-xs text-muted-foreground ml-0.5">/100</span>
                  </div>
                  <Badge 
                    variant={analysisResult.compositeScore >= 85 ? "default" : analysisResult.compositeScore >= 60 ? "secondary" : "destructive"}
                    className="text-[10px]"
                  >
                    {analysisResult.compositeScore >= 85 ? "Excellent Équilibre" : analysisResult.compositeScore >= 60 ? "Correct" : "Déséquilibré"}
                  </Badge>
                </div>
              </div>

              {/* Grid des facteurs spécifiques */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Parité */}
                <div className="p-3.5 rounded-xl border bg-card/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-blue-500" /> Parité Pair/Impair
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {analysisResult.evens}P / {analysisResult.odds}I
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {analysisResult.parityDesc}
                  </p>
                </div>

                {/* Somme */}
                <div className="p-3.5 rounded-xl border bg-card/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-amber-500" /> Somme Cumulée
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Total: {analysisResult.sum}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {analysisResult.sumDesc}
                  </p>
                </div>

                {/* Dispersion */}
                <div className="p-3.5 rounded-xl border bg-card/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-emerald-500" /> Écartement Spatial
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Grille 1-90
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {analysisResult.dispersionDesc}
                  </p>
                </div>

              </div>

              {/* Conseils IA de Synthèse */}
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Recommandation Personnalisée de l'IA :
                </div>
                <p className="text-xs text-foreground/85 leading-relaxed font-medium">
                  "{analysisResult.advice}"
                </p>
              </div>

            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};
