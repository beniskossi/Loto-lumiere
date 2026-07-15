import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDrawResults } from "@/hooks/useDrawResults";
import { 
  analyzeSeasonalRecurrence, 
  RecurrenceReport, 
  LagResult 
} from "@/lib/algorithms/seasonalRecurrenceService";
import { motion } from "framer-motion";
import { Activity, History, ArrowRightLeft, Sparkles, CheckCircle, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SeasonalRecurrencePanelProps {
  drawName: string;
}

export const SeasonalRecurrencePanel = ({ drawName }: SeasonalRecurrencePanelProps) => {
  const { data: results, isLoading } = useDrawResults(drawName, 500); // Need a lot of history
  const [reportGagnants, setReportGagnants] = useState<RecurrenceReport | null>(null);
  const [reportMachine, setReportMachine] = useState<RecurrenceReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (results && results.length > 50) {
      setIsAnalyzing(true);
      // Run it in a slight timeout so UI doesn't freeze
      const timer = setTimeout(() => {
        try {
          const gagnants = analyzeSeasonalRecurrence(results, 'gagnants', { lags: [1, 2, 3, 4, 5, 6, 11, 12] });
          const machine = analyzeSeasonalRecurrence(results, 'machine', { lags: [1, 2, 3, 4, 5, 6, 11, 12] });
          setReportGagnants(gagnants);
          setReportMachine(machine);
        } catch (e) {
          console.error("Error analyzing seasonal recurrence", e);
        } finally {
          setIsAnalyzing(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [results]);

  if (isLoading || isAnalyzing) {
    return (
      <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-border/30">
        <CardContent className="p-8 text-center space-y-4">
          <Activity className="w-12 h-12 mx-auto text-primary animate-pulse" />
          <p className="text-muted-foreground text-sm">
            Analyse des permutations et récurrences saisonnières en cours...
          </p>
          <div className="space-y-2 max-w-sm mx-auto">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6 mx-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!results || results.length <= 50 || !reportGagnants) {
    return (
      <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-border/30">
        <CardContent className="p-8 text-center space-y-3">
          <History className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <h3 className="font-bold text-lg">Historique insuffisant</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            L'analyse des récurrences mensuelles nécessite plusieurs mois d'historique 
            (au moins 50 tirages) pour calculer des modèles statistiques fiables via permutations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
              Résonance Inter-Mois (Lags)
            </CardTitle>
            <Badge variant="outline" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
              {reportGagnants.monthsAnalyzed} mois analysés
            </Badge>
          </div>
          <CardDescription>
            Analyse par test de permutation pour détecter si les numéros sortis il y a X mois sont statistiquement 
            sur-représentés parmi les numéros du mois en cours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RecurrenceSection title="Tirages Gagnants" report={reportGagnants} />
          {reportMachine && reportMachine.monthsAnalyzed > 0 && (
            <RecurrenceSection title="Tirages Machine" report={reportMachine} />
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/40 border-border/40">
        <CardContent className="p-4 text-sm text-muted-foreground flex gap-3 leading-relaxed">
          <Sparkles className="w-8 h-8 text-amber-500 shrink-0" />
          <p>
            <strong>Stratégie de Prédiction :</strong> Si un décalage (ex: Lag 5) est significatif 
            (étoile dorée), cela valide l'hypothèse de l'utilisateur : les numéros d'il y a 5 mois 
            ont une tendance non-fortuite à ressortir. Si "Aucun décalage n'est significatif", le 
            hasard domine et il vaut mieux éviter d'intégrer cette récurrence pour ne pas sur-ajuster.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const RecurrenceSection = ({ title, report }: { title: string; report: RecurrenceReport }) => {
  const hasSignificant = report.results.some(r => r.significant);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold text-slate-200">{title}</h4>
        {hasSignificant ? (
          <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-amber-500/30 font-normal text-xs gap-1">
            <AlertTriangle className="w-3 h-3" /> Motif détecté
          </Badge>
        ) : (
          <Badge className="bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 border-slate-500/30 font-normal text-xs gap-1">
            <CheckCircle className="w-3 h-3" /> Hasard dominant
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {report.results.map((r, i) => (
          <motion.div
            key={r.lag}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1 ${
              r.significant 
                ? "bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]" 
                : "bg-slate-900/50 border-white/5"
            }`}
          >
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Lag {r.lag} mois
            </span>
            <span className={`text-lg font-bold ${r.significant ? "text-amber-400" : "text-slate-300"}`}>
              {Math.round(r.observedOverlap * 100)}%
            </span>
            <div className="text-[9px] text-muted-foreground flex gap-1.5 mt-1">
              <span title="Moyenne de base">Base: {Math.round(r.baselineMean * 100)}%</span>
              <span title="P-Value">P: {r.pValue.toFixed(3)}</span>
            </div>
          </motion.div>
        ))}
      </div>
      
      <p className={`text-xs p-3 rounded-lg border ${
        hasSignificant 
          ? "bg-amber-500/10 border-amber-500/20 text-amber-200/90" 
          : "bg-slate-900/40 border-slate-800 text-slate-400"
      }`}>
        {report.verdict}
      </p>
    </div>
  );
};
