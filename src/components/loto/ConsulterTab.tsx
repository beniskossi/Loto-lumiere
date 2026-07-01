import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, TrendingUp, TrendingDown, Clock, Zap, Link2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NumberBall } from "@/components/NumberBall";
import { useNumberStatistics } from "@/hooks/useNumberStatistics";
import { useDrawResults } from "@/hooks/useDrawResults";
import { cn } from "@/lib/utils";

interface ConsulterTabProps {
  drawName: string;
}

export const ConsulterTab = ({ drawName }: ConsulterTabProps) => {
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const { data: statistics, isLoading: statsLoading } = useNumberStatistics(drawName);
  const { data: results, isLoading: resultsLoading } = useDrawResults(drawName, 100);

  const isLoading = statsLoading || resultsLoading;

  // Calculate number details
  const numberDetails = useMemo(() => {
    if (!selectedNumber || !statistics || !results) return null;

    const stat = statistics.find(s => s.number === selectedNumber);
    if (!stat) return null;

    // Associated numbers (appear together)
    const associations: Record<number, number> = {};
    results.forEach(result => {
      if (result.winning_numbers.includes(selectedNumber)) {
        result.winning_numbers.forEach(num => {
          if (num !== selectedNumber) {
            associations[num] = (associations[num] || 0) + 1;
          }
        });
      }
    });

    const associatedNumbers = Object.entries(associations)
      .map(([num, count]) => ({ number: parseInt(num), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Following numbers (appear in next draw)
    const following: Record<number, number> = {};
    for (let i = 0; i < results.length - 1; i++) {
      if (results[i].winning_numbers.includes(selectedNumber)) {
        results[i + 1].winning_numbers.forEach(num => {
          following[num] = (following[num] || 0) + 1;
        });
      }
    }

    const followingNumbers = Object.entries(following)
      .map(([num, count]) => ({ number: parseInt(num), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const totalDraws = results.length;
    const appearanceRate = ((stat.frequency / totalDraws) * 100).toFixed(1);

    return {
      stat,
      associatedNumbers,
      followingNumbers,
      totalDraws,
      appearanceRate
    };
  }, [selectedNumber, statistics, results]);

  // Number grid for selection
  const numberGrid = useMemo(() => {
    return Array.from({ length: 90 }, (_, i) => {
      const num = i + 1;
      const stat = statistics?.find(s => s.number === num);
      return {
        number: num,
        frequency: stat?.frequency || 0,
        gap: stat?.days_since_last || 0
      };
    });
  }, [statistics]);

  const maxFrequency = Math.max(...numberGrid.map(n => n.frequency), 1);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold bg-gradient-to-r from-info via-primary to-info bg-clip-text text-transparent">
          Consulter un Numéro
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          Analyse détaillée et associations pour chaque numéro
        </p>
      </motion.div>

      {/* Number Grid Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="w-4 h-4 text-primary" />
              Sélectionner un Numéro
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-9 sm:grid-cols-10 gap-1">
                {[...Array(90)].map((_, i) => (
                  <div key={i} className="aspect-square rounded-md bg-secondary/50 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-9 sm:grid-cols-10 gap-1">
                {numberGrid.map((item) => {
                  const intensity = item.frequency / maxFrequency;
                  const isSelected = selectedNumber === item.number;
                  return (
                    <motion.button
                      key={item.number}
                      onClick={() => setSelectedNumber(isSelected ? null : item.number)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "aspect-square rounded-md flex items-center justify-center text-xs font-medium",
                        "transition-all duration-200 cursor-pointer",
                        "relative overflow-hidden",
                        isSelected 
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary text-primary-foreground" 
                          : "bg-secondary/50 hover:bg-secondary"
                      )}
                      style={{
                        opacity: isSelected ? 1 : 0.5 + intensity * 0.5
                      }}
                    >
                      {item.number}
                    </motion.button>
                  );
                })}
              </div>
            )}
            
            {/* Legend */}
            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
              <span>Moins fréquent</span>
              <div className="flex gap-1">
                {[0.2, 0.4, 0.6, 0.8, 1].map((o) => (
                  <div
                    key={o}
                    className="w-4 h-4 rounded bg-secondary"
                    style={{ opacity: 0.3 + o * 0.7 }}
                  />
                ))}
              </div>
              <span>Plus fréquent</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Number Details */}
      <AnimatePresence mode="wait">
        {selectedNumber && numberDetails && (
          <motion.div
            key={selectedNumber}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Stats Overview */}
            <Card className="bg-gradient-to-br from-primary/10 to-accent/5 border-primary/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl scale-150" />
                    <NumberBall 
                      number={selectedNumber} 
                      size="lg" 
                      className="relative z-10 w-16 h-16 text-xl shadow-lg"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Numéro {selectedNumber}</h3>
                    <p className="text-sm text-muted-foreground">
                      Analyse sur {numberDetails.totalDraws} tirages
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-background/50 text-center">
                    <TrendingUp className="w-5 h-5 mx-auto mb-1 text-success" />
                    <p className="text-2xl font-bold text-foreground">
                      {numberDetails.stat.frequency}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Apparitions</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-background/50 text-center">
                    <Zap className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-2xl font-bold text-foreground">
                      {numberDetails.appearanceRate}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">Taux</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-background/50 text-center">
                    <Clock className="w-5 h-5 mx-auto mb-1 text-warning" />
                    <p className="text-2xl font-bold text-foreground">
                      {numberDetails.stat.days_since_last}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Jours d'écart</p>
                  </div>
                </div>

                {numberDetails.stat.last_appearance && (
                  <div className="mt-4 p-3 rounded-lg bg-background/30 text-sm text-center">
                    <span className="text-muted-foreground">Dernière apparition: </span>
                    <span className="font-medium">
                      {new Date(numberDetails.stat.last_appearance).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Associated Numbers */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Link2 className="w-4 h-4 text-info" />
                    Numéros Associés
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Sortent souvent avec le {selectedNumber}
                  </p>
                </CardHeader>
                <CardContent>
                  {numberDetails.associatedNumbers.length > 0 ? (
                    <div className="space-y-2">
                      {numberDetails.associatedNumbers.map((item, idx) => (
                        <motion.div
                          key={item.number}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30"
                        >
                          <span className="text-xs font-bold text-muted-foreground w-4">
                            {idx + 1}
                          </span>
                          <NumberBall number={item.number} size="sm" className="w-8 h-8 text-xs" />
                          <div className="flex-1">
                            <Progress 
                              value={(item.count / numberDetails.stat.frequency) * 100} 
                              className="h-1.5" 
                            />
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {item.count}x
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucune donnée disponible
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ArrowRight className="w-4 h-4 text-success" />
                    Numéros Suivants
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Sortent au tirage suivant après le {selectedNumber}
                  </p>
                </CardHeader>
                <CardContent>
                  {numberDetails.followingNumbers.length > 0 ? (
                    <div className="space-y-2">
                      {numberDetails.followingNumbers.map((item, idx) => (
                        <motion.div
                          key={item.number}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30"
                        >
                          <span className="text-xs font-bold text-muted-foreground w-4">
                            {idx + 1}
                          </span>
                          <NumberBall number={item.number} size="sm" className="w-8 h-8 text-xs" />
                          <div className="flex-1">
                            <Progress 
                              value={(item.count / numberDetails.stat.frequency) * 100} 
                              className="h-1.5" 
                            />
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {item.count}x
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Pas assez de données
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Disclaimer */}
            <Card className="bg-warning/10 border-warning/30">
              <CardContent className="p-4">
                <p className="text-xs text-warning-foreground">
                  <strong>💡 Note:</strong> Ces statistiques sont basées sur l'historique et ne garantissent aucun résultat futur. Chaque tirage est indépendant.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!selectedNumber && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-secondary/20 border-border/30">
            <CardContent className="p-8 text-center">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Cliquez sur un numéro ci-dessus pour voir son analyse détaillée
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};
