import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileCode, FileSpreadsheet, Clipboard, Check, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export interface ExportColumn {
  key: string;
  label: string;
  accessor?: (row: any) => string | number | null | undefined;
}

interface DataExporterProps {
  id?: string;
  data: any[];
  defaultFileName?: string;
  columns?: ExportColumn[];
  buttonText?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
}

export const DataExporter = ({
  id = "data-exporter",
  data,
  defaultFileName = "loto-export",
  columns,
  buttonText = "Exporter",
  variant = "outline",
  className = "",
}: DataExporterProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    columns ? columns.map((c) => c.key) : []
  );
  const [csvDelimiter, setCsvDelimiter] = useState<"," | ";">(";");
  const [splitArrays, setSplitArrays] = useState(true);

  // Default columns mapping if not provided
  const actualColumns = columns || [
    { key: "draw_name", label: "Nom Tirage" },
    { key: "draw_date", label: "Date" },
    { key: "draw_day", label: "Jour" },
    { key: "draw_time", label: "Heure" },
    { key: "winning_numbers", label: "Numéros Gagnants" },
    { key: "machine_numbers", label: "Numéros Machine" },
  ];

  // Initialize selected columns on first load if state is empty
  if (selectedColumns.length === 0 && actualColumns.length > 0) {
    setSelectedColumns(actualColumns.map((c) => c.key));
  }

  const handleToggleColumn = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const getRowValue = (row: any, col: ExportColumn): any => {
    if (col.accessor) {
      return col.accessor(row);
    }
    return row[col.key];
  };

  const convertToCSV = (): string => {
    const activeCols = actualColumns.filter((c) => selectedColumns.includes(c.key));
    const headerRow: string[] = [];

    // Build headers
    activeCols.forEach((col) => {
      if (splitArrays && (col.key === "winning_numbers" || col.key === "machine_numbers")) {
        const prefix = col.key === "winning_numbers" ? "N" : "M";
        for (let i = 1; i <= 5; i++) {
          headerRow.push(`${prefix}${i}`);
        }
      } else {
        headerRow.push(col.label);
      }
    });

    const csvLines = [headerRow.join(csvDelimiter)];

    // Build rows
    data.forEach((row) => {
      const lineValues: string[] = [];
      activeCols.forEach((col) => {
        const val = getRowValue(row, col);

        if (splitArrays && (col.key === "winning_numbers" || col.key === "machine_numbers")) {
          const arr = Array.isArray(val) ? val : [];
          for (let i = 0; i < 5; i++) {
            lineValues.push(arr[i] !== undefined ? String(arr[i]) : "");
          }
        } else {
          if (Array.isArray(val)) {
            lineValues.push(`"${val.join("-")}"`);
          } else if (val === null || val === undefined) {
            lineValues.push("");
          } else {
            const strVal = String(val).replace(/"/g, '""');
            lineValues.push(strVal.includes(csvDelimiter) || strVal.includes("\n") ? `"${strVal}"` : strVal);
          }
        }
      });
      csvLines.push(lineValues.join(csvDelimiter));
    });

    return csvLines.join("\n");
  };

  const convertToJSON = (): string => {
    const activeCols = actualColumns.filter((c) => selectedColumns.includes(c.key));
    const filteredData = data.map((row) => {
      const filteredRow: any = {};
      activeCols.forEach((col) => {
        filteredRow[col.key] = getRowValue(row, col);
      });
      return filteredRow;
    });
    return JSON.stringify(filteredData, null, 2);
  };

  const triggerDownload = (content: string, mimeType: string, extension: string) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    // Deterministic timestamp (from local time metadata or standard iso format)
    const dateStr = new Date().toISOString().split("T")[0];
    const fileName = `${defaultFileName}-${dateStr}.${extension}`;
    
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "✓ Exportation réussie",
      description: `${data.length} enregistrements sauvegardés sous ${fileName}`,
    });
  };

  const handleExportCSV = () => {
    if (data.length === 0) {
      toast({
        title: "Données vides",
        description: "Aucun enregistrement à exporter.",
        variant: "destructive",
      });
      return;
    }
    const csvContent = convertToCSV();
    triggerDownload(csvContent, "text/csv", "csv");
  };

  const handleExportJSON = () => {
    if (data.length === 0) {
      toast({
        title: "Données vides",
        description: "Aucun enregistrement à exporter.",
        variant: "destructive",
      });
      return;
    }
    const jsonContent = convertToJSON();
    triggerDownload(jsonContent, "application/json", "json");
  };

  const handleCopyToClipboard = () => {
    if (data.length === 0) {
      toast({
        title: "Données vides",
        description: "Aucune donnée à copier.",
        variant: "destructive",
      });
      return;
    }
    try {
      const csvContent = convertToCSV();
      navigator.clipboard.writeText(csvContent);
      setCopied(true);
      toast({
        title: "✓ Copié dans le presse-papiers",
        description: "Format CSV copié avec succès !",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Échec de copie",
        description: "Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`} id={id}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} className={`gap-2 ${className.includes("w-full") ? "w-full" : ""} ${className.includes("h-11") ? "h-11" : "h-9"}`} id={`${id}-trigger`}>
            <Download className="w-4 h-4" />
            <span>{buttonText}</span>
            <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] bg-primary/10 text-primary border-none">
              {data.length}
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" id={`${id}-content`}>
          <DropdownMenuLabel className="font-bold">Formats d'Export</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuCheckboxItem
            id={`${id}-opt-csv`}
            onClick={handleExportCSV}
            className="cursor-pointer gap-2 py-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Exporter en CSV (.csv)</span>
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            id={`${id}-opt-json`}
            onClick={handleExportJSON}
            className="cursor-pointer gap-2 py-2"
          >
            <FileCode className="w-4 h-4 text-amber-500" />
            <span>Exporter en JSON (.json)</span>
          </DropdownMenuCheckboxItem>

          <DropdownMenuCheckboxItem
            id={`${id}-opt-copy`}
            onClick={handleCopyToClipboard}
            className="cursor-pointer gap-2 py-2"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Clipboard className="w-4 h-4 text-blue-500" />
            )}
            <span>Copier le CSV</span>
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />

          {/* Config Popover embedded */}
          <div className="px-2 py-1.5">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs text-muted-foreground hover:text-foreground">
                  <Settings2 className="w-3.5 h-3.5" />
                  Options Avancées
                </Button>
              </PopoverTrigger>
              <PopoverContent side="left" className="w-64 p-4 space-y-4" id={`${id}-popover`}>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Colonnes à Inclure</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                    {actualColumns.map((col) => {
                      const isChecked = selectedColumns.includes(col.key);
                      return (
                        <div
                          key={col.key}
                          onClick={() => handleToggleColumn(col.key)}
                          className="flex items-center gap-2 px-2 py-1 hover:bg-muted rounded-md text-xs cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded border-border text-primary focus:ring-primary w-3 h-3"
                          />
                          <span className="truncate">{col.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-border/60 pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs cursor-pointer" htmlFor={`${id}-split-arrays`}>
                      Séparer les numéros en colonnes distinctes (N1-N5)
                    </Label>
                    <input
                      id={`${id}-split-arrays`}
                      type="checkbox"
                      checked={splitArrays}
                      onChange={(e) => setSplitArrays(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 ml-2"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Séparateur CSV</Label>
                    <div className="flex gap-2">
                      <Button
                        id={`${id}-sep-semicolon`}
                        size="sm"
                        variant={csvDelimiter === ";" ? "default" : "outline"}
                        onClick={() => setCsvDelimiter(";")}
                        className="h-7 text-xs flex-1"
                      >
                        Point-virgule (;)
                      </Button>
                      <Button
                        id={`${id}-sep-comma`}
                        size="sm"
                        variant={csvDelimiter === "," ? "default" : "outline"}
                        onClick={() => setCsvDelimiter(",")}
                        className="h-7 text-xs flex-1"
                      >
                        Virgule (,)
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
