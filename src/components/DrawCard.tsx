import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle2, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { DrawSchedule } from "@/types/lottery";
import { Badge } from "@/components/ui/badge";
import { NumberBall } from "./NumberBall";

interface DrawCardProps {
  draw: DrawSchedule;
  onClick: () => void;
  className?: string;
  isToday?: boolean;
  status?: 'passed' | 'upcoming' | 'future';
  lastResult?: number[];
}

export const DrawCard = ({ 
  draw, 
  onClick, 
  className, 
  isToday = false, 
  status = 'future',
  lastResult 
}: DrawCardProps) => {
  const isUpcoming = status === 'upcoming';
  const isPassed = status === 'passed';
  const hasResult = isPassed && isToday && lastResult && lastResult.length > 0;
  
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] bg-gradient-card border-border/50 group touch-target relative overflow-hidden",
        isToday && "ring-2 ring-primary/50",
        isUpcoming && "ring-2 ring-amber-500/70 shadow-lg shadow-amber-500/20",
        className
      )}
      onClick={onClick}
    >
      {isUpcoming && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 animate-pulse" />
      )}
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn(
                "font-bold text-base sm:text-lg group-hover:text-primary transition-colors truncate",
                isUpcoming ? "text-amber-600 dark:text-amber-400" : "text-foreground"
              )}>
                {draw.name}
              </h3>
              {isToday && isUpcoming && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0 animate-pulse">
                  <Timer className="w-3 h-3 mr-1" />
                  Bientôt
                </Badge>
              )}
              {isToday && isPassed && !hasResult && (
                <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/30 text-[10px] px-1.5 py-0">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Passé
                </Badge>
              )}
            </div>
            <div className={cn(
              "flex items-center gap-2",
              isPassed && isToday ? "text-muted-foreground/70" : "text-muted-foreground"
            )}>
              <Clock className={cn(
                "w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0",
                isUpcoming && "text-amber-500 animate-pulse"
              )} />
              <span className={cn(
                "text-xs sm:text-sm font-medium",
                isUpcoming && "text-amber-600 dark:text-amber-400 font-semibold"
              )}>
                {draw.time}
              </span>
            </div>
            
            {/* Afficher les résultats si disponibles */}
            {hasResult && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  Résultat du jour
                </p>
                <div className="flex gap-1">
                  {lastResult.slice(0, 5).map((num, idx) => (
                    <NumberBall 
                      key={idx} 
                      number={num} 
                      size="xs"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {!hasResult && (
            <div className={cn(
              "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-glow transition-all flex-shrink-0",
              isUpcoming ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-gradient-primary",
              isPassed && isToday && "opacity-60"
            )}>
              <span className="text-white font-bold text-lg sm:text-xl">5</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
