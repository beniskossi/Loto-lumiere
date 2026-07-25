import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const EducationalGlossary = () => {
  return (
    <Card className="bg-slate-900/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <BookOpen className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <CardTitle>Glossaire Pédagogique & Rigueur Scientifique</CardTitle>
            <CardDescription>
              Comprendre les concepts mathématiques et probabilistes de LOTO LUMIERE
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-300">
        <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Transparence & Hasard</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            Les tirages de loterie sont des événements indépendants. L'analyse historique permet de <strong>décrire le passé</strong> et de générer des combinaisons optimales sous contrainte de couverture, mais elle <strong>ne modifie en rien la probabilité mathématique d'un tirage physique</strong>.
          </AlertDescription>
        </Alert>

        <div className="grid gap-3">
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <span className="font-semibold text-white">Hasard & Indépendance</span>
            <p className="mt-1 text-xs">Le fait qu'un numéro soit sorti (ou non) aux tirages précédents n'influence pas sa probabilité de sortir au prochain tirage. Chaque tirage repart de zéro.</p>
          </div>
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <span className="font-semibold text-white">Fréquence vs Probabilité</span>
            <p className="mt-1 text-xs">La <strong>fréquence</strong> est une observation du passé (ex: "le 12 est sorti 5 fois ce mois-ci"). La <strong>probabilité</strong> est une chance mathématique théorique future (toujours 1 chance sur 90 pour chaque boule au départ).</p>
          </div>
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <span className="font-semibold text-white">Log-Score de Bernoulli & Scoring Propre</span>
            <p className="mt-1 text-xs">Évaluation stricte des probabilités sans sur-confiance. Mesure la distance d'information de Shannon entre la distribution prédite et le tirage réel.</p>
          </div>
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <span className="font-semibold text-white">Test de Diebold-Mariano & Skill Score</span>
            <p className="mt-1 text-xs">Test statistique HAC (Newey-West) comparant le modèle à la baseline uniforme (5/90). Si p &gt; 0.05, l'application conclut à l'absence d'avantage statistiquement significatif.</p>
          </div>

          <div className="pt-2">
            <h3 className="font-semibold text-white mb-2">Moteur Probabiliste (Phase 2)</h3>
            <ul className="space-y-3 text-xs text-gray-300">
              <li>
                <span className="font-semibold text-white">Loi de Dirichlet à Oubli : </span>
                Le moteur central (FrequencyPro) calcule une distribution bayésienne (Dirichlet-multinomiale) avec un facteur d'oubli exponentiel.
              </li>
              <li>
                <span className="font-semibold text-white">Baseline PCG32 (Honnêteté) : </span>
                L'IA est toujours comparée à un tirage pseudo-aléatoire uniforme de haute précision (PCG32).
              </li>
              <li>
                <span className="font-semibold text-white">Ledger Immuable (Walk-Forward) : </span>
                Les prédictions sont enregistrées chaque nuit avant le tirage dans un Ledger immuable puis confrontées à la réalité (backtesting continu walk-forward).
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
