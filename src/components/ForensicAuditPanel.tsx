import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useRunForensicAudit, 
  useForensicHistory, 
  usePerformanceMetrics,
  type ForensicAuditResult,
  type GeminiForensicAnalysis,
  type ForensicInsight,
  type CalibrationAdjustment,
} from "@/hooks/useForensicAudit";
import { DRAW_SCHEDULE, DAYS_ORDER } from "@/types/lottery";
import {
  Search, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Brain,
  Scale,
  RefreshCw,
  Zap,
  BarChart3,
  Activity,
  Target,
  Settings2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const DRAW_OPTIONS = [
  "all",
  ...DAYS_ORDER.flatMap(day => (DRAW_SCHEDULE[day] || []).map(d => d.name))
];

export const ForensicAuditPanel = ({ drawName }: { drawName?: string }) => {
  const [selectedDraw, setSelectedDraw] = useState<string>(drawName || "all");
  const [days, setDays] = useState(30);
  const [applyAdjustments, setApplyAdjustments] = useState(false);
  const [runGeminiAnalysis, setRunGeminiAnalysis] = useState(true);
  const [lastAuditResult, setLastAuditResult] = useState<{
    audit: ForensicAuditResult;
    geminiAnalysis: GeminiForensicAnalysis | null;
  } | null>(null);

  const isAdmin = true; // Simplified for now, real check happens server-side
  const { mutate: runAudit, isPending: isAuditing } = useRunForensicAudit();
  const { data: history, isLoading: isLoadingHistory } = useForensicHistory(selectedDraw);
  const { data: metrics } = usePerformanceMetrics(selectedDraw, days);

  const handleRunAudit = () => {
    runAudit(
      { 
        drawName: selectedDraw === "all" ? undefined : selectedDraw, 
        days, 
        applyAdjustments: isAdmin && applyAdjustments,
        runGeminiAnalysis
      },
      {
        onSuccess: (data) => {
          setLastAuditResult({
            audit: data.audit,
            geminiAnalysis: data.geminiAnalysis
          });
        }
      }
    );
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "declining": return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string): "destructive" | "secondary" | "outline" | "default" => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 70) return "text-green-500";
    if (score >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900/50 via-purple-900/20 to-slate-900/50 border-purple-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Search className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Audit Forensic & Calibrage Stochastique</CardTitle>
              <CardDescription>
                Analyse rétroactive des divergences prédictives et ajustement déterministe des poids.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label>Tirage</Label>
            <Select value={selectedDraw} onValueChange={setSelectedDraw}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tous les tirages" />
              </SelectTrigger>
              <SelectContent>
                {DRAW_OPTIONS.map((draw, idx) => (
                  <SelectItem key={`${draw}-${idx}`} value={String(draw)}>
                    {draw === "all" ? "Tous les tirages" : String(draw)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Période</Label>
            <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 jours</SelectItem>
                <SelectItem value="14">14 jours</SelectItem>
                <SelectItem value="30">30 jours</SelectItem>
                <SelectItem value="60">60 jours</SelectItem>
                <SelectItem value="90">90 jours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch 
                id="gemini" 
                checked={runGeminiAnalysis}
                onCheckedChange={setRunGeminiAnalysis}
              />
              <Label htmlFor="gemini" className="flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-purple-400" />
                Deep Research
              </Label>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <Switch 
                  id="apply" 
                  checked={applyAdjustments}
                  onCheckedChange={setApplyAdjustments}
                />
                <Label htmlFor="apply" className="flex items-center gap-1">
                  <Settings2 className="h-4 w-4 text-orange-400" />
                  Appliquer
                </Label>
              </div>
            )}
          </div>

          <Button 
            onClick={handleRunAudit} 
            disabled={isAuditing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isAuditing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Lancer l'Audit
          </Button>
        </div>

        {/* Quick Stats */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Vecteurs Produits</p>
                  <p className="text-2xl font-bold">{metrics.totalPredictions}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 flex items-center gap-3">
                <Target className="h-8 w-8 text-green-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Précision Moy.</p>
                  <p className="text-2xl font-bold">{metrics.averageAccuracy.toFixed(1)}%</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 flex items-center gap-3">
                <Activity className="h-8 w-8 text-yellow-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Matches Moy.</p>
                  <p className="text-2xl font-bold">{metrics.averageMatches.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 flex items-center gap-3">
                <Scale className="h-8 w-8 text-purple-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Matrice Modulaire</p>
                  <p className="text-2xl font-bold">{Object.keys(metrics.byAlgorithm).length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Audit Results */}
        {lastAuditResult && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="bg-slate-800/50">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="algorithms">Algorithmes</TabsTrigger>
              <TabsTrigger value="adjustments">Ajustements</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              {lastAuditResult.geminiAnalysis && (
                <TabsTrigger value="gemini">
                  <Sparkles className="h-4 w-4 mr-1" />
                  Deep Research
                </TabsTrigger>
              )}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Calibration de Confiance */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Scale className="h-4 w-4 text-blue-400" />
                      Erreur Quadratique (Calibration)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Confiance annoncée</span>
                      <span className="font-medium">
                        {(lastAuditResult.audit.confidenceCalibration.averageConfidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Précision réelle</span>
                      <span className="font-medium">
                        {(lastAuditResult.audit.confidenceCalibration.actualAccuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Erreur de calibration</span>
                      <Badge variant={lastAuditResult.audit.confidenceCalibration.isOverconfident ? "destructive" : "default"}>
                        {(lastAuditResult.audit.confidenceCalibration.calibrationError * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    {lastAuditResult.audit.confidenceCalibration.isOverconfident && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <span className="text-sm text-red-300">
                          Multiplicateur suggéré: {lastAuditResult.audit.confidenceCalibration.suggestedConfidenceMultiplier.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tendance de Performance */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {getTrendIcon(lastAuditResult.audit.performanceTrend.direction)}
                      Tendance de Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Récent ({days}j)</span>
                      <span className="font-medium">
                        {lastAuditResult.audit.performanceTrend.recentAverage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Historique</span>
                      <span className="font-medium">
                        {lastAuditResult.audit.performanceTrend.historicalAverage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Volatilité</span>
                      <span className="font-medium">
                        {lastAuditResult.audit.performanceTrend.volatility.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Direction</span>
                      <Badge variant={
                        lastAuditResult.audit.performanceTrend.direction === "improving" ? "default" :
                        lastAuditResult.audit.performanceTrend.direction === "declining" ? "destructive" :
                        "secondary"
                      }>
                        {lastAuditResult.audit.performanceTrend.direction === "improving" ? "En hausse" :
                         lastAuditResult.audit.performanceTrend.direction === "declining" ? "En baisse" :
                         "Stable"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    Recommandations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {lastAuditResult.audit.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Algorithms Tab */}
            <TabsContent value="algorithms" className="space-y-4">
              <div className="grid gap-3">
                {lastAuditResult.audit.algorithmPerformance.map((algo) => (
                  <Card key={typeof algo.algorithm === 'object' ? JSON.stringify(algo.algorithm) : String(algo.algorithm)} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{typeof algo.algorithm === 'object' ? JSON.stringify(algo.algorithm) : String(algo.algorithm)}</span>
                          {getTrendIcon(algo.trend)}
                          {algo.overconfidence && (
                            <Badge variant="destructive" className="text-xs">Surconfiant</Badge>
                          )}
                        </div>
                        <Badge variant={algo.accuracy > 25 ? "default" : algo.accuracy > 15 ? "secondary" : "destructive"}>
                          {algo.accuracy.toFixed(1)}%
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Prédictions</span>
                          <p className="font-medium">{algo.predictions}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">F1 Score</span>
                          <p className="font-medium">{algo.f1Score.toFixed(3)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Matches Moy.</span>
                          <p className="font-medium">{algo.averageMatches.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Err. Calibration</span>
                          <p className={`font-medium ${Math.abs(algo.calibrationError) > 0.15 ? 'text-red-400' : ''}`}>
                            {(algo.calibrationError * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Performance</span>
                          <span>{algo.accuracy.toFixed(1)}%</span>
                        </div>
                        <Progress value={Math.min(100, algo.accuracy * 2)} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Adjustments Tab */}
            <TabsContent value="adjustments" className="space-y-4">
              {lastAuditResult.audit.calibrationAdjustments.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
                    <p>Aucun ajustement nécessaire</p>
                    <p className="text-sm">Les algorithmes sont correctement calibrés</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {lastAuditResult.audit.calibrationAdjustments.map((adj) => (
                    <Card key={typeof adj.algorithm === 'object' ? JSON.stringify(adj.algorithm) : String(adj.algorithm)} className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{typeof adj.algorithm === 'object' ? JSON.stringify(adj.algorithm) : String(adj.algorithm)}</span>
                          <Badge variant={adj.changePercent > 0 ? "default" : "destructive"}>
                            {adj.changePercent > 0 ? "+" : ""}{adj.changePercent.toFixed(1)}%
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm mb-3">
                          <div>
                            <span className="text-muted-foreground">Poids précédent: </span>
                            <span>{adj.previousWeight.toFixed(2)}</span>
                          </div>
                          <ChevronRight className="h-4 w-4" />
                          <div>
                            <span className="text-muted-foreground">Nouveau poids: </span>
                            <span className="font-medium text-primary">{adj.newWeight.toFixed(2)}</span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">{adj.reason}</p>
                        
                        {adj.newParams && (
                          <div className="mt-2 p-2 rounded bg-slate-700/50 text-xs">
                            <span className="text-muted-foreground">Paramètres ajustés: </span>
                            {Object.entries(adj.newParams).map(([k, v]) => (
                              <span key={k} className="mr-2">{k}: {typeof v === 'number' ? v.toFixed(4) : typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="space-y-4">
              {lastAuditResult.audit.insights.map((insight, idx) => (
                <Card key={idx} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        insight.severity === "critical" ? "bg-red-500/20" :
                        insight.severity === "high" ? "bg-orange-500/20" :
                        insight.severity === "medium" ? "bg-yellow-500/20" :
                        "bg-blue-500/20"
                      }`}>
                        {insight.type === "warning" ? <AlertTriangle className="h-5 w-5" /> :
                         insight.type === "anomaly" ? <XCircle className="h-5 w-5" /> :
                         insight.type === "recommendation" ? <CheckCircle className="h-5 w-5" /> :
                         <Activity className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{typeof insight.title === 'object' ? JSON.stringify(insight.title) : String(insight.title)}</span>
                          <Badge variant={getSeverityColor(insight.severity)}>
                            {typeof insight.severity === 'object' ? JSON.stringify(insight.severity) : String(insight.severity)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{typeof insight.description === 'object' ? JSON.stringify(insight.description) : String(insight.description)}</p>
                        {insight.suggestedAction && (
                          <p className="text-sm text-primary">→ {typeof insight.suggestedAction === 'object' ? JSON.stringify(insight.suggestedAction) : String(insight.suggestedAction)}</p>
                        )}
                        {insight.affectedAlgorithms.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {insight.affectedAlgorithms.map((algo) => (
                              <Badge key={typeof algo === 'object' ? JSON.stringify(algo) : String(algo)} variant="outline" className="text-xs">{typeof algo === 'object' ? JSON.stringify(algo) : String(algo)}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Gemini Analysis Tab */}
            {lastAuditResult.geminiAnalysis && (
              <TabsContent value="gemini" className="space-y-4">
                <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-purple-400" />
                        Audit Deep Research
                      </CardTitle>
                      <div className={`text-3xl font-bold ${getHealthColor(lastAuditResult.geminiAnalysis.healthScore)}`}>
                        {lastAuditResult.geminiAnalysis.healthScore}/100
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm">{typeof lastAuditResult.geminiAnalysis.summary === 'object' ? JSON.stringify(lastAuditResult.geminiAnalysis.summary) : String(lastAuditResult.geminiAnalysis.summary)}</p>
                    
                    {lastAuditResult.geminiAnalysis.criticalIssues.length > 0 && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                        <h4 className="font-medium text-red-300 mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Problèmes Critiques
                        </h4>
                        <ul className="space-y-1">
                          {lastAuditResult.geminiAnalysis.criticalIssues.map((issue, idx) => (
                            <li key={idx} className="text-sm text-red-200">• {typeof issue === 'object' ? JSON.stringify(issue) : String(issue)}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium mb-3">Recommandations Priorisées</h4>
                      <div className="space-y-2">
                        {lastAuditResult.geminiAnalysis.recommendations.map((rec, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-2 rounded bg-slate-800/50">
                            <Badge variant={
                              rec.priority === "haute" ? "destructive" :
                              rec.priority === "moyenne" ? "secondary" :
                              "outline"
                            } className="flex-shrink-0">
                              {typeof rec.priority === 'object' ? JSON.stringify(rec.priority) : String(rec.priority)}
                            </Badge>
                            <div className="text-sm">
                              <p className="font-medium">{typeof rec.action === 'object' ? JSON.stringify(rec.action) : String(rec.action)}</p>
                              <p className="text-muted-foreground">{typeof rec.impact === 'object' ? JSON.stringify(rec.impact) : String(rec.impact)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {lastAuditResult.geminiAnalysis.algorithmAssessment && (
                      <div>
                        <h4 className="font-medium mb-3">Évaluation par Algorithme</h4>
                        <div className="grid gap-2">
                          {Object.entries(lastAuditResult.geminiAnalysis.algorithmAssessment).map(([algo, assessment]) => (
                            <div key={typeof algo === 'object' ? JSON.stringify(algo) : String(algo)} className="flex items-center justify-between p-2 rounded bg-slate-800/50">
                              <span className="font-medium">{typeof algo === 'object' ? JSON.stringify(algo) : String(algo)}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant={
                                  assessment.status === "excellent" ? "default" :
                                  assessment.status === "bon" ? "secondary" :
                                  assessment.status === "attention" ? "outline" :
                                  "destructive"
                                }>
                                  {typeof assessment.status === 'object' ? JSON.stringify(assessment.status) : String(assessment.status)}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}

        {/* History */}
        {!lastAuditResult && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Historique des Audits</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : history && history.length > 0 ? (
                <div className="space-y-2">
                  {history.slice(0, 5).map((audit) => {
                    const weightAdjustments = audit.weight_adjustments as Array<unknown> | null;
                    return (
                      <div key={audit.id} className="flex items-center justify-between p-3 rounded bg-slate-700/50">
                        <div>
                          <p className="font-medium">{typeof audit.draw_name === 'object' ? JSON.stringify(audit.draw_name) : String(audit.draw_name)}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(audit.created_at), "PPP 'à' HH:mm", { locale: fr })}
                          </p>
                        </div>
                        <Badge>
                          {weightAdjustments?.length || 0} ajustements
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Aucun audit précédent. Lancez votre premier audit forensic.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};
