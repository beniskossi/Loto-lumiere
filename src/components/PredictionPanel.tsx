import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { NumberBall } from "@/components/NumberBall";
import { SocialShare } from "@/components/SocialShare";
import { useLatestPrediction } from "@/hooks/usePredictions";
import { useGeneratePrediction } from "@/hooks/useGeneratePrediction";
import { useAdvancedPrediction } from "@/hooks/useAdvancedPrediction";
import { usePersonalizedPrediction } from "@/hooks/usePersonalizedPrediction";
import { PredictionExplanationPanel } from "./PredictionExplanationPanel";
import { PatternDetectionPanel } from "./PatternDetectionPanel";
import { PredictionFeedbackDialog } from "./PredictionFeedbackDialog";
import { DynamicConfidenceIndicator } from "./DynamicConfidenceIndicator";
import { MultiAlgorithmComparison } from "./MultiAlgorithmComparison";
import { ConditionalPredictions } from "./ConditionalPredictions";
import { MultiDrawPredictionPanel } from "./MultiDrawPredictionPanel";
import { MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Brain, Sparkles, TrendingUp, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { PredictionSkeleton } from "@/components/LoadingSkeleton";

interface PredictionPanelProps {
  drawName: string;
}

export const PredictionPanel = ({ drawName }: PredictionPanelProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: latestPrediction, isLoading: predictionLoading } = useLatestPrediction(drawName);
  const { data: advancedPredictions } = useAdvancedPrediction(drawName);
  const { data: personalizedData } = usePersonalizedPrediction(drawName, user?.id);
  const explanations = advancedPredictions?.explanations;
  const patterns = personalizedData?.patterns || [];
  const personalizedPrediction = personalizedData?.prediction;
  const generatePrediction = useGeneratePrediction();
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [analysisDepth, setAnalysisDepth] = useState("100");
  const topAdvancedPrediction = advancedPredictions?.predictions?.[0];

  const handleGeneratePrediction = async () => {
    try {
      toast({
        title: "Génération en cours...",
        description: "Analyse des données historiques avec les modèles ML",
      });

      await generatePrediction.mutateAsync({ 
        drawName, 
        analysisDepth: parseInt(analysisDepth) 
      });

      toast({
        title: "✓ Prédiction générée",
        description: "Nouvelle prédiction disponible",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: (error as Error).message || "Impossible de générer la prédiction",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Confiance Dynamique */}
      <DynamicConfidenceIndicator drawName={drawName} />

      {/* Comparaison Multi-Algorithmes */}
      <MultiAlgorithmComparison drawName={drawName} />

      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Prédictions Intelligentes
              </CardTitle>
              <CardDescription>
                Prédictions basées sur des algorithmes d'apprentissage automatique
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="analysis-depth" className="text-sm whitespace-nowrap">Analyser:</Label>
                <Select value={analysisDepth} onValueChange={setAnalysisDepth}>
                  <SelectTrigger id="analysis-depth" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 tirages</SelectItem>
                    <SelectItem value="50">50 tirages</SelectItem>
                    <SelectItem value="100">100 tirages</SelectItem>
                    <SelectItem value="200">200 tirages</SelectItem>
                    <SelectItem value="500">500 tirages</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleGeneratePrediction}
                  disabled={generatePrediction.isPending}
                  className="gap-2"
                >
                  {generatePrediction.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Générer
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="gap-2"
                >
                  <Brain className="w-4 h-4" />
                  {showAdvanced ? "Masquer" : "Avancé"}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {predictionLoading ? (
            <PredictionSkeleton />
          ) : (
            <div className="space-y-4">
              {latestPrediction ? (
              <div className="space-y-4">
                <div className="p-6 bg-gradient-primary rounded-lg text-white">
                  <div className="mb-4">
                    <p className="text-sm opacity-90 mb-1">
                      Prédiction pour le prochain tirage {drawName}
                    </p>
                    <p className="text-xs opacity-70">
                      Date prévue: {format(new Date(latestPrediction.prediction_date), "EEEE d MMMM yyyy", { locale: fr })}
                    </p>
                    <div className="flex items-center gap-4 text-xs opacity-80">
                      <span>Modèle: <strong>{latestPrediction.model_used}</strong></span>
                      {latestPrediction.confidence_score && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Confiance: <strong>{latestPrediction.confidence_score.toFixed(1)}%</strong>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-3 flex-wrap justify-center mb-4">
                    {latestPrediction.predicted_numbers.map((num, idx) => (
                      <NumberBall key={`${num}-${idx}`} number={num} size="lg" confidence={latestPrediction.confidence_score ? latestPrediction.confidence_score * 100 : undefined} />
                    ))}
                  </div>

                  <div className="flex justify-center gap-2 mb-4">
                    <SocialShare
                      title={`Prédiction ${drawName}`}
                      description={`Numéros prédits: ${latestPrediction.predicted_numbers.join(', ')}`}
                      numbers={latestPrediction.predicted_numbers}
                      drawName={drawName}
                      predictionId={latestPrediction.id}
                      confidence={latestPrediction.confidence_score}
                    />
                    {user && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFeedback(true)}
                        className="gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Évaluer
                      </Button>
                    )}
                  </div>

                  {latestPrediction.confidence_score && (
                    <div className="space-y-3 mt-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>Niveau de confiance</span>
                        <span className="font-bold">{latestPrediction.confidence_score.toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={latestPrediction.confidence_score} 
                        className="h-2 bg-white/20"
                      />
                      <div className="text-xs opacity-80">
                        {latestPrediction.confidence_score >= 75 ? "🔥 Confiance élevée" : 
                         latestPrediction.confidence_score >= 60 ? "✓ Confiance moyenne" : 
                         "⚠️ Confiance modérée"}
                      </div>
                    </div>
                  )}
                </div>

                {latestPrediction.model_metadata && (
                  <Card className="bg-muted/50 border-muted">
                    <CardContent className="pt-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        Détails de l'analyse:
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        {Object.entries(latestPrediction.model_metadata).map(([key, value]) => (
                          <div key={key} className="p-2 bg-background rounded">
                            <span className="text-muted-foreground capitalize">
                              {key.replace(/_/g, " ")}:
                            </span>
                            <p className="font-semibold text-foreground">
                              {typeof value === "number" ? value.toFixed(2) : String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-muted/30 rounded-lg border-2 border-dashed border-muted">
                <Brain className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Aucune prédiction disponible pour le moment. 
                </p>
                <Button 
                  onClick={handleGeneratePrediction}
                  disabled={generatePrediction.isPending}
                  variant="outline"
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Générer la première prédiction
                </Button>
              </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>



      <Card className="bg-destructive/10 border-destructive/30">
        <CardContent className="pt-6">
          <p className="text-sm text-foreground">
            <strong className="text-destructive">⚠️ Avertissement:</strong> Ces prédictions sont basées sur des analyses 
            statistiques historiques et ne garantissent aucun résultat. La loterie reste un 
            jeu de hasard où chaque tirage est totalement indépendant. Jouez de manière 
            responsable.
          </p>
        </CardContent>
      </Card>
      {/* Prédiction personnalisée */}
      {user && personalizedPrediction && (
        <Card className="bg-gradient-accent text-white border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Prédiction Personnalisée
            </CardTitle>
            <CardDescription className="text-white/80">
              Basée sur vos favoris et historique
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap justify-center mb-4">
              {personalizedPrediction.numbers.map((num, idx) => (
                <NumberBall key={`${num}-${idx}`} number={num} size="lg" confidence={personalizedPrediction.confidence * 100} />
              ))}
            </div>
            <div className="text-center text-sm opacity-90">
              Confiance: {Math.round(personalizedPrediction.confidence * 100)}%
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prédictions Conditionnelles */}
      <ConditionalPredictions drawName={drawName} />

      {/* Patterns */}
      {patterns.length > 0 && (
        <PatternDetectionPanel patterns={patterns} />
      )}

      {/* Explications */}
      {latestPrediction && explanations && typeof explanations === 'object' && !Array.isArray(explanations) && (
        <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Explications détaillées
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {explanations.summary && (
              <p className="text-sm text-muted-foreground">{explanations.summary}</p>
            )}
            {explanations.strengths && explanations.strengths.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 text-foreground">Points forts:</p>
                <ul className="list-disc list-inside space-y-1">
                  {explanations.strengths.map((strength, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">{strength}</li>
                  ))}
                </ul>
              </div>
            )}
            {explanations.weaknesses && explanations.weaknesses.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 text-foreground">Points d'attention:</p>
                <ul className="list-disc list-inside space-y-1">
                  {explanations.weaknesses.map((weakness, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">{weakness}</li>
                  ))}
                </ul>
              </div>
            )}
            {explanations.recommendation && (
              <p className="text-sm font-medium text-primary">{explanations.recommendation}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prédiction avancée */}
      {showAdvanced && topAdvancedPrediction && (
        <Card className="bg-gradient-accent text-white border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Prédiction IA Avancée
            </CardTitle>
            <CardDescription className="text-white/80">
              {topAdvancedPrediction.algorithm} - Confiance: {Math.round(topAdvancedPrediction.confidence * 100)}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap justify-center mb-4">
              {topAdvancedPrediction.numbers.map((num, idx) => (
                <NumberBall key={`${num}-${idx}`} number={num} size="lg" confidence={topAdvancedPrediction.confidence * 100} />
              ))}
            </div>
            <div className="flex gap-1 flex-wrap justify-center">
              {topAdvancedPrediction.factors.slice(0, 3).map((factor, idx) => (
                <span key={idx} className="text-xs bg-white/20 px-2 py-1 rounded">
                  {factor}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback Dialog */}
      {user && latestPrediction && (
        <PredictionFeedbackDialog
          open={showFeedback}
          onOpenChange={setShowFeedback}
          predictionId={latestPrediction.id}
          predictedNumbers={latestPrediction.predicted_numbers}
        />
      )}
    </div>
  );
};
