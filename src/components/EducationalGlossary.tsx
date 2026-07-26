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
            <CardTitle>Glossaire Pédagogique</CardTitle>
            <CardDescription>
              Comprendre les concepts derrière l'analyse de données
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-300">
        <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Transparence & Hasard</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            Les tirages de loterie sont des événements indépendants. L'analyse historique (fréquences, algorithmes) permet de <strong>décrire le passé</strong> et de générer des combinaisons variées, mais elle <strong>ne modifie en rien la probabilité mathématique du prochain tirage</strong>.
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
            <span className="font-semibold text-white">Corrélation (Biais de confirmation)</span>
            <p className="mt-1 text-xs">Les algorithmes peuvent trouver des "motifs" dans le passé (ex: "le 5 et le 10 sortent souvent ensemble"). C'est une observation descriptive du jeu de données, pas une loi de la nature.</p>
          </div>
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <span className="font-semibold text-white">Calibration (Score de Confiance)</span>
            <p className="mt-1 text-xs">Le score affiché (ex: 65%) ne signifie pas "65% de chances de gagner". Il indique le degré d'alignement de la combinaison avec les paramètres du modèle (répartition, poids historiques).</p>
          </div>
        
<h3 className="font-semibold text-white mb-2">Moteur Probabiliste (Phase 2)</h3>
          <ul className="space-y-4 text-sm text-gray-300">
            <li>
              <span className="font-semibold text-white">Loi de Dirichlet à Oubli</span>
              <p className="mt-1 text-gray-400">Le moteur central (FrequencyPro) n'utilise plus de statistiques naïves. Il calcule une distribution bayésienne (Dirichlet-multinomiale) avec un facteur d'oubli exponentiel. Les pondérations (lambda) ne sont plus codées en dur mais ajustées mathématiquement.</p>
            </li>
            <li>
              <span className="font-semibold text-white">Baseline PCG32 (Honnêteté)</span>
              <p className="mt-1 text-gray-400">Pour prouver sa performance, l'IA est toujours comparée à un algorithme purement aléatoire de haute précision (PCG32). Si l'IA ne fait pas mieux que la baseline (probabilité de 5/90), elle s'efface.</p>
            </li>
            <li>
              <span className="font-semibold text-white">Ledger de Calibration (Walk-Forward)</span>
              <p className="mt-1 text-gray-400">Les prédictions sont enregistrées chaque nuit dans un Ledger immuable puis confrontées à la réalité le lendemain. Ce backtesting continu (Platt Scaling) permet à l'IA d'apprendre de ses propres erreurs (Log-Score) et de ne jamais gonfler artificiellement sa "confiance".</p>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
