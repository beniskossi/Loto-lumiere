import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trash2, Download, Upload, RefreshCw, LogOut, LogIn, Database, TrendingUp, AlertCircle, Settings, Activity, Gauge, Eye, EyeOff, X } from "lucide-react";
import { drawResultSchema, validateData, loginSchema } from "@/lib/validations";
import { sanitizeNumbers, sanitizeString, sanitizeEmail } from "@/lib/sanitize";
import { useRefreshResults } from "@/hooks/useDrawResults";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DRAW_SCHEDULE } from "@/types/lottery";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DataExporter } from "@/components/DataExporter";
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
const DataQualityDashboard = lazy(() => import("@/components/DataQualityDashboard").then(m => ({ default: m.DataQualityDashboard })));

import { useAdmin } from "@/hooks/useAdmin";

const PanelFallback = () => (
  <div className="space-y-3">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-32 w-full rounded-xl" />
    <Skeleton className="h-32 w-full rounded-xl" />
  </div>
);

const Admin = () => {
  const navigate = useNavigate();
  const {
    user,
    authLoading,
    isAdmin,
    roleLoading,
    isLoading,
    email,
    setEmail,
    password,
    setPassword,
    drawName,
    setDrawName,
    drawDate,
    setDrawDate,
    numbers,
    setNumbers,
    machineNumbers,
    setMachineNumbers,
    showMachineNumbers,
    setShowMachineNumbers,
    activeDrawName,
    setActiveDrawName,
    exportDrawName,
    setExportDrawName,
    showStats,
    handleToggleStats,
    showWarningAlert,
    handleToggleWarningAlert,
    stats,
    exportDataset,
    isPreparingExport,
    fileInputRef,
    allDraws,
    handleNumberChange,
    handleMachineNumberChange,
    handleAddResult,
    handleScrapeResults,
    handleExportData,
    handleImportData,
    handleDeleteOldResults,
    handleLogin,
    handleLogout,
    loadStats,
  } = useAdmin();

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
                className="text-muted-foreground hover:text-foreground mb-4 -ml-2 transition-colors font-medium text-xs uppercase tracking-wider"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à l'accueil
              </Button>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3 font-display">
                <Settings className="w-8 h-8 text-primary" />
                Administration Centrale
              </h1>
              <p className="text-muted-foreground mt-2 text-base md:text-lg max-w-2xl font-sans">
                Supervision du système, gestion des tirages et réglage des algorithmes de prédiction.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleStats}
                className="gap-2 border-border/50 bg-background/40 hover:bg-background/80 text-xs font-semibold font-display h-10 px-4 flex-1 md:flex-none shadow-sm transition-all"
              >
                {showStats ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Masquer les stats</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    <span>Afficher les stats</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="gap-2 border-border/50 bg-background/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-xs font-semibold font-display h-10 px-4 flex-1 md:flex-none shadow-sm transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-8 space-y-8">

        {/* Statistics Dashboard with Real Data */}
        {showStats && (
          <div className="animate-fade-in">
            <Suspense fallback={<PanelFallback />}>
              <AdminDashboardStats />
            </Suspense>
          </div>
        )}

        {showWarningAlert && (
          <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 animate-slide-up flex items-start justify-between p-4 relative pr-12">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <AlertDescription className="font-medium text-sm">
                Interface d'administration privilégiée. Toute modification affecte directement la base de données et les résultats en temps réel.
              </AlertDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleWarningAlert}
              className="absolute right-2 top-2 h-8 w-8 text-amber-600/60 dark:text-amber-400/60 hover:bg-amber-500/10 hover:text-amber-600 rounded-lg shrink-0 transition-colors"
            >
              <X className="w-4 h-4" />
            </Button>
          </Alert>
        )}

        <Tabs defaultValue="diagnostic" className="w-full flex flex-col xl:flex-row gap-8">
          <TabsList className="flex flex-row xl:flex-col w-full xl:w-72 h-auto bg-card/65 p-2 rounded-xl border border-border/50 shadow-md gap-2 shrink-0 overflow-x-auto no-scrollbar justify-start backdrop-blur-md">
            <TabsTrigger value="diagnostic" className="gap-3 justify-start py-3 px-4 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all whitespace-nowrap xl:whitespace-normal group border border-transparent data-[state=active]:border-primary/15">
              <div className="p-2 rounded-md bg-blue-500/10 text-blue-500 group-data-[state=active]:bg-blue-500 group-data-[state=active]:text-white transition-colors"><Activity className="w-4 h-4" /></div>
              <div className="flex flex-col items-start">
                <span className="font-display font-semibold text-sm">Diagnostic</span>
                <span className="text-xs font-sans font-normal opacity-70 hidden xl:block">État de santé et journaux</span>
              </div>
            </TabsTrigger>
            
            <TabsTrigger value="results" className="gap-3 justify-start py-3 px-4 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all whitespace-nowrap xl:whitespace-normal group border border-transparent data-[state=active]:border-primary/15">
              <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-500 group-data-[state=active]:bg-emerald-500 group-data-[state=active]:text-white transition-colors"><Database className="w-4 h-4" /></div>
              <div className="flex flex-col items-start">
                <span className="font-display font-semibold text-sm">Données</span>
                <span className="text-xs font-sans font-normal opacity-70 hidden xl:block">Gestion des tirages</span>
              </div>
            </TabsTrigger>
            
            <TabsTrigger value="ai_engine" className="gap-3 justify-start py-3 px-4 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all whitespace-nowrap xl:whitespace-normal group border border-transparent data-[state=active]:border-primary/15">
              <div className="p-2 rounded-md bg-purple-500/10 text-purple-500 group-data-[state=active]:bg-purple-500 group-data-[state=active]:text-white transition-colors"><TrendingUp className="w-4 h-4" /></div>
              <div className="flex flex-col items-start">
                <span className="font-display font-semibold text-sm">Moteur IA & Algorithmes</span>
                <span className="text-xs font-sans font-normal opacity-70 hidden xl:block">Orchestration, Évaluation & Config</span>
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
              <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
                <DataQualityDashboard />
              </Suspense>
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
                {/* Left Column - Sub-Tabs for adding/importing results */}
                <div className="space-y-6">
                  <Tabs defaultValue="add-manual" className="w-full space-y-4">
                    <TabsList className="grid grid-cols-3 bg-card/65 p-1 rounded-xl border border-border/50 h-12 backdrop-blur-md shadow-sm">
                      <TabsTrigger 
                        value="add-manual" 
                        className="text-xs font-semibold font-display gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all py-2"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Saisie Manuelle</span>
                        <span className="sm:hidden">Saisie</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="import-file" 
                        className="text-xs font-semibold font-display gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-emerald-500 data-[state=active]:shadow-sm transition-all py-2"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Importer</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="quick-actions" 
                        className="text-xs font-semibold font-display gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-amber-500 data-[state=active]:shadow-sm transition-all py-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Actions Système</span>
                        <span className="sm:hidden">Système</span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="add-manual" className="mt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0">
                      <Card className="bg-card border-border/50 shadow-sm animate-slide-up hover:shadow-glow/5 transition-all duration-300">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-lg font-display">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                              <Database className="w-4 h-4 text-primary" />
                            </div>
                            Ajouter un Résultat Manuellement
                          </CardTitle>
                          <CardDescription className="text-sm font-sans">
                            Saisissez les numéros gagnants d'un tirage spécifique pour enrichir la base de données de l'algorithme.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="draw-name" className="text-sm font-medium text-muted-foreground font-display">Tirage de destination</Label>
                            <Select value={drawName} onValueChange={setDrawName}>
                              <SelectTrigger id="draw-name" className="h-11 bg-background/50 border-border/60">
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
                            <Label htmlFor="draw-date" className="text-sm font-medium text-muted-foreground font-display">Date officielle du tirage</Label>
                            <Input
                              id="draw-date"
                              type="date"
                              value={drawDate}
                              onChange={(e) => setDrawDate(e.target.value)}
                              className="h-11 bg-background/50 border-border/60"
                            />
                          </div>

                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-muted-foreground font-display">Numéros Gagnants (5 numéros entre 1 et 90)</Label>
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
                                  className="h-12 text-center text-lg font-mono font-bold bg-background/50 border-border/80 text-foreground focus-visible:border-primary/50"
                                />
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3 pt-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium text-muted-foreground font-display">Numéros Machine (Facultatif - Optionnel)</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowMachineNumbers(!showMachineNumbers)}
                                className="h-7 py-0.5 px-3 text-xs rounded-full border border-border/50 bg-background/30 hover:bg-muted"
                              >
                                {showMachineNumbers ? "Masquer" : "Définir"}
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
                                    className="h-12 text-center text-lg font-mono text-muted-foreground font-bold bg-background/20 border-border/40 focus-visible:border-primary/30"
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          <Button
                            onClick={handleAddResult}
                            disabled={isLoading}
                            className="w-full h-11 text-sm font-semibold font-display mt-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                          >
                            Enregistrer le tirage
                          </Button>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="import-file" className="mt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0">
                      <Suspense fallback={<PanelFallback />}>
                        <DrawResultsImporter onImportComplete={loadStats} activeDrawName={activeDrawName} />
                      </Suspense>
                    </TabsContent>

                    <TabsContent value="quick-actions" className="mt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0">
                      <Card className="bg-card border-border/50 shadow-sm animate-slide-up hover:shadow-glow/5 transition-all duration-300">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-lg font-display">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                              <RefreshCw className="w-4 h-4 text-primary" />
                            </div>
                            Actions Système & Maintenance
                          </CardTitle>
                          <CardDescription className="text-sm font-sans">
                            Scraping, sauvegarde automatique des données, exportation au format standardisé JSON, et purges de sécurité.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Button
                            onClick={handleScrapeResults}
                            disabled={isLoading}
                            className="w-full gap-2 group h-11 text-xs font-semibold font-display shadow-sm"
                            variant="default"
                          >
                            <RefreshCw className={`w-4 h-4 group-hover:rotate-180 transition-transform duration-500 ${isLoading ? 'animate-spin' : ''}`} />
                            Scraper les Résultats Récents
                          </Button>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2 flex flex-col justify-between p-3 rounded-lg border border-border/50 bg-background/30">
                              <div>
                                <Label className="text-xs font-bold text-muted-foreground font-display">Exporter la base de données</Label>
                                <Select value={exportDrawName} onValueChange={setExportDrawName}>
                                  <SelectTrigger className="h-10 mt-1 bg-background/50 text-xs border-border/50">
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
                              </div>
                              {isPreparingExport ? (
                                <Button disabled className="w-full h-10 gap-2 mt-2 text-xs" variant="secondary">
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  Préparation...
                                </Button>
                              ) : (
                                <DataExporter
                                  data={exportDataset}
                                  defaultFileName={exportDrawName === "all" ? "loto-lumiere-export-complet" : `loto-lumiere-export-${exportDrawName.toLowerCase().replace(/\s+/g, '-')}`}
                                  buttonText="Lancer l'exportation"
                                  className="w-full mt-2 h-10 text-xs"
                                  variant="secondary"
                                />
                              )}
                            </div>

                            <div className="space-y-2 p-3 rounded-lg border border-border/50 bg-background/30 flex flex-col justify-between">
                              <div>
                                <Label className="text-xs font-bold text-muted-foreground font-display">Restauration rapide (JSON)</Label>
                                <p className="text-[11px] text-muted-foreground mt-1 font-sans">
                                  Sélectionnez un fichier de sauvegarde pour réimporter vos données de tirage.
                                </p>
                              </div>
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
                                  className="w-full gap-2 h-10 text-xs font-semibold font-display border-border/50 hover:bg-muted"
                                  variant="outline"
                                >
                                  <Upload className="w-3.5 h-3.5 text-emerald-500" />
                                  Sélectionner Fichier
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-border/30 mt-4 bg-destructive/5 rounded-lg p-3 border border-destructive/10">
                            <Label className="text-xs font-bold text-destructive font-display">Zone de Danger</Label>
                            <Button
                              onClick={handleDeleteOldResults}
                              disabled={isLoading}
                              className="w-full gap-2 h-10 mt-2 bg-destructive/90 hover:bg-destructive text-destructive-foreground text-xs font-semibold font-display"
                              variant="destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Purger les tirages de plus de 6 mois
                            </Button>
                            <p className="text-[11px] text-destructive/80 mt-2 text-center font-medium font-sans">
                              ⚠️ Opération irréversible. Toutes les statistiques et cycles d'entraînement associés seront recalculés.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Right Column - Results manager */}
                <div className="h-full">
                  <Suspense fallback={<PanelFallback />}>
                    <DrawResultsManager activeDrawName={activeDrawName} onActiveDrawNameChange={setActiveDrawName} />
                  </Suspense>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai_engine" className="mt-0">
              <Tabs defaultValue="performance" className="w-full">
                <TabsList className="mb-6 bg-card/65 border border-border/50 shadow-sm flex flex-row flex-nowrap overflow-x-auto no-scrollbar justify-start whitespace-nowrap w-full max-w-full">
                  <TabsTrigger value="performance" className="flex-shrink-0">Performance & Évaluation</TabsTrigger>
                  <TabsTrigger value="training" className="flex-shrink-0">Entraînement Chronologique</TabsTrigger>
                  <TabsTrigger value="orchestration" className="flex-shrink-0">Orchestration Adaptative</TabsTrigger>
                  <TabsTrigger value="config" className="flex-shrink-0">Configuration Algorithmique</TabsTrigger>
                </TabsList>
                
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
                
                <TabsContent value="orchestration" className="space-y-6 mt-0">
                  <Suspense fallback={<PanelFallback />}>
                    <AdaptiveOrchestrationPanel />
                  </Suspense>
                </TabsContent>
                
                <TabsContent value="config" className="space-y-6 mt-0">
                  <Suspense fallback={<PanelFallback />}>
                    <PredictionConfigPanel />
                    <AlgorithmManagement />
                  </Suspense>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default Admin;
