import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, Clock, Sun, Moon, TrendingUp, TrendingDown, 
  Activity, Repeat, BarChart3, ArrowUpRight, ArrowDownRight,
  Minus, ArrowRightLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NumberBall } from "@/components/NumberBall";
import { useTemporalAnalysis, TemporalAnalysisData, DayPattern, MonthPattern, TimeSlotPattern, SeasonalTrend, TemporalCycle } from "@/hooks/useTemporalAnalysis";
import { SeasonalRecurrencePanel } from "@/components/SeasonalRecurrencePanel";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface TemporalAnalysisProps {
  drawName: string;
}

export const TemporalAnalysis = ({ drawName }: TemporalAnalysisProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const { data, isLoading } = useTemporalAnalysis(drawName, 200);

  if (isLoading) {
    return <TemporalAnalysisSkeleton />;
  }

  if (!data) {
    return (
      <Card className="bg-card/50 backdrop-blur-xl border-border/30">
        <CardContent className="p-8 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Données insuffisantes pour l'analyse temporelle
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          Analyse Temporelle
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          Tendances saisonnières et patterns cycliques
        </p>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickStatCard
          icon={TrendingUp}
          label="Tendance"
          value={data.recentTrend.direction === "up" ? "Hausse" : data.recentTrend.direction === "down" ? "Baisse" : "Stable"}
          trend={data.recentTrend.direction}
        />
        <QuickStatCard
          icon={Repeat}
          label="Cycles détectés"
          value={data.detectedCycles.length.toString()}
          trend="stable"
        />
        <QuickStatCard
          icon={Sun}
          label="Jour le plus actif"
          value={data.dayPatterns.sort((a, b) => b.drawCount - a.drawCount)[0]?.day || "-"}
          trend="stable"
        />
        <QuickStatCard
          icon={BarChart3}
          label="Somme moyenne"
          value={Math.round(data.dayPatterns.reduce((a, b) => a + b.avgSum, 0) / data.dayPatterns.length).toString()}
          trend="stable"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-secondary/30 backdrop-blur-sm">
          <TabsTrigger value="overview" className="text-xs md:text-sm">
            <Activity className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Aperçu</span>
          </TabsTrigger>
          <TabsTrigger value="daily" className="text-xs md:text-sm">
            <Calendar className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Jours</span>
          </TabsTrigger>
          <TabsTrigger value="monthly" className="text-xs md:text-sm">
            <Sun className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Mois</span>
          </TabsTrigger>
          <TabsTrigger value="cycles" className="text-xs md:text-sm">
            <Repeat className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Cycles</span>
          </TabsTrigger>
          <TabsTrigger value="recurrence" className="text-xs md:text-sm">
            <ArrowRightLeft className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Lags (Saisons)</span>
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent key="overview" value="overview" className="mt-6">
            <OverviewTab data={data} />
          </TabsContent>

          <TabsContent key="daily" value="daily" className="mt-6">
            <DailyTab data={data} />
          </TabsContent>

          <TabsContent key="monthly" value="monthly" className="mt-6">
            <MonthlyTab data={data} />
          </TabsContent>

          <TabsContent key="cycles" value="cycles" className="mt-6">
            <CyclesTab data={data} />
          </TabsContent>
          
          <TabsContent key="recurrence" value="recurrence" className="mt-6">
            <SeasonalRecurrencePanel drawName={drawName} />
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  );
};

// Quick Stat Card
const QuickStatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  trend 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  trend: "up" | "down" | "stable";
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
  >
    <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-border/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{value}</span>
          {trend === "up" && <ArrowUpRight className="w-4 h-4 text-success" />}
          {trend === "down" && <ArrowDownRight className="w-4 h-4 text-destructive" />}
          {trend === "stable" && <Minus className="w-4 h-4 text-muted-foreground" />}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// Overview Tab
const OverviewTab = ({ data }: { data: TemporalAnalysisData }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="space-y-4"
  >
    {/* Recent Trend */}
    <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Tendance Récente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4 text-success" />
              En hausse
            </p>
            <div className="flex flex-wrap gap-2">
              {data.recentTrend.trendingNumbers.map((num: number, idx: number) => (
                <NumberBall key={`trend-up-${num}-${idx}`} number={num} size="sm" className="w-9 h-9 text-xs" />
              ))}
              {data.recentTrend.trendingNumbers.length === 0 && (
                <span className="text-muted-foreground text-sm">Aucun</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
              <ArrowDownRight className="w-4 h-4 text-destructive" />
              En baisse
            </p>
            <div className="flex flex-wrap gap-2">
              {data.recentTrend.decliningNumbers.map((num: number, idx: number) => (
                <NumberBall key={`trend-down-${num}-${idx}`} number={num} size="sm" className="w-9 h-9 text-xs opacity-60" />
              ))}
              {data.recentTrend.decliningNumbers.length === 0 && (
                <span className="text-muted-foreground text-sm">Aucun</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Weekday vs Weekend */}
    <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Semaine vs Week-end
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Semaine</span>
              <Badge variant="outline" className="text-xs">
                {data.weekdayVsWeekend.weekday.drawCount} tirages
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Somme moy: <span className="font-bold text-foreground">{data.weekdayVsWeekend.weekday.avgSum}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.weekdayVsWeekend.weekday.hotNumbers.map((num: number, idx: number) => (
                <NumberBall key={`weekday-hot-${num}-${idx}`} number={num} size="sm" className="w-8 h-8 text-xs" />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Week-end</span>
              <Badge variant="outline" className="text-xs">
                {data.weekdayVsWeekend.weekend.drawCount} tirages
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Somme moy: <span className="font-bold text-foreground">{data.weekdayVsWeekend.weekend.avgSum}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.weekdayVsWeekend.weekend.hotNumbers.map((num: number, idx: number) => (
                <NumberBall key={`weekend-hot-${num}-${idx}`} number={num} size="sm" className="w-8 h-8 text-xs" />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Time Slots */}
    <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Par Horaire
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.timeSlotPatterns.map((slot: TimeSlotPattern, idxSlot: number) => (
            <div key={`timeslot-${slot.timeSlot || idxSlot}`} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div>
                <span className="font-medium text-sm">{slot.timeSlot}</span>
                <p className="text-xs text-muted-foreground">{slot.drawCount} tirages</p>
              </div>
              <div className="flex gap-1.5">
                {slot.hotNumbers.slice(0, 3).map((num: number, idxNum: number) => (
                  <NumberBall key={`timeslot-hot-${num}-${idxNum}`} number={num} size="sm" className="w-7 h-7 text-xs" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// Daily Tab
const DailyTab = ({ data }: { data: TemporalAnalysisData }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="space-y-3"
  >
    {data.dayPatterns.map((day: DayPattern, index: number) => (
      <motion.div
        key={`day-pattern-${day.day}-${index}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-border/30 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg">{day.day}</h3>
                <p className="text-xs text-muted-foreground">
                  {day.drawCount} tirages • Somme moy: {day.avgSum}
                </p>
              </div>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  day.avgSum > 230 && "border-success/50 text-success",
                  day.avgSum < 200 && "border-warning/50 text-warning"
                )}
              >
                {day.avgSum > 230 ? "Sommes élevées" : day.avgSum < 200 ? "Sommes basses" : "Équilibré"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-success" /> Favoris
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {day.hotNumbers.map((num: number, idx: number) => (
                    <NumberBall key={`day-hot-${num}-${idx}`} number={num} size="sm" className="w-8 h-8 text-xs" />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-destructive" /> À éviter
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {day.coldNumbers.map((num: number, idx: number) => (
                    <NumberBall key={`day-cold-${num}-${idx}`} number={num} size="sm" className="w-8 h-8 text-xs opacity-50" />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    ))}
  </motion.div>
);

// Monthly Tab
const MonthlyTab = ({ data }: { data: TemporalAnalysisData }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="space-y-4"
  >
    {/* Seasonal Overview */}
    <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sun className="w-5 h-5 text-primary" />
          Tendances Saisonnières
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.seasonalTrends.map((season: SeasonalTrend, idxSeason: number) => (
          <div key={`season-${season.season}-${idxSeason}`} className="p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{season.season}</span>
              <Badge variant="outline" className="text-xs">
                {season.drawCount} tirages
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {season.hotNumbers.slice(0, 4).map((num: number, idxNum: number) => (
                  <NumberBall key={`season-hot-${num}-${idxNum}`} number={num} size="sm" className="w-7 h-7 text-xs" />
                ))}
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>Somme: {season.avgSum}</div>
                <div>Pairs: {Math.round(season.evenRatio * 100)}%</div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>

    {/* Monthly Details */}
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {data.monthPatterns.map((month: MonthPattern, index: number) => (
        <motion.div
          key={`month-pattern-${month.month}-${index}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.03 }}
        >
          <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-border/30">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{month.monthName}</span>
                <span className="text-xs text-muted-foreground">{month.drawCount}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {month.hotNumbers.slice(0, 3).map((num: number, idxNum: number) => (
                  <NumberBall key={`month-hot-${num}-${idxNum}`} number={num} size="sm" className="w-6 h-6 text-[10px]" />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

// Cycles Tab
const CyclesTab = ({ data }: { data: TemporalAnalysisData }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="space-y-4"
  >
    {data.detectedCycles.length === 0 ? (
      <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-border/30">
        <CardContent className="p-8 text-center">
          <Repeat className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Aucun cycle significatif détecté dans les données actuelles
          </p>
        </CardContent>
      </Card>
    ) : (
      data.detectedCycles.map((cycle: TemporalCycle, index: number) => (
        <motion.div
          key={`cycle-${cycle.cycleLength}-${index}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-border/30 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <CardContent className="relative p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Repeat className="w-5 h-5 text-primary" />
                    <h3 className="font-bold">{cycle.description}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Période: {cycle.cycleLength} tirages
                  </p>
                </div>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    cycle.confidence > 0.7 && "border-success/50 text-success",
                    cycle.confidence > 0.5 && cycle.confidence <= 0.7 && "border-warning/50 text-warning",
                    cycle.confidence <= 0.5 && "border-muted-foreground/50"
                  )}
                >
                  {Math.round(cycle.confidence * 100)}% confiance
                </Badge>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Numéros cycliques</p>
                <div className="flex flex-wrap gap-2">
                  {cycle.numbers.map((num: number, i: number) => (
                    <motion.div
                      key={`cycle-num-${num}-${i}`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                    >
                      <NumberBall number={num} size="sm" className="w-10 h-10" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))
    )}

    {/* Explanation Card */}
    <Card className="bg-secondary/20 border-border/20">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">
          <strong>Comment ça marche:</strong> L'analyse cyclique recherche les numéros qui apparaissent 
          à intervalles réguliers (hebdomadaires, bi-hebdomadaires, mensuels). Un niveau de confiance 
          élevé indique un pattern plus fiable.
        </p>
      </CardContent>
    </Card>
  </motion.div>
);

// Loading Skeleton
const TemporalAnalysisSkeleton = () => (
  <div className="space-y-6 pb-24">
    <div className="text-center">
      <Skeleton className="h-8 w-48 mx-auto mb-2" />
      <Skeleton className="h-4 w-64 mx-auto" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </div>
    <Skeleton className="h-12 rounded-lg" />
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-lg" />
      ))}
    </div>
  </div>
);
