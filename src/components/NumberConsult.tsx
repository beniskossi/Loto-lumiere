import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumberBall } from "@/components/NumberBall";
import { useNumberStatistics } from "@/hooks/useNumberStatistics";
import { useDrawResults } from "@/hooks/useDrawResults";
import { Progress } from "@/components/ui/progress";

interface NumberConsultProps {
  drawName: string;
}

export const NumberConsult = ({ drawName }: NumberConsultProps) => {
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [useMachine, setUseMachine] = useState(false);
  const { data: statistics } = useNumberStatistics(drawName);
  const { data: results } = useDrawResults(drawName, 100);

  const selectedStat = statistics?.find((s) => s.number === selectedNumber);

  // Calculer les numéros associés pour le numéro sélectionné
  const getAssociatedNumbers = () => {
    if (!selectedNumber || !results) return [];

    const associations: Record<number, number> = {};

    results.forEach((result) => {
      const numbersToCheck = useMachine && result.machine_numbers?.length ? result.machine_numbers : result.winning_numbers;
      if (numbersToCheck.includes(selectedNumber)) {
        numbersToCheck.forEach((num) => {
          if (num !== selectedNumber) {
            associations[num] = (associations[num] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(associations)
      .map(([num, count]) => ({ number: parseInt(num), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  // Calculer les numéros qui suivent souvent ce numéro au prochain tirage
  const getFollowingNumbers = () => {
    if (!selectedNumber || !results || results.length < 2) return [];

    const following: Record<number, number> = {};

    for (let i = 0; i < results.length - 1; i++) {
      const numbersToCheck = useMachine && results[i].machine_numbers?.length ? results[i].machine_numbers : results[i].winning_numbers;
      const nextNumbers = useMachine && results[i + 1].machine_numbers?.length ? results[i + 1].machine_numbers : results[i + 1].winning_numbers;
      if (numbersToCheck.includes(selectedNumber)) {
        nextNumbers.forEach((num) => {
          following[num] = (following[num] || 0) + 1;
        });
      }
    }

    return Object.entries(following)
      .map(([num, count]) => ({ number: parseInt(num), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const associatedNumbers = getAssociatedNumbers();
  const followingNumbers = getFollowingNumbers();
  const totalDraws = results?.length || 0;
  const machineDrawsCount = results?.filter(r => r.machine_numbers?.length).length || 0;
  const appearanceRate = selectedStat ? ((selectedStat.frequency / totalDraws) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle>Sélectionner un Numéro</CardTitle>
          <CardDescription>
            Analysez la régularité et les associations d'un numéro spécifique
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            onValueChange={(value) => setSelectedNumber(parseInt(value))}
            value={selectedNumber?.toString() || ""}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisissez un numéro de 1 à 90" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {Array.from({ length: 90 }, (_, i) => i + 1).map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  <div className="flex items-center gap-2">
                    <NumberBall number={num} size="sm" />
                    <span>Numéro {num}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {machineDrawsCount > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useMachine"
                  checked={useMachine}
                  onChange={(e) => setUseMachine(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <label htmlFor="useMachine" className="text-sm font-medium cursor-pointer">
                  Analyser les numéros machine
                </label>
              </div>
              <span className="text-xs text-muted-foreground">
                {machineDrawsCount} tirage{machineDrawsCount > 1 ? 's' : ''} disponible{machineDrawsCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedNumber && selectedStat && (
        <>
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                Régularité du Numéro {useMachine && "(Machine)"}
                <NumberBall number={selectedNumber} size="md" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Fréquence d'apparition</p>
                  <p className="text-2xl font-bold text-accent">{selectedStat.frequency}</p>
                  <p className="text-xs text-muted-foreground">sur {totalDraws} tirages</p>
                </div>

                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Taux d'apparition</p>
                  <p className="text-2xl font-bold text-primary">{appearanceRate}%</p>
                  <Progress value={parseFloat(appearanceRate)} className="mt-2" />
                </div>

                <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Écart actuel</p>
                  <p className="text-2xl font-bold text-success">{selectedStat.days_since_last}</p>
                  <p className="text-xs text-muted-foreground">jours depuis dernier</p>
                </div>
              </div>

              {selectedStat.last_appearance && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Dernière apparition:</strong>{" "}
                    {new Date(selectedStat.last_appearance).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="text-primary">Numéros Associés</CardTitle>
                <CardDescription>
                  Numéros qui sortent souvent avec le {selectedNumber} dans le même tirage
                </CardDescription>
              </CardHeader>
              <CardContent>
                {associatedNumbers.length > 0 ? (
                  <div className="space-y-3">
                    {associatedNumbers.map((item, idx) => (
                      <div key={item.number} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                        <span className="text-lg font-bold text-muted-foreground w-6">
                          #{idx + 1}
                        </span>
                        <NumberBall number={item.number} size="md" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Apparitions ensemble: <span className="text-primary font-bold">{item.count}</span>
                          </p>
                          <Progress
                            value={(item.count / selectedStat.frequency) * 100}
                            className="mt-1 h-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Aucune donnée d'association disponible
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="text-success">Numéros Prédictifs</CardTitle>
                <CardDescription>
                  Numéros qui sortent souvent au tirage suivant après le {selectedNumber}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {followingNumbers.length > 0 ? (
                  <div className="space-y-3">
                    {followingNumbers.map((item, idx) => (
                      <div key={item.number} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                        <span className="text-lg font-bold text-muted-foreground w-6">
                          #{idx + 1}
                        </span>
                        <NumberBall number={item.number} size="md" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Apparitions au tirage suivant: <span className="text-success font-bold">{item.count}</span>
                          </p>
                          <Progress
                            value={(item.count / selectedStat.frequency) * 100}
                            className="mt-1 h-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Pas assez de données pour analyser les tendances prédictives
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-accent/10 border-accent/30">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                <strong>💡 Interprétation:</strong> Ces statistiques montrent les corrélations historiques 
                mais ne garantissent aucun résultat futur. La loterie reste un jeu de hasard où chaque 
                tirage est indépendant.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedNumber && (
        <Card className="bg-muted/30 border-muted">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              Sélectionnez un numéro ci-dessus pour voir son analyse détaillée
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
