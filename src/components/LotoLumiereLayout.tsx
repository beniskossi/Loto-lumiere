import { useState, useMemo, lazy, Suspense, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, LogOut, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { DRAW_SCHEDULE } from "@/types/lottery";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { isSameDay } from "@/utils/dateUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

// Eagerly load AccueilTab (home screen), lazy load the rest
import { AccueilTab } from "./loto/AccueilTab";
import { BottomNavBar, TabId } from "./loto/BottomNavBar";
import { ScrollToTop } from "./loto/ScrollToTop";

// Lazy-loaded tab components — only loaded when user navigates to them
const PredictionsContainer = lazy(() => import("./loto/PredictionsContainer").then(m => ({ default: m.PredictionsContainer })));
const AnalysesContainer = lazy(() => import("./loto/AnalysesContainer").then(m => ({ default: m.AnalysesContainer })));
const ForensicAuditPanel = lazy(() => import("@/components/ForensicAuditPanel").then(m => ({ default: m.ForensicAuditPanel })));

const TabFallback = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

export const LotoLumiereLayout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdminRole(user?.id);
  const [activeTab, setActiveTab] = useState<TabId>("accueil");
  const initialDraw = useMemo(() => {
    const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const today = days[new Date().getDay()];
    const todayDraws = DRAW_SCHEDULE[today];
    return todayDraws && todayDraws.length > 0 ? todayDraws[0].name : "Etoile";
  }, []);

  const [selectedDraw, setSelectedDraw] = useState(initialDraw);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { pullDistance, refreshing } = usePullToRefresh();
  const { triggerHaptic } = useHapticFeedback();
 
  const allDraws = useMemo(() => Object.values(DRAW_SCHEDULE).flat(), []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
    navigate("/");
  }, [navigate]);

  const handleSelectDrawFromAccueil = useCallback((drawName: string, date?: Date) => {
    setSelectedDraw(drawName);
    setSelectedDate(date);
    setActiveTab("analyses");
  }, [triggerHaptic]);

  const handleTabChange = useCallback((tab: TabId) => {
    triggerHaptic("light");
    setActiveTab(tab);
  }, [triggerHaptic]);

  const clearHistoricalView = useCallback(() => {
    setSelectedDate(undefined);
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case "accueil":
        return <AccueilTab onSelectDraw={handleSelectDrawFromAccueil} />;
      case "predictions":
        return (
          <Suspense fallback={<TabFallback />}>
            <PredictionsContainer key={selectedDraw} drawName={selectedDraw} selectedDate={selectedDate} onClearDate={clearHistoricalView} />
          </Suspense>
        );
      case "analyses":
        return (
          <Suspense fallback={<TabFallback />}>
            <AnalysesContainer key={selectedDraw} drawName={selectedDraw} />
          </Suspense>
        );
      case "forensic":
        return (
          <Suspense fallback={<TabFallback />}>
            <ForensicAuditPanel />
          </Suspense>
        );
      default:
        return <AccueilTab onSelectDraw={handleSelectDrawFromAccueil} />;
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Background ambient blobs for immersive cosmic vibe */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] dark:bg-primary/8" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-accent/5 blur-[150px] dark:bg-accent/8" />
      </div>

      {/* Onboarding */}
      <AnimatePresence>
        {showOnboarding && <OnboardingWizard onComplete={completeOnboarding} />}
      </AnimatePresence>

      {/* Pull to Refresh Indicator */}
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl transition-all duration-300">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate("/")}>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm group-hover:shadow-primary/20 transition-all duration-500">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-display font-extrabold text-xl tracking-tight text-foreground">LOTO LUMIÈRE</h1>
                <p className="font-mono text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">Suite d'Analyse Pro</p>
              </div>
            </div>

            {/* Draw Selector */}
            <Select value={selectedDraw} onValueChange={setSelectedDraw}>
              <SelectTrigger className="w-[140px] h-9 bg-secondary/50 border-border/30 rounded-xl text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allDraws.map((draw) => (
                  <SelectItem key={draw.name} value={draw.name}>
                    {draw.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {isAdmin && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate("/admin")}
                  className="text-muted-foreground hover:text-foreground w-9 h-9"
                  title="Administration"
                >
                  <Shield className="w-4 h-4" />
                </Button>
              )}
              <ThemeToggle />
              {user && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-foreground w-9 h-9"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <BottomNavBar activeTab={activeTab} onTabChange={handleTabChange} />
      
      {/* Scroll to Top */}
      <ScrollToTop />
    </div>
  );
};
