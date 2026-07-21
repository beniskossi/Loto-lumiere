import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  User, 
  Settings, 
  Bell, 
  Lock, 
  HelpCircle, 
  LogOut, 
  Check, 
  Activity, 
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Info,
  Coins,
  Heart,
  TrendingUp,
  Trash2
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";

export const CompteContainer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdminRole(user?.id);

  // States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const [notifDrawAlerts, setNotifDrawAlerts] = useState(true);
  const [notifOptimization, setNotifOptimization] = useState(true);
  const [notifWeeklyReport, setNotifWeeklyReport] = useState(false);

  // Mode responsable avec budget (hebdomadaire) et rappels de risque
  const [weeklyBudget, setWeeklyBudget] = useState<number>(() => {
    const saved = localStorage.getItem("loto_lumiere_weekly_budget");
    return saved ? Number(saved) : 50;
  });
  const [weeklySpending, setWeeklySpending] = useState<number>(() => {
    const saved = localStorage.getItem("loto_lumiere_weekly_spending");
    return saved ? Number(saved) : 0;
  });
  const [enableBudgetAlerts, setEnableBudgetAlerts] = useState<boolean>(() => {
    const saved = localStorage.getItem("loto_lumiere_budget_alerts_enabled");
    return saved ? saved === "true" : true;
  });
  const [enableRiskReminders, setEnableRiskReminders] = useState<boolean>(() => {
    const saved = localStorage.getItem("loto_lumiere_risk_reminders_enabled");
    return saved ? saved === "true" : true;
  });

  // Seuil d'alerte de confiance configurable (alertes configurables)
  const [alertConfidenceThreshold, setAlertConfidenceThreshold] = useState<number>(() => {
    const saved = localStorage.getItem("loto_lumiere_alert_confidence_threshold");
    return saved ? Number(saved) : 60;
  });

  // Persist responsible mode changes in localStorage
  useEffect(() => {
    localStorage.setItem("loto_lumiere_weekly_budget", String(weeklyBudget));
    localStorage.setItem("loto_lumiere_weekly_spending", String(weeklySpending));
    localStorage.setItem("loto_lumiere_budget_alerts_enabled", String(enableBudgetAlerts));
    localStorage.setItem("loto_lumiere_risk_reminders_enabled", String(enableRiskReminders));
  }, [weeklyBudget, weeklySpending, enableBudgetAlerts, enableRiskReminders]);

  useEffect(() => {
    localStorage.setItem("loto_lumiere_alert_confidence_threshold", String(alertConfidenceThreshold));
  }, [alertConfidenceThreshold]);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Déconnexion réussie");
      navigate("/");
    } catch (e) {
      toast.error("Erreur lors de la déconnexion");
    }
  }, [navigate]);

  const handleResetOnboarding = useCallback(() => {
    localStorage.removeItem("loto_lumiere_onboarding_completed");
    toast.success("Le guide de bienvenue a été réinitialisé. Rafraîchissez pour le revoir !");
  }, []);

  const handleUpdatePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Mot de passe mis à jour avec succès !");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la mise à jour du mot de passe");
    } finally {
      setIsChangingPassword(false);
    }
  }, [newPassword, confirmPassword]);

  const handleDeleteAccount = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmation !== "SUPPRIMER") {
      toast.error("Veuillez saisir 'SUPPRIMER' pour confirmer");
      return;
    }

    setIsDeletingAccount(true);
    try {
      if (user?.id) {
        // Purge user's personal research, tracking, and feedback in compliance with GDPR
        await supabase.from("user_prediction_feedback").delete().eq("user_id", user.id);
        await supabase.from("tracked_predictions").delete().eq("user_id", user.id);
        
        await supabase.auth.signOut();
        toast.success("Compte et historiques supprimés avec succès (Droit à l'oubli appliqué)");
        navigate("/auth");
      } else {
        toast.error("Identifiant de session introuvable");
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la purge de vos données");
    } finally {
      setIsDeletingAccount(false);
    }
  }, [user, deleteConfirmation, navigate]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="border-b border-border/50 pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Votre Compte & Préférences
        </h2>
        <p className="text-sm text-muted-foreground">
          Gérez votre profil utilisateur, configurez vos alertes de tirage et personnalisez la suite analytique LOTO LUMIÈRE.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Account details and Personalization quick actions */}
        <div className="md:col-span-1 space-y-6">
          {/* Account Profile Card */}
          <Card className="border-border/60 bg-gradient-to-b from-card to-secondary/10">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto shadow-sm">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground truncate max-w-[200px] mx-auto">
                  {user?.email || "Utilisateur Anonyme"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium flex items-center justify-center gap-1">
                  <Activity className="w-3 h-3 text-green-500" />
                  {isAdmin ? "Administrateur Système" : "Analyste Senior"}
                </p>
              </div>

              {isAdmin && (
                <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/15 border-purple-500/20 font-mono text-[10px]">
                  Rôle Admin Actif
                </Badge>
              )}

              <div className="pt-4 border-t border-border/30 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>ID d'Analyse :</span>
                  <span className="font-mono text-[10px] truncate max-w-[100px]">{user?.id?.slice(0, 8) || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Abonnement :</span>
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/20 bg-primary/5 uppercase font-semibold">Premium</Badge>
                </div>
              </div>

              <Button
                variant="destructive"
                className="w-full gap-2 mt-4 rounded-xl shadow-sm"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </Button>
            </CardContent>
          </Card>

          {/* Quick Settings Card */}
          <Card className="border-border/60 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Aide & Apparence
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="theme-account" className="text-xs font-medium text-muted-foreground cursor-pointer">Thème d'interface</Label>
                <ThemeToggle />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/20">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Tutoriel</Label>
                  <p className="text-[10px] text-muted-foreground">Réinitialiser l'Onboarding</p>
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleResetOnboarding}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Réinitialiser l'onboarding"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Columns: Notifications, Password changes */}
        <div className="md:col-span-2 space-y-6">
          {/* Notifications Card */}
          <Card className="border-border/60 bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                Alertes & Notifications
              </CardTitle>
              <CardDescription>
                Configurez la réception de vos rapports statistiques et de vos alertes de tirage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl border border-border/20">
                <div className="space-y-1">
                  <Label htmlFor="draw-alerts" className="text-sm font-bold cursor-pointer">T0 de Tirage Imminent</Label>
                  <p className="text-xs text-muted-foreground">Notifications push et haptiques 15min avant un tirage.</p>
                </div>
                <Switch 
                  id="draw-alerts" 
                  checked={notifDrawAlerts} 
                  onCheckedChange={setNotifDrawAlerts}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl border border-border/20">
                <div className="space-y-1">
                  <Label htmlFor="opt-alerts" className="text-sm font-bold cursor-pointer font-sans">Optimisation d'Ensemble</Label>
                  <p className="text-xs text-muted-foreground">Alerte lors de l'exécution automatique d'une orchestration adaptative.</p>
                </div>
                <Switch 
                  id="opt-alerts" 
                  checked={notifOptimization} 
                  onCheckedChange={setNotifOptimization}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl border border-border/20">
                <div className="space-y-1">
                  <Label htmlFor="weekly-report" className="text-sm font-bold cursor-pointer">Synthèse Hebdomadaire</Label>
                  <p className="text-xs text-muted-foreground">Rapport d'efficacité analytique (Z-Scores, écarts) tous les dimanches.</p>
                </div>
                <Switch 
                  id="weekly-report" 
                  checked={notifWeeklyReport} 
                  onCheckedChange={setNotifWeeklyReport}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {/* Configurable Alert Confidence Threshold */}
              <div className="pt-4 border-t border-border/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Seuil d'Alerte de Confiance</Label>
                    <p className="text-xs text-muted-foreground">Ne m'alerter que si la confiance d'alignement est supérieure à {alertConfidenceThreshold}%.</p>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs text-primary border-primary/20 bg-primary/5">{alertConfidenceThreshold}%</Badge>
                </div>
                <input 
                  type="range" 
                  min="30" 
                  max="90" 
                  step="5"
                  value={alertConfidenceThreshold} 
                  onChange={(e) => setAlertConfidenceThreshold(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>

          {/* Responsible Gaming Card */}
          <Card className="border-border/60 bg-card overflow-hidden">
            <CardHeader className="border-b border-border/20 bg-emerald-500/5">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-emerald-500">
                <Heart className="w-5 h-5 animate-pulse-subtle" />
                Mode Jeu Responsable & Budget
              </CardTitle>
              <CardDescription>
                Fixez vos limites de jeu hebdomadaires et suivez votre indice de risque financier.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Spending vs Budget configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weekly-budget-input" className="text-xs font-bold uppercase text-muted-foreground">Budget hebdomadaire (€)</Label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="weekly-budget-input"
                      type="number"
                      min="1"
                      value={weeklyBudget}
                      onChange={(e) => setWeeklyBudget(Math.max(1, Number(e.target.value)))}
                      className="pl-9 bg-secondary/15 border-border/30 rounded-xl h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weekly-spending-input" className="text-xs font-bold uppercase text-muted-foreground">Dépenses réelles cette semaine (€)</Label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="weekly-spending-input"
                      type="number"
                      min="0"
                      value={weeklySpending}
                      onChange={(e) => setWeeklySpending(Math.max(0, Number(e.target.value)))}
                      className="pl-9 bg-secondary/15 border-border/30 rounded-xl h-10"
                    />
                  </div>
                </div>
              </div>

              {/* Progress Bar of Budget */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-muted-foreground">Consommation du budget hebdomadaire</span>
                  <span className={
                    weeklySpending >= weeklyBudget ? "text-destructive font-bold" :
                    weeklySpending >= weeklyBudget * 0.7 ? "text-amber-500 font-semibold" : "text-emerald-500 font-semibold"
                  }>
                    {weeklySpending} € / {weeklyBudget} € ({Math.round((weeklySpending / weeklyBudget) * 100)}%)
                  </span>
                </div>
                <Progress 
                  value={Math.min(100, (weeklySpending / weeklyBudget) * 100)} 
                  className={
                    weeklySpending >= weeklyBudget ? "[&>div]:bg-red-500" :
                    weeklySpending >= weeklyBudget * 0.7 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
                  }
                />
              </div>

              {/* Dynamic Warning Messages */}
              {weeklySpending >= weeklyBudget && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-xs text-red-600 dark:text-red-400">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold uppercase tracking-tight">ALERTE : Budget hebdomadaire dépassé !</p>
                    <p className="mt-0.5 leading-relaxed text-red-600/85 dark:text-red-400/80">
                      Vous avez dépassé votre limite de dépenses de {weeklySpending - weeklyBudget} €. Nous vous recommandons de cesser tout jeu pour le reste de la semaine et de ne pas essayer de vous refaire.
                    </p>
                  </div>
                </div>
              )}

              {weeklySpending < weeklyBudget && weeklySpending >= weeklyBudget * 0.7 && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-xs text-amber-600 dark:text-amber-400">
                  <Info className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold uppercase tracking-tight">ATTENTION : Seuil de budget critique proche</p>
                    <p className="mt-0.5 leading-relaxed text-amber-600/85 dark:text-amber-400/80">
                      Vous avez utilisé plus de 70% de votre budget de jeu hebdomadaire. Jouez avec parcimonie ou faites une pause.
                    </p>
                  </div>
                </div>
              )}

              {/* Switches for responsible gaming options */}
              <div className="space-y-3.5 border-t border-border/20 pt-4">
                <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-xl border border-border/15">
                  <div className="space-y-0.5">
                    <Label htmlFor="budget-alerts-opt" className="text-sm font-bold cursor-pointer">Alerte de dépassement</Label>
                    <p className="text-xs text-muted-foreground">M'avertir activement lors de la génération si mon budget est dépassé.</p>
                  </div>
                  <Switch 
                    id="budget-alerts-opt" 
                    checked={enableBudgetAlerts} 
                    onCheckedChange={setEnableBudgetAlerts}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-xl border border-border/15">
                  <div className="space-y-0.5">
                    <Label htmlFor="risk-reminders-opt" className="text-sm font-bold cursor-pointer">Rappels de risque et de hasard</Label>
                    <p className="text-xs text-muted-foreground">Afficher des messages de rappel légaux et mathématiques sur les écrans.</p>
                  </div>
                  <Switch 
                    id="risk-reminders-opt" 
                    checked={enableRiskReminders} 
                    onCheckedChange={setEnableRiskReminders}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
              </div>

              {/* Risk Index badge indicator */}
              <div className="p-3 bg-secondary/20 rounded-xl border border-border/30 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">NIVEAU DE RISQUE DE JEU :</span>
                <Badge className={
                  weeklySpending >= weeklyBudget ? "bg-red-500/20 text-red-500 border-red-500/30 font-mono" :
                  weeklySpending >= weeklyBudget * 0.7 ? "bg-amber-500/20 text-amber-500 border-amber-500/30 font-mono" :
                  "bg-emerald-500/20 text-emerald-500 border-emerald-500/30 font-mono"
                }>
                  {weeklySpending >= weeklyBudget ? "CRITIQUE (BUDGET DÉPASSÉ)" :
                   weeklySpending >= weeklyBudget * 0.7 ? "ATTENTION" : "SAIN"}
                </Badge>
              </div>

              {/* Official Helplines and Legal Block */}
              <div className="p-4 bg-[#211516] border border-red-900/30 rounded-xl space-y-2 text-[11px] text-red-400">
                <p className="font-extrabold uppercase tracking-wide flex items-center gap-1.5 text-red-500">
                  🔞 PRÉVENTION & AIDE CONTRE LA DÉPENDANCE
                </p>
                <p className="leading-relaxed text-red-300/80">
                  Le loto et les jeux de hasard doivent rester un divertissement. La dépendance au jeu s'installe souvent de manière insidieuse. Si vous éprouvez des difficultés ou que vous souhaitez en parler, des conseillers professionnels sont à votre écoute de manière anonyme et gratuite.
                </p>
                <div className="pt-2 border-t border-red-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-red-400/90 font-semibold font-mono">
                  <span>S.O.S. JOUEURS : 09 74 75 13 13</span>
                  <a href="https://www.joueurs-info-service.fr/" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-300">
                    joueurs-info-service.fr
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card className="border-border/60 bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Sécurité du Compte
              </CardTitle>
              <CardDescription>
                Mettez à jour le mot de passe de votre profil de connexion.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nouveau mot de passe</Label>
                  <Input 
                    id="new-password" 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    className="bg-secondary/20 border-border/40 focus:border-primary rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
                  <Input 
                    id="confirm-password" 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Saisir à nouveau"
                    className="bg-secondary/20 border-border/40 focus:border-primary rounded-xl"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isChangingPassword}
                  className="rounded-xl shadow-sm gap-2"
                >
                  {isChangingPassword ? "Mise à jour..." : "Enregistrer le mot de passe"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Supprimer le compte Card */}
          <Card className="border-red-500/30 bg-red-500/5">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-red-500">
                <Trash2 className="w-5 h-5" />
                Suppression du Compte & RGPD
              </CardTitle>
              <CardDescription className="text-red-600/80 dark:text-red-400/80">
                Purgez de manière définitive et irréversible l'ensemble de vos données de recherche et de profil.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <p className="text-xs text-muted-foreground leading-normal">
                  Conformément au Règlement Général sur la Protection des Données (RGPD - Droit à l'oubli), cette action supprimera instantanément vos préférences d'alertes, vos historiques de grilles, vos commentaires de tirages et fermera votre accès. Aucun retour en arrière n'est possible.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="delete-confirm" className="text-xs font-bold text-red-600 dark:text-red-400">Pour confirmer, saisissez "SUPPRIMER" ci-dessous :</Label>
                  <Input 
                    id="delete-confirm" 
                    type="text" 
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="SUPPRIMER"
                    className="bg-red-500/5 border-red-500/20 focus:border-red-500 rounded-xl font-mono text-sm uppercase"
                  />
                </div>

                <Button 
                  type="submit" 
                  variant="destructive"
                  disabled={isDeletingAccount || deleteConfirmation !== "SUPPRIMER"}
                  className="rounded-xl shadow-sm gap-2 w-full sm:w-auto animate-none"
                >
                  {isDeletingAccount ? "Purge des données..." : "Supprimer définitivement mes données"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
