import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, BarChart3, Brain, Search, Sparkles, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ALGORITHM_NAMES } from "@/lib/algorithms/registry";

export const HowItWorks = () => {
  const features = [
    {
      icon: Database,
      title: "Données Historiques",
      description: "Accédez aux résultats de tous les tirages avec historique complet et mise à jour automatique.",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Search,
      title: "Consultation de Numéros",
      description: "Analysez n'importe quel numéro : fréquence, associations, et tendances prédictives.",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      icon: BarChart3,
      title: "Statistiques Détaillées",
      description: "Visualisez les numéros les plus et moins fréquents avec des graphiques interactifs.",
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      icon: Brain,
      title: "Prédictions Standards",
      description: "3 algorithmes de base analysent les patterns historiques pour générer des prédictions.",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: Sparkles,
      title: "Science Avancée (4 Axes)",
      description: "Modélisation Markov, Calibration EMA, Régulation Shannon et Analyse Harmonique DFT pour des prédictions équilibrées.",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Brain,
      title: "IA Avancée & Algorithmes",
      description: `${ALGORITHM_NAMES.length} algorithmes optimaux : ${ALGORITHM_NAMES.join(', ')} pour des prédictions ultra-précises.`,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-primary text-white border-0">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-3">
            <Info className="w-7 h-7" />
            Comment Utiliser LOTO LUMIERE
          </CardTitle>
          <CardDescription className="text-white/80 text-base">
            Guide complet pour profiter au maximum de toutes les fonctionnalités
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card
              key={index}
              className="bg-gradient-card border-border/50 hover:border-primary/50 transition-all hover:shadow-lg animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${feature.bgColor}`}>
                    <Icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Alert className="bg-accent/10 border-accent/30">
        <Info className="w-5 h-5 text-accent" />
        <AlertDescription className="text-foreground">
          <strong>Important :</strong> Les prédictions sont basées sur l'analyse statistique des tirages passés. 
          La loterie reste un jeu de hasard où chaque tirage est indépendant. Jouez de manière responsable.
        </AlertDescription>
      </Alert>

      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Conseils d'Utilisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold">1</span>
            </div>
            <p className="text-muted-foreground">
              Consultez l'onglet <strong>Données</strong> pour voir l'historique complet des résultats
            </p>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
              <span className="text-accent font-bold">2</span>
            </div>
            <p className="text-muted-foreground">
              Utilisez <strong>Consulter</strong> pour analyser vos numéros préférés en profondeur
            </p>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
              <span className="text-success font-bold">3</span>
            </div>
            <p className="text-muted-foreground">
              Explorez les <strong>Statistiques</strong> pour identifier les tendances globales
            </p>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-purple-500 font-bold">4</span>
            </div>
            <p className="text-muted-foreground">
              Comparez les <strong>Prédictions</strong> standards et <strong>IA Avancée</strong> pour une vision complète
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
