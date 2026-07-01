import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  refreshing: boolean;
}

const THRESHOLD = 80;

export const PullToRefreshIndicator = ({ pullDistance, refreshing }: PullToRefreshIndicatorProps) => {
  const isReady = pullDistance >= THRESHOLD;
  const visible = pullDistance > 10 || refreshing;

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed top-16 left-0 right-0 z-40 flex justify-center pointer-events-none"
    >
      <div className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full shadow-lg",
        "bg-secondary/90 backdrop-blur-md border border-border/30",
        "transition-colors duration-200",
        isReady && "bg-primary/20 border-primary/30"
      )}>
        {refreshing ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : (
          <motion.div
            animate={{ rotate: isReady ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-muted-foreground"
          >
            ↓
          </motion.div>
        )}
        <span className="text-xs font-medium text-muted-foreground">
          {refreshing ? "Actualisation…" : isReady ? "Relâcher" : "Tirer pour actualiser"}
        </span>
      </div>
    </motion.div>
  );
};
