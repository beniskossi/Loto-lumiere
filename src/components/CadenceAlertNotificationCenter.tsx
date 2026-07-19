import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, BellRing, Check, Trash2, ShieldAlert, Sparkles, Zap, Activity, Info } from "lucide-react";
import { useCadenceAlerts, CadenceAlert } from "@/hooks/useCadenceAlerts";
import { NumberBall } from "@/components/NumberBall";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CadenceAlertNotificationCenterProps {
  drawName: string;
}

export const CadenceAlertNotificationCenter = ({ drawName }: CadenceAlertNotificationCenterProps) => {
  const { alerts, unreadCount, isLoading, markAsRead, markAllAsRead, clearAlerts } = useCadenceAlerts(drawName);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          id="cadence-alerts-bell"
          className="relative text-muted-foreground hover:text-foreground w-9 h-9 rounded-xl transition-all duration-300"
          title="Alertes de Cadence"
        >
          {unreadCount > 0 ? (
            <>
              <BellRing className="w-4.5 h-4.5 text-amber-400 animate-[bounce_2s_infinite]" />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            </>
          ) : (
            <Bell className="w-4.5 h-4.5" />
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 sm:w-96 p-0 bg-slate-950/95 border-border/40 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden z-50">
        {/* Header */}
        <div className="p-4 border-b border-border/20 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 rounded-lg">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Alertes de Cadence</h3>
              <p className="text-[10px] text-muted-foreground">Pattern Lock & Séquences d'Écart ({drawName})</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            {alerts.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg"
                  onClick={markAllAsRead}
                  title="Tout marquer comme lu"
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                  onClick={clearAlerts}
                  title="Nettoyer les alertes"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Content Body */}
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Activity className="w-5 h-5 text-amber-400 animate-spin" />
              <span>Analyse des motifs de cadence en cours...</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
              <Bell className="w-8 h-8 text-muted-foreground/30" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-300">Aucune alerte critique</p>
                <p className="text-[10px] leading-relaxed max-w-xs mx-auto">
                  Aucun numéro n'a encore atteint le seuil d'alignement parfait (80%+) sur sa cadence rythmique historique pour ce tirage.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              <AnimatePresence initial={false}>
                {alerts.map((alert) => {
                  const isRead = alert.read;
                  const isHigh = alert.severity === "high";
                  
                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      onClick={() => !isRead && markAsRead(alert.id)}
                      className={cn(
                        "p-3 rounded-xl border transition-all duration-300 cursor-pointer flex gap-3 relative overflow-hidden",
                        isRead 
                          ? "bg-transparent border-transparent opacity-60 hover:opacity-100" 
                          : "bg-slate-900/60 hover:bg-slate-900 border-border/20 shadow-sm hover:border-amber-500/20"
                      )}
                    >
                      {/* Left indicator strip for unread and high severity */}
                      {!isRead && (
                        <div className={cn(
                          "absolute left-0 top-0 bottom-0 w-1",
                          isHigh ? "bg-amber-500" : "bg-blue-500"
                        )} />
                      )}

                      {/* Icon */}
                      <div className="shrink-0 pt-0.5">
                        {alert.type === "cadence_lock" && (
                          <div className={cn("p-2 rounded-lg", isHigh ? "bg-amber-500/10 text-amber-400" : "bg-purple-500/10 text-purple-400")}>
                            <Zap className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {alert.type === "double_gap_trigger" && (
                          <div className={cn("p-2 rounded-lg", isHigh ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400")}>
                            <Activity className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {alert.type === "pattern_match" && (
                          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white leading-none truncate">{alert.title}</span>
                          <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                            {Math.round(alert.score * 100)}%
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{alert.description}</p>
                        
                        {/* Interactive number ball render */}
                        {alert.number && (
                          <div className="pt-1.5 flex items-center gap-1.5">
                            <span className="text-[9px] text-muted-foreground font-mono">Cible :</span>
                            <NumberBall number={alert.number} size="xs" className={isRead ? "opacity-60" : "opacity-100"} />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Footer info explaining the math */}
        <div className="p-3 border-t border-border/20 bg-slate-950/80 text-[10px] text-muted-foreground leading-relaxed flex gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            Les **verrouillages rythmiques** décrivent un état où la périodicité de l'écart consécutif (Gap Cadence) 
            entre en résonance parfaite avec son historique d'apparition. L'explicabilité mathématique estime une tension statistique maximale.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
