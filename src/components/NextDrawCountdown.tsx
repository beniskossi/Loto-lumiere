import { useNextDrawCountdown } from "@/hooks/useNextDrawCountdown";
import { Card, CardContent } from "@/components/ui/card";
import { Timer, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const NextDrawCountdown = () => {
  const nextDraw = useNextDrawCountdown();

  if (!nextDraw) {
    return (
      <Card className="bg-muted/50 border-border/50">
        <CardContent className="p-4 text-center">
          <p className="text-muted-foreground text-sm">Tous les tirages du jour sont terminés</p>
        </CardContent>
      </Card>
    );
  }

  const { hours, minutes, seconds } = nextDraw.timeUntil;
  const isImminent = hours === 0 && minutes < 30;

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      isImminent 
        ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/50 shadow-lg shadow-amber-500/10" 
        : "bg-gradient-card border-border/50"
    )}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              isImminent ? "bg-amber-500/20 animate-pulse" : "bg-primary/10"
            )}>
              {isImminent ? (
                <Sparkles className="w-6 h-6 text-amber-500" />
              ) : (
                <Timer className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Prochain tirage</p>
              <h3 className={cn(
                "font-bold text-lg",
                isImminent ? "text-amber-600 dark:text-amber-400" : "text-foreground"
              )}>
                {nextDraw.name}
              </h3>
              <p className="text-xs text-muted-foreground">{nextDraw.time}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TimeBlock value={hours} label="h" isImminent={isImminent} />
            <span className={cn(
              "text-2xl font-bold",
              isImminent ? "text-amber-500 animate-pulse" : "text-muted-foreground"
            )}>:</span>
            <TimeBlock value={minutes} label="m" isImminent={isImminent} />
            <span className={cn(
              "text-2xl font-bold",
              isImminent ? "text-amber-500 animate-pulse" : "text-muted-foreground"
            )}>:</span>
            <TimeBlock value={seconds} label="s" isImminent={isImminent} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const TimeBlock = ({ value, label, isImminent }: { value: number; label: string; isImminent: boolean }) => (
  <div className={cn(
    "flex flex-col items-center justify-center w-14 h-16 rounded-lg",
    isImminent 
      ? "bg-amber-500/20 border border-amber-500/30" 
      : "bg-muted/50 border border-border/50"
  )}>
    <span className={cn(
      "text-2xl font-bold tabular-nums",
      isImminent ? "text-amber-600 dark:text-amber-400" : "text-foreground"
    )}>
      {value.toString().padStart(2, '0')}
    </span>
    <span className="text-[10px] text-muted-foreground uppercase">{label}</span>
  </div>
);
