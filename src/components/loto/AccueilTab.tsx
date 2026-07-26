import { useMemo, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock, CalendarDays, Sparkles, Timer, CheckCircle2, ChevronLeft, ChevronRight, CalendarIcon, History } from "lucide-react";
import { DRAW_SCHEDULE } from "@/types/lottery";
import { getDrawStatus, getCurrentTime, getFrenchDayFromDate, isSameDay, formatDateForQuery } from "@/utils/dateUtils";
import { useTodayDrawResults } from "@/hooks/useTodayDrawResults";
import { useDateDrawResults } from "@/hooks/useDateDrawResults";
import { NumberBall } from "@/components/NumberBall";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AccueilTabProps {
  onSelectDraw: (drawName: string, date?: Date) => void;
}

export const AccueilTab = ({ onSelectDraw }: AccueilTabProps) => {
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const isToday = useMemo(() => isSameDay(selectedDate, today), [selectedDate, today]);
  const selectedDay = useMemo(() => getFrenchDayFromDate(selectedDate), [selectedDate]);
  const currentTime = getCurrentTime();
  
  const { data: todayResults } = useTodayDrawResults();
  const { data: dateResults, isLoading: isLoadingResults } = useDateDrawResults(selectedDate);
  
  // Use today's results if viewing today, otherwise use date-specific results
  const resultsToShow = isToday ? todayResults : dateResults;
  
  // Get draws for selected day
  const selectedDayDraws = useMemo(() => {
    return DRAW_SCHEDULE[selectedDay] || [];
  }, [selectedDay]);

  // Find next upcoming draw (only for today)
  const nextDraw = useMemo(() => {
    if (!isToday) return null;
    return selectedDayDraws.find(draw => draw.time > currentTime);
  }, [selectedDayDraws, currentTime, isToday]);

  // Navigation handlers
  const goToPreviousDay = useCallback(() => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      if (newDate <= today) {
        return newDate;
      }
      return prev;
    });
  }, [today]);

  const goToToday = useCallback(() => {
    setSelectedDate(today);
  }, [today]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Date Selector */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousDay}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "min-w-[200px] justify-start text-left font-normal",
                  !isToday && "border-primary/50 bg-primary/5"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setIsCalendarOpen(false);
                  }
                }}
                disabled={(date) => date > today}
                initialFocus
                locale={fr}
              />
            </PopoverContent>
          </Popover>
          
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextDay}
            disabled={isSameDay(selectedDate, today)}
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {!isToday && (
          <Button
            variant="secondary"
            size="sm"
            onClick={goToToday}
            className="gap-2"
          >
            <Sparkles className="h-3 w-3" />
            Retour à aujourd'hui
          </Button>
        )}
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-6"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <Badge className={cn(
            "px-4 py-1 font-mono text-[11px] tracking-widest uppercase transition-colors",
            isToday 
              ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" 
              : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
          )}>
            {isToday ? (
              <Sparkles className="w-3.5 h-3.5 mr-2" />
            ) : (
              <History className="w-3.5 h-3.5 mr-2" />
            )}
            {selectedDay}
          </Badge>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">
          {isToday ? "Synthèse Globale du Jour" : "Matrice Historique"}
        </h2>
        <p className="text-sm font-medium text-muted-foreground/80">
          {selectedDayDraws.length} itérations programmées • {isToday ? `Synchronisation : ${currentTime}` : format(selectedDate, "d MMMM yyyy", { locale: fr })}
        </p>
      </motion.div>

      {/* Next Draw Highlight (only for today) */}
      <AnimatePresence mode="wait">
        {isToday && nextDraw && (
          <motion.div
            key="next-draw"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className="border-border/60 bg-gradient-to-br from-card to-card/50 overflow-hidden shadow-sm relative group">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold text-primary uppercase tracking-widest flex items-center gap-1.5 mb-2">
                      <Timer className="w-3.5 h-3.5" />
                      Prochaine Itération
                    </p>
                    <h3 className="text-2xl font-bold tracking-tight text-foreground mb-1">{nextDraw.name}</h3>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      T0 : {nextDraw.time}
                    </p>
                  </div>
                  <button
                    onClick={() => onSelectDraw(nextDraw.name)}
                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-sm font-semibold transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
                  >
                    Exécuter Modèle
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Past Date Analysis Banner */}
      {!isToday && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
        >
          <Card className="border-border/60 bg-secondary/20 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <History className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground tracking-tight">Audit Historique</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Analyse comparative des jeux de données passés et précision prédictive.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Draws Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {isToday ? `Séquence du ${selectedDay}` : `Séquence du ${format(selectedDate, "d MMMM yyyy", { locale: fr })}`}
          </h3>
        </div>
        
        {isLoadingResults && !isToday ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-5 h-28 bg-secondary/20" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selectedDayDraws.map((draw, index) => {
              const status = isToday ? getDrawStatus(draw.time, true) : 'passed';
              const isPassed = status === 'passed';
              const isUpcoming = status === 'upcoming';
              const drawResult = resultsToShow?.[draw.name];
              const result = drawResult?.winningNumbers;
              const machineNumbers = drawResult?.machineNumbers;
              const hasResult = result && result.length > 0;

              return (
                <motion.div
                  key={`${draw.name}-${formatDateForQuery(selectedDate)}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className={cn(
                      "cursor-pointer transition-all duration-300 hover:shadow-md border-border/40 group",
                      isUpcoming && "ring-1 ring-primary/20 bg-primary/5 hover:bg-primary/10",
                      !isToday && hasResult && "bg-secondary/10 hover:bg-secondary/20",
                      !isToday && !hasResult && "opacity-70 hover:opacity-100"
                    )}
                    onClick={() => onSelectDraw(draw.name, isToday ? undefined : selectedDate)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className={cn(
                              "font-bold text-lg truncate",
                              isUpcoming ? "text-primary" : "text-foreground"
                            )}>
                              {draw.name}
                            </h4>
                            {isUpcoming && (
                              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
                                Planifié
                              </Badge>
                            )}
                            {!isToday && hasResult && (
                              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                                Résultat
                              </Badge>
                            )}
                            {isToday && isPassed && !hasResult && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                Conclu
                              </Badge>
                            )}
                          </div>
                          
                          <p className={cn(
                            "text-sm flex items-center gap-1.5",
                            isUpcoming ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                          )}>
                            <Clock className={cn("w-3.5 h-3.5", isUpcoming && "animate-pulse")} />
                            {draw.time}
                          </p>

                          {/* Show results if available */}
                          {hasResult && (
                            <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
                              <div>
                                <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                                  Vecteur Gagnant
                                </p>
                                <div className="flex gap-1">
                                  {result.slice(0, 5).map((num, idx) => (
                                    <NumberBall 
                                      key={idx} 
                                      number={num} 
                                      size="xs"
                                    />
                                  ))}
                                </div>
                              </div>
                              
                              {/* Machine numbers */}
                              {machineNumbers && machineNumbers.length > 0 && (
                                <div>
                                  <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-blue-500" />
                                    Vecteur Machine
                                  </p>
                                  <div className="flex gap-1">
                                    {machineNumbers.slice(0, 5).map((num, idx) => (
                                      <NumberBall 
                                        key={idx} 
                                        number={num} 
                                        size="xs"
                                        className="opacity-80"
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* No result message for past dates */}
                          {!isToday && !hasResult && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <p className="text-[10px] text-muted-foreground">
                                Synthèse non disponible
                              </p>
                            </div>
                          )}
                        </div>

                        {!hasResult && (
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                            isUpcoming 
                              ? "bg-gradient-to-br from-amber-400 to-amber-600" 
                              : "bg-gradient-to-br from-primary to-accent",
                            (isPassed || !isToday) && "opacity-50"
                          )}>
                            <span className="text-white font-bold text-sm">5</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Week Schedule Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-secondary/20 border-border/30">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Programme de la semaine</h3>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {Object.entries(DRAW_SCHEDULE).map(([day, draws]) => (
                <div 
                  key={day}
                  className={cn(
                    "p-2 rounded-lg cursor-pointer transition-colors hover:bg-primary/10",
                    day === selectedDay ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground"
                  )}
                  onClick={() => {
                    // Find next occurrence of this day
                    const targetDay = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"].indexOf(day);
                    const newDate = new Date(today);
                    const currentDayNum = today.getDay();
                    let diff = targetDay - currentDayNum;
                    if (diff > 0) diff -= 7; // Go to past week
                    if (diff === 0 && !isToday) diff = 0;
                    else if (diff === 0) diff = 0;
                    else if (diff > 0) diff = diff - 7;
                    newDate.setDate(today.getDate() + diff);
                    setSelectedDate(newDate);
                  }}
                >
                  <p className="font-medium">{day.slice(0, 3)}</p>
                  <p className="text-lg font-bold">{draws.length}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
