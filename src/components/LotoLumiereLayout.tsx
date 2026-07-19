import { useState, useMemo, lazy, Suspense, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, LogOut, Shield, Home, Target, Search, TrendingUp, FlaskConical, User } from "lucide-react";
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
import { cn } from "@/lib/utils";

// Eagerly load AccueilTab (home screen), lazy load the rest
import { AccueilTab } from "./loto/AccueilTab";
import { BottomNavBar, TabId } from "./loto/BottomNavBar";
import { ScrollToTop } from "./loto/ScrollToTop";
import { CadenceAlertNotificationCenter } from "./CadenceAlertNotificationCenter";
import { Footer } from "./Footer";

// Lazy-loaded tab components — only loaded when user navigates to them
const PredictionsContainer = lazy(() => import("./loto/PredictionsContainer").then(m => ({ default: m.PredictionsContainer })));
const AnalysesContainer = lazy(() => import("./loto/AnalysesContainer").then(m => ({ default: m.AnalysesContainer })));
const PerformancesContainer = lazy(() => import("./loto/PerformancesContainer").then(m => ({ default: m.PerformancesContainer })));
const CompteContainer = lazy(() => import("./loto/CompteContainer").then(m => ({ default: m.CompteContainer })));

const TabFallback = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

const navigationTabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "accueil", label: "Aujourd'hui", icon: Home },
  { id: "predictions", label: "Grilles", icon: Target },
  { id: "analyses", label: "Analyses & Labo", icon: FlaskConical },
  { id: "performances", label: "Performances", icon: TrendingUp },
  { id: "compte", label: "Compte", icon: User },
];

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
  }, []);

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
      case "performances":
        return (
          <Suspense fallback={<TabFallback />}>
            <PerformancesContainer key={selectedDraw} drawName={selectedDraw} />
          </Suspense>
        );
      case "compte":
        return (
          <Suspense fallback={<TabFallback />}>
            <CompteContainer />
          </Suspense>
        );
      default:
        return <AccueilTab onSelectDraw={handleSelectDrawFromAccueil} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1017] relative flex flex-col md:flex-row text-foreground font-sans">
      
      {/* Onboarding */}
      <AnimatePresence>
        {showOnboarding && <OnboardingWizard onComplete={completeOnboarding} />}
      </AnimatePresence>

      {/* Pull to Refresh Indicator */}
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} />

      {/* Sticky Left Sidebar Navigation on Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#121620] border-r border-border/40 fixed top-0 bottom-0 left-0 z-40 overflow-y-auto">
        {/* Sidebar Brand/Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-border/30 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <Sparkles className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-sm tracking-tight text-slate-100">LOTO LUMIÈRE</h1>
            <p className="font-mono text-[9px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">Suite d'Analyse Pro</p>
          </div>
        </div>

        {/* Sidebar Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigationTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 text-left",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm font-bold"
                    : "text-slate-400 hover:bg-[#1a1f2e] hover:text-slate-200"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary-foreground" : "text-slate-400")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Analyst Profile Card */}
        <div className="p-4 border-t border-border/30 bg-[#161b27]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{user?.email || "Analyste"}</p>
              <p className="text-[10px] text-slate-400 font-medium">Session Active</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-xl transition-all duration-300">
          <div className="px-4 md:px-6 h-16 flex items-center justify-between">
            
            {/* Brand Logo on Mobile only */}
            <div className="flex items-center gap-3 cursor-pointer md:hidden" onClick={() => navigate("/")}>
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="font-display font-extrabold text-sm tracking-tight text-slate-100">LOTO LUMIÈRE</h1>
            </div>

            {/* Desktop Section Info */}
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-400 font-medium">
              <span>Rapport d'analyse active :</span>
              <span className="text-primary font-bold">{selectedDraw}</span>
            </div>

            {/* Right Side Control Bar */}
            <div className="flex items-center gap-3">
              {/* Draw Selector Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline text-xs text-slate-400 font-medium">Tirage :</span>
                <Select value={selectedDraw} onValueChange={setSelectedDraw}>
                  <SelectTrigger className="w-[130px] h-9 bg-secondary/40 border-border/30 rounded-xl text-sm font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121620] border-border/30">
                    {allDraws.map((draw) => (
                      <SelectItem key={draw.name} value={draw.name}>
                        {draw.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="h-4 w-px bg-border/40 hidden sm:block" />

              <div className="flex items-center gap-1.5">
                <CadenceAlertNotificationCenter drawName={selectedDraw} />
                {isAdmin && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => navigate("/admin")}
                    className="text-slate-400 hover:text-slate-200 w-9 h-9 hover:bg-[#1a1f2e] rounded-xl"
                    title="Administration"
                  >
                    <Shield className="w-4.5 h-4.5" />
                  </Button>
                )}
                <ThemeToggle />
                {user && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={handleLogout}
                    className="text-slate-400 hover:text-slate-200 w-9 h-9 hover:bg-[#1a1f2e] rounded-xl"
                    title="Déconnexion"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                  </Button>
                )}
              </div>
            </div>

          </div>
        </header>

        {/* View Content Port */}
        <main className="flex-grow p-4 md:p-6 pb-24 md:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
          <Footer />
        </main>

      </div>

      {/* Bottom Navigation on Mobile Viewport */}
      <div className="md:hidden">
        <BottomNavBar activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      <ScrollToTop />
    </div>
  );

};
