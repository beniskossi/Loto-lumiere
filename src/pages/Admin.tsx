import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trash2, Download, Upload, RefreshCw, LogOut, LogIn, Database, TrendingUp, AlertCircle, Settings, Activity, Gauge } from "lucide-react";
import { drawResultSchema, validateData, loginSchema } from "@/lib/validations";
import { sanitizeNumbers, sanitizeString, sanitizeEmail } from "@/lib/sanitize";
import { useRefreshResults } from "@/hooks/useDrawResults";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DRAW_SCHEDULE } from "@/types/lottery";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Footer } from "@/components/Footer";
const AdminDashboardStats = lazy(() => import("@/components/AdminDashboardStats").then(m => ({ default: m.AdminDashboardStats })));

// Lazy-load heavy admin panels — only loaded when their tab is opened
const DrawResultsManager = lazy(() => import("@/components/DrawResultsManager").then(m => ({ default: m.DrawResultsManager })));
const AlgorithmManagement = lazy(() => import("@/components/AlgorithmManagement").then(m => ({ default: m.AlgorithmManagement })));
const DrawResultsImporter = lazy(() => import("@/components/DrawResultsImporter").then(m => ({ default: m.DrawResultsImporter })));
const AlgorithmPerformanceComparison = lazy(() => import("@/components/AlgorithmPerformanceComparison").then(m => ({ default: m.AlgorithmPerformanceComparison })));
const AlgorithmEvaluationPanel = lazy(() => import("@/components/AlgorithmEvaluationPanel").then(m => ({ default: m.AlgorithmEvaluationPanel })));
const DiagnosticPanel = lazy(() => import("@/components/DiagnosticPanel").then(m => ({ default: m.DiagnosticPanel })));
const AdaptiveOrchestrationPanel = lazy(() => import("@/components/AdaptiveOrchestrationPanel").then(m => ({ default: m.AdaptiveOrchestrationPanel })));
const PredictionConfigPanel = lazy(() => import("@/components/PredictionConfigPanel").then(m => ({ default: m.PredictionConfigPanel })));
const ChronologicalTrainingPanel = lazy(() => import("@/components/ChronologicalTrainingPanel").then(m => ({ default: m.ChronologicalTrainingPanel })));

