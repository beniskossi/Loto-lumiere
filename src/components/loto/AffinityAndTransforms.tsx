import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GapAffinityEngine, GapAffinityResult, TransformedNumber } from "@/lib/algorithms/gapAffinity";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, Sparkles, Scale, RefreshCw, Layers, Compass, HelpCircle } from "lucide-react";
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
        .select("id, draw_name, draw_date, winning_numbers")
        .eq("draw_name", drawName)
        .order("draw_date", { ascending: false })
        .limit(300);

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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
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
        </div>
      )}
    </div>
  );
};
