import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useConditionalPredictions } from "@/hooks/useConditionalPredictions";
import { GitBranch, Sparkles, ArrowRight, Search, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberBall } from "@/components/NumberBall";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ConditionalPredictionsProps {
  drawName: string;
}

export const ConditionalPredictions = ({ drawName }: ConditionalPredictionsProps) => {
  const { data, isLoading } = useConditionalPredictions(drawName);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRules = useMemo(() => {
    if (!data?.rules) return [];
    if (!searchTerm.trim()) return data.rules;
    const term = parseInt(searchTerm.trim(), 10);
    if (isNaN(term)) return data.rules;
    return data.rules.filter(
      r => r.condition === term || r.consequence === term
    );
  }, [data?.rules, searchTerm]);

  const filteredCombinations = useMemo(() => {
    if (!data?.combinations) return [];
    if (!searchTerm.trim()) return data.combinations;
    const term = parseInt(searchTerm.trim(), 10);
    if (isNaN(term)) return data.combinations;
    return data.combinations.filter(
      c => c.numbers.includes(term)
    );
  }, [data?.combinations, searchTerm]);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/40">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const hasRules = filteredRules.length > 0;
  const hasCombos = filteredCombinations.length > 0;

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card/50 p-4 rounded-xl border border-border/40 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className="font-semibold text-sm">Filtre par Numéro</h3>
            <p className="text-xs text-muted-foreground">Recherchez un numéro dans les règles d'implication</p>
          </div>
        </div>
        <div className="relative w-full sm:w-48">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Ex: 12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      {!data || (data.rules.length === 0 && data.combinations.length === 0) ? (
        <Card className="border-border/40 bg-card/30 text-center py-8">
          <CardContent className="space-y-3 flex flex-col items-center">
            <Info className="w-8 h-8 text-purple-400" />
            <h4 className="font-semibold text-base">Aucune règle conditionnelle détectée</h4>
            <p className="text-xs text-muted-foreground max-w-md">
              Les données historiques pour le tirage <strong>{drawName}</strong> n'ont pas encore atteint la masse critique requise pour extraire des règles d'implication statistiques avec un seuil de confiance suffisant.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Rules Section */}
          <Card className="bg-gradient-to-br from-purple-500/10 via-card/50 to-pink-500/10 border-purple-500/30 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitBranch className="w-5 h-5 text-purple-400" />
                  Règles d'Implication Conditionnelle
                </CardTitle>
                <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-300">
                  {filteredRules.length} règle(s)
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Modèle d'association (Si le numéro X sort, le numéro Y a une probabilité élevée d'accompagner le tirage)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasRules ? (
                <div className="space-y-2.5">
                  {filteredRules.slice(0, 8).map((rule, idx) => (
                    <div key={idx} className="p-3 bg-background/60 hover:bg-background/80 transition-all rounded-xl border border-border/40 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <NumberBall number={rule.condition} size="md" />
                        <ArrowRight className="w-4 h-4 text-purple-400 shrink-0" />
                        <NumberBall number={rule.consequence} size="md" />
                      </div>
                      <div className="text-right">
                        <Badge variant={rule.confidence === "high" ? "default" : rule.confidence === "medium" ? "secondary" : "outline"} className="text-xs">
                          {rule.probability.toFixed(0)}% probabilité
                        </Badge>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Observé {rule.occurrences} fois ensemble
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Aucune règle trouvée pour le numéro {searchTerm}.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Combinations Section */}
          <Card className="bg-gradient-to-br from-blue-500/10 via-card/50 to-cyan-500/10 border-blue-500/30 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  Paires et Trio d'Affinité
                </CardTitle>
                <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-300">
                  {filteredCombinations.length} combinaison(s)
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Séquences récurrentes enregistrées dans les archives historiques
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasCombos ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredCombinations.map((combo, idx) => (
                    <div key={idx} className="p-3 bg-background/60 rounded-xl border border-border/40 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex gap-2">
                          {combo.numbers.map((num, i) => (
                            <NumberBall key={i} number={num} size="sm" />
                          ))}
                        </div>
                        <Badge variant="secondary" className="font-semibold text-xs bg-blue-500/20 text-blue-300">
                          {combo.frequency}× sorties
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-2 border-t border-border/30">
                        <span>Dernière apparition</span>
                        <span className="font-medium text-foreground">
                          {format(new Date(combo.lastSeen), "dd MMMM yyyy", { locale: fr })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Aucune combinaison associée trouvée pour le numéro {searchTerm}.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