const PanelFallback = () => (
  <div className="space-y-3">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-32 w-full rounded-xl" />
    <Skeleton className="h-32 w-full rounded-xl" />
  </div>
);

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const refreshResults = useRefreshResults();
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole(user?.id);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formulaire de connexion
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Formulaire d'ajout manuel
  const [drawName, setDrawName] = useState("");
  const [drawDate, setDrawDate] = useState("");
  const [numbers, setNumbers] = useState(["", "", "", "", ""]);
  const [machineNumbers, setMachineNumbers] = useState(["", "", "", "", ""]);
  const [showMachineNumbers, setShowMachineNumbers] = useState(false);

  // Active / Selected draw name for the whole Données tab
  const [activeDrawName, setActiveDrawName] = useState<string>("all");

  // Export
  const [exportDrawName, setExportDrawName] = useState("all");

  // Statistiques
  const [stats, setStats] = useState({
    totalDraws: 0,
    lastDrawDate: "",
    totalNumbers: 0,
  });

  // Récupérer tous les tirages pour le select
  const allDraws = Object.values(DRAW_SCHEDULE).flat();

  useEffect(() => {
    if (activeDrawName !== "all") {
      setDrawName(activeDrawName);
    } else {
      setDrawName("");
    }
  }, [activeDrawName]);

  useEffect(() => {
    if (user && isAdmin) {
      loadStats();
    }
  }, [user, isAdmin]);

  const loadStats = async () => {
    try {
      const { count, data: draws } = await supabase
        .from("draw_results")
        .select("id, draw_date", { count: 'exact' })
        .order("draw_date", { ascending: false })
        .limit(1);

      if (draws) {
        setStats({
          totalDraws: count || 0,
          lastDrawDate: draws[0]?.draw_date || "N/A",
          totalNumbers: (count || 0) * 5,
        });
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleNumberChange = (index: number, value: string) => {
    const newNumbers = [...numbers];
    newNumbers[index] = value;
    setNumbers(newNumbers);
  };

  const handleMachineNumberChange = (index: number, value: string) => {
    const newMachineNumbers = [...machineNumbers];
    newMachineNumbers[index] = value;
    setMachineNumbers(newMachineNumbers);
  };

  const handleAddResult = async () => {
    const sanitizedWinningNumbers = sanitizeNumbers(numbers);
    const sanitizedMachineNumbers = showMachineNumbers ? sanitizeNumbers(machineNumbers) : null;

    const validation = validateData(drawResultSchema, {
      draw_name: drawName,
      draw_date: drawDate,
      winning_numbers: sanitizedWinningNumbers,
      machine_numbers: sanitizedMachineNumbers,
    });

    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0];
      toast({
        title: "Erreur de validation",
        description: firstError || "Données invalides",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const draw = allDraws.find(d => d.name === drawName);
      const insertData: Record<string, unknown> = {
        draw_name: validation.data.draw_name,
        draw_day: draw?.day || "",
        draw_time: draw?.time || "",
        draw_date: validation.data.draw_date,
        winning_numbers: validation.data.winning_numbers,
      };

      if (validation.data.machine_numbers && validation.data.machine_numbers.length === 5) {
        insertData.machine_numbers = validation.data.machine_numbers;
      }

      const { error } = await supabase.from("draw_results").insert(insertData);

      if (error) throw error;

      toast({
        title: "✓ Résultat ajouté",
        description: "Le tirage a été enregistré avec succès",
      });

      // Reset form
      setDrawName("");
      setDrawDate("");
      setNumbers(["", "", "", "", ""]);
      setMachineNumbers(["", "", "", "", ""]);
      setShowMachineNumbers(false);
      
      // Reload stats
      loadStats();
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'ajouter le résultat",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScrapeResults = async () => {
    setIsLoading(true);
    try {
      await refreshResults();
      toast({
        title: "✓ Scraping terminé",
        description: "Les résultats ont été mis à jour",
      });
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec du scraping",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      let query = supabase.from("draw_results").select("*").order("draw_date", { ascending: false });
      
      if (exportDrawName !== "all") {
        query = query.eq("draw_name", exportDrawName);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = exportDrawName === "all" 
        ? `loto-lumiere-export-complet-${new Date().toISOString().split("T")[0]}.json`
        : `loto-lumiere-export-${exportDrawName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split("T")[0]}.json`;
      link.download = fileName;
      link.click();

      toast({
        title: "✓ Export réussi",
        description: `${data?.length || 0} résultats exportés`,
      });
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec de l'export",
        variant: "destructive",
      });
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        throw new Error("Format JSON invalide");
      }

      // Insérer les données avec upsert pour éviter les plantages sur doublons
      const { error } = await supabase.from("draw_results").upsert(data, { onConflict: "draw_name,draw_date" });
      if (error) throw error;

      toast({
        title: "✓ Import réussi",
        description: `${data.length} résultat(s) importé(s) ou mis à jour`,
      });
    } catch (error: any) {
      console.error("JSON import error:", error);
      const errorMessage = error?.message || error?.details || (error && typeof error === "object" ? JSON.stringify(error) : String(error));
      toast({
        title: "Erreur",
        description: errorMessage || "Échec de l'import",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteOldResults = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer les résultats de plus de 6 mois ?")) {
      return;
    }

    setIsLoading(true);
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const dateStr = sixMonthsAgo.toISOString().split("T")[0];

      const { error } = await supabase
        .from("draw_results")
        .delete()
        .lt("draw_date", dateStr);

      if (error) throw error;

      toast({
        title: "✓ Nettoyage effectué",
        description: "Les anciens résultats ont été supprimés",
      });
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec de la suppression",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const sanitizedEmail = sanitizeEmail(email);
    const validation = validateData(loginSchema, {
      email: sanitizedEmail,
      password: password,
    });

    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0];
      toast({
        title: "Erreur de validation",
        description: firstError || "Données invalides",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(validation.data.email, validation.data.password);
      if (error) throw error;
      
      toast({
        title: "✓ Connexion réussie",
        description: "Bienvenue dans l'interface d'administration",
      });
    } catch (error: unknown) {
      toast({
        title: "Erreur de connexion",
        description: error instanceof Error ? error.message : "Email ou mot de passe incorrect",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt",
      });
      navigate("/");
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  // Vérification stricte des permissions admin
  const hasAccess = user && isAdmin;
  
  // Check if user has admin role
  if (user && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-primary text-white py-8 px-4 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/20 mb-4"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
            <h1 className="text-4xl font-bold tracking-tight">Accès Refusé</h1>
            <p className="text-white/80 mt-2 font-medium">Vous n'avez pas les permissions nécessaires</p>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-16">
          <Card className="bg-card border-border/50 shadow-glow">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-destructive/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Accès Administrateur Requis</CardTitle>
              <CardDescription className="text-base mt-2">
                Cette page est réservée aux administrateurs. Contactez un administrateur si vous pensez que c'est une erreur.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Button
                onClick={() => navigate("/")}
                className="w-full gap-2"
                size="lg"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à l'accueil
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-primary text-white py-12 px-4 shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10 pointer-events-none" />
          <div className="max-w-7xl mx-auto relative z-10">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/20 mb-6 -ml-2 transition-colors"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
            <h1 className="text-4xl font-bold tracking-tight">Administration</h1>
            <p className="text-white/80 mt-3 text-lg max-w-xl">
              Connectez-vous pour accéder à l'interface de gestion et de configuration du système Loto Lumière.
            </p>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-16 relative z-20 -mt-10">
          <Card className="bg-card border-border/50 shadow-2xl backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <LogIn className="w-5 h-5 text-primary" />
                </div>
                Connexion
              </CardTitle>
              <CardDescription className="text-base">
                Entrez vos identifiants administrateur
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Adresse Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@lotolumiere.ci"
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-11"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full gap-2 h-11 text-base font-medium mt-2 transition-all hover:shadow-md"
                >
                  <LogIn className="w-4 h-4" />
                  {isLoading ? "Connexion en cours..." : "Se connecter"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border shadow-sm py-8 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-background pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground mb-4 -ml-2 transition-colors"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à l'accueil
              </Button>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
                <Settings className="w-8 h-8 text-primary" />
                Administration Centrale
              </h1>
              <p className="text-muted-foreground mt-2 text-base md:text-lg max-w-2xl">
                Supervision du système, gestion des tirages et réglage des algorithmes de prédiction.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="gap-2 shrink-0 border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-8 space-y-8">

        {/* Statistics Dashboard with Real Data */}
        <div className="animate-fade-in">
          <Suspense fallback={<PanelFallback />}>
            <AdminDashboardStats />
          </Suspense>
        </div>

        <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 animate-slide-up">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="ml-2 font-medium">
            Interface d'administration privilégiée. Toute modification affecte directement la base de données et les résultats en temps réel.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="diagnostic" className="w-full flex flex-col xl:flex-row gap-8">
          <TabsList className="flex flex-row xl:flex-col w-full xl:w-72 h-auto bg-card/50 p-2 rounded-xl border border-border/50 shadow-sm gap-2 shrink-0 overflow-x-auto no-scrollbar justify-start backdrop-blur-sm">
            <TabsTrigger value="diagnostic" className="gap-3 justify-start py-3 px-4 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all whitespace-nowrap xl:whitespace-normal group">
              <div className="p-2 rounded-md bg-blue-500/10 text-blue-500 group-data-[state=active]:bg-blue-500 group-data-[state=active]:text-white transition-colors"><Activity className="w-4 h-4" /></div>
              <div className="flex flex-col items-start">
                <span className="font-semibold">Diagnostic</span>
                <span className="text-xs font-normal opacity-70 hidden xl:block">État de santé et journaux</span>
              </div>
            </TabsTrigger>
            
            <TabsTrigger value="results" className="gap-3 justify-start py-3 px-4 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all whitespace-nowrap xl:whitespace-normal group">
              <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-500 group-data-[state=active]:bg-emerald-500 group-data-[state=active]:text-white transition-colors"><Database className="w-4 h-4" /></div>
              <div className="flex flex-col items-start">
                <span className="font-semibold">Données</span>
                <span className="text-xs font-normal opacity-70 hidden xl:block">Gestion des tirages</span>
              </div>
            </TabsTrigger>
            
            <TabsTrigger value="performance" className="gap-3 justify-start py-3 px-4 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all whitespace-nowrap xl:whitespace-normal group">
              <div className="p-2 rounded-md bg-purple-500/10 text-purple-500 group-data-[state=active]:bg-purple-500 group-data-[state=active]:text-white transition-colors"><TrendingUp className="w-4 h-4" /></div>
              <div className="flex flex-col items-start">
                <span className="font-semibold">Performance</span>
                <span className="text-xs font-normal opacity-70 hidden xl:block">Évaluation des modèles</span>
              </div>
            </TabsTrigger>
            
            <TabsTrigger value="training" className="gap-3 justify-start py-3 px-4 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all whitespace-nowrap xl:whitespace-normal group">
              <div className="p-2 rounded-md bg-orange-500/10 text-orange-500 group-data-[state=active]:bg-orange-500 group-data-[state=active]:text-white transition-colors"><Activity className="w-4 h-4" /></div>
              <div className="flex flex-col items-start">
                <span className="font-semibold">Entraînement</span>
                <span className="text-xs font-normal opacity-70 hidden xl:block">Cycles chronologiques</span>
              </div>
            </TabsTrigger>
            
            <TabsTrigger value="config" className="gap-3 justify-start py-3 px-4 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all whitespace-nowrap xl:whitespace-normal group">
              <div className="p-2 rounded-md bg-rose-500/10 text-rose-500 group-data-[state=active]:bg-rose-500 group-data-[state=active]:text-white transition-colors"><Settings className="w-4 h-4" /></div>
              <div className="flex flex-col items-start">
                <span className="font-semibold">Configuration</span>
                <span className="text-xs font-normal opacity-70 hidden xl:block">Paramètres du moteur</span>
              </div>
            </TabsTrigger>
            
            <TabsTrigger value="orchestration" className="gap-3 justify-start py-3 px-4 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all whitespace-nowrap xl:whitespace-normal group">
              <div className="p-2 rounded-md bg-cyan-500/10 text-cyan-500 group-data-[state=active]:bg-cyan-500 group-data-[state=active]:text-white transition-colors"><Gauge className="w-4 h-4" /></div>
              <div className="flex flex-col items-start">
                <span className="font-semibold">Orchestration</span>
                <span className="text-xs font-normal opacity-70 hidden xl:block">Ajustement adaptatif</span>
              </div>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 w-full min-w-0">
            <TabsContent value="diagnostic" className="space-y-6 animate-fade-in mt-0">
              <Suspense fallback={<PanelFallback />}>
                <DiagnosticPanel />
              </Suspense>
            </TabsContent>

            <TabsContent value="results" className="space-y-6 mt-0 animate-fade-in">
              {/* Card de Sélection du Tirage de Gestion Actif */}
              <Card className="bg-card border-border/50 shadow-sm animate-fade-in">
                <CardContent className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                      <Database className="w-5 h-5 text-primary" />
                      Sélection du Tirage de Gestion
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Déterminez le tirage actif. Toutes les modifications, ajouts manuels, filtrages et importations de fichiers (CSV/JSON) seront attribués à ce tirage.
                    </p>
                  </div>
                  <div className="w-full md:w-auto shrink-0 flex items-center gap-3">
                    <Label htmlFor="active-draw-select" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                      Tirage Actif :
                    </Label>
                    <Select value={activeDrawName} onValueChange={setActiveDrawName}>
                      <SelectTrigger id="active-draw-select" className="w-full md:w-[260px] h-11 border-primary/20 bg-background/50 font-semibold focus:ring-primary">
                        <SelectValue placeholder="Tous les tirages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="font-semibold text-primary">Tous les tirages (Aucun filtre forcé)</SelectItem>
                        {allDraws.map((draw) => (
                          <SelectItem key={draw.name} value={draw.name}>
                            {draw.name} ({draw.day} {draw.time})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <div className="grid xl:grid-cols-2 gap-8">
                <div className="space-y-8">
                  <Card className="bg-card border-border/50 shadow-sm animate-slide-up hover:shadow-glow transition-all duration-300">
                    <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Database className="w-5 h-5 text-primary" />
                      </div>
                      Ajouter un Résultat
                    </CardTitle>
                    <CardDescription className="text-base">
                      Entrez les informations du tirage manuellement
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="draw-name" className="text-sm font-medium">Tirage</Label>
                      <Select value={drawName} onValueChange={setDrawName}>
                        <SelectTrigger id="draw-name" className="h-11">
                          <SelectValue placeholder="Sélectionnez un tirage" />
                        </SelectTrigger>
                        <SelectContent>
                          {allDraws.map((draw) => (
                            <SelectItem key={draw.name} value={draw.name}>
                              {draw.name} - {draw.day} {draw.time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="draw-date" className="text-sm font-medium">Date</Label>
                      <Input
                        id="draw-date"
                        type="date"
                        value={drawDate}
                        onChange={(e) => setDrawDate(e.target.value)}
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Numéros Gagnants (5 numéros entre 1-90)</Label>
                      <div className="grid grid-cols-5 gap-3">
                        {numbers.map((num, idx) => (
                          <Input
                            key={idx}
                            type="number"
                            min="1"
                            max="90"
                            value={num}
                            onChange={(e) => handleNumberChange(idx, e.target.value)}
                            placeholder={`N°${idx + 1}`}
                            className="h-12 text-center text-lg font-mono font-semibold"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-muted-foreground">Numéros Machine (facultatif)</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowMachineNumbers(!showMachineNumbers)}
                          className="h-auto py-1 px-3 text-xs rounded-full border border-border/50 hover:bg-muted"
                        >
                          {showMachineNumbers ? "Masquer" : "Afficher"}
                        </Button>
                      </div>
                      {showMachineNumbers && (
                        <div className="grid grid-cols-5 gap-3 animate-fade-in">
                          {machineNumbers.map((num, idx) => (
                            <Input
                              key={idx}
                              type="number"
                              min="1"
                              max="90"
                              value={num}
                              onChange={(e) => handleMachineNumberChange(idx, e.target.value)}
                              placeholder={`M°${idx + 1}`}
                              className="h-12 text-center text-lg font-mono text-muted-foreground"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleAddResult}
                      disabled={isLoading}
                      className="w-full h-11 text-base font-medium mt-4"
                    >
                      Ajouter le Résultat
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border/50 shadow-sm animate-slide-up hover:shadow-glow transition-all duration-300">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <RefreshCw className="w-5 h-5 text-primary" />
                      </div>
                      Actions Rapides
                    </CardTitle>
                    <CardDescription className="text-base">
                      Opérations de maintenance et gestion des données
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={handleScrapeResults}
                      disabled={isLoading}
                      className="w-full gap-2 group h-11"
                      variant="default"
                    >
                      <RefreshCw className={`w-4 h-4 group-hover:rotate-180 transition-transform duration-500 ${isLoading ? 'animate-spin' : ''}`} />
                      Scraper les Résultats Récent
                    </Button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Tirage à exporter</Label>
                        <Select value={exportDrawName} onValueChange={setExportDrawName}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Tous les tirages" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les tirages</SelectItem>
                            {allDraws.map((draw) => (
                              <SelectItem key={draw.name} value={draw.name}>
                                {draw.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={handleExportData}
                          className="w-full gap-2 h-11"
                          variant="secondary"
                        >
                          <Download className="w-4 h-4" />
                          Exporter
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Importer des résultats</Label>
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleImportData}
                            className="hidden"
                            id="import-file"
                          />
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                            className="w-full gap-2 h-11"
                            variant="outline"
                          >
                            <Upload className="w-4 h-4" />
                            Importer
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border/50 mt-4">
                      <Button
                        onClick={handleDeleteOldResults}
                        disabled={isLoading}
                        className="w-full gap-2 h-11 bg-destructive/90 hover:bg-destructive"
                        variant="destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        Purger les données (&gt; 6 mois)
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2 text-center font-medium">
                        ⚠️ Cette action supprimera définitivement les anciens tirages.
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Import facilité */}
                <Suspense fallback={<PanelFallback />}>
                  <DrawResultsImporter onImportComplete={loadStats} activeDrawName={activeDrawName} />
                </Suspense>
              </div>

              {/* Gestion des résultats - Takes up right column or full width if not enough space */}
              <div className="h-full">
                <Suspense fallback={<PanelFallback />}>
                  <DrawResultsManager activeDrawName={activeDrawName} onActiveDrawNameChange={setActiveDrawName} />
                </Suspense>
              </div>
            </div>
          </TabsContent>

            <TabsContent value="performance" className="space-y-6 mt-0">
              <Suspense fallback={<PanelFallback />}>
                <AlgorithmPerformanceComparison />
                <AlgorithmEvaluationPanel />
              </Suspense>
            </TabsContent>

            <TabsContent value="training" className="space-y-6 mt-0">
              <Suspense fallback={<PanelFallback />}>
                <ChronologicalTrainingPanel />
              </Suspense>
            </TabsContent>

            <TabsContent value="config" className="space-y-6 mt-0">
              <Suspense fallback={<PanelFallback />}>
                <PredictionConfigPanel />
                <AlgorithmManagement />
              </Suspense>
            </TabsContent>

            <TabsContent value="orchestration" className="space-y-6 mt-0">
              <Suspense fallback={<PanelFallback />}>
                <AdaptiveOrchestrationPanel />
              </Suspense>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default Admin;
