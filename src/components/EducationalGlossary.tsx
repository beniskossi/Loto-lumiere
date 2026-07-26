import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, AlertTriangle, Search, Brain, Cpu, Zap, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface GlossaryItem {
  id: string;
  category: "core" | "algorithms" | "formulas" | "metrics";
  title: string;
  subtitle: string;
  description: string;
  tag: string;
}

const GLOSSARY_ITEMS: GlossaryItem[] = [
  // Core Concepts
  {
    id: "hasard",
    category: "core",
    title: "Hasard & Indépendance Stochastique",
    subtitle: "Théorie de la probabilité classique",
    description: "Chaque tirage est strictement indépendant des précédents. Le conteneur à boules repart de zéro à chaque session avec une probabilité initiale uniforme (1/90 pour chaque numéro). L'analyse de données n'influence pas le tirage physique mais recherche des structures d'asymétrie dans l'historique.",
    tag: "Fondamental"
  },
  {
    id: "frequence-vs-probabilite",
    category: "core",
    title: "Fréquence Observée vs Probabilité Théorique",
    subtitle: "Inférence fréquentiste",
    description: "La fréquence est la mesure empirique passée (combien de fois un numéro a été tiré). La probabilité est la chance mathématique future. La loi des grands nombres stipule que la fréquence tend vers la probabilité lorsque le nombre de tirages tend vers l'infini.",
    tag: "Statistique"
  },
  {
    id: "dirichlet",
    category: "core",
    title: "Loi de Dirichlet à Oubli Exponentiel",
    subtitle: "Modèle Bayésien dynamique",
    description: "Contrairement aux moyennes simples, la distribution Dirichlet-Multinomiale intègre un paramètre de dégradation temporelle (lambda). Les tirages récents ont plus de poids dans la mise à jour des a priori bayésiens que les tirages vieux de plusieurs années.",
    tag: "Bayésien"
  },
  // Algorithms
  {
    id: "frequency-pro",
    category: "algorithms",
    title: "FrequencyPro",
    subtitle: "Statistique Inférentielle & Gaps",
    description: "Combine la fréquence pondérée par l'ancienneté, les écarts (gaps) moyens de sortie et les cycles d'émergence des numéros. Utile pour capter le retour à la moyenne théorique.",
    tag: "Statistique"
  },
  {
    id: "random-forest",
    category: "algorithms",
    title: "Random Forest",
    subtitle: "Ensemble d'Arbres de Décision",
    description: "Entraîne des centaines d'arbres sur des sous-ensembles aléatoires des données historiques (bagging) pour prédire l'appartenance d'un numéro au prochain tirage selon ses caractéristiques (parité, somme, décade, gap).",
    tag: "Machine Learning"
  },
  {
    id: "lstm-network",
    category: "algorithms",
    title: "LSTM Network",
    subtitle: "Deep Learning Séquentiel",
    description: "Réseau de neurones récurrent doté de portes d'oubli et de mémoire à long/court terme. Détecte les dépendances temporelles complexes et les dynamiques de transition entre tirages successifs.",
    tag: "Deep Learning"
  },
  {
    id: "transformer",
    category: "algorithms",
    title: "Transformer (Attention)",
    subtitle: "Mécanisme d'Auto-Attention",
    description: "Modèle d'attention multi-têtes analysant les relations contextuelles globales entre l'ensemble des numéros d'une fenêtre historique sans contrainte de proximité temporelle immédiate.",
    tag: "Deep Learning"
  },
  {
    id: "xgboost",
    category: "algorithms",
    title: "XGBoost",
    subtitle: "Gradient Boosted Decision Trees",
    description: "Algorithme de boosting supervisé hautement optimisé. Construit séquentiellement des arbres compensant les erreurs des arbres précédents pour maximiser le gain d'information.",
    tag: "Ensemble"
  },
  {
    id: "stacking-ensemble",
    category: "algorithms",
    title: "Stacking Ensemble",
    subtitle: "Méta-Classificateur Hybride",
    description: "Fusionne les prédictions individuelles de FrequencyPro, Random Forest, LSTM, Transformer et XGBoost via un méta-modèle pondéré adaptatif pour un consensus robuste.",
    tag: "Hybride ML"
  },
  // Formulas
  {
    id: "weighted-frequency",
    category: "formulas",
    title: "WeightedFrequency",
    subtitle: "Fréquence Pondérée Temporelle",
    description: "Mesure la récurrence des numéros en appliquant une décroissance exponentielle inversement proportionnelle à l'ancienneté du tirage.",
    tag: "Formule"
  },
  {
    id: "recurrent-pairs",
    category: "formulas",
    title: "RecurrentPairs",
    subtitle: "Co-occurrence de Paires",
    description: "Calcule le taux de corrélation et de co-apparition entre chaque paire de boules [1..90] pour repérer les paires historiquement associées.",
    tag: "Formule"
  },
  {
    id: "adaptive-gap",
    category: "formulas",
    title: "AdaptiveGap",
    subtitle: "Pression d'Écart Adaptative",
    description: "Compare l'écart actuel sans sortie d'un numéro avec son écart moyen historique et son écart maximum pour évaluer son retard stochastique relatif.",
    tag: "Formule"
  },
  {
    id: "sum-parity",
    category: "formulas",
    title: "SumParityBalance",
    subtitle: "Équilibre Somme & Parité",
    description: "Évalue la conformité d'un quintet aux cloches de Gauss de la somme idéale (autour de 227) et au ratio optimal de parité (3 paires / 2 impaires ou 2 paires / 3 impaires).",
    tag: "Formule"
  },
  // Metrics
  {
    id: "platt-scaling",
    category: "metrics",
    title: "Calibration & Platt Scaling",
    subtitle: "Ajustement des scores de confiance",
    description: "Méthode de régression logistique transformant les scores bruts des modèles en probabilités bien calibrées. Empêche la sur-confiance.",
    tag: "Métrologie"
  },
  {
    id: "walk-forward",
    category: "metrics",
    title: "Validation Walk-Forward",
    subtitle: "Backtesting temporel continu",
    description: "Procédure d'évaluation où le modèle est ré-entraîné à chaque pas de temps t et testé strictement sur t+1 sans fuite d'information future (data leakage).",
    tag: "Validation"
  }
];

