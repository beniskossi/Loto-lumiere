import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { NumberBall } from "./NumberBall";
import { useAIPredictionAnalyzer, type AIAnalysisResult } from "@/hooks/useAIPredictionAnalyzer";
import { 
  Sparkles, Brain, Loader2, Info, TrendingUp, 
  Flame, Snowflake, Link, BarChart3, Clock, 
  RefreshCw, CheckCircle2, AlertTriangle, Minus
} from "lucide-react";

interface AIPredictionAnalyzerProps {
  predictions: any[];
  drawName: string;
}

const patternIcons: Record<string, React.ReactNode> = {
  consensus: <Link className="w-4 h-4" />,
  hot_streak: <Flame className="w-4 h-4 text-orange-500" />,
  cold_due: <Snowflake className="w-4 h-4 text-blue-400" />,
  pair: <Link className="w-4 h-4" />,
  sequence: <TrendingUp className="w-4 h-4" />,
  cycle: <RefreshCw className="w-4 h-4" />,
  spatial: <BarChart3 className="w-4 h-4" />,
  temporal: <Clock className="w-4 h-4" />,
};

const impactIcons: Record<string, React.ReactNode> = {
  positive: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  neutral: <Minus className="w-4 h-4 text-muted-foreground" />,
  negative: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
};

export const AIPredictionAnalyzer = ({ predictions, drawName }: AIPredictionAnalyzerProps) => {
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const analyzerMutation = useAIPredictionAnalyzer();

  const handleAnalyze = async (quick = false) => {
    try {
      const result = await analyzerMutation.mutateAsync({
        predictions: predictions.slice(0, 6),
        drawName,
        useQuickAnalysis: quick,
      });
      setAiResult(result);
    } catch (error) {
      console.error('Erreur analyse:', error);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 75) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-orange-500";
  };

  const getConfidenceBarColor = (score: number) => {
    if (score >= 75) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-orange-500";
  };

  return (
    <Card className="bg-gradient-card border-primary/30 shadow-glow overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2 flex-wrap">
                Analyse Gemini IA
                <Badge variant="outline" className="bg-primary/10 text-xs">
                  <Brain className="w-3 h-3 mr-1" />
                  Gemini 2.5 Pro
                </Badge>
              </CardTitle>
              <CardDescription>
                Intelligence artificielle avancée pour optimiser vos choix
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handleAnalyze(true)}
              disabled={analyzerMutation.isPending || predictions.length === 0}
              variant="outline"
              size="sm"
            >
              {analyzerMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Analyse Rapide"
              )}
            </Button>
            <Button
              onClick={() => handleAnalyze(false)}
              disabled={analyzerMutation.isPending || predictions.length === 0}
              className="gap-2"
            >
              {analyzerMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyse Complète
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!aiResult && !analyzerMutation.isPending && (
          <Alert className="bg-primary/5 border-primary/20">
            <Info className="w-4 h-4" />
            <AlertDescription>
              Cliquez sur <strong>"Analyse Complète"</strong> pour une analyse IA approfondie avec Gemini Pro, 
              ou <strong>"Analyse Rapide"</strong> pour une synthèse algorithmique instantanée.
            </AlertDescription>
          </Alert>
        )}

        {aiResult && (
          <div className="space-y-6 animate-fade-in">
            {/* Numéros recommandés */}
            <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border-2 border-primary/30">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Numéros Recommandés
                </h3>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-xs">
                    {aiResult.mode === 'ai' ? 'Gemini Pro' : 'Analyse Rapide'}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${getConfidenceColor(aiResult.confidenceScore)}`}>
                      {aiResult.confidenceScore.toFixed(0)}%
                    </span>
                    <Progress 
                      value={aiResult.confidenceScore} 
                      className={`w-20 h-2 ${getConfidenceBarColor(aiResult.confidenceScore)}`}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-center flex-wrap">
                {aiResult.recommendedNumbers.map((num: number, idx: number) => (
                  <NumberBall key={`${num}-${idx}`} number={num} size="lg" />
                ))}
              </div>
            </div>

            {/* Patterns détectés */}
            {aiResult.patterns && aiResult.patterns.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Patterns Détectés ({aiResult.patterns.length})
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {aiResult.patterns.map((pattern, idx) => (
                    <div 
                      key={idx}
                      className="p-3 bg-muted/50 rounded-lg border border-border/50 flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-background">
                        {patternIcons[pattern.type] || <Sparkles className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm capitalize">
                            {pattern.type.replace('_', ' ')}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {(pattern.strength * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {pattern.description}
                        </p>
                        {pattern.affectedNumbers && pattern.affectedNumbers.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {pattern.affectedNumbers.slice(0, 5).map((n) => (
                              <Badge key={n} variant="secondary" className="text-xs px-1.5 py-0">
                                {n}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insights avancés */}
            {aiResult.advancedInsights && aiResult.advancedInsights.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Insights Avancés
                </h3>
                <div className="space-y-2">
                  {aiResult.advancedInsights.map((insight, idx) => (
                    <div 
                      key={idx}
                      className="p-3 bg-muted/30 rounded-lg flex items-start gap-3"
                    >
                      {impactIcons[insight.impact]}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{insight.title}</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {insight.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raisonnement */}
            {aiResult.reasoning && aiResult.reasoning.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Raisonnement
                </h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {aiResult.reasoning.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Analyse détaillée */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Résumé</h3>
              <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                <p className="text-sm text-foreground leading-relaxed">
                  {aiResult.analysis}
                </p>
              </div>
            </div>

            {/* Méta-informations */}
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4 flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <span>Tirage: <strong>{drawName}</strong></span>
                <span>Temps: <strong>{aiResult.executionTime}ms</strong></span>
              </div>
              <span>
                {new Date(aiResult.timestamp).toLocaleString('fr-FR')}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
