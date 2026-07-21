import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { drawResultSchema, validateData, loginSchema } from "@/lib/validations";
import { sanitizeNumbers, sanitizeEmail } from "@/lib/sanitize";
import { useRefreshResults } from "@/hooks/useDrawResults";
import { DRAW_SCHEDULE } from "@/types/lottery";

export const useAdmin = () => {
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

  // Interface view controls
  const [showStats, setShowStats] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("admin-show-stats");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [showWarningAlert, setShowWarningAlert] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("admin-show-warning-alert");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const handleToggleStats = () => {
    setShowStats((prev) => {
      const newVal = !prev;
      localStorage.setItem("admin-show-stats", JSON.stringify(newVal));
      return newVal;
    });
  };

  const handleToggleWarningAlert = () => {
    setShowWarningAlert((prev) => {
      const newVal = !prev;
      localStorage.setItem("admin-show-warning-alert", JSON.stringify(newVal));
      return newVal;
    });
  };

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

  const [exportDataset, setExportDataset] = useState<Record<string, unknown>[]>([]);
  const [isPreparingExport, setIsPreparingExport] = useState(false);

  useEffect(() => {
    const fetchExportDataset = async () => {
      setIsPreparingExport(true);
      try {
        let query = supabase.from("draw_results").select("*").order("draw_date", { ascending: false });
        if (exportDrawName !== "all") {
          query = query.eq("draw_name", exportDrawName);
        }
        const { data, error } = await query;
        if (error) throw error;
        setExportDataset(data || []);
      } catch (err) {
        console.error("Error loading export dataset:", err);
      } finally {
        setIsPreparingExport(false);
      }
    };

    if (user && isAdmin) {
      fetchExportDataset();
    }
  }, [exportDrawName, user, isAdmin]);

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

      const { error } = await supabase.from("draw_results").insert(insertData as any);

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

      // Dedupliquer les données par rapport aux clés uniques
      const uniqueDataMap = new Map();
      data.forEach((r: Record<string, unknown>) => {
        if (r.draw_name && r.draw_date) {
          const key = `${r.draw_name}_${r.draw_date}`;
          uniqueDataMap.set(key, r);
        }
      });
      const uniqueData = Array.from(uniqueDataMap.values());

      // Insérer les données avec upsert pour éviter les plantages sur doublons
      const { error } = await supabase.from("draw_results").upsert(uniqueData, { onConflict: "draw_name,draw_date" });
      if (error) throw error;

      toast({
        title: "✓ Import réussi",
        description: `${data.length} résultat(s) importé(s) ou mis à jour`,
      });
    } catch (error: unknown) {
      console.error("JSON import error:", error);
      const err = error as Error;
      const errorMessage = err?.message || (error && typeof error === "object" ? JSON.stringify(error) : String(error));
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

  return {
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
  };
};
