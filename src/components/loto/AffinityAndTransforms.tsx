import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GapAffinityEngine, GapAffinityResult, TransformedNumber } from "@/lib/algorithms/gapAffinity";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Info, 
  Sparkles, 
  Scale, 
  RefreshCw, 
  Layers, 
  Compass, 
  HelpCircle, 
  Link2, 
  GitBranch, 
  ArrowRight, 
  Clock, 
  Trophy 
} from "lucide-react";
import { NumberBall } from "@/components/NumberBall";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AffinityAndTransformsProps {
  drawName: string;
}

export const AffinityAndTransforms = ({ drawName }: AffinityAndTransformsProps) => {
  const [customNumbers, setCustomNumbers] = useState<number[]>([12, 27, 45, 60, 89]);
  const [tempNum, setTempNum] = useState<string>("");

  // Récupérer l'historique complet pour calculer les écarts réels
  const { data: rawDraws, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["affinity-draws-history", drawName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("draw_results")
        .select("id, draw_name, draw_date, winning_numbers, draw_time, draw_day")
        .eq("draw_name", drawName)
        .order("draw_date", { ascending: false })
        .limit(300);

      if (error) throw error;

      return (data || []).map((d) => ({
        id: d.id,
        drawName: d.draw_name,
        date: d.draw_date,
        winningNumbers: d.winning_numbers,
        drawTime: d.draw_time || "",
        drawDay: d.draw_day || "",
      }));
    },
    enabled: !!drawName,
  });

  // Récupérer également la prédiction IA par défaut pour initialiser les numéros si possible
  const { data: aiPrediction } = useQuery({
    queryKey: ["affinity-ai-pred", drawName],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("advanced-ai-prediction-v2", {
        body: { drawName, useSmartEnsemble: true },
      });
      if (error) return null;
      return data?.optimizedPrediction?.numbers as number[] | undefined;
    },
    enabled: !!drawName,
  });

  // Mettre à jour les numéros d'analyse dès que la prédiction IA est disponible (une seule fois)
  useMemo(() => {
    if (aiPrediction && aiPrediction.length >= 5) {
      setCustomNumbers(aiPrediction.slice(0, 5));
    }
  }, [aiPrediction]);

  // Calculs algorithmiques via notre GapAffinityEngine 100% déterministe
  const results = useMemo(() => {
    if (!rawDraws || rawDraws.length === 0) return null;

    // Séquence d'affinité
    const affinitySequence = GapAffinityEngine.getGapAffinitySequence(rawDraws, customNumbers, 8);
    
    // Transformations géométriques
    const transformations = GapAffinityEngine.calculateNumberTransforms(customNumbers);

    // Gaps actuels pour explications
    const currentGaps = GapAffinityEngine.calculateCurrentGaps(rawDraws);

    return {
      affinitySequence,
      transformations,
      currentGaps,
    };
  }, [rawDraws, customNumbers]);

  // Calcul d'affinité matricielle et co-occurrences réelles de paires
  const pairAffinities = useMemo(() => {
    if (!rawDraws || rawDraws.length === 0 || customNumbers.length < 2) return [];

    const pairs: {
      num1: number;
      num2: number;
      coOccurrences: number;
      jaccardIndex: number;
      lastSeenDate: string | null;
      drawsSinceLast: number;
    }[] = [];

    // Fréquence individuelle de chaque numéro
    const freqMap = new Map<number, number>();
    rawDraws.forEach((draw) => {
      const numbers = draw.winningNumbers || [];
      numbers.forEach((n) => {
        freqMap.set(n, (freqMap.get(n) || 0) + 1);
      });
    });

    // Établir toutes les paires possibles à partir de customNumbers
    for (let i = 0; i < customNumbers.length - 1; i++) {
      for (let j = i + 1; j < customNumbers.length; j++) {
        const n1 = customNumbers[i];
        const n2 = customNumbers[j];

        let coOccurrences = 0;
        let lastSeenDate: string | null = null;
        let drawsSinceLast = rawDraws.length;

        for (let k = 0; k < rawDraws.length; k++) {
          const draw = rawDraws[k];
          const numbers = draw.winningNumbers || [];
          if (numbers.includes(n1) && numbers.includes(n2)) {
            coOccurrences++;
            if (!lastSeenDate) {
              lastSeenDate = draw.date;
              drawsSinceLast = k; // index chronologique inverse
            }
          }
        }

        const count1 = freqMap.get(n1) || 0;
        const count2 = freqMap.get(n2) || 0;
        const unionCount = count1 + count2 - coOccurrences;
        const jaccardIndex = unionCount > 0 ? coOccurrences / unionCount : 0;

        pairs.push({
          num1: n1,
          num2: n2,
          coOccurrences,
          jaccardIndex,
          lastSeenDate,
          drawsSinceLast,
        });
      }
    }

    return pairs.sort((a, b) => b.jaccardIndex - a.jaccardIndex);
  }, [rawDraws, customNumbers]);

  // Recherche de compagnons de paires optimaux globaux (les plus fortes affinités de chaque numéro actif)
  const globalCompanionAffinities = useMemo(() => {
    if (!rawDraws || rawDraws.length === 0 || customNumbers.length === 0) return [];

    const freqMap = new Map<number, number>();
    rawDraws.forEach((draw) => {
      const numbers = draw.winningNumbers || [];
      numbers.forEach((n) => {
        freqMap.set(n, (freqMap.get(n) || 0) + 1);
      });
    });

    const companionsList: {
      baseNumber: number;
      topCompanions: { number: number; count: number; jaccardIndex: number }[];
    }[] = [];

    customNumbers.forEach((baseNum) => {
      const coMap = new Map<number, number>();
      rawDraws.forEach((draw) => {
        const numbers = draw.winningNumbers || [];
        if (numbers.includes(baseNum)) {
          numbers.forEach((n) => {
            if (n !== baseNum) {
              coMap.set(n, (coMap.get(n) || 0) + 1);
            }
          });
        }
      });

      const baseFreq = freqMap.get(baseNum) || 0;
      const sorted = Array.from(coMap.entries())
        .map(([num, count]) => {
          const numFreq = freqMap.get(num) || 0;
          const unionCount = baseFreq + numFreq - count;
          const jaccardIndex = unionCount > 0 ? count / unionCount : 0;
          return { number: num, count, jaccardIndex };
        })
        .sort((a, b) => b.jaccardIndex - a.jaccardIndex)
        .slice(0, 3);

      companionsList.push({
        baseNumber: baseNum,
        topCompanions: sorted,
      });
    });

    return companionsList;
  }, [rawDraws, customNumbers]);

  const handleAddNumber = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(tempNum, 10);
    if (isNaN(val) || val < 1 || val > 90) {
      toast.error("Veuillez saisir un numéro valide entre 1 et 90.");
      return;
    }
    if (customNumbers.includes(val)) {
      toast.error("Ce numéro est déjà présent dans la séquence.");
      return;
    }

    if (customNumbers.length >= 5) {
      // Remplacer le premier par glissement
      setCustomNumbers([...customNumbers.slice(1), val].sort((a, b) => a - b));
    } else {
      setCustomNumbers([...customNumbers, val].sort((a, b) => a - b));
    }
    setTempNum("");
    toast.success(`Numéro ${val} ajouté à l'analyse.`);
  };

  const handleRemoveNumber = (num: number) => {
    if (customNumbers.length <= 1) {
      toast.error("Il doit y avoir au moins 1 numéro pour lancer l'analyse d'affinité.");
      return;
    }
    setCustomNumbers(customNumbers.filter((n) => n !== num));
    toast.success(`Numéro ${num} retiré.`);
  };

  const handleUseAIPrediction = () => {
    if (aiPrediction && aiPrediction.length >= 5) {
      setCustomNumbers(aiPrediction.slice(0, 5));
      toast.success("Numéros de la prédiction IA officielle appliqués.");
    } else {
      toast.info("Aucune prédiction IA officielle trouvée, conservation des numéros actuels.");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Panneau de configuration des numéros sources */}
      <Card className="border-border/60 bg-card/40 backdrop-blur-md">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1 max-w-xl">
              <h3 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                <Compass className="w-5 h-5 text-primary" />
                Séquence Source pour Analyse d'Affinité
              </h3>
              <p className="text-sm text-muted-foreground">
                Définissez les numéros de base choisis par les algorithmes ou saisissez les vôtres pour projeter leurs affinités d'écarts stochastiques et symétries de coordonnées.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {aiPrediction && aiPrediction.length >= 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUseAIPrediction}
                  className="gap-2 text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Utiliser Prédiction IA
                </Button>
              )}
              <form onSubmit={handleAddNumber} className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={tempNum}
                  onChange={(e) => setTempNum(e.target.value)}
                  placeholder="1-90"
                  className="w-20 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
                <Button type="submit" size="sm" className="text-xs">
                  Ajouter
                </Button>
              </form>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 bg-muted/30 p-4 rounded-xl border border-border/30">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Numéros Actifs :
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <AnimatePresence>
                {customNumbers.map((num) => (
                  <motion.div
                    key={num}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="relative group"
                  >
                    <NumberBall
                      number={num}
                      size="md"
                      className="cursor-pointer hover:ring-2 hover:ring-destructive/50 transition-all duration-200"
                      onClick={() => handleRemoveNumber(num)}
                    />
                    <span className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md">
                      ×
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <p className="text-[11px] text-muted-foreground ml-auto">
              (Cliquez sur une boule pour la retirer de la séquence)
            </p>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : !results ? (
        <Card className="border-dashed border-border/60 text-center py-12 bg-card/20">
          <CardContent className="space-y-3">
            <Info className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              Données stochastiques indisponibles pour ce tirage.
            </p>
            <Button size="sm" onClick={() => refetch()}>
              Recharger l'historique
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="pairs" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 max-w-2xl bg-secondary/20 p-1 rounded-xl mb-6">
            <TabsTrigger value="pairs" className="gap-2 rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-background/80 data-[state=active]:shadow-sm">
              <Link2 className="w-4 h-4 text-blue-400" />
              Affinités de Paires
            </TabsTrigger>
            <TabsTrigger value="geometry" className="gap-2 rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-background/80 data-[state=active]:shadow-sm">
              <Scale className="w-4 h-4 text-amber-500" />
              Symétries & Géométrie
            </TabsTrigger>
            <TabsTrigger value="gap-sequences" className="gap-2 rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-background/80 data-[state=active]:shadow-sm">
              <Layers className="w-4 h-4 text-purple-500" />
              Écarts Harmoniques
            </TabsTrigger>
          </TabsList>

          {/* ONGLETS CONTENU */}
          <TabsContent value="pairs" className="mt-0 focus-visible:outline-none space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* ANALYSE DES PAIRES ACTIVES */}
              <Card className="border-border/60 bg-card/50 shadow-md flex flex-col">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-blue-400" />
                        Co-occurrences des Paires Sélectionnées
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Analyse statistique des {pairAffinities.length} paires possibles formées par vos numéros actifs
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-blue-500/5 text-blue-400 border-blue-500/10">
                      Formule Jaccard
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                  {pairAffinities.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      Sélectionnez au moins 2 numéros pour analyser les paires.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
                      {pairAffinities.map((pair, idx) => {
                        const pct = Math.round(pair.jaccardIndex * 100);
                        return (
                          <div 
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/10 hover:bg-muted/30 transition-all gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-muted-foreground w-6">#{idx + 1}</span>
                              <div className="flex gap-1.5">
                                <NumberBall number={pair.num1} size="xs" />
                                <span className="text-muted-foreground font-semibold">+</span>
                                <NumberBall number={pair.num2} size="xs" />
                              </div>
                            </div>

                            <div className="flex items-center gap-6 justify-between sm:justify-end flex-1">
                              <div className="flex flex-col text-left sm:text-right">
                                <span className="text-xs font-semibold text-foreground">
                                  {pair.coOccurrences} {pair.coOccurrences > 1 ? "sorties" : "sortie"}
                                </span>
                                {pair.lastSeenDate ? (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 sm:justify-end">
                                    <Clock className="w-3 h-3 text-muted-foreground/70" />
                                    il y a {pair.drawsSinceLast} tirages
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground/50">Jamais sorties ensemble</span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden hidden xs:block">
                                  <div 
                                    className="bg-blue-400 h-full rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono text-xs w-12 justify-center">
                                  {pct}%
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="bg-muted/10 p-3.5 rounded-xl border border-border/20 text-xs text-muted-foreground space-y-1.5">
                    <p className="font-semibold text-foreground flex items-center gap-1.5 text-[11px]">
                      <Info className="w-3.5 h-3.5 text-blue-400" />
                      Indice d'Affinité de Jaccard :
                    </p>
                    <p className="text-[10px] leading-relaxed text-muted-foreground/90">
                      Mesure la force d'association d'une paire en évitant les biais de fréquence brute. 
                      Formule : <code className="bg-muted px-1 rounded font-mono text-foreground">P(A ∩ B) / P(A ∪ B)</code>. 
                      Un score de 10% ou plus indique un couple de numéros statistiquement soudé de façon anormale par rapport à l'indépendance pure.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* COMPAGNONS GLOBAUX */}
              <Card className="border-border/60 bg-card/50 shadow-md flex flex-col">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-blue-400" />
                        Compagnons d'Affinité Maximale
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Pour chaque numéro actif, voici les 3 autres numéros de la grille qui l'accompagnent le plus souvent
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/5 text-emerald-400 border-emerald-500/10">
                      Co-occurrences SQL
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
                    {globalCompanionAffinities.map((compGroup, i) => (
                      <div key={i} className="p-3.5 rounded-xl bg-muted/10 border border-border/5 space-y-3">
                        <div className="flex items-center gap-2 border-b border-border/10 pb-2">
                          <span className="text-xs text-muted-foreground">Autour de :</span>
                          <NumberBall number={compGroup.baseNumber} size="xs" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {compGroup.topCompanions.map((companion, idx) => {
                            const cPct = Math.round(companion.jaccardIndex * 100);
                            return (
                              <div 
                                key={idx} 
                                className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-background/50 border border-border/30 text-center space-y-1.5"
                              >
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-muted-foreground font-mono">#{idx+1}</span>
                                  <NumberBall number={companion.number} size="xs" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-foreground">{companion.count} sorties</span>
                                  <span className="text-[9px] text-blue-400 font-mono">Affinité {cPct}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-muted/10 p-3.5 rounded-xl border border-border/20 text-xs text-muted-foreground space-y-1.5">
                    <p className="font-semibold text-foreground flex items-center gap-1.5 text-[11px]">
                      <Trophy className="w-3.5 h-3.5 text-emerald-500" />
                      Recommandation de Couplage :
                    </p>
                    <p className="text-[10px] leading-relaxed text-muted-foreground/90">
                      Si vous jouez l'un de vos numéros actifs, associer son compagnon à forte affinité dans vos grilles réelles permet d'exploiter les grappes temporelles d'apparition confirmées par l'historique de la loterie.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="geometry" className="mt-0 focus-visible:outline-none">
            {/* GÉOMÉTRIE DES NUMÉROS (Transformations Symétriques) */}
            <Card className="border-border/60 bg-card/50 shadow-md flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                      <Scale className="w-5 h-5 text-amber-500" />
                      Symétries & Géométrie d'Écarts
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Transformations canoniques déterministes basées sur la topologie de la grille [1, 90]
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/5 text-amber-500">
                    Déterministe Exact
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/40 text-[10px] font-bold text-muted-foreground uppercase tracking-wider pb-2">
                        <th className="pb-3 pr-4">Base</th>
                        <th className="pb-3 px-3 text-center">Voisins (-1 / +1)</th>
                        <th className="pb-3 px-3 text-center">Ombre Lin. (91-n)</th>
                        <th className="pb-3 px-3 text-center">Ombre Circ. (n+45)</th>
                        <th className="pb-3 px-3 text-center">Miroir (Inverse)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.transformations.map((t) => (
                        <tr
                          key={t.original}
                          className="border-b border-border/10 last:border-0 hover:bg-muted/10 transition-colors"
                        >
                          <td className="py-3.5 pr-4">
                            <NumberBall number={t.original} size="sm" />
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <Badge variant="secondary" className="font-mono text-xs w-8 h-7 flex items-center justify-center rounded-md">
                                {t.voisinMoins}
                              </Badge>
                              <span className="text-muted-foreground text-[10px]">/</span>
                              <Badge variant="secondary" className="font-mono text-xs w-8 h-7 flex items-center justify-center rounded-md">
                                {t.voisinPlus}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 border-purple-500/30 text-purple-400 bg-purple-500/5">
                              {t.ombreLineaire}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                              {t.ombreCirculaire}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 border-amber-500/30 text-amber-400 bg-amber-500/5">
                              {t.miroir}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Guide méthodologique rapide */}
                <div className="bg-muted/20 p-4 rounded-xl border border-border/30 text-xs text-muted-foreground mt-4 space-y-2">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-primary" />
                    Définition des Concepts Géométriques :
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>
                      <strong className="text-foreground">Voisins :</strong> Numéros adjacents sur la grille, favorisant l'effet de glissement mécanique de la sphère de tirage.
                    </li>
                    <li>
                      <strong className="text-foreground">Ombre Linéaire (91-n) :</strong> Le point symétrique linéaire sur l'intervalle [1, 90] (ex: 1 $\leftrightarrow$ 90).
                    </li>
                    <li>
                      <strong className="text-foreground">Ombre Circulaire (n+45) :</strong> L'antipode direct sur le disque stochastique mod 90, représentant la plus grande distance uniforme.
                    </li>
                    <li>
                      <strong className="text-foreground">Miroir :</strong> Inverse décimal des chiffres avec enveloppement rigoureux (ex: 27 $\rightarrow$ 72 ; 60 $\rightarrow$ 6).
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gap-sequences" className="mt-0 focus-visible:outline-none">
            {/* SÉQUENCE D'AFFINITÉ DES ÉCARTS (Gap Affinity Sequence) */}
            <Card className="border-border/60 bg-card/50 shadow-md flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                      <Layers className="w-5 h-5 text-purple-500" />
                      Séquences d'Affinité des Écarts
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Numéros de la grille partageant la plus forte corrélation d'intervalle de non-sortie
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-purple-500/5 text-purple-500">
                    Stochastique Déterminé
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pb-2 border-b border-border/30">
                    <span>Numéro Proposé</span>
                    <span>Écart Actuel</span>
                    <span>Cohorte de Gap</span>
                    <span className="text-right">Coefficient d'Affinité</span>
                  </div>

                  <div className="space-y-2.5">
                    {results.affinitySequence.map((item, index) => {
                      const pct = Math.round(item.affinityScore * 100);
                      return (
                        <div
                          key={item.number}
                          className="flex items-center justify-between bg-muted/20 hover:bg-muted/40 p-2.5 rounded-lg border border-border/10 transition-all duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-muted-foreground w-4">
                              #{index + 1}
                            </span>
                            <NumberBall number={item.number} size="xs" />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {item.currentGap}
                            </span>
                            <span className="text-muted-foreground text-[10px]">tirages</span>
                          </div>

                          <div>
                            <Badge
                              className={cn(
                                "text-[10px] px-2 py-0.5 font-medium border capitalize",
                                item.cohort === "court" && "border-emerald-500/20 text-emerald-400 bg-emerald-500/5",
                                item.cohort === "moyen" && "border-blue-500/20 text-blue-400 bg-blue-500/5",
                                item.cohort === "long" && "border-amber-500/20 text-amber-400 bg-amber-500/5",
                                item.cohort === "critique" && "border-rose-500/20 text-rose-400 bg-rose-500/5"
                              )}
                            >
                              {item.cohort}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-primary h-full rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs font-bold text-primary w-10 text-right">
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explication d'affinité */}
                <div className="bg-muted/20 p-4 rounded-xl border border-border/30 text-xs text-muted-foreground mt-4 space-y-2">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-primary" />
                    Principe de l'Affinité des Écarts :
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    L'affinité des écarts calcule à quel point d'autres numéros de la grille [1, 90] partagent un profil de latence harmonique proche de votre séquence active. Un coefficient élevé indique que le numéro cible a une distance temporelle de sommeil (Gap) parfaitement corrélée et équilibrée avec vos numéros, favorisant des sorties simultanées en grappes harmoniques lors des rééquilibrages de tirage.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
