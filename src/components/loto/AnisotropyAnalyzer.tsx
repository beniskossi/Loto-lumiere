import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, HelpCircle, Activity, LayoutGrid, Scale, Sparkles, TrendingUp } from "lucide-react";
import { NumberBall } from "@/components/NumberBall";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LineChart,
  Line
} from "recharts";

interface AnisotropyAnalyzerProps {
  drawName: string;
}

interface DecadeStats {
  id: number;
  label: string;
  range: [number, number];
  count: number;
  percentage: number;
  currentGap: number;
  zScore: number;
  pressionEquilibre: number; // Probabilité de rééquilibrage stochastique
}

export const AnisotropyAnalyzer = ({ drawName }: AnisotropyAnalyzerProps) => {
  const [selectedDecade, setSelectedDecade] = useState<number | null>(null);

  // Récupérer l'historique des 100 derniers tirages pour une analyse statistique robuste
  const { data: rawDraws, isLoading } = useQuery({
    queryKey: ["anisotropy-draws-history", drawName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("draw_results")
        .select("id, draw_name, draw_date, winning_numbers")
        .eq("draw_name", drawName)
        .order("draw_date", { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data || []).map((d) => ({
        id: d.id,
        drawName: d.draw_name,
        date: d.draw_date,
        winningNumbers: d.winning_numbers,
      }));
    },
    enabled: !!drawName,
  });

  // Calculs statistiques de l'Anisotropie Spatiale
  const stats = useMemo(() => {
    if (!rawDraws || rawDraws.length === 0) return null;

    const totalDraws = rawDraws.length;
    const decadeRanges: [number, number][] = [
      [1, 10],   // D1
      [11, 20],  // D2
      [21, 30],  // D3
      [31, 40],  // D4
      [41, 50],  // D5
      [51, 60],  // D6
      [61, 70],  // D7
      [71, 80],  // D8
      [81, 90],  // D9
    ];

    // Initialisation des structures
    const counts = Array(9).fill(0);
    const gaps = Array(9).fill(0);
    const gapFound = Array(9).fill(false);

    let totalBalls = 0;

    // Calcul des fréquences et des gaps actuels (non-sortie de la décade)
    rawDraws.forEach((draw, drawIdx) => {
      const numbers = draw.winningNumbers;
      if (!numbers || !Array.isArray(numbers)) return;

      const hasDecadeInDraw = Array(9).fill(false);

      numbers.forEach((num) => {
        decadeRanges.forEach((range, idx) => {
          if (num >= range[0] && num <= range[1]) {
            counts[idx]++;
            totalBalls++;
            hasDecadeInDraw[idx] = true;
          }
        });
      });

      // Calcul du gap actuel pour chaque décade
      hasDecadeInDraw.forEach((hasNumber, idx) => {
        if (!hasNumber && !gapFound[idx]) {
          gaps[idx]++;
        } else {
          gapFound[idx] = true;
        }
      });
    });

    // Fréquence théorique moyenne par décade : 5 numéros par tirage de 90 boules
    // Soit en moyenne 5 * (10 / 90) = 0.555 boules par décade et par tirage.
    // Pour N tirages, la moyenne théorique attendue est totalDraws * 0.555
    const expectedCount = totalDraws * (5 * (10 / 90));
    
    // Écart-type théorique (Loi Binomiale : N = totalDraws, p = 5/9)
    // Pour l'apparition d'au moins une boule de la décade par tirage
    const pDecadeAtLeastOne = 1 - ( (80/90) * (79/89) * (78/88) * (77/87) * (76/86) ); // ~0.443
    const varianceBinomial = totalDraws * pDecadeAtLeastOne * (1 - pDecadeAtLeastOne);
    const stdDevBinomial = Math.sqrt(varianceBinomial);

    // Construction des statistiques par décade
    const decadeStatsList: DecadeStats[] = decadeRanges.map((range, idx) => {
      const count = counts[idx];
      const percentage = totalBalls > 0 ? (count / totalBalls) * 100 : 0;
      
      // Z-Score pour détecter les décades anormalement chaudes (Z > 1.5) ou froides (Z < -1.5)
      const zScore = stdDevBinomial > 0 ? (count - expectedCount) / stdDevBinomial : 0;

      // Calcul de la pression d'équilibre (stochastique) : plus la décade a un grand gap et un faible z-score historique, plus elle pousse au rééquilibrage stochastique
      const gapFactor = Math.min(10, gaps[idx]) / 10; // Normalisé sur 10 tirages max
      const zFactor = Math.max(-2, Math.min(2, zScore)) / 2; // Normalisé entre -1 et 1
      const pressure = Math.max(0, Math.min(100, Math.round((gapFactor * 60 + (1 - zFactor) * 40))));

      return {
        id: idx + 1,
        label: `Décade ${idx + 1}`,
        range,
        count,
        percentage,
        currentGap: gaps[idx],
        zScore,
        pressionEquilibre: pressure,
      };
    });

    // Calcul de l'Entropie de Shannon de la distribution décimale
    // H(X) = - Sum( p_i * log2(p_i) )
    let shannonEntropy = 0;
    decadeStatsList.forEach((d) => {
      const pi = d.count / totalBalls;
      if (pi > 0) {
        shannonEntropy -= pi * Math.log2(pi);
      }
    });

    // L'entropie théorique maximale pour 9 éléments est log2(9) ≈ 3.170
    const maxEntropy = Math.log2(9);
    const entropyRatio = shannonEntropy / maxEntropy; // Ratio de régularité [0, 1]

    // Qualification du niveau d'anisotropie
    let anisotropyLevel = "Modéré";
    let anisotropyColor = "text-amber-500";
    if (entropyRatio >= 0.98) {
      anisotropyLevel = "Isotrope Parfait (Uniformité Totale)";
      anisotropyColor = "text-emerald-500";
    } else if (entropyRatio >= 0.94) {
      anisotropyLevel = "Isotrope Standard (Dispersion Naturelle)";
      anisotropyColor = "text-emerald-400";
    } else if (entropyRatio < 0.90) {
      anisotropyLevel = "Anisotrope Sévère (Forte Concentration Spatiale)";
      anisotropyColor = "text-rose-500";
    }

    // Décade la plus pressentie pour un rééquilibrage stochastique imminent
    const topPressionDecade = [...decadeStatsList].sort((a, b) => b.pressionEquilibre - a.pressionEquilibre)[0];

    return {
      decadeStatsList,
      shannonEntropy,
      maxEntropy,
      entropyRatio,
      anisotropyLevel,
      anisotropyColor,
      topPressionDecade,
      totalBalls,
      totalDraws,
    };
  }, [rawDraws]);

  // Données de tendance pour Recharts
  const chartData = useMemo(() => {
    if (!stats) return [];
    return stats.decadeStatsList.map((d) => ({
      name: `[${d.range[0]}-${d.range[1]}]`,
      "Activité %": parseFloat(d.percentage.toFixed(1)),
      "Pression d'Équilibre": d.pressionEquilibre,
      "Retard (Gap)": d.currentGap,
    }));
  }, [stats]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-[350px] w-full rounded-2xl" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="border-dashed border-border/60 text-center py-12 bg-card/20">
        <CardContent className="space-y-3">
          <Info className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            Données de dispersion spatiale indisponibles pour ce tirage.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Résumé de l'Entropie & Force Thermique */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Jauge d'Entropie */}
        <Card className="border-border/60 bg-gradient-to-br from-card to-muted/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-primary" />
              Entropie Thermique de Shannon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono">
                {stats.shannonEntropy.toFixed(3)}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                Max: {stats.maxEntropy.toFixed(3)}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.entropyRatio * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span className="text-muted-foreground">Régularité spatiale</span>
              <span className={cn("font-bold", stats.anisotropyColor)}>
                {(stats.entropyRatio * 100).toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Niveau de Concentration Spatiale */}
        <Card className="border-border/60 bg-gradient-to-br from-card to-muted/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-500" />
              État d'Anisotropie Global
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <span className={cn("text-sm font-bold block", stats.anisotropyColor)}>
              {stats.anisotropyLevel}
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Mesure si la sortie récente des boules respecte une isotropicité stochastique ou si des forces spatiales créent des grappes d'attraction locale.
            </p>
          </CardContent>
        </Card>

        {/* Recommandation de Rééquilibrage */}
        <Card className="border-border/60 bg-gradient-to-br from-card to-muted/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Rééquilibrage Imminent Pressenti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">
                Tranche [{stats.topPressionDecade.range[0]}-{stats.topPressionDecade.range[1]}]
              </span>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono text-[10px]">
                Attraction : {stats.topPressionDecade.pressionEquilibre}%
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Cette décade possède le plus fort déséquilibre combiné (Retard de {stats.topPressionDecade.currentGap} tirages et Z-score de {stats.topPressionDecade.zScore.toFixed(2)}). Son aspiration stochastique est maximale.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Graphique d'activité Recharts */}
        <Card className="lg:col-span-2 border-border/60 bg-card/40 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Activité Thermique et Pression Statistique par Tranches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                  <Bar dataKey="Activité %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => {
                      const isSelected = selectedDecade === index + 1;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={isSelected ? "hsl(var(--accent))" : "hsl(var(--primary))"}
                          opacity={selectedDecade === null || isSelected ? 1 : 0.6}
                        />
                      );
                    })}
                  </Bar>
                  <Bar dataKey="Pression d'Équilibre" fill="hsl(var(--emerald-500))" radius={[4, 4, 0, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Détails par Décade */}
        <Card className="border-border/60 bg-card/40 backdrop-blur-md flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-purple-400" />
              Sélecteur de Dispersion Spatiale
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 overflow-y-auto no-scrollbar max-h-[300px]">
            <div className="grid grid-cols-3 gap-2">
              {stats.decadeStatsList.map((d, idx) => {
                const isSelected = selectedDecade === d.id;
                const isTopPression = d.id === stats.topPressionDecade.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDecade(isSelected ? null : d.id)}
                    className={cn(
                      "p-2 rounded-lg border text-left transition-all duration-200 flex flex-col justify-between h-[75px] cursor-pointer",
                      isSelected
                        ? "bg-accent/15 border-accent shadow-sm"
                        : "bg-muted/10 border-border/30 hover:bg-muted/20",
                      isTopPression && !isSelected && "border-emerald-500/30 bg-emerald-500/5"
                    )}
                  >
                    <span className="text-[10px] font-bold text-muted-foreground leading-none block">
                      D{d.id} <span className="font-mono text-[9px]">[{d.range[0]}-{d.range[1]}]</span>
                    </span>
                    <span className="text-xs font-mono font-bold block text-foreground mt-1">
                      {d.percentage.toFixed(1)}%
                    </span>
                    <span className={cn(
                      "text-[9px] font-mono leading-none block mt-1",
                      d.currentGap > 2 ? "text-amber-500 font-bold" : "text-muted-foreground"
                    )}>
                      Gap : {d.currentGap}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedDecade && (
              <div className="p-3 bg-muted/20 border border-border/30 rounded-xl space-y-2 text-xs">
                {(() => {
                  const d = stats.decadeStatsList[selectedDecade - 1];
                  return (
                    <>
                      <div className="flex justify-between font-semibold">
                        <span>Décade {d.id} : [{d.range[0]} - {d.range[1]}]</span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          Z-Score : {d.zScore.toFixed(2)}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Cette décade est apparue <strong className="text-foreground">{d.count} fois</strong> sur les 100 derniers tirages.
                        {d.zScore > 1.5 ? (
                          <span className="text-rose-400 block mt-1">🔥 Hyperactivité thermique constatée : le secteur est en surchauffe par rapport à sa distribution théorique.</span>
                        ) : d.zScore < -1.5 ? (
                          <span className="text-cyan-400 block mt-1">❄️ Refroidissement sévère : cette décade est boudée par l'aspiration mécanique de la sphère de tirage.</span>
                        ) : (
                          <span className="text-emerald-400 block mt-1">✓ Distribution saine : la décade suit une dérive de diffusion statistique normale.</span>
                        )}
                      </p>
                    </>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rendu Spatial interactif de la Grille de 90 boules colorées par Décades */}
      <Card className="border-border/60 bg-card/40 backdrop-blur-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-primary" />
            Matrice d'Isotropicité de la Grille Décimale (90 Numéros)
          </CardTitle>
          <CardDescription className="text-xs">
            Visualisez le rayonnement et la densité d'aspiration spatiale sur l'ensemble de la grille en fonction de l'activité décimale.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-10 gap-1.5 p-3 bg-background border border-border/30 rounded-2xl max-h-[300px] overflow-y-auto no-scrollbar">
            {Array.from({ length: 90 }, (_, i) => i + 1).map((n) => {
              // Trouver à quelle décade appartient n
              const decId = Math.floor((n - 1) / 10) + 1;
              const decStats = stats.decadeStatsList[decId - 1];
              const isSelectedDecade = selectedDecade === decId;
              const isTopPressure = decId === stats.topPressionDecade.id;

              // Déterminer la couleur de rayonnement thermique de la décade
              let bgClass = "bg-muted/10 border-border/20 text-muted-foreground";
              if (isSelectedDecade) {
                bgClass = "bg-accent text-accent-foreground border-accent scale-105 z-10 font-bold ring-2 ring-accent/30";
              } else {
                if (decStats.zScore > 1.2) {
                  bgClass = "bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20";
                } else if (decStats.zScore < -1.2) {
                  bgClass = "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20";
                } else if (isTopPressure) {
                  bgClass = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20";
                } else {
                  bgClass = "bg-secondary/15 hover:bg-secondary/30 text-foreground/80 border-border/30";
                }
              }

              return (
                <button
                  key={n}
                  onClick={() => setSelectedDecade(isSelectedDecade ? null : decId)}
                  className={cn(
                    "h-8 rounded-lg text-xs font-mono font-semibold transition-all duration-200 flex flex-col items-center justify-center border cursor-pointer relative group/ball",
                    bgClass
                  )}
                  title={`Numéro ${n} - Décade ${decId} (${decStats.range[0]}-${decStats.range[1]})`}
                >
                  <span>{n}</span>
                  {/* Petit indicateur de point */}
                  {!isSelectedDecade && isTopPressure && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-400" />
                  )}
                  {!isSelectedDecade && decStats.zScore > 1.2 && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-orange-400" />
                  )}
                  {!isSelectedDecade && decStats.zScore < -1.2 && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-cyan-400" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] text-muted-foreground mt-4 border-t border-border/10 pt-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-orange-500/10 border border-orange-500/20 inline-block" />
              Surchauffe Décimale (Z &gt; 1.2)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-cyan-500/10 border border-cyan-500/20 inline-block" />
              Refroidissement Décimal (Z &lt; -1.2)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 inline-block" />
              Attraction Maximale de Rééquilibrage
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-accent inline-block" />
              Tranche Sélectionnée
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Guide méthodologique XAI complet */}
      <Card className="border-border/60 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent shadow-sm">
        <CardContent className="p-5 flex gap-4 items-start">
          <HelpCircle className="w-5 h-5 text-primary mt-0.5 shrink-0 animate-pulse" />
          <div className="space-y-1.5 text-xs">
            <h4 className="font-semibold text-foreground">Guide du Chercheur : Interprétation de l'Anisotropie Spatiale</h4>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              En théorie des jeux stochastiques, l'isotropicité représente l'état d'équidistribution idéal. Cependant, les tirages réels subissent des fluctuations de diffusion induites par des forces mécaniques et temporelles. L'Anisotropy Analyzer décompose la grille de 90 numéros en 9 tranches décimales strictes (décades) pour localiser les zones de congestion (surchauffe) et les zones de dépression statistique (refroidissement).
            </p>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              Le système calcule en direct <strong className="text-primary">l'Entropie de Shannon</strong> de cette distribution. Si l'entropie baisse fortement, cela signale l'émergence de "grappes d'attraction". Un joueur averti exploitera alors le principe de <strong className="text-primary">pression de rééquilibrage stochastique</strong> pour privilégier les numéros issus de tranches boudées qui vont immanquablement subir une poussée d'aspiration lors des tirages à venir afin de restaurer l'uniformité statistique globale de l'univers de jeu.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