export const EducationalGlossary = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");

  const filteredItems = useMemo(() => {
    return GLOSSARY_ITEMS.filter((item) => {
      const matchesTab = activeTab === "all" || item.category === activeTab;
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchTerm]);

  return (
    <Card className="border-border/50 bg-card/40 backdrop-blur-md shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Glossaire Technique & Explicabilité</CardTitle>
              <CardDescription className="text-xs">
                Découvrez les fondements mathématiques, les 6 algorithmes ML et les formules de LOTO LUMIERE
              </CardDescription>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher un terme..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Alert variant="destructive" className="bg-purple-500/10 text-purple-200 border-purple-500/20">
          <AlertTriangle className="h-4 w-4 text-purple-400" />
          <AlertTitle className="text-sm font-semibold">Avertissement de Transparence Scientifique</AlertTitle>
          <AlertDescription className="text-xs mt-1 leading-relaxed">
            LOTO LUMIERE utilise le Machine Learning et la statistique inférentielle pour explorer le jeu de données. La loterie physique restant un processus stochastique à événements indépendants, ces modèles ne garantissent aucun résultat futur et servent à l'analyse raisonnée et l'aide à la décision.
          </AlertDescription>
        </Alert>

        {/* Category Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto p-1 bg-secondary/30 rounded-xl gap-1 text-xs">
            <TabsTrigger value="all" className="rounded-lg py-1.5">Tous ({GLOSSARY_ITEMS.length})</TabsTrigger>
            <TabsTrigger value="core" className="rounded-lg py-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Bases
            </TabsTrigger>
            <TabsTrigger value="algorithms" className="rounded-lg py-1.5 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              6 Algorithmes
            </TabsTrigger>
            <TabsTrigger value="formulas" className="rounded-lg py-1.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Formules
            </TabsTrigger>
            <TabsTrigger value="metrics" className="rounded-lg py-1.5 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              Métriques
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-background/50 hover:bg-background/80 transition-all rounded-xl border border-border/40 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold text-sm text-foreground">{item.title}</h4>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {item.tag}
                </Badge>
              </div>
              <p className="text-[11px] font-medium text-purple-400">{item.subtitle}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <p className="col-span-2 text-center text-xs text-muted-foreground py-8">
              Aucun concept trouvé pour "{searchTerm}".
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

