import { motion } from "framer-motion";
import { Home, Target, Brain, Search, Timer, ShieldCheck, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabId = "accueil" | "predictions" | "analyses" | "forensic";

interface BottomNavBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: React.ElementType; highlight?: boolean }[] = [
  { id: "accueil", label: "Synthèse Globale", icon: Home },
  { id: "predictions", label: "Moteur Prédictif", icon: Target, highlight: true },
  { id: "analyses", label: "Matrices & Écarts", icon: Search },
  { id: "forensic", label: "Audit d'Intégrité", icon: ShieldCheck },
];

export const BottomNavBar = ({ activeTab, onTabChange }: BottomNavBarProps) => {
  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "safe-area-bottom"
      )}
    >
      {/* Glass background */}
      <div className={cn(
        "mx-2 mb-2 rounded-2xl overflow-hidden",
        "bg-gradient-to-b from-secondary/95 to-secondary/80 dark:from-secondary/90 dark:to-secondary/75",
        "backdrop-blur-xl border border-white/5 dark:border-white/10",
        "shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]"
      )}>
        <div className="flex items-center justify-around px-1 py-1.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl",
                  "transition-all duration-300 min-w-0 flex-1",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {/* Active background */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className={cn(
                      "absolute inset-0 rounded-xl",
                      "bg-primary/15",
                      "shadow-[0_0_15px_hsl(var(--primary)/0.2)]"
                    )}
                    transition={{ type: "spring", duration: 0.4 }}
                  />
                )}
                
                {/* Icon */}
                <div className="relative z-10">
                  {tab.highlight && isActive ? (
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="p-1 -mt-2 rounded-full bg-gradient-to-br from-primary to-accent shadow-md shadow-primary/30"
                    >
                      <Icon className="w-3.5 h-3.5 text-primary-foreground" />
                    </motion.div>
                  ) : (
                    <Icon 
                      className={cn(
                        "w-4 h-4 transition-transform duration-200",
                        isActive && "scale-110"
                      )} 
                    />
                  )}
                  
                  {/* Glow for active */}
                  {isActive && !tab.highlight && (
                    <motion.div
                      initial={{ scale: 1, opacity: 0.4 }}
                      animate={{ 
                        scale: [1, 1.4, 1],
                        opacity: [0.4, 0, 0.4]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-primary blur-md"
                    />
                  )}
                </div>
                
                {/* Label */}
                <span className={cn(
                  "text-[9px] font-medium relative z-10 truncate",
                  "transition-all duration-200",
                  isActive ? "opacity-100 font-semibold" : "opacity-70"
                )}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
};
