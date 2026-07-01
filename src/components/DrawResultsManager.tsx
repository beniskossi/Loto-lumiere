import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useDrawResultsPaginated, DrawResult } from "@/hooks/useDrawResults";
import { NumberBall } from "@/components/NumberBall";
import { Edit2, Trash2, Calendar, Clock, CalendarIcon, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DRAW_SCHEDULE } from "@/types/lottery";

export const DrawResultsManager = () => {
  const { toast } = useToast();
  const [selectedDrawName, setSelectedDrawName] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 20;
  
  const { data: paginatedData, refetch } = useDrawResultsPaginated(
    selectedDrawName === "all" ? undefined : selectedDrawName,
    currentPage,
    resultsPerPage
  );
  
  const paginatedResults = paginatedData?.data || [];
  const totalPages = paginatedData?.totalPages || 0;
  const totalCount = paginatedData?.count || 0;
  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = Math.min(startIndex + resultsPerPage, totalCount);
  
  const [editingResult, setEditingResult] = useState<DrawResult | null>(null);
  const [deletingResult, setDeletingResult] = useState<DrawResult | null>(null);
  const [editNumbers, setEditNumbers] = useState<string[]>([]);
  const [editMachineNumbers, setEditMachineNumbers] = useState<string[]>([]);
  const [showMachineNumbers, setShowMachineNumbers] = useState(false);
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  // Get unique draw names for filter (fetch separately)
  const { data: allDrawNames } = useDrawResultsPaginated(undefined, 1, 1000);
  const drawNames = Array.from(new Set((allDrawNames?.data || []).map(r => r.draw_name))).sort();

  // Reset to first page when filter changes
  const handleDrawFilterChange = (value: string) => {
    setSelectedDrawName(value);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleEditClick = (result: DrawResult) => {
    setEditingResult(result);
    setEditNumbers(result.winning_numbers.map(n => n.toString()));
    setEditMachineNumbers(result.machine_numbers?.map(n => n.toString()) || ["", "", "", "", ""]);
    setShowMachineNumbers(!!result.machine_numbers && result.machine_numbers.length > 0);
    setEditDate(new Date(result.draw_date));
  };

  const handleEditNumberChange = (index: number, value: string) => {
    const newNumbers = [...editNumbers];
    newNumbers[index] = value;
    setEditNumbers(newNumbers);
  };

  const handleEditMachineNumberChange = (index: number, value: string) => {
    const newMachineNumbers = [...editMachineNumbers];
    newMachineNumbers[index] = value;
    setEditMachineNumbers(newMachineNumbers);
  };

  const handleUpdateResult = async () => {
    if (!editingResult) return;

    const winningNumbers = editNumbers.map(n => parseInt(n)).filter(n => n >= 1 && n <= 90);
    if (winningNumbers.length !== 5) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer 5 numéros valides entre 1 et 90",
        variant: "destructive",
      });
      return;
    }

    // Validate machine numbers if provided
    const parsedMachineNumbers = showMachineNumbers 
      ? editMachineNumbers.map(n => parseInt(n)).filter(n => n >= 1 && n <= 90)
      : [];
    
    if (showMachineNumbers && parsedMachineNumbers.length > 0 && parsedMachineNumbers.length !== 5) {
      toast({
        title: "Erreur",
        description: "Les numéros machine doivent être soit vides, soit 5 numéros valides entre 1 et 90",
        variant: "destructive",
      });
      return;
    }

    if (!editDate) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une date",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const updateData: any = { 
        winning_numbers: winningNumbers,
        draw_date: format(editDate, "yyyy-MM-dd")
      };

      if (parsedMachineNumbers.length === 5) {
        updateData.machine_numbers = parsedMachineNumbers;
      } else {
        updateData.machine_numbers = null;
      }

      const { error } = await supabase
        .from("draw_results")
        .update(updateData)
        .eq("id", editingResult.id);

      if (error) throw error;

      toast({
        title: "✓ Résultat modifié",
        description: "Le résultat a été mis à jour avec succès",
      });

      setEditingResult(null);
      setEditDate(undefined);
      setShowMachineNumbers(false);
      refetch();
    } catch (error) {
      console.error("Error updating result:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le résultat",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteResult = async () => {
    if (!deletingResult) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("draw_results")
        .delete()
        .eq("id", deletingResult.id);

      if (error) throw error;

      toast({
        title: "✓ Résultat supprimé",
        description: "Le résultat a été supprimé avec succès",
      });

      setDeletingResult(null);
      refetch();
    } catch (error) {
      console.error("Error deleting result:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le résultat",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-card to-muted/20 border-border/50 animate-fade-in shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Edit2 className="w-5 h-5 text-primary" />
            </div>
            Gérer les Résultats
          </CardTitle>
          <CardDescription>
            Modifier ou supprimer les résultats des tirages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedDrawName} onValueChange={handleDrawFilterChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrer par tirage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les tirages</SelectItem>
                  {drawNames.map((drawName) => (
                    <SelectItem key={drawName} value={drawName}>
                      {drawName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {totalCount} résultat{totalCount > 1 ? 's' : ''}
              {selectedDrawName !== "all" && ` pour ${selectedDrawName}`}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Tirage</TableHead>
                  <TableHead>Numéros</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Aucun résultat trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(result.draw_date), "dd MMM yyyy", { locale: fr })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{result.draw_name}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {result.draw_time}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Gagnants</p>
                            <div className="flex gap-1 flex-wrap">
                              {result.winning_numbers.map((num, idx) => (
                                <NumberBall key={`${num}-${idx}`} number={num} size="sm" />
                              ))}
                            </div>
                          </div>
                          {result.machine_numbers && result.machine_numbers.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Machine</p>
                              <div className="flex gap-1 flex-wrap">
                                {result.machine_numbers.map((num, idx) => (
                                  <NumberBall key={`machine-${num}-${idx}`} number={num} size="sm" className="opacity-70" />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(result)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeletingResult(result)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} sur {totalPages}
                <span className="ml-2">
                  ({startIndex + 1}-{endIndex} sur {totalCount})
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingResult} onOpenChange={() => setEditingResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le Résultat</DialogTitle>
            <DialogDescription>
              {editingResult && (
                <>
                  {editingResult.draw_name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date du Tirage</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-2",
                      !editDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editDate ? format(editDate, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={editDate}
                    onSelect={setEditDate}
                    initialFocus
                    locale={fr}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label>Numéros Gagnants</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {editNumbers.map((num, idx) => (
                  <Input
                    key={idx}
                    type="number"
                    min="1"
                    max="90"
                    value={num}
                    onChange={(e) => handleEditNumberChange(idx, e.target.value)}
                    placeholder={`N°${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Numéros Machine (facultatif)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMachineNumbers(!showMachineNumbers)}
                  className="h-auto py-1 px-2 text-xs"
                >
                  {showMachineNumbers ? "Masquer" : "Afficher"}
                </Button>
              </div>
              {showMachineNumbers && (
                <div className="grid grid-cols-5 gap-2">
                  {editMachineNumbers.map((num, idx) => (
                    <Input
                      key={idx}
                      type="number"
                      min="1"
                      max="90"
                      value={num}
                      onChange={(e) => handleEditMachineNumberChange(idx, e.target.value)}
                      placeholder={`M°${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingResult(null)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateResult} disabled={isLoading}>
              {isLoading ? "Modification..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingResult} onOpenChange={() => setDeletingResult(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce résultat ?
              {deletingResult && (
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <div className="font-medium">{deletingResult.draw_name}</div>
                  <div className="text-sm">
                    {format(new Date(deletingResult.draw_date), "dd MMMM yyyy", { locale: fr })}
                  </div>
                </div>
              )}
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteResult}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
