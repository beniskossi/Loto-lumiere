import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NumberBall } from "@/components/NumberBall";
import { 
  buildPortfolio, 
  popularityPenalty, 
  calculateExpectedValue, 
  DEFAULT_LOTO_PAYTABLE 
} from "../../../supabase/functions/_shared/core/portfolio.ts";
import { Layers, ShieldCheck, AlertCircle, Coins, Sparkles, AlertTriangle } from "lucide-react";

export const PortfolioOptimizerPanel = () => {
  const [gridCount, setGridCount] = useState<number>(5);
  const [avoidPopular, setAvoidPopular] = useState<boolean>(true);

  // Simulation uniforme / bayésienne pour la distribution de base
  const uniformPi = useMemo(() => {
    const pi = new Float64Array(91);
    for (let k = 1; k <= 90; k++) pi[k] = 5 / 90;
    return pi;
  }, []);

  const portfolio = useMemo(() => {
    return buildPortfolio(uniformPi, gridCount, Math.random, { avoidPopular });
  }, [uniformPi, gridCount, avoidPopular]);

  const portfolioAnalysis = useMemo(() => {
    return portfolio.map(grid => {
      const penalty = popularityPenalty(grid);
      const evResult = calculateExpectedValue(grid, uniformPi, DEFAULT_LOTO_PAYTABLE);
      return {
        grid,
        penalty,
        ev: evResult.ev.toFixed(4),
        netProfit: evResult.netProfitExpected.toFixed(2),
        probByMatch: evResult.probByMatch
      };
    });
  }, [portfolio, uniformPi]);

  return (
    <Card className="border border-border/50 bg-black/40 backdrop-blur-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Couche de Décision & Optimization de Portefeuille
            </CardTitle>
            <CardDescription className="text-xs text-gray-400 mt-1">
              Génération de grilles à recouvrement minimal et évitement de la popularité humaine
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-950/20">
            Jeu Parimutuel
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-lg bg-black/30 border border-white/5">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-medium">
              <span className="text-gray-300">Nombre de grilles souhaitées</span>
              <span className="text-indigo-400 font-mono font-bold text-sm">{gridCount}</span>
            </div>
            <Slider
              value={[gridCount]}
              min={2}
              max={10}
              step={1}
              onValueChange={vals => setGridCount(vals[0])}
              className="py-2"
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold text-gray-200">
                Pénaliser les combinaisons populaires
              </Label>
              <p className="text-[11px] text-gray-400">
                Évite les dates (&le;31), suites arithmétiques et chiffres porte-bonheur pour ne pas partager le jackpot
              </p>
            </div>
            <Switch
              checked={avoidPopular}
              onCheckedChange={setAvoidPopular}
            />
          </div>
        </div>

        {/* Responsible Play Important Notice */}
        <div className="p-3.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300/90 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-200">Transparence sur l'Espérance Mathématique (E[Gain]) :</span>
            <p className="text-[11px] leading-relaxed text-amber-300/80">
              L'optimisation de portefeuille n'augmente pas la probabilité brute de gagner (qui reste fixée par la combinaison de 5 parmi 90). Son rôle est d'optimiser le <strong>gain net conditionnel</strong> en évitant les grilles sur-jouées par les autres joueurs (jeu parimutuel) pour réduire la probabilité de partage du lot.
            </p>
          </div>
        </div>

        {/* Generated Portfolio Grids */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Portefeuille Généré sous Contrainte de Couverture
          </h4>

          <div className="space-y-2.5">
            {portfolioAnalysis.map((item, idx) => (
              <div 
                key={idx}
                className="p-3 rounded-lg bg-black/40 border border-white/5 hover:border-indigo-500/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-500 w-6 font-semibold">#{idx + 1}</span>
                  <div className="flex items-center gap-1.5">
                    {item.grid.map((num) => (
                      <NumberBall key={num} number={num} size="sm" />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block">Indice de Popularité</span>
                    <span className={item.penalty === 0 ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                      {item.penalty === 0 ? "Anti-populaire (Optimal)" : `Pénalité: +${item.penalty}`}
                    </span>
                  </div>

                  <div className="text-right border-l border-white/10 pl-4">
                    <span className="text-[10px] text-gray-400 block">Espérance E[Gain] / Ticket</span>
                    <span className="font-mono text-amber-400 font-semibold">
                      {item.netProfit} €
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
