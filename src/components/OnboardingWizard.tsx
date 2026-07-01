import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Target, Brain, Search, Timer, Sparkles, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface OnboardingStep {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

const steps: OnboardingStep[] = [
  {
    icon: Sparkles,
    title: "Bienvenue sur Loto Lumière",
    description: "Votre suite professionnelle d'analyse de tirages. Découvrez les fonctionnalités clés en quelques secondes.",
    color: "from-primary to-accent",
  },
  {
    icon: Target,
    title: "Prédictions Intelligentes",
    description: "Des algorithmes avancés analysent l'historique pour générer des prédictions optimisées pour chaque tirage.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Brain,
    title: "Intelligence Artificielle",
    description: "Notre moteur IA compare plusieurs algorithmes et sélectionne automatiquement le plus performant.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: Search,
    title: "Consultation & Analyse",
    description: "Explorez les statistiques détaillées, fréquences et tendances de chaque numéro.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Timer,
    title: "Analyse des Écarts",
    description: "Identifiez les numéros en retard et les opportunités grâce à l'analyse des écarts.",
    color: "from-sky-500 to-blue-500",
  },
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { triggerHaptic } = useHapticFeedback();
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const Icon = step.icon;

  const next = () => {
    triggerHaptic("light");
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const skip = () => {
    triggerHaptic("light");
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl p-6"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={skip}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
      >
        <X className="w-5 h-5" />
      </Button>

      <div className="w-full max-w-sm flex flex-col items-center text-center gap-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-6"
          >
            {/* Icon */}
            <div className={cn(
              "w-24 h-24 rounded-3xl flex items-center justify-center bg-gradient-to-br shadow-lg",
              step.color
            )}>
              <Icon className="w-10 h-10 text-white" />
            </div>

            {/* Text */}
            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{step.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === currentStep ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          <Button onClick={next} className="w-full gap-2 h-12 rounded-xl text-base">
            {isLast ? "Commencer" : "Suivant"}
            <ChevronRight className="w-4 h-4" />
          </Button>
          {!isLast && (
            <Button variant="ghost" onClick={skip} className="text-muted-foreground text-sm">
              Passer le tutoriel
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
