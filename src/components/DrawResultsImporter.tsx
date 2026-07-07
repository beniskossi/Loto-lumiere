import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Upload, 
  FileText, 
  Download, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Search, 
  CheckSquare, 
  Square, 
  Copy, 
  Info,
  Layers,
  Database
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { NumberBall } from "@/components/NumberBall";
import { DRAW_SCHEDULE } from "@/types/lottery";

interface ParsedResult {
  id: string;
  draw_name: string;
  draw_date: string;
  winning_numbers: number[];
  machine_numbers?: number[];
  draw_day: string;
  draw_time: string;
  isValid: boolean;
  validationError?: string;
  rawLine: string;
  alreadyExists?: boolean;
}

export const DrawResultsImporter = ({ onImportComplete }: { onImportComplete?: () => void }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [previewResults, setPreviewResults] = useState<ParsedResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<"all" | "importable" | "duplicates" | "errors">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allDraws = Object.values(DRAW_SCHEDULE).flat();

  // 100% Deterministic normalize/search of draw schedule
  const normalizeDrawName = (name: string): string => {
    return name.toLowerCase().replace(/[-_\s]+/g, "");
  };

  const findBestDrawMatch = (input: string) => {
    const normalizedInput = normalizeDrawName(input);
    if (!normalizedInput) return null;

    // Try exact match first
    let match = allDraws.find(d => normalizeDrawName(d.name) === normalizedInput);
    if (match) return match;

    // Try partial match
    match = allDraws.find(d => {
      const normName = normalizeDrawName(d.name);
      return normName.includes(normalizedInput) || normalizedInput.includes(normName);
    });
    if (match) return match;

    // Direct translation alias mapping (no magical random mapping)
    const aliases: Record<string, string> = {
      "monday": "Monday Special",
      "mspecial": "Monday Special",
      "matinale": "La Matinale",
      "tuesday": "Lucky Tuesday",
      "luckyt": "Lucky Tuesday",
      "pheure": "Premiere Heure",
      "premiere": "Premiere Heure",
      "thursday": "Fortune Thursday",
      "fthursday": "Fortune Thursday",
      "bonanza": "Friday Bonanza",
      "fbonanza": "Friday Bonanza",
      "special": "Monday Special"
    };

    for (const [key, val] of Object.entries(aliases)) {
      if (normalizedInput.includes(key)) {
        const aliasMatch = allDraws.find(d => d.name === val);
        if (aliasMatch) return aliasMatch;
      }
    }

    return null;
  };

  // Robust line parser for unstructured spaces/dashes/brackets/commas format
  const parseLine = (line: string): Omit<ParsedResult, "id"> => {
    const trimmed = line.trim();
    let remaining = trimmed;

    // 1. Detect and extract ISO or French Date
    let detectedDate = "";
    const dateIsoRegex = /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/;
    const dateFrRegex = /\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/;

    const matchIso = remaining.match(dateIsoRegex);
    const matchFr = remaining.match(dateFrRegex);

    if (matchIso) {
      const [fullDate, year, month, day] = matchIso;
      detectedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      remaining = remaining.replace(fullDate, " ");
    } else if (matchFr) {
      const [fullDate, day, month, year] = matchFr;
      detectedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      remaining = remaining.replace(fullDate, " ");
    } else {
      return {
        draw_name: "",
        draw_date: "",
        winning_numbers: [],
        draw_day: "",
        draw_time: "",
        isValid: false,
        validationError: "Date manquante ou format incorrect (attendu: AAAA-MM-JJ ou JJ/MM/AAAA)",
        rawLine: line
      };
    }

    // 2. Extract positive integer numbers
    const numberRegex = /\b\d+\b/g;
    const foundNumbers = (remaining.match(numberRegex) || []).map(n => parseInt(n));

    // Strip numbers from line to find remaining words (the Draw Name)
    let textOnly = remaining;
    foundNumbers.forEach(n => {
      textOnly = textOnly.replace(new RegExp(`\\b${n}\\b`, "g"), " ");
    });

    // Clean remaining text to form the draw name candidate (letters and spaces only)
    const cleanedDrawName = textOnly
      .replace(/[^a-zA-Z\s]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const match = findBestDrawMatch(cleanedDrawName);
    if (!match) {
      return {
        draw_name: cleanedDrawName || "Inconnu",
        draw_date: detectedDate,
        winning_numbers: [],
        draw_day: "",
        draw_time: "",
        isValid: false,
        validationError: `Tirage inconnu : "${cleanedDrawName || 'nom introuvable'}"`,
        rawLine: line
      };
    }

    // Validate numbers range (1 - 90)
    const validDrawNumbers = foundNumbers.filter(n => n >= 1 && n <= 90);

    if (validDrawNumbers.length < 5) {
      return {
        draw_name: match.name,
        draw_date: detectedDate,
        winning_numbers: validDrawNumbers,
        draw_day: match.day,
        draw_time: match.time,
        isValid: false,
        validationError: `Numéros insuffisants (trouvé: ${validDrawNumbers.length}, attendu: 5 minimum entre 1-90)`,
        rawLine: line
      };
    }

    const winningNumbers = validDrawNumbers.slice(0, 5);
    const machineNumbers = validDrawNumbers.length >= 10 ? validDrawNumbers.slice(5, 10) : undefined;

    return {
      draw_name: match.name,
      draw_date: detectedDate,
      winning_numbers: winningNumbers,
      machine_numbers: machineNumbers,
      draw_day: match.day,
      draw_time: match.time,
      isValid: true,
      rawLine: line
    };
  };

  const parseJSONContent = (text: string): ParsedResult[] => {
    try {
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const results: ParsedResult[] = [];

      items.forEach((item, idx) => {
        if (typeof item !== "object" || item === null) return;

        // Flexible key matching
        const rawDrawName = item.draw_name || item.drawName || item.draw || "";
        const rawDrawDate = item.draw_date || item.drawDate || item.date || "";
        
        let rawWinning = item.winning_numbers || item.winningNumbers || item.numbers || item.winning || [];
        if (typeof rawWinning === "string") {
          rawWinning = rawWinning.split(/[,\s;]+/).map((n: string) => parseInt(n));
        }
        
        let rawMachine = item.machine_numbers || item.machineNumbers || item.machine || undefined;
        if (typeof rawMachine === "string") {
          rawMachine = rawMachine.split(/[,\s;]+/).map((n: string) => parseInt(n));
        }

        // Standardize date
        const detectedDate = String(rawDrawDate).trim();
        let formattedDate = "";
        const dateIsoRegex = /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/;
        const dateFrRegex = /\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/;

        const matchIso = detectedDate.match(dateIsoRegex);
        const matchFr = detectedDate.match(dateFrRegex);

        if (matchIso) {
          const [_, year, month, day] = matchIso;
          formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        } else if (matchFr) {
          const [_, day, month, year] = matchFr;
          formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }

        const match = findBestDrawMatch(String(rawDrawName));
        const winningNumbers = (Array.isArray(rawWinning) ? rawWinning : [])
          .map(n => typeof n === "number" ? n : parseInt(String(n)))
          .filter(n => !isNaN(n) && n >= 1 && n <= 90);
        
        const machineNumbers = (Array.isArray(rawMachine) ? rawMachine : [])
          .map(n => typeof n === "number" ? n : parseInt(String(n)))
          .filter(n => !isNaN(n) && n >= 1 && n <= 90);

        const errors: string[] = [];
        if (!match) errors.push(`Tirage non reconnu: "${rawDrawName}"`);
        if (!formattedDate) errors.push(`Date absente/invalide: "${rawDrawDate}"`);
        if (winningNumbers.length < 5) errors.push(`Numéros gagnants invalides (attendu: 5, reçu: ${winningNumbers.length})`);

        results.push({
          id: `json-${idx}-${Date.now()}`,
          draw_name: match?.name || String(rawDrawName) || "Inconnu",
          draw_date: formattedDate || detectedDate,
          winning_numbers: winningNumbers.slice(0, 5),
          machine_numbers: machineNumbers.length >= 5 ? machineNumbers.slice(0, 5) : undefined,
          draw_day: match?.day || "",
          draw_time: match?.time || "",
          isValid: errors.length === 0,
          validationError: errors.join(" | "),
          rawLine: JSON.stringify(item)
        });
      });
      return results;
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const parseCsvContent = (text: string): ParsedResult[] => {
    const lines = text.trim().split("\n");
    const results: ParsedResult[] = [];
    
    if (lines.length === 0) return [];
    
    // Skip header if first line resembles column titles
    let startIndex = 0;
    if (lines[0].toLowerCase().includes("tirage") || lines[0].toLowerCase().includes("date") || lines[0].toLowerCase().includes("n1")) {
      startIndex = 1;
    }
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(/[,;\t]/).map(p => p.trim());
      
      if (parts.length < 2) continue;
      
      const inputDrawName = parts[0] || "";
      const drawDate = parts[1] || "";
      
      // Numbers: index 2 to 6
      const numbers = parts.slice(2, 7).map(n => parseInt(n)).filter(n => !isNaN(n));
      
      // Machine numbers: index 7 to 11
      const machineNumbers = parts.length >= 12 
        ? parts.slice(7, 12).map(n => parseInt(n)).filter(n => !isNaN(n))
        : undefined;
        
      const validWinning = numbers.filter(n => n >= 1 && n <= 90);
      const validMachine = machineNumbers ? machineNumbers.filter(n => n >= 1 && n <= 90) : undefined;
      
      let formattedDate = "";
      const dateIsoRegex = /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/;
      const dateFrRegex = /\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/;

      const matchIso = drawDate.match(dateIsoRegex);
      const matchFr = drawDate.match(dateFrRegex);

      if (matchIso) {
        const [_, year, month, day] = matchIso;
        formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      } else if (matchFr) {
        const [_, day, month, year] = matchFr;
        formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
      
      const match = findBestDrawMatch(inputDrawName);
      
      const errors: string[] = [];
      if (!match) errors.push(`Tirage inconnu: "${inputDrawName}"`);
      if (!formattedDate) errors.push(`Date invalide: "${drawDate}"`);
      if (validWinning.length < 5) errors.push(`Numéros gagnants invalides (attendu: 5, reçu: ${validWinning.length})`);
      
      results.push({
        id: `csv-${i}-${Date.now()}`,
        draw_name: match?.name || inputDrawName || "Inconnu",
        draw_date: formattedDate || drawDate,
        winning_numbers: validWinning.slice(0, 5),
        machine_numbers: validMachine && validMachine.length >= 5 ? validMachine.slice(0, 5) : undefined,
        draw_day: match?.day || "",
        draw_time: match?.time || "",
        isValid: errors.length === 0,
        validationError: errors.join(" | "),
        rawLine: line
      });
    }
    
    return results;
  };

  // Queries Supabase in one trip to flag already existing results
  const enrichAndSetPreviewResults = async (results: ParsedResult[]) => {
    setIsLoading(true);
    try {
      const validResults = results.filter(r => r.isValid);
      if (validResults.length === 0) {
        setPreviewResults(results);
        setSelectedIds(new Set());
        return;
      }
      
      const uniqueDrawNames = Array.from(new Set(validResults.map(r => r.draw_name)));
      
      const { data: existingResults, error } = await supabase
        .from("draw_results")
        .select("draw_name, draw_date")
        .in("draw_name", uniqueDrawNames);
        
      if (error) throw error;
      
      const existingSet = new Set(
        (existingResults || []).map(r => `${r.draw_name}_${r.draw_date}`)
      );
      
      const enriched = results.map(r => {
        if (!r.isValid) return r;
        
        const key = `${r.draw_name}_${r.draw_date}`;
        const alreadyExists = existingSet.has(key);
        return {
          ...r,
          alreadyExists
        };
      });
      
      setPreviewResults(enriched);
      
      // Auto-select items that are valid and don't exist yet
      const autoSelected = enriched
        .filter(r => r.isValid && !r.alreadyExists)
        .map(r => r.id);
        
      setSelectedIds(new Set(autoSelected));
      
      const readyCount = enriched.filter(r => r.isValid && !r.alreadyExists).length;
      const dupCount = enriched.filter(r => r.alreadyExists).length;
      const errCount = enriched.filter(r => !r.isValid).length;
      
      toast({
        title: "Analyse des données terminée",
        description: `${readyCount} prêt(s), ${dupCount} doublon(s) ignoré(s), ${errCount} erreur(s) détectée(s).`,
      });
    } catch (error) {
      console.error("Error checking duplicates:", error);
      setPreviewResults(results);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePastePreview = async () => {
    const trimmed = pastedText.trim();
    if (!trimmed) return;
    
    let parsed: ParsedResult[] = [];
    
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      parsed = parseJSONContent(trimmed);
    } else if (trimmed.includes(",") || trimmed.includes(";")) {
      parsed = parseCsvContent(trimmed);
    } else {
      const lines = trimmed.split("\n");
      parsed = lines.map((line, idx) => {
        const p = parseLine(line);
        return {
          ...p,
          id: `paste-${idx}-${Date.now()}`
        };
      });
    }
    
    if (parsed.length === 0) {
      toast({
        title: "Données non lisibles",
        description: "Vérifiez que le format colle bien aux exemples ci-dessous.",
        variant: "destructive",
      });
      return;
    }
    
    await enrichAndSetPreviewResults(parsed);
  };

  // Drag & Drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    setIsLoading(true);
    try {
      const text = await file.text();
      let results: ParsedResult[] = [];
      
      if (extension === "json") {
        results = parseJSONContent(text);
      } else if (extension === "csv") {
        results = parseCsvContent(text);
      } else {
        toast({
          title: "Format non supporté",
          description: "Veuillez sélectionner un fichier au format .json ou .csv",
          variant: "destructive",
        });
        return;
      }
      
      if (results.length === 0) {
        toast({
          title: "Fichier vide ou illisible",
          description: "Aucun résultat n'a pu être extrait de ce fichier.",
          variant: "destructive",
        });
        return;
      }
      
      await enrichAndSetPreviewResults(results);
    } catch (e) {
      console.error(e);
      toast({
        title: "Erreur de lecture",
        description: "Échec du chargement du fichier.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Checkbox interactions
  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    const currentlyVisibleSelectable = filteredResults.filter(r => r.isValid && !r.alreadyExists);
    const allVisibleAreSelected = currentlyVisibleSelectable.every(r => selectedIds.has(r.id));
    
    const next = new Set(selectedIds);
    if (allVisibleAreSelected) {
      currentlyVisibleSelectable.forEach(r => next.delete(r.id));
    } else {
      currentlyVisibleSelectable.forEach(r => next.add(r.id));
    }
    setSelectedIds(next);
  };

  // Perform bulk import of selected records in a single database transaction
  const handleImport = async () => {
    const selectedResults = previewResults.filter(r => selectedIds.has(r.id) && r.isValid);
    if (selectedResults.length === 0) {
      toast({
        title: "Aucune sélection",
        description: "Sélectionnez au moins un tirage valide et non-existant à insérer.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const payload = selectedResults.map(r => ({
        draw_name: r.draw_name,
        draw_date: r.draw_date,
        winning_numbers: r.winning_numbers,
        machine_numbers: r.machine_numbers || null,
        draw_day: r.draw_day,
        draw_time: r.draw_time,
      }));

      const { error } = await supabase.from("draw_results").insert(payload);

      if (error) throw error;

      toast({
        title: "✓ Importation réussie",
        description: `${selectedResults.length} tirage(s) ont été importés avec succès !`,
      });

      // Reset
      setPreviewResults([]);
      setSelectedIds(new Set());
      setPastedText("");
      setSearchQuery("");
      setFilterType("all");

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      console.error("Batch import error:", error);
      toast({
        title: "Erreur d'importation",
        description: error instanceof Error ? error.message : "Échec de l'insertion en base.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplateCsv = () => {
    const content = `Tirage,Date,N1,N2,N3,N4,N5,M1,M2,M3,M4,M5
Reveil,2026-07-06,12,24,35,48,89,1,4,15,40,77
Lucky Tuesday,2026-07-07,8,19,45,63,77,,,,,`;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "loto_lumiere_template.csv");
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplateJson = () => {
    const content = JSON.stringify([
      {
        "draw_name": "Reveil",
        "draw_date": "2026-07-06",
        "winning_numbers": [12, 24, 35, 48, 89],
        "machine_numbers": [1, 4, 15, 40, 77]
      },
      {
        "draw_name": "Lucky Tuesday",
        "draw_date": "2026-07-07",
        "winning_numbers": [8, 19, 45, 63, 77]
      }
    ], null, 2);
    const blob = new Blob([content], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "loto_lumiere_template.json");
    link.click();
    URL.revokeObjectURL(url);
  };

  // Dynamic status-based counts
  const totalCount = previewResults.length;
  const importableCount = previewResults.filter(r => r.isValid && !r.alreadyExists).length;
  const duplicateCount = previewResults.filter(r => r.alreadyExists).length;
  const errorCount = previewResults.filter(r => !r.isValid).length;

  const filteredResults = previewResults.filter(result => {
    const matchesSearch = 
      result.draw_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.draw_date.includes(searchQuery);
      
    if (!matchesSearch) return false;
    
    if (filterType === "importable") {
      return result.isValid && !result.alreadyExists;
    }
    if (filterType === "duplicates") {
      return result.isValid && result.alreadyExists;
    }
    if (filterType === "errors") {
      return !result.isValid;
    }
    return true;
  });

  const selectableVisibleCount = filteredResults.filter(r => r.isValid && !r.alreadyExists).length;
  const allSelected = selectableVisibleCount > 0 && filteredResults
    .filter(r => r.isValid && !r.alreadyExists)
    .every(r => selectedIds.has(r.id));

  return (
    <Card id="card-results-importer" className="bg-card border-border/50 animate-fade-in shadow-sm hover:shadow-glow transition-all duration-300 xl:col-span-2">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Upload className="w-5 h-5 text-primary" />
          </div>
          Importation Facilitée & Multi-Format
        </CardTitle>
        <CardDescription className="text-base mt-1">
          Ajoutez des centaines de tirages d'un coup. Import intelligent, nettoyage des formats, détection des doublons en temps réel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="paste" className="w-full" id="tabs-importer">
          <TabsList className="grid w-full grid-cols-2 p-1.5 bg-muted/50 rounded-xl mb-4">
            <TabsTrigger id="trigger-paste" value="paste" className="rounded-lg data-[state=active]:shadow-sm">Copier-Coller Libre</TabsTrigger>
            <TabsTrigger id="trigger-file" value="file" className="rounded-lg data-[state=active]:shadow-sm">Fichier CSV / JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="textarea-pasted-data" className="text-sm font-medium">Coller vos lignes de résultats ou payload JSON</Label>
                <div className="flex gap-2">
                  <Button 
                    id="btn-paste-template-csv"
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setPastedText("Reveil 2026-07-06 12 24 35 48 89\nLucky Tuesday 2026-07-07 8 19 45 63 77 1 2 3 4 5")} 
                    className="h-7 text-xs border border-border/50 rounded-md"
                  >
                    Exemple Texte
                  </Button>
                  <Button 
                    id="btn-paste-template-json"
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setPastedText(JSON.stringify([
                      { "draw": "Reveil", "date": "2026-07-06", "numbers": [12, 24, 35, 48, 89] }
                    ], null, 2))} 
                    className="h-7 text-xs border border-border/50 rounded-md"
                  >
                    Exemple JSON
                  </Button>
                </div>
              </div>
              <Textarea
                id="textarea-pasted-data"
                placeholder="Copiez-collez ici vos données brutes. Formats acceptés:
- Texte: Reveil 2026-07-06 12 24 35 48 89 (séparateurs: espaces, tirets, virgules)
- CSV: Tirage,Date,N1,N2,N3,N4,N5
- JSON: Tableau d'objets avec clés 'draw', 'date', 'numbers'"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={7}
                className="font-mono text-sm leading-relaxed"
              />
            </div>
            <Button 
              id="btn-parse-pasted" 
              onClick={handlePastePreview} 
              disabled={!pastedText.trim() || isLoading}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Analyse et Prévisualiser
            </Button>
          </TabsContent>

          <TabsContent value="file" className="space-y-4">
            <div
              id="drop-zone-importer"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${
                dragActive ? "border-primary bg-primary/5 shadow-inner" : "border-border hover:border-primary/50 bg-card/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                id="input-file-browse"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-3 bg-muted/50 rounded-full mb-3 text-muted-foreground group-hover:text-primary transition-colors">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-foreground text-center">
                Glissez-déposez votre fichier ici
              </p>
              <p className="text-sm text-muted-foreground text-center mt-1 mb-4">
                Prend en charge les formats .csv et .json uniquement
              </p>
              <Button 
                id="btn-file-browse-click"
                variant="secondary" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                Parcourir les fichiers
              </Button>
            </div>
            
            <div className="flex gap-3 justify-end pt-2 border-t border-border/40">
              <span className="text-xs text-muted-foreground self-center">Télécharger des modèles d'importation :</span>
              <Button 
                id="btn-download-tpl-csv"
                variant="outline" 
                size="sm" 
                onClick={downloadTemplateCsv}
                className="gap-1.5 text-xs h-8 border-border/60"
              >
                <Download className="w-3.5 h-3.5" /> Modèle CSV
              </Button>
              <Button 
                id="btn-download-tpl-json"
                variant="outline" 
                size="sm" 
                onClick={downloadTemplateJson}
                className="gap-1.5 text-xs h-8 border-border/60"
              >
                <Download className="w-3.5 h-3.5" /> Modèle JSON
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dynamic Interactive Preview Table */}
        {previewResults.length > 0 && (
          <div className="mt-8 space-y-4 pt-6 border-t border-border/50 animate-fade-in" id="preview-results-container">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Tableau de Prévisualisation
                </h3>
                <p className="text-sm text-muted-foreground">
                  Cochez les lignes à importer. Les doublons détectés et erreurs sont exclus par défaut.
                </p>
              </div>

              {/* Dynamic stats list */}
              <div className="flex flex-wrap gap-2">
                <Button
                  id="btn-filter-all"
                  variant={filterType === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("all")}
                  className="h-8 text-xs rounded-full"
                >
                  Tous ({totalCount})
                </Button>
                <Button
                  id="btn-filter-importable"
                  variant={filterType === "importable" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("importable")}
                  className="h-8 text-xs rounded-full border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 data-[state=active]:bg-emerald-500"
                >
                  Importables ({importableCount})
                </Button>
                <Button
                  id="btn-filter-duplicates"
                  variant={filterType === "duplicates" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("duplicates")}
                  className="h-8 text-xs rounded-full border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                >
                  Doublons ({duplicateCount})
                </Button>
                <Button
                  id="btn-filter-errors"
                  variant={filterType === "errors" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("errors")}
                  className="h-8 text-xs rounded-full border-red-500/30 text-red-500 hover:bg-red-500/10"
                >
                  Erreurs ({errorCount})
                </Button>
              </div>
            </div>

            {/* Quick action bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20 p-3 rounded-lg border border-border/40">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    id="input-preview-search"
                    type="text"
                    placeholder="Filtrer par tirage ou date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 bg-background border border-border/50 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground shrink-0 w-full sm:w-auto justify-end">
                <span>{selectedIds.size} de {importableCount} prêt(s) sélectionné(s)</span>
                <div className="h-4 w-px bg-border/60" />
                <Button
                  id="btn-preview-clear-all"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewResults([])}
                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                >
                  Vider l'aperçu
                </Button>
              </div>
            </div>

            {/* Interactive Table with overflow safety */}
            <div className="overflow-hidden border border-border/50 rounded-xl bg-card">
              <div className="overflow-x-auto">
                <Table id="table-results-preview">
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[50px] text-center">
                        <Checkbox 
                          id="checkbox-preview-toggle-all"
                          checked={allSelected} 
                          onCheckedChange={toggleSelectAll}
                          disabled={selectableVisibleCount === 0}
                        />
                      </TableHead>
                      <TableHead className="w-[110px]">Statut</TableHead>
                      <TableHead className="w-[140px]">Tirage</TableHead>
                      <TableHead className="w-[110px]">Date</TableHead>
                      <TableHead className="text-center">Numéros Gagnants</TableHead>
                      <TableHead className="text-center">Numéros Machine</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-medium">
                          Aucun résultat ne correspond aux filtres appliqués.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredResults.map((result) => {
                        const isSelectable = result.isValid && !result.alreadyExists;
                        return (
                          <TableRow 
                            key={result.id} 
                            className={`transition-colors ${
                              !result.isValid 
                                ? "bg-red-500/[0.02] hover:bg-red-500/[0.04]" 
                                : result.alreadyExists 
                                ? "bg-amber-500/[0.02] hover:bg-amber-500/[0.04]" 
                                : "hover:bg-muted/30"
                            }`}
                          >
                            <TableCell className="text-center">
                              <Checkbox
                                id={`checkbox-preview-item-${result.id}`}
                                checked={selectedIds.has(result.id)}
                                onCheckedChange={() => handleToggleRow(result.id)}
                                disabled={!isSelectable}
                              />
                            </TableCell>
                            <TableCell>
                              {!result.isValid ? (
                                <Badge variant="destructive" className="gap-1 shadow-sm font-semibold">
                                  <AlertCircle className="w-3 h-3" /> Erreur
                                </Badge>
                              ) : result.alreadyExists ? (
                                <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/5 gap-1 font-semibold">
                                  <Check className="w-3 h-3" /> Doublon
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20 gap-1 font-semibold">
                                  <Check className="w-3 h-3" /> Prêt
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold text-foreground">
                              {result.draw_name}
                              <span className="text-[10px] text-muted-foreground block font-normal opacity-80">
                                {result.draw_day || "Jour inconnu"} {result.draw_time}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                              {result.draw_date}
                            </TableCell>
                            <TableCell>
                              {result.isValid && result.winning_numbers.length === 5 ? (
                                <div className="flex gap-1.5 justify-center">
                                  {result.winning_numbers.map((num, i) => (
                                    <NumberBall key={i} number={num} size="xs" />
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-destructive font-medium text-center">
                                  {result.validationError || "Données incorrectes"}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {result.isValid && result.machine_numbers && result.machine_numbers.length === 5 ? (
                                <div className="flex gap-1.5 justify-center opacity-75">
                                  {result.machine_numbers.map((num, i) => (
                                    <NumberBall key={i} number={num} size="xs" className="scale-90 border border-muted" />
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground text-center font-normal">
                                  --
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Execute panel */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-muted/30 border border-border/40 rounded-xl gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Database className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold">Lancer l'importation de masse</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedIds.size} résultat(s) sélectionné(s) prêt(s) à être persisté(s).
                  </p>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto shrink-0">
                <Button
                  id="btn-preview-cancel"
                  variant="outline"
                  onClick={() => {
                    setPreviewResults([]);
                    setSelectedIds(new Set());
                  }}
                  className="flex-1 sm:flex-none border-border/60"
                >
                  Annuler
                </Button>
                <Button
                  id="btn-preview-import-execute"
                  onClick={handleImport}
                  disabled={selectedIds.size === 0 || isLoading}
                  className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 font-semibold gap-2 shadow-sm shadow-emerald-900/10"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Importer {selectedIds.size} tirages
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Documentation Block */}
        <div className="p-4 bg-muted/25 rounded-xl border border-border/30" id="docs-block-importer">
          <h4 className="font-bold mb-3 flex items-center gap-1.5 text-sm text-foreground">
            <Info className="w-4 h-4 text-primary" /> Guide du format de données :
          </h4>
          <div className="text-xs text-muted-foreground grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p><strong>Heuristique de parsing intelligente :</strong></p>
              <p>Notre algorithme extrait automatiquement les tirages sans tenir compte de l'ordre des colonnes. Il repère la date, isole les numéros entre 1 et 90, et map le texte restant vers les tirages officiels.</p>
            </div>
            <div className="space-y-1.5">
              <p><strong>Noms de tirages auto-mappés :</strong></p>
              <p>Des variations comme "lucky tuesday", "LUCKY-TUESDAY" ou "LuckyTuesday" seront toutes associées automatiquement au tirage officiel <strong>Lucky Tuesday</strong>.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
