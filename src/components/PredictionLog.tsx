import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePredictionLog, LoggedPrediction } from "@/hooks/usePredictionLog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { NumberBall } from "@/components/NumberBall";
import { motion, AnimatePresence } from "framer-motion";
import { History, TrendingUp, Trophy, AlertCircle, CheckCircle2, Search, Filter, Download, Share2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataExporter } from "@/components/DataExporter";
import { SocialShare } from "@/components/SocialShare";

export const PredictionLog = () => {
  const { user } = useAuth();
  const { data: logs = [], isLoading } = usePredictionLog(user?.id);
  const [selectedDraw, setSelectedDraw] = useState<string>("all");
  const [filter, setFilter] = useState<"all" | "completed" | "pending">("all");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Journal de Prédictions</CardTitle>
          <CardDescription>Chargement de l'historique...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  const STAGGER_DELAY = 0.05; // Constante d'animation
  const drawNames = Array.from(new Set(logs.map(l => l.draw_name)));

  const filteredLogs = logs.filter(log => {
    if (selectedDraw !== "all" && log.draw_name !== selectedDraw) return false;
    if (filter === "completed" && !log.winning_numbers) return false;
    if (filter === "pending" && log.winning_numbers) return false;
    return true;
  });

  return (
    <Card className="shadow-sm border-accent/20">
      <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-accent" />
            Journal de Validation Longitudinale
          </CardTitle>
          <CardDescription className="mt-1.5">
            Comparez vos prédictions générées avec les résultats réels pour évaluer les performances du modèle.
          </CardDescription>
        </div>
        <DataExporter 
          data={filteredLogs}
          columns={[
            { key: "prediction_date", label: "Date Prédiction" },
            { key: "draw_name", label: "Tirage" },
            { key: "model_used", label: "Modèle" },
            { key: "predicted_numbers", label: "Prédiction" },
            { key: "winning_numbers", label: "Résultat" },
            { key: "matches", label: "Matchs" },
            { key: "success_rate", label: "Précision (%)" },
            { key: "notes", label: "Notes" }
          ]}
          id="prediction-log-export"
          defaultFileName="journal-predictions"
          buttonText="Exporter le journal"
        />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedDraw} onValueChange={setSelectedDraw}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Tirage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les tirages</SelectItem>
                {drawNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={filter} onValueChange={(v: string) => setFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="completed">Vérifiés (Résultats dispo)</SelectItem>
                <SelectItem value="pending">En attente de résultat</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border/50">
            <Search className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Aucune prédiction ne correspond à vos filtres.</p>
            <p className="text-xs text-muted-foreground mt-2">
              Sauvegardez des prédictions depuis le panneau principal pour les voir apparaître ici.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredLogs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: index * STAGGER_DELAY }}
                  className="bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-4 border-b bg-muted/10 flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-semibold">{log.draw_name}</Badge>
                        <Badge variant="secondary" className="text-xs">Modèle: {log.model_used}</Badge>
                        {log.confidence_score && (
                          <Badge variant="default" className="text-xs bg-primary/20 text-primary hover:bg-primary/30">
                            Confiance: {Math.round(log.confidence_score * 100)}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Générée le {new Date(log.prediction_date).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    {log.winning_numbers ? (
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <p className="text-sm font-semibold flex items-center justify-end gap-1 text-success">
                            <CheckCircle2 className="w-4 h-4" />
                            Précision: {log.success_rate.toFixed(0)}%
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.matches} match(s) sur {log.predicted_numbers.length}
                          </p>
                        </div>
                        <SocialShare 
                          title={`Prédiction Validée Loto Lumière - ${log.draw_name}`}
                          description={`Mon modèle ${log.model_used} a obtenu une précision de ${log.success_rate.toFixed(0)}% !`}
                          numbers={log.predicted_numbers}
                          drawName={log.draw_name}
                          confidence={log.confidence_score}
                          predictionId={log.prediction_id}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                            En attente de résultat
                          </Badge>
                        </div>
                        <SocialShare 
                          title={`Nouvelle Prédiction Loto Lumière - ${log.draw_name}`}
                          description={`Découvrez ma prédiction générée par IA (Modèle: ${log.model_used}).`}
                          numbers={log.predicted_numbers}
                          drawName={log.draw_name}
                          confidence={log.confidence_score}
                          predictionId={log.prediction_id}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 grid md:grid-cols-2 gap-6">
                    {/* Predicted Numbers */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                        <TrendingUp className="w-3 h-3" />
                        Prédiction
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {log.predicted_numbers.map((num, idx) => {
                          const isMatch = log.winning_numbers?.includes(num);
                          return (
                            <div key={idx} className="relative">
                              <NumberBall 
                                number={num} 
                                size="sm" 
                                className={isMatch ? "ring-2 ring-success ring-offset-2 bg-success/20" : ""}
                              />
                              {isMatch && (
                                <div className="absolute -top-1 -right-1 bg-success text-white rounded-full w-4 h-4 flex items-center justify-center">
                                  <CheckCircle2 className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {log.notes && (
                        <p className="text-xs text-muted-foreground mt-3 italic border-l-2 pl-2">
                          "{log.notes}"
                        </p>
                      )}
                    </div>
                    
                    {/* Actual Results */}
                    <div className="md:border-l pl-0 md:pl-6 border-border/50">
                      {log.winning_numbers ? (
                        <>
                          <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                            <Trophy className="w-3 h-3 text-accent" />
                            Résultat Officiel
                            {log.draw_date && (
                              <span className="font-normal opacity-70">
                                ({new Date(log.draw_date).toLocaleDateString("fr-FR")})
                              </span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {log.winning_numbers.map((num, idx) => (
                              <NumberBall key={idx} number={num} size="sm" />
                            ))}
                          </div>
                          
                          <div className="mt-4">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Taux de validation</span>
                              <span>{log.success_rate.toFixed(0)}%</span>
                            </div>
                            <Progress value={log.success_rate} className="h-1.5 bg-muted" />
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-muted/30 rounded-lg border border-dashed border-border/50">
                          <AlertCircle className="w-6 h-6 text-muted-foreground mb-2 opacity-50" />
                          <p className="text-sm text-muted-foreground">En attente du tirage officiel</p>
                          <p className="text-xs text-muted-foreground mt-1 opacity-70">Les résultats seront comparés automatiquement ici.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
