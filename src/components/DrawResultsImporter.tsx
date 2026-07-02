import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, Copy, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DRAW_SCHEDULE } from "@/types/lottery";

interface ParsedResult {
  draw_name: string;
  draw_date: string;
  winning_numbers: number[];
  machine_numbers?: number[];
  draw_day: string;
  draw_time: string;
}

export const DrawResultsImporter = ({ onImportComplete }: { onImportComplete?: () => void }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [previewResults, setPreviewResults] = useState<ParsedResult[]>([]);

  const allDraws = Object.values(DRAW_SCHEDULE).flat();

  const normalizeDrawName = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '');
  };

  const getDrawScheduleInfo = (drawName: string) => {
    const normalizedInput = normalizeDrawName(drawName);
    const draw = allDraws.find(d => normalizeDrawName(d.name) === normalizedInput);
    return draw ? { day: draw.day, time: draw.time, exactName: draw.name } : { day: "", time: "", exactName: drawName };
  };

  const parseTextInput = (text: string): ParsedResult[] => {
    const results: ParsedResult[] = [];
    const lines = text.trim().split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // First, try to identify the draw name from known draws
      let matchedDraw: { name: string; day: string; time: string } | null = null;
      let remainingText = line.trim();
      
      // Try to match draw names (longest first to handle "Lucky Tuesday" before "Lucky")
      const sortedDraws = [...allDraws].sort((a, b) => b.name.length - a.name.length);
      for (const draw of sortedDraws) {
        const normalizedLine = normalizeDrawName(line);
        const normalizedDrawName = normalizeDrawName(draw.name);
        if (normalizedLine.startsWith(normalizedDrawName)) {
          matchedDraw = draw;
          // Remove draw name from the beginning
          const regex = new RegExp(`^${draw.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i');
          remainingText = line.replace(regex, '').trim();
          break;
        }
      }
      
      if (!matchedDraw) continue;
      
      // Parse remaining parts: Date N1 N2 N3 N4 N5 [M1 M2 M3 M4 M5]
      const parts = remainingText.split(/[,\s]+/).map(p => p.trim());
      
      if (parts.length < 6) continue; // Minimum: date + 5 numéros
      
      const drawDate = parts[0]; // Format: YYYY-MM-DD ou DD/MM/YYYY
      const numbers = parts.slice(1, 6).map(n => parseInt(n));
      const machineNumbers = parts.length >= 11 ? parts.slice(6, 11).map(n => parseInt(n)) : undefined;
      
      // Valider les numéros
      if (numbers.some(n => isNaN(n) || n < 1 || n > 90) || numbers.length !== 5) continue;
      if (machineNumbers && (machineNumbers.some(n => isNaN(n) || n < 1 || n > 90) || machineNumbers.length !== 5)) continue;
      
      // Normaliser la date
      let normalizedDate = drawDate;
      if (drawDate.includes('/')) {
        const [day, month, year] = drawDate.split('/');
        normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      results.push({
        draw_name: matchedDraw.name,
        draw_date: normalizedDate,
        winning_numbers: numbers,
        machine_numbers: machineNumbers?.length === 5 ? machineNumbers : undefined,
        draw_day: matchedDraw.day,
        draw_time: matchedDraw.time,
      });
    }
    
    return results;
  };

  const parseCsvFile = async (file: File): Promise<ParsedResult[]> => {
    const text = await file.text();
    const lines = text.trim().split('\n');
    const results: ParsedResult[] = [];
    
    // Skip header if present
    const startIndex = lines[0].toLowerCase().includes('tirage') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(/[,;]/).map(p => p.trim());
      
      if (parts.length < 7) continue;
      
      const inputDrawName = parts[0];
      const drawDate = parts[1];
      const numbers = parts.slice(2, 7).map(n => parseInt(n));
      const machineNumbers = parts.length >= 12 ? parts.slice(7, 12).map(n => parseInt(n)) : undefined;
      
      if (numbers.some(n => isNaN(n) || n < 1 || n > 90) || numbers.length !== 5) continue;
      if (machineNumbers && (machineNumbers.some(n => isNaN(n) || n < 1 || n > 90) || machineNumbers.length !== 5)) continue;
      
      let normalizedDate = drawDate;
      if (drawDate.includes('/')) {
        const [day, month, year] = drawDate.split('/');
        normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      const scheduleInfo = getDrawScheduleInfo(inputDrawName);
      
      results.push({
        draw_name: scheduleInfo.exactName,
        draw_date: normalizedDate,
        winning_numbers: numbers,
        machine_numbers: machineNumbers?.length === 5 ? machineNumbers : undefined,
        draw_day: scheduleInfo.day,
        draw_time: scheduleInfo.time,
      });
    }
    
    return results;
  };

  const handlePreviewText = () => {
    const results = parseTextInput(pastedText);
    setPreviewResults(results);
    
    if (results.length === 0) {
      toast({
        title: "Aucun résultat valide",
        description: "Vérifiez le format de vos données",
        variant: "destructive",
      });
    }
  };

  const handlePreviewCsv = async () => {
    if (!csvFile) return;
    
    try {
      const results = await parseCsvFile(csvFile);
      setPreviewResults(results);
      
      if (results.length === 0) {
        toast({
          title: "Aucun résultat valide",
          description: "Vérifiez le format de votre fichier CSV",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de lire le fichier CSV",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (previewResults.length === 0) return;
    
    setIsLoading(true);
    try {
      let insertedCount = 0;
      let skippedCount = 0;
      
      const VALID_DRAW_NAMES = Array.from(
        new Set(
          Object.values(DRAW_SCHEDULE)
            .flat()
            .map((draw) => draw.name)
        )
      );
      
      for (const result of previewResults) {
        if (!VALID_DRAW_NAMES.includes(result.draw_name)) {
          toast({
            title: "Nom de tirage invalide",
            description: `Le tirage '${result.draw_name}' n'existe pas dans le programme. Import ignoré pour cette ligne.`,
            variant: "destructive"
          });
          skippedCount++;
          continue;
        }

        // Check if result already exists
        const { data: existing } = await supabase
          .from("draw_results")
          .select("id")
          .eq("draw_name", result.draw_name)
          .eq("draw_date", result.draw_date)
          .maybeSingle();
        
        if (existing) {
          skippedCount++;
          continue;
        }
        
        const { error } = await supabase.from("draw_results").insert(result);
        
        if (error) {
          const safeError = String(error).substring(0, 100);
          console.error("Error inserting:", safeError);
        } else {
          insertedCount++;
        }
      }
      
      toast({
        title: "✓ Import terminé",
        description: `${insertedCount} résultat(s) importé(s), ${skippedCount} doublon(s) ignoré(s)`,
      });
      
      // Reset
      setPastedText("");
      setCsvFile(null);
      setPreviewResults([]);
      
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      const safeError = String(error).substring(0, 100);
      console.error("Import error:", safeError);
      toast({
        title: "Erreur",
        description: "Échec de l'import",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `Tirage,Date,N1,N2,N3,N4,N5,M1,M2,M3,M4,M5
Reveil,2024-01-15,12,23,45,67,89,5,10,20,30,40
Etoile,2024-01-15,8,15,27,56,78,,,,,`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template-import.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="bg-gradient-to-br from-card to-muted/20 border-border/50 animate-fade-in shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-full">
            <Upload className="w-5 h-5 text-primary" />
          </div>
          Import Facilité
        </CardTitle>
        <CardDescription>
          Importez plusieurs résultats en une fois via CSV ou copier-coller
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-2 p-1.5 bg-muted/50 rounded-xl mb-4">
            <TabsTrigger value="text" className="rounded-lg data-[state=active]:shadow-sm">Copier-Coller</TabsTrigger>
            <TabsTrigger value="csv" className="rounded-lg data-[state=active]:shadow-sm">Fichier CSV</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paste-text">Collez vos données ici</Label>
              <Textarea
                id="paste-text"
                placeholder="Exemple:
Reveil 2024-01-15 12 23 45 67 89
Etoile 2024-01-15 8 15 27 56 78 5 10 20 30 40"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={6}
              />
            </div>
            <Button onClick={handlePreviewText} disabled={!pastedText.trim()}>
              <FileText className="w-4 h-4 mr-2" />
              Prévisualiser
            </Button>
          </TabsContent>

          <TabsContent value="csv" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">Sélectionnez un fichier CSV</Label>
              <input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handlePreviewCsv} disabled={!csvFile}>
                <FileText className="w-4 h-4 mr-2" />
                Prévisualiser
              </Button>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Télécharger modèle
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {previewResults.length > 0 && (
          <div className="mt-6 space-y-4">
            <Alert>
              <AlertDescription>
                {previewResults.length} résultat(s) détecté(s). Vérifiez avant d'importer.
              </AlertDescription>
            </Alert>

            <div className="max-h-64 overflow-y-auto border rounded-lg p-4 bg-muted/50">
              {previewResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex-1">
                    <span className="font-medium">{result.draw_name}</span>
                    <span className="text-muted-foreground ml-2">{result.draw_date}</span>
                  </div>
                  <div className="flex gap-1">
                    {result.winning_numbers.map((num, i) => (
                      <span key={i} className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={isLoading} className="flex-1">
                {isLoading ? "Import en cours..." : `Importer ${previewResults.length} résultat(s)`}
              </Button>
              <Button variant="outline" onClick={() => setPreviewResults([])}>
                Annuler
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h4 className="font-semibold mb-2">Format attendu :</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Texte :</strong> NomTirage Date N1 N2 N3 N4 N5 [M1 M2 M3 M4 M5]</p>
            <p><strong>CSV :</strong> Tirage,Date,N1,N2,N3,N4,N5,M1,M2,M3,M4,M5</p>
            <p><strong>Date :</strong> YYYY-MM-DD ou DD/MM/YYYY</p>
            <p><strong>Numéros :</strong> 1-90, M1-M5 optionnels (numéros machine)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
