import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, TrendingDown, PiggyBank, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export function ResponsiblePlay() {
  const [budget, setBudget] = useState<number>(0);
  const [spent, setSpent] = useState<number>(0);

  useEffect(() => {
    const savedBudget = localStorage.getItem("loto_budget");
    const savedSpent = localStorage.getItem("loto_spent");
    if (savedBudget) setBudget(Number(savedBudget));
    if (savedSpent) setSpent(Number(savedSpent));
  }, []);

  const handleSetBudget = () => {
    const newBudget = prompt("Définissez votre budget mensuel maximum (en €):", budget.toString());
    if (newBudget !== null && !isNaN(Number(newBudget)) && Number(newBudget) >= 0) {
      setBudget(Number(newBudget));
      localStorage.setItem("loto_budget", newBudget);
      toast.success("Budget mis à jour");
    }
  };

  const handleAddExpense = () => {
    const expense = prompt("Combien avez-vous dépensé pour ce tirage ? (en €):");
    if (expense !== null && !isNaN(Number(expense)) && Number(expense) >= 0) {
      const newSpent = spent + Number(expense);
      setSpent(newSpent);
      localStorage.setItem("loto_spent", newSpent.toString());
      toast.info(`Dépense ajoutée : ${expense}€`);
      
      if (budget > 0 && newSpent > budget) {
        toast.error("Attention : Vous avez dépassé votre budget mensuel !", {
          duration: 5000,
        });
      }
    }
  };

  const handleResetSpent = () => {
    if (confirm("Voulez-vous remettre vos dépenses à zéro pour ce mois ?")) {
      setSpent(0);
      localStorage.setItem("loto_spent", "0");
      toast.success("Dépenses réinitialisées");
    }
  };

  const spentPercentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  
  return (
    <Card className="border-orange-200 bg-orange-50/30 dark:bg-orange-950/10 dark:border-orange-900/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-orange-500" />
          <CardTitle className="text-base text-orange-700 dark:text-orange-400">Jeu Responsable</CardTitle>
        </div>
        <CardDescription>
          Gardez le contrôle sur vos dépenses. Les jeux d'argent comportent des risques.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {budget > 0 ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Dépenses : <strong>{spent}€</strong></span>
              <span>Budget max : <strong>{budget}€</strong></span>
            </div>
            <Progress 
              value={spentPercentage} 
              className={`h-2 ${spentPercentage >= 90 ? "bg-red-200 [&>div]:bg-red-600" : "bg-orange-200 [&>div]:bg-orange-500"}`} 
            />
            {spentPercentage >= 100 && (
              <div className="flex items-start gap-2 text-red-600 text-sm mt-2 bg-red-50 p-2 rounded-md">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Vous avez dépassé votre limite. Il est recommandé de faire une pause.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground flex items-center gap-2 bg-background p-3 rounded-md border border-dashed">
            <PiggyBank className="w-4 h-4" />
            Aucun budget défini. Fixez une limite pour mieux contrôler votre jeu.
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleSetBudget} className="text-xs border-orange-200 hover:bg-orange-100">
            {budget > 0 ? "Modifier le budget" : "Définir un budget"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddExpense} className="text-xs border-orange-200 hover:bg-orange-100">
            Ajouter une dépense
          </Button>
          {spent > 0 && (
            <Button variant="ghost" size="sm" onClick={handleResetSpent} className="text-xs text-muted-foreground">
              Remettre à zéro
            </Button>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground mt-4 pt-4 border-t flex flex-col gap-1">
          <p>⚠️ Jouer comporte des risques : endettement, isolement, dépendance.</p>
          <p>Pour être aidé, appelez le 09 74 75 13 13 (appel non surtaxé).</p>
        </div>
      </CardContent>
    </Card>
  );
}
