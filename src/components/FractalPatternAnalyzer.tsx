import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useDrawResults } from "@/hooks/useDrawResults";
import { NumberBall } from "./NumberBall";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ReferenceLine
} from "recharts";
import { 
  Activity, 
  Info, 
  Compass, 
  TrendingUp, 
  GitBranch, 
  HelpCircle, 
  Flame, 
  RefreshCw,
  Scale,
  BrainCircuit,
  Binary
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FractalPatternAnalyzerProps {
  drawName: string;
}

// Interfaces for Hurst calculations
interface HurstResult {
  H: number;
  r2: number;
  predictabilityIndex: number;
  interpretation: string;
  interpretationDetail: string;
  regPoints: { lnD: number; lnRS: number; d: number; rs: number; predictedLnRS: number }[];
  series: number[];
}

export const FractalPatternAnalyzer = ({ drawName }: FractalPatternAnalyzerProps) => {
  const { data: results, isLoading, refetch } = useDrawResults(drawName, 250);
  const [historySize, setHistorySize] = useState<number>(100);
  const [selectedSeriesType, setSelectedSeriesType] = useState<"sums" | "means" | "parity">("sums");
  const [showFormulaInfo, setShowFormulaInfo] = useState<boolean>(false);

  // Filter and reverse results to have chronological order (oldest to newest)
  const chronoDraws = useMemo(() => {
    if (!results) return [];
    return [...results]
      .filter(r => r.winning_numbers && r.winning_numbers.length > 0)
      .slice(0, Math.min(historySize, results.length))
      .reverse();
  }, [results, historySize]);

  // Extract the time series based on selected series type
  const timeSeries = useMemo(() => {
    if (chronoDraws.length === 0) return [];
    
    return chronoDraws.map(draw => {
      const numbers = draw.winning_numbers || [];
      if (selectedSeriesType === "sums") {
        return numbers.reduce((sum, val) => sum + val, 0);
      } else if (selectedSeriesType === "means") {
        return numbers.reduce((sum, val) => sum + val, 0) / (numbers.length || 1);
      } else {
        // parity: proportion of even numbers
        const evens = numbers.filter(n => n % 2 === 0).length;
        return evens / (numbers.length || 1);
      }
    });
  }, [chronoDraws, selectedSeriesType]);

  // Compute Hurst Exponent deterministically using Rescaled Range (R/S) Analysis
  const hurstData = useMemo<HurstResult | null>(() => {
    const N = timeSeries.length;
    if (N < 16) return null;

    // 1. Choose window sizes (d) that are divisors or reasonable subsets
    // We want d to be between 4 and N, typically using power-of-2 like spacings or even gaps
    const dValues: number[] = [];
    const minD = 6;
    const maxD = Math.floor(N / 2);

    // Generate intervals for d
    for (let d = minD; d <= maxD; d = Math.round(d * 1.4)) {
      if (!dValues.includes(d) && d >= minD) {
        dValues.push(d);
      }
    }
    // Ensure we include the maximum possible d
    if (maxD > minD && !dValues.includes(maxD)) {
      dValues.push(maxD);
    }

    const R_S_pairs: { d: number; rs: number }[] = [];

    // 2. Compute R/S for each d
    for (const d of dValues) {
      const numSubsets = Math.floor(N / d);
      if (numSubsets === 0) continue;

      let rsSum = 0;
      let validSubsetsCount = 0;

      for (let j = 0; j < numSubsets; j++) {
        const startIndex = j * d;
        const subset = timeSeries.slice(startIndex, startIndex + d);

        // Calculate subset mean
        const mean = subset.reduce((sum, val) => sum + val, 0) / d;

        // Calculate subset standard deviation
        let varianceSum = 0;
        for (const x of subset) {
          varianceSum += (x - mean) * (x - mean);
        }
        const stdDev = Math.sqrt(varianceSum / d);

        // Skip subset if standard deviation is zero (to avoid division by zero)
        if (stdDev <= 0.00001) continue;

        // Create mean-adjusted and cumulative deviation series
        const Y: number[] = [];
        let cumSum = 0;
        const Z: number[] = [0];

        for (let i = 0; i < d; i++) {
          const adj = subset[i] - mean;
          Y.push(adj);
          cumSum += adj;
          Z.push(cumSum);
        }

        // Calculate Range R
        const maxZ = Math.max(...Z);
        const minZ = Math.min(...Z);
        const range = maxZ - minZ;

        // Rescaled range
        const rs = range / stdDev;
        rsSum += rs;
        validSubsetsCount++;
      }

      if (validSubsetsCount > 0) {
        const avgRS = rsSum / validSubsetsCount;
        R_S_pairs.push({ d, rs: avgRS });
      }
    }

    if (R_S_pairs.length < 3) return null;

    // 3. Perform Linear Regression on ln(d) vs ln(R/S) to find Hurst exponent H
    // ln(R/S) = H * ln(d) + C
    const regPoints = R_S_pairs.map(p => ({
      lnD: Math.log(p.d),
      lnRS: Math.log(p.rs),
      d: p.d,
      rs: p.rs,
      predictedLnRS: 0
    }));

    const nPoints = regPoints.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (const pt of regPoints) {
      sumX += pt.lnD;
      sumY += pt.lnRS;
      sumXY += pt.lnD * pt.lnRS;
      sumXX += pt.lnD * pt.lnD;
    }

    const denominator = (nPoints * sumXX - sumX * sumX);
    if (Math.abs(denominator) < 0.000001) return null;

    const H = (nPoints * sumXY - sumX * sumY) / denominator;
    const C = (sumY - H * sumX) / nPoints;

    // 4. Calculate R2 (Coefficient of Determination)
    const yMean = sumY / nPoints;
    let ssTot = 0;
    let ssRes = 0;

    for (const pt of regPoints) {
      const predictedY = H * pt.lnD + C;
      pt.predictedLnRS = predictedY;
      
      const diffMean = pt.lnRS - yMean;
      ssTot += diffMean * diffMean;

      const diffPred = pt.lnRS - predictedY;
      ssRes += diffPred * diffPred;
    }

    const r2 = ssTot > 0 ? (1 - (ssRes / ssTot)) : 1;

    // Normalize H to [0, 1] interval just in case of regression noise
    const boundedH = Math.max(0, Math.min(1, H));

    // Predictability Index: represents how far H is from the pure random walk of H = 0.5
    // PI = |H - 0.5| * 2, scaled to 0-100%
    const predictabilityIndex = Math.min(100, Math.round(Math.abs(boundedH - 0.5) * 200));

    // Formulate interpretations
    let interpretation = "";
    let interpretationDetail = "";

    if (boundedH < 0.45) {
      interpretation = "Anti-Persistant (Régression Moyenne)";
      interpretationDetail = `Hurst exponentiel H = ${boundedH.toFixed(3)} (< 0.50). La série temporelle des tirages possède un caractère "auto-correcteur". Un écart vers le haut par rapport à la moyenne sera très probablement suivi d'une correction immédiate vers le bas au prochain tirage. Les oscillations courtes sont privilégiées, favorisant des transitions de phase régulières.`;
    } else if (boundedH >= 0.45 && boundedH <= 0.55) {
      interpretation = "Mouvement Brownien (Bruit Aléatoire)";
      interpretationDetail = `Hurst exponentiel H = ${boundedH.toFixed(3)} (≈ 0.50). La série temporelle se comporte comme un bruit blanc ou un mouvement brownien pur, dénué de toute mémoire à long terme. Chaque tirage est rigoureusement indépendant du précédent. Le chaos thermique domine l'historique récent.`;
    } else {
      interpretation = "Persistant (Effet Tendance)";
      interpretationDetail = `Hurst exponentiel H = ${boundedH.toFixed(3)} (> 0.50). La série temporelle possède une "mémoire de tendance" active. Un mouvement récent dans une direction (hausse de la somme, décalage de la parité) tend à être suivi d'une dynamique similaire. Des patterns de clusters fractals se dessinent dans le temps.`;
    }

    return {
      H: boundedH,
      r2,
      predictabilityIndex,
      interpretation,
      interpretationDetail,
      regPoints,
      series: timeSeries
    };
  }, [timeSeries]);

  // Generate rolling Hurst exponent to observe predictability dynamics over time
  const rollingPredictability = useMemo(() => {
    if (timeSeries.length < 32) return [];

    const windowSize = 24; // rolling size
    const resultsList: { drawIndex: number; drawLabel: string; H: number; PI: number }[] = [];

    for (let i = windowSize; i <= timeSeries.length; i++) {
      const subSeries = timeSeries.slice(i - windowSize, i);
      const subN = subSeries.length;
      
      const dVals = [6, 8, 12];
      const subR_S: { d: number; rs: number }[] = [];

      for (const d of dVals) {
        const m = Math.floor(subN / d);
        if (m === 0) continue;
        let sumRS = 0;
        let count = 0;

        for (let j = 0; j < m; j++) {
          const chunk = subSeries.slice(j * d, j * d + d);
          const mean = chunk.reduce((s, v) => s + v, 0) / d;
          let varSum = 0;
          for (const x of chunk) varSum += (x - mean) * (x - mean);
          const sdev = Math.sqrt(varSum / d);
          if (sdev <= 0.0001) continue;

          let cum = 0;
          const Z = [0];
          for (let k = 0; k < d; k++) {
            cum += (chunk[k] - mean);
            Z.push(cum);
          }
          const range = Math.max(...Z) - Math.min(...Z);
          sumRS += range / sdev;
          count++;
        }
        if (count > 0) subR_S.push({ d, rs: sumRS / count });
      }

      if (subR_S.length >= 2) {
        // Simple linear regression slope for rolling
        const x1 = Math.log(subR_S[0].d);
        const y1 = Math.log(subR_S[0].rs);
        const x2 = Math.log(subR_S[subR_S.length - 1].d);
        const y2 = Math.log(subR_S[subR_S.length - 1].rs);
        
        let localH = (y2 - y1) / (x2 - x1 || 1);
        localH = Math.max(0, Math.min(1, localH));
        const localPI = Math.min(100, Math.round(Math.abs(localH - 0.5) * 200));

        // Get actual draw number/date
        const drawObj = chronoDraws[i - 1];
        resultsList.push({
          drawIndex: i,
          drawLabel: drawObj ? `${drawObj.draw_number || i}` : `T-${timeSeries.length - i}`,
          H: localH,
          PI: localPI
        });
      }
    }

    return resultsList;
  }, [timeSeries, chronoDraws]);

  // Determine recommendations based on the Hurst parameter and current state
  const fractalInsights = useMemo(() => {
    if (!hurstData) return [];

    const H = hurstData.H;
    const series = hurstData.series;
    const currentVal = series[series.length - 1];
    
    // Mean of series
    const mean = series.reduce((s, v) => s + v, 0) / (series.length || 1);
    const insights: string[] = [];

    insights.push(`Le **coefficient d'autocorrélation fractal (Hurst)** est mesuré à **H = ${H.toFixed(4)}** avec un indice d'alignement empirique **R² = ${hurstData.r2.toFixed(3)}**.`);

    if (H < 0.45) {
      insights.push(
        `**Comportement de rappel vers la moyenne (Anti-persistance)** détecté. La valeur actuelle de la série (${currentVal.toFixed(1)}) se situe ${currentVal > mean ? "au-dessus" : "en-dessous"} de la moyenne théorique (${mean.toFixed(1)}).`
      );
      if (currentVal > mean) {
        insights.push(
          `**Recommandation active** : Privilégiez des structures de tirage au prochain coup qui forcent une **baisse** de la somme ou de la parité pour rétablir la dérive fractale (retour harmonique).`
        );
      } else {
        insights.push(
          `**Recommandation active** : Privilégiez des structures de tirage au prochain coup qui forcent une **hausse** pour compenser l'écart temporaire.`
        );
      }
    } else if (H > 0.55) {
      insights.push(
        `**Comportement de persistance (Tendance)** détecté. La série temporelle montre un phénomène de "mémoire positive" à long terme.`
      );
      const lastGradients = series.slice(-3);
      const isTrendingUp = lastGradients[2] > lastGradients[0];
      insights.push(
        `**Recommandation active** : La tendance récente est à la **${isTrendingUp ? "hausse" : "baisse"}**. Dans un système persistant, favorisez des grilles de tirage s'inscrivant dans le prolongement de cette tendance dynamique.`
      );
    } else {
      insights.push(
        `**Neutralité chaotique optimale (Bruit Pur)**. La série ne présente pas de biais de structure mesurable à ce jour. Les variations restent rigoureusement aléatoires autour du centre de gravité standard.`
      );
      insights.push(
        `**Recommandation active** : Exploitez la distribution canonique pure (somme médiane attendue, parité de 50/50) sans forcer d'anticipation cyclique.`
      );
    }

    return insights;
  }, [hurstData]);

  return (
    <div className="space-y-6">
      
      {/* Title & Introduction Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-card/80 to-card/40 backdrop-blur-xl border border-border/30 p-6 rounded-2xl">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-purple-500 animate-pulse" />
            Analyseur de Patterns Fractals (Exposant de Hurst)
          </h2>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Calculez le niveau de mémoire temporelle des tirages historiques en évaluant l'exposant de Hurst (H) par analyse de plage rééchelonnée (R/S).
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs gap-1.5"
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Recalculer
          </Button>
          <Button
            variant={showFormulaInfo ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFormulaInfo(!showFormulaInfo)}
            className="text-xs gap-1.5"
          >
            <Binary className="w-3.5 h-3.5 text-primary" />
            Équations
          </Button>
        </div>
      </div>

      {/* Equations Explanation panel */}
      <AnimatePresence>
        {showFormulaInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-primary">
                  <Info className="w-4 h-4" />
                  Formulation Mathématique Déterministe
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-3 leading-relaxed text-foreground/90">
                <p>
                  L'exposant de Hurst $H$ quantifie le degré d'autocorrélation à long terme d'une série temporelle. Le calcul est rigoureusement déterministe et s'articule comme suit :
                </p>
                <div className="bg-background/80 p-4 rounded-xl font-mono space-y-2 border border-border/30 overflow-x-auto text-[11px]">
                  <div>1. Partitionner la série de taille $N$ en sous-intervalles de taille $d$ : $X_{t, j}$ pour $t \in [1, d]$.</div>
                  <div>2. Soustraire la moyenne locale : $Y_{t, j} = X_{t, j} - \mu_j$ où $\mu_j = \frac{1}{d} \sum_{i=1}^{d} X_{i, j}$.</div>
                  <div>3. Intégrer les écarts cumulés : $Z_{t, j} = \sum_{k=1}^{t} Y_{k, j}$.</div>
                  <div>4. Calculer l'amplitude locale : $R_j(d) = \max(Z_{1,j}, \dots, Z_{d,j}) - \min(Z_{1,j}, \dots, Z_{d,j})$.</div>
                  <div>5. Diviser par l'écart-type local $S_j(d)$ pour obtenir le Rescaled Range $(R/S)_d = \frac{1}{m}\sum R_j(d)/S_j(d)$.</div>
                  <div>6. Effectuer une régression linéaire : $\ln(E[R(d)/S(d)]) = H \cdot \ln(d) + \ln(C)$.</div>
                </div>
                <p>
                  Le coefficient de détermination $R^2$ mesure l'alignement des points de calcul sur la loi de puissance fractale théorique. Plus $R^2$ est proche de 1, plus la régularité fractale de la série est confirmée.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Settings and Gauge Indicators */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-border/50 bg-card/60 backdrop-blur-xl shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Compass className="w-5 h-5 text-primary" />
                Sélecteur de Dimension
              </CardTitle>
              <CardDescription className="text-xs">
                Définissez la série temporelle et la profondeur d'historique à auditer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              
              {/* Target Series Selector Buttons */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Série Temporelle Cible
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-muted/40 p-1 rounded-lg">
                  <Button
                    variant={selectedSeriesType === "sums" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 text-[11px] font-semibold rounded-md"
                    onClick={() => setSelectedSeriesType("sums")}
                  >
                    Somme
                  </Button>
                  <Button
                    variant={selectedSeriesType === "means" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 text-[11px] font-semibold rounded-md"
                    onClick={() => setSelectedSeriesType("means")}
                  >
                    Moyenne
                  </Button>
                  <Button
                    variant={selectedSeriesType === "parity" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 text-[11px] font-semibold rounded-md"
                    onClick={() => setSelectedSeriesType("parity")}
                  >
                    Parité
                  </Button>
                </div>
              </div>

              {/* History Depth Limit Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-foreground/80">Profondeur d'Analyse</span>
                  <span className="font-mono font-bold text-primary">{historySize} tirages</span>
                </div>
                <Slider
                  value={[historySize]}
                  min={30}
                  max={Math.min(250, results?.length || 250)}
                  step={5}
                  onValueChange={(val) => setHistorySize(val[0])}
                />
                <p className="text-[10px] text-muted-foreground">
                  Plus l'historique est profond, plus la régression de Hurst est précise statistiquement.
                </p>
              </div>

              {/* Predictability Index Gauge */}
              {hurstData && (
                <div className="pt-4 border-t border-border/30 space-y-4">
                  <div className="text-center space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Indice de Prédictibilité Fractal
                    </span>
                    <div className="relative inline-flex items-center justify-center">
                      {/* Circle Gauge SVG */}
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="52"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          className="text-secondary"
                        />
                        <motion.circle
                          cx="64"
                          cy="64"
                          r="52"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 52}
                          animate={{ strokeDashoffset: (2 * Math.PI * 52) * (1 - hurstData.predictabilityIndex / 100) }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="text-purple-500"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
                          {hurstData.predictabilityIndex}%
                        </span>
                        <span className="text-[9px] text-muted-foreground block font-bold uppercase">
                          Index (PI)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Interpretive Badge and label */}
                  <div className="p-3 bg-secondary/10 rounded-xl border border-border/20 text-center">
                    <Badge variant="outline" className="mb-1 text-[10px] uppercase font-bold border-purple-500/30 text-purple-400 bg-purple-500/5">
                      {hurstData.interpretation}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                      R² de la loi d'échelle : <strong className="text-foreground font-mono">{(hurstData.r2 * 100).toFixed(1)}%</strong>
                    </p>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        {/* Right Column: Regression Plot & Insights */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Scientific Interpretation Card */}
          {hurstData && (
            <Card className="border-border/40 bg-gradient-to-br from-secondary/10 to-background shadow-lg overflow-hidden">
              <CardHeader className="pb-3 bg-secondary/5 border-b border-border/30">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-primary" />
                  Diagnostic Stochastique de la Série
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <p className="text-xs text-foreground/80 leading-relaxed font-medium">
                  {hurstData.interpretationDetail}
                </p>

                {/* Recommendations */}
                <div className="space-y-2 border-t border-border/30 pt-4">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                    Instructions d'Optimisation Fractale
                  </span>
                  <div className="space-y-2">
                    {fractalInsights.map((insight, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-border/20 bg-muted/30 text-xs flex gap-2.5 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0 mt-1.5" />
                        <div 
                          className="text-foreground/90 font-medium"
                          dangerouslySetInnerHTML={{
                            __html: insight
                              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-purple-400 font-bold">$1</strong>')
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Log-Log Scaling plot & Rolling analysis charts */}
          <Card className="border-border/50 bg-card/40">
            <CardHeader className="py-3 flex flex-row items-center justify-between border-b border-border/30">
              <div>
                <CardTitle className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide text-foreground/80">
                  <Scale className="w-4 h-4 text-primary" />
                  Régression Linéaire de la Loi d'Échelle (R/S)
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Double échelle logarithmique $\ln(d)$ vs $\ln(R/S)$ montrant la pente harmonique $H$.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {isLoading ? (
                <div className="h-[240px] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : hurstData ? (
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ top: 10, right: 20, bottom: 20, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis 
                        type="number" 
                        dataKey="lnD" 
                        name="ln(d)" 
                        unit="" 
                        stroke="#888888"
                        fontSize={10}
                        tickFormatter={(v) => v.toFixed(2)}
                        label={{ value: "ln(Taille d'intervalle d)", position: "bottom", offset: 0, fill: "#888888", fontSize: 10 }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="lnRS" 
                        name="ln(R/S)" 
                        stroke="#888888"
                        fontSize={10}
                        tickFormatter={(v) => v.toFixed(2)}
                        label={{ value: "ln(R/S)", angle: -90, position: "left", offset: 10, fill: "#888888", fontSize: 10 }}
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }} 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background/95 border border-border p-2.5 rounded-lg shadow-md font-mono text-[10px] space-y-1">
                                <p className="font-bold text-foreground">Intervalle d = {data.d}</p>
                                <p>ln(d) = {data.lnD.toFixed(4)}</p>
                                <p className="text-primary">R/S Réel = {data.rs.toFixed(2)}</p>
                                <p className="text-muted-foreground">ln(R/S) Réel = {data.lnRS.toFixed(4)}</p>
                                <p className="text-purple-400">ln(R/S) Prédit = {data.predictedLnRS.toFixed(4)}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter 
                        name="Données R/S" 
                        data={hurstData.regPoints} 
                        fill="#a855f7" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="predictedLnRS" 
                        data={hurstData.regPoints} 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={false}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  Données historiques insuffisantes pour tracer la régression de Hurst.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rolling Predictability Chart */}
          {rollingPredictability.length > 0 && (
            <Card className="border-border/50 bg-card/40">
              <CardHeader className="py-3 flex flex-row items-center justify-between border-b border-border/30">
                <div>
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide text-foreground/80">
                    <Activity className="w-4 h-4 text-purple-400" />
                    Évolution Temporelle de l'Indice de Prédictibilité (PI)
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    Rolling window Hurst calculation across history to catch cycles of determinism.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rollingPredictability}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis 
                        dataKey="drawLabel" 
                        stroke="#888888" 
                        fontSize={9}
                        tickMargin={4}
                      />
                      <YAxis 
                        stroke="#888888" 
                        fontSize={9}
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background/95 border border-border p-2.5 rounded-lg shadow-md font-mono text-[10px] space-y-1">
                                <p className="font-bold text-foreground">Tirage #{data.drawLabel}</p>
                                <p className="text-purple-400 font-bold">Index Prédictibilité : {data.PI}%</p>
                                <p className="text-primary">Rolling Hurst H = {data.H.toFixed(3)}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <ReferenceLine y={50} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: "Seuil de Confiance", fill: "#f43f5e", fontSize: 9, position: "top" }} />
                      <Line 
                        type="monotone" 
                        dataKey="PI" 
                        stroke="#a855f7" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

        </div>

      </div>

    </div>
  );
};
