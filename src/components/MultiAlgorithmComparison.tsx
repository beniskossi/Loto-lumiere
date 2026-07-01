import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberBall } from "@/components/NumberBall";
import { useMultiAlgorithmComparison } from "@/hooks/useMultiAlgorithmComparison";
import { Brain, Trophy, Users, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface MultiAlgorithmComparisonProps {
  drawName: string;
}

export const MultiAlgorithmComparison = ({ drawName }: MultiAlgorithmComparisonProps) => {
  const { data, isLoading } = useMultiAlgorithmComparison(drawName);
  const { toast } = useToast();
  const [votes, setVotes] = useState<Record<string, number>>({});

  const handleVote = (algorithm: string) => {
    setVotes(prev => ({ ...prev, [algorithm]: (prev[algorithm] || 0) + 1 }));
    toast({
      title: "Vote enregistré",
      description: `Vous avez voté pour ${algorithm}`,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.topAlgorithms.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-accent/10 to-primary/10 border-accent/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Comparaison Multi-Algorithmes
          </CardTitle>
          <CardDescription>
            Top 3 des algorithmes les plus performants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.topAlgorithms.map((algo) => (
            <div key={algo.algorithm} className="p-4 bg-background/50 rounded-lg border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {algo.rank === 1 && <Trophy className="w-5 h-5 text-yellow-500" />}
                  {algo.rank === 2 && <Trophy className="w-5 h-5 text-gray-400" />}
                  {algo.rank === 3 && <Trophy className="w-5 h-5 text-orange-600" />}
                  <span className="font-semibold">{algo.algorithm}</span>
                </div>
                <Badge variant={algo.rank === 1 ? "default" : "secondary"}>
                  #{algo.rank}
                </Badge>
              </div>

              <div className="flex gap-2 flex-wrap justify-center">
                {algo.numbers.map((num, idx) => (
                  <NumberBall key={`${num}-${idx}`} number={num} size="md" />
                ))}
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex gap-4">
                  <span className="text-muted-foreground">
                    Confiance: <strong className="text-foreground">{(algo.confidence ?? 0).toFixed(1)}%</strong>
                  </span>
                  <span className="text-muted-foreground">
                    Précision: <strong className="text-foreground">{(algo.recentAccuracy ?? 0).toFixed(1)}%</strong>
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVote(algo.algorithm)}
                  className="gap-1"
                >
                  <ThumbsUp className="w-3 h-3" />
                  {votes[algo.algorithm] || 0}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-gradient-primary text-white border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Consensus des 3 Meilleurs
          </CardTitle>
          <CardDescription className="text-white/80">
            Prédiction basée sur l'accord des algorithmes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap justify-center">
            {data.consensus.numbers.map((num, idx) => (
              <NumberBall key={`${num}-${idx}`} number={num} size="lg" />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-white/10 rounded">
              <p className="text-white/70 text-xs">Confiance moyenne</p>
              <p className="text-xl font-bold">{(data.consensus?.confidence ?? 0).toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-white/10 rounded">
              <p className="text-white/70 text-xs">Score d'accord</p>
              <p className="text-xl font-bold">{(data.consensus?.agreementScore ?? 0).toFixed(1)}%</p>
            </div>
          </div>

          <p className="text-center text-sm opacity-90">
            {(data.consensus?.agreementScore ?? 0) >= 70 ? "🔥 Fort consensus" : 
             (data.consensus?.agreementScore ?? 0) >= 50 ? "✓ Consensus modéré" : 
             "⚠️ Consensus faible"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
