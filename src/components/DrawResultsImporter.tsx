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
import { formatToFrenchDate } from "@/utils/dateUtils";

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

export const DrawResultsImporter = ({ 
  onImportComplete,
  activeDrawName 
}: { 
  onImportComplete?: () => void;
  activeDrawName?: string;
}) => {
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

  const getDayOfWeekFr = (dateStr: string): string => {
    // dateStr is "YYYY-MM-DD"
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    return days[date.getDay()];
  };

  // Robust line parser for unstructured spaces/dashes/brackets/commas format
  const parseLine = (line: string): Omit<ParsedResult, "id"> => {
    const trimmed = line.trim();
    let remaining = trimmed;

    // 1. Detect and extract ISO or French Date
    let detectedDate = "";
    const dateIsoRegex = /\b(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})\b/;
    const dateFrRegex = /\b(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})\b/;

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

    const match = activeDrawName && activeDrawName !== "all"
      ? allDraws.find(d => d.name === activeDrawName)
      : findBestDrawMatch(cleanedDrawName);
    
    let drawName = match?.name || cleanedDrawName || "Inconnu";
    let drawDay = match?.day || "";
    let drawTime = match?.time || "";

    if (!match && detectedDate) {
      const dayFr = getDayOfWeekFr(detectedDate);
      const dayDraws = DRAW_SCHEDULE[dayFr];
      if (dayDraws && dayDraws.length > 0) {
        // Default to the last (major) draw of that day
        const defaultDraw = dayDraws[dayDraws.length - 1];
        drawName = defaultDraw.name;
        drawDay = defaultDraw.day;
        drawTime = defaultDraw.time;
      }
    }

    // Validate numbers range (1 - 90)
    const validDrawNumbers = foundNumbers.filter(n => n >= 1 && n <= 90);

    if (validDrawNumbers.length < 5) {
      return {
        draw_name: drawName,
        draw_date: detectedDate,
        winning_numbers: validDrawNumbers,
        draw_day: drawDay,
        draw_time: drawTime,
        isValid: false,
        validationError: `Numéros insuffisants (trouvé: ${validDrawNumbers.length}, attendu: 5 minimum entre 1-90)`,
        rawLine: line
      };
    }

    const winningNumbers = validDrawNumbers.slice(0, 5);
    const machineNumbers = validDrawNumbers.length >= 10 ? validDrawNumbers.slice(5, 10) : undefined;

    return {
      draw_name: drawName,
      draw_date: detectedDate,
      winning_numbers: winningNumbers,
      machine_numbers: machineNumbers,
      draw_day: drawDay,
      draw_time: drawTime,
      isValid: drawName !== "Inconnu" && !!detectedDate,
      validationError: drawName === "Inconnu" ? "Tirage non reconnu" : undefined,
      rawLine: line
    };
  };

  const parseJSONContent = (text: string): ParsedResult[] => {
    try {
      const parsed = JSON.parse(text);
      
      const extractRecords = (obj: Record<string, unknown> | unknown[] | null): Record<string, unknown>[] => {
        let records: Record<string, unknown>[] = [];
        if (Array.isArray(obj)) {
          for (const item of obj) {
            records = records.concat(extractRecords(item));
          }
        } else if (typeof obj === 'object' && obj !== null) {
          const keys = Object.keys(obj).join(' ').toLowerCase();
          const hasDate = keys.includes('date') || keys.includes('time') || keys.includes('jour');
          const hasNumbers = keys.includes('win') || keys.includes('num') || keys.includes('gagnant') || keys.includes('result') || keys.includes('tirage');
          
          if (hasDate && hasNumbers) {
            records.push(obj);
          } else {
            for (const key in obj) {
              records = records.concat(extractRecords(obj[key]));
            }
          }
        }
        return records;
      };

      let items = extractRecords(parsed);
      if (items.length === 0) {
         if (Array.isArray(parsed)) items = parsed;
         else if (typeof parsed === 'object' && parsed !== null) items = [parsed];
      }
      
      // Deduplicate items just in case
      items = items.filter((item, index, self) => 
        index === self.findIndex((t) => JSON.stringify(t) === JSON.stringify(item))
      );

      const results: ParsedResult[] = [];

      items.forEach((item, idx) => {
        if (typeof item !== "object" || item === null) return;

        // Flexible key matching
        const rawDrawName = item.draw_name || item.drawName || item.name || item.nom || item.tirage || "";
        const rawDrawDate = item.draw_date || item.drawDate || item.date || item.jour || "";
        
        let rawWinning: any = undefined;
        // Search for anything that looks like winning numbers
        for (const key of ['winning_numbers', 'winningNumbers', 'numbers', 'winning', 'gagnants', 'resultats', 'results', 'nums']) {
           if (item[key] !== undefined) {
             rawWinning = item[key];
             break;
           }
        }
        
        if (typeof rawWinning === "string") {
          rawWinning = rawWinning.match(/\b\d+\b/g)?.map((n: string) => parseInt(n)) || [];
        } else if (typeof rawWinning === "number") {
          rawWinning = [rawWinning];
        } else if (!rawWinning) {
           // Search all values for arrays of numbers
           for (const val of Object.values(item)) {
              if (Array.isArray(val) && val.length >= 5 && typeof val[0] === 'number') {
                 rawWinning = val;
                 break;
              } else if (typeof val === 'string' && val.split(/[,;\s-]/).length >= 5) {
                 const nums = val.match(/\b\d+\b/g)?.map(n => parseInt(n));
                 if (nums && nums.length >= 5) {
                    rawWinning = nums;
                    break;
                 }
              }
           }
        }
        
        let rawMachine: any = undefined;
        for (const key of ['machine_numbers', 'machineNumbers', 'machine', 'machines']) {
           if (item[key] !== undefined) {
             rawMachine = item[key];
             break;
           }
        }
        if (typeof rawMachine === "string") {
          rawMachine = rawMachine.match(/\b\d+\b/g)?.map((n: string) => parseInt(n)) || [];
        } else if (typeof rawMachine === "number") {
          rawMachine = [rawMachine];
        }

        // Standardize date
        const detectedDate = String(rawDrawDate).trim();
        let formattedDate = "";
        const dateIsoRegex = /\b(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})\b/;
        const dateFrRegex = /\b(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})\b/;

        const matchIso = detectedDate.match(dateIsoRegex);
        const matchFr = detectedDate.match(dateFrRegex);

        if (matchIso) {
          const [_, year, month, day] = matchIso;
          formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        } else if (matchFr) {
          const [_, day, month, year] = matchFr;
          formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }

        let winningNumbers = (Array.isArray(rawWinning) ? rawWinning : [])
          .map(n => typeof n === "number" ? n : parseInt(String(n)))
          .filter(n => !isNaN(n) && n >= 1 && n <= 90);
        
        let machineNumbers = (Array.isArray(rawMachine) ? rawMachine : [])
          .map(n => typeof n === "number" ? n : parseInt(String(n)))
          .filter(n => !isNaN(n) && n >= 1 && n <= 90);

        if (winningNumbers.length >= 10 && machineNumbers.length === 0) {
          machineNumbers = winningNumbers.slice(5, 10);
          winningNumbers = winningNumbers.slice(0, 5);
        }

        const match = activeDrawName && activeDrawName !== "all"
          ? allDraws.find(d => d.name === activeDrawName)
          : findBestDrawMatch(String(rawDrawName));
        let drawName = match?.name || String(rawDrawName) || "Inconnu";
        let drawDay = match?.day || "";
        let drawTime = match?.time || "";

        if (!match && formattedDate) {
          const dayFr = getDayOfWeekFr(formattedDate);
          const dayDraws = DRAW_SCHEDULE[dayFr];
          if (dayDraws && dayDraws.length > 0) {
            const defaultDraw = dayDraws[dayDraws.length - 1];
            drawName = defaultDraw.name;
            drawDay = defaultDraw.day;
            drawTime = defaultDraw.time;
          }
        }

        const errors: string[] = [];
        if (drawName === "Inconnu") errors.push(`Tirage non reconnu: "${rawDrawName}"`);
        if (!formattedDate) errors.push(`Date absente/invalide: "${rawDrawDate}"`);
        if (winningNumbers.length < 5) errors.push(`Numéros gagnants invalides (attendu: 5, reçu: ${winningNumbers.length})`);

        results.push({
          id: `json-${idx}-${Date.now()}`,
          draw_name: drawName,
          draw_date: formattedDate || detectedDate,
          winning_numbers: winningNumbers.slice(0, 5),
          machine_numbers: machineNumbers.length >= 5 ? machineNumbers.slice(0, 5) : undefined,
          draw_day: drawDay,
          draw_time: drawTime,
          isValid: errors.length === 0,
          validationError: errors.length > 0 ? errors.join(" | ") : undefined,
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
    if (lines.length === 0) return [];
    
    const results: ParsedResult[] = [];
    const dateIsoRegex = /\b(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})\b/;
    const dateFrRegex = /\b(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})\b/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(/[,;\t|]/).map(p => p.trim());
      
      const potentialNumbers: number[] = [];
      let drawDate = "";
      let inputDrawName = "";
      
      parts.forEach(part => {
        // is it a date?
        if (!drawDate && (part.match(dateIsoRegex) || part.match(dateFrRegex))) {
          drawDate = part;
        } 
        // is it a name? (mostly letters)
        else if (!inputDrawName && isNaN(parseInt(part)) && part.length >= 3 && /[a-zA-Z]/.test(part) && 
                 !part.toLowerCase().includes('date') && !part.toLowerCase().includes('tirage') && !part.toLowerCase().includes('winning')) {
          inputDrawName = part;
        }
        // is it numbers? (could be space separated)
        else {
          const nums = part.match(/\b\d+\b/g);
          if (nums) {
            potentialNumbers.push(...nums.map(n => parseInt(n)).filter(n => n >= 1 && n <= 90));
          }
        }
      });
      
      // if we couldn't find date from columns, search in whole line
      if (!drawDate) {
         const mIso = line.match(dateIsoRegex);
         const mFr = line.match(dateFrRegex);
         if (mIso) drawDate = mIso[0];
         else if (mFr) drawDate = mFr[0];
      }
      
      // If no draw name but we have date and numbers, we can deduce draw name later
      if (potentialNumbers.length >= 5) {
        let formattedDate = "";
        const matchIso = drawDate.match(dateIsoRegex);
        const matchFr = drawDate.match(dateFrRegex);

        if (matchIso) {
          const [_, year, month, day] = matchIso;
          formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        } else if (matchFr) {
          const [_, day, month, year] = matchFr;
          formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
        
        const match = activeDrawName && activeDrawName !== "all"
          ? allDraws.find(d => d.name === activeDrawName)
          : findBestDrawMatch(inputDrawName);
        
        let drawName = match?.name || inputDrawName || "Inconnu";
        let drawDay = match?.day || "";
        let drawTime = match?.time || "";

        if (!match && formattedDate) {
          const dayFr = getDayOfWeekFr(formattedDate);
          const dayDraws = DRAW_SCHEDULE[dayFr];
          if (dayDraws && dayDraws.length > 0) {
            const defaultDraw = dayDraws[dayDraws.length - 1];
            drawName = defaultDraw.name;
            drawDay = defaultDraw.day;
            drawTime = defaultDraw.time;
          }
        }

        const validWinning = potentialNumbers.slice(0, 5);
        const validMachine = potentialNumbers.length >= 10 ? potentialNumbers.slice(5, 10) : undefined;

        const errors: string[] = [];
        if (drawName === "Inconnu") errors.push(`Tirage inconnu: "${inputDrawName || 'nom introuvable'}"`);
        if (!formattedDate) errors.push(`Date invalide: "${drawDate}"`);
        if (validWinning.length < 5) errors.push(`Numéros gagnants invalides (attendu: 5, reçu: ${validWinning.length})`);
        
        results.push({
          id: `csv-${i}-${Date.now()}`,
          draw_name: drawName,
          draw_date: formattedDate || drawDate,
          winning_numbers: validWinning,
          machine_numbers: validMachine,
          draw_day: drawDay,
          draw_time: drawTime,
          isValid: errors.length === 0,
          validationError: errors.length > 0 ? errors.join(" | ") : undefined,
          rawLine: line
        });
      }
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
      const dates = validResults.map(r => r.draw_date).filter(Boolean);
      const minDate = dates.length > 0 ? dates.reduce((min, d) => d < min ? d : min, dates[0]) : null;
      const maxDate = dates.length > 0 ? dates.reduce((max, d) => d > max ? d : max, dates[0]) : null;

      let query = supabase
        .from("draw_results")
        .select("draw_name, draw_date")
        .in("draw_name", uniqueDrawNames);

      if (minDate && maxDate) {
        query = query.gte("draw_date", minDate).lte("draw_date", maxDate);
      }
      
      const { data: existingResults, error } = await query;
        
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

  const handleUpdateDrawName = async (resultId: string, newDrawName: string) => {
    // Find the draw details in DRAW_SCHEDULE
    const drawDetails = allDraws.find(d => d.name === newDrawName);
    if (!drawDetails) return;

    // Update the item in previewResults
    const updated = previewResults.map(r => {
      if (r.id !== resultId) return r;
      return {
        ...r,
        draw_name: drawDetails.name,
        draw_day: drawDetails.day,
        draw_time: drawDetails.time,
        isValid: true,
        validationError: undefined
      };
    });

    // Re-check duplicates for this specific updated set
    setIsLoading(true);
    try {
      const validUpdated = updated.filter(r => r.isValid);
      const uniqueDrawNames = Array.from(new Set(validUpdated.map(r => r.draw_name)));
      const dates = validUpdated.map(r => r.draw_date).filter(Boolean);
      const minDate = dates.length > 0 ? dates.reduce((min, d) => d < min ? d : min, dates[0]) : null;
      const maxDate = dates.length > 0 ? dates.reduce((max, d) => d > max ? d : max, dates[0]) : null;

      let query = supabase
        .from("draw_results")
        .select("draw_name, draw_date")
        .in("draw_name", uniqueDrawNames);

      if (minDate && maxDate) {
        query = query.gte("draw_date", minDate).lte("draw_date", maxDate);
      }
      
      const { data: existingResults, error } = await query;
        
      if (error) throw error;
      
      const existingSet = new Set(
        (existingResults || []).map(r => `${r.draw_name}_${r.draw_date}`)
      );
      
      const enriched = updated.map(r => {
        if (!r.isValid) return r;
        const key = `${r.draw_name}_${r.draw_date}`;
        return {
          ...r,
          alreadyExists: existingSet.has(key)
        };
      });

      setPreviewResults(enriched);
      
      // Update selected status based on whether it is now valid and not duplicate
      const nextSelected = new Set(selectedIds);
      const targetItem = enriched.find(item => item.id === resultId);
      if (targetItem) {
        if (targetItem.isValid && !targetItem.alreadyExists) {
          nextSelected.add(resultId);
        } else {
          nextSelected.delete(resultId);
        }
      }
      setSelectedIds(nextSelected);
    } catch (e) {
      console.error("Error re-checking duplicates:", e);
      setPreviewResults(updated);
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
      // Deduplicate payload to avoid "ON CONFLICT DO UPDATE command cannot affect row a second time" error
      const uniquePayloadMap = new Map();
      selectedResults.forEach(r => {
        const key = `${r.draw_name}_${r.draw_date}`;
        uniquePayloadMap.set(key, {
          draw_name: r.draw_name,
          draw_date: r.draw_date,
          winning_numbers: r.winning_numbers,
          machine_numbers: r.machine_numbers || null,
          draw_day: r.draw_day,
          draw_time: r.draw_time,
        });
      });
      const payload = Array.from(uniquePayloadMap.values());

      // We use upsert with onConflict to handle conflicts gracefully (overwriting or skipping instead of throwing)
      const { error } = await supabase
        .from("draw_results")
        .upsert(payload, { onConflict: "draw_name,draw_date" });

      if (error) throw error;

      toast({
        title: "✓ Importation réussie",
        description: `${selectedResults.length} tirage(s) ont été importés ou mis à jour avec succès !`,
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
    } catch (error: any) {
      console.error("Batch import error:", error);
      const errorMessage = error?.message || error?.details || (error && typeof error === "object" ? JSON.stringify(error) : String(error));
      toast({
        title: "Erreur d'importation",
        description: errorMessage || "Échec de l'insertion en base.",
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
                              <div className="space-y-1">
                                <select
                                  id={`select-draw-name-${result.id}`}
                                  value={result.draw_name}
                                  onChange={(e) => handleUpdateDrawName(result.id, e.target.value)}
                                  className="bg-background text-foreground border border-border/60 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-primary w-full max-w-[150px] font-semibold"
                                >
                                  <option value="" disabled>Choisir un tirage</option>
                                  {Object.entries(DRAW_SCHEDULE).map(([day, draws]) => (
                                    <optgroup key={day} label={day} className="text-muted-foreground font-normal">
                                      {draws.map(d => (
                                        <option key={d.name} value={d.name} className="text-foreground font-medium">
                                          {d.name} ({d.time})
                                        </option>
                                      ))}
                                    </optgroup>
                                  ))}
                                </select>
                                <span className="text-[10px] text-muted-foreground block font-normal opacity-80 pl-1">
                                  {result.draw_day || "Jour inconnu"} {result.draw_time}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                              {formatToFrenchDate(result.draw_date)}
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
