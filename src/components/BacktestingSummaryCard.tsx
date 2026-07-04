import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Activity, CheckCircle2, RefreshCw, BarChart2 } from "lucide-react";
import { useBacktesting } from "@/hooks/useBacktesting";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

export const BacktestingSummaryCard = ({ drawName = "Etoile" }: { drawName?: string }) => {
  const { runBacktest, isRunning, lastResults, aggregateStats } = useBacktesting(drawName);
  
  const handleRunBacktest = () => {
    runBacktest({
      drawName,
      validationType: 'standard',
      saveResults: false
    });
  };

  const topAlgorithm = lastResults?.evaluations?.[0] || null;

  return (
    <Card className="bg-gradient-to-br from-card to-muted/20 border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-md">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            Backtesting Module
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-mono">
            {drawName}
          </Badge>
        </div>
        <CardDescription className="text-xs mt-1">
          Simulez les tirages historiques pour évaluer l'engine prédictif (Précision, Rappel, F1-Score).
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-2">
        {topAlgorithm ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Brain className="w-3 h-3" />
                Meilleur algorithme
              </span>
              <span className="text-sm font-bold text-primary">{topAlgorithm.algorithm}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Précision</span>
                  <span className="text-xs font-bold">{topAlgorithm.precision?.toFixed(1)}%</span>
                </div>
                <Progress value={topAlgorithm.precision} className="h-1.5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Rappel</span>
                  <span className="text-xs font-bold">{topAlgorithm.recall?.toFixed(1)}%</span>
                </div>
                <Progress value={topAlgorithm.recall} className="h-1.5 [&>div]:bg-amber-500" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">F1-Score</span>
                  <span className="text-xs font-bold">{topAlgorithm.f1Score?.toFixed(1)}%</span>
                </div>
                <Progress value={topAlgorithm.f1Score} className="h-1.5 [&>div]:bg-purple-500" />
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-mono bg-muted/30 px-3 py-2 rounded-md border border-border/30 justify-between">
               <span className="text-muted-foreground">Matchs Moy: <span className="text-foreground">{topAlgorithm.avgMatches?.toFixed(2)}</span></span>
               <span className="text-muted-foreground">Tests: <span className="text-foreground">{topAlgorithm.totalTests}</span></span>
            </div>
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center opacity-50">
              <BarChart2 className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Aucun résultat en mémoire pour ce tirage. Lancez une simulation.
            </p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-2">
        <Button 
          variant="secondary" 
          className="w-full text-xs h-8 gap-2" 
          onClick={handleRunBacktest}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              Simulation en cours...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3" />
              {topAlgorithm ? 'Relancer la simulation' : 'Lancer le Backtesting'}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
