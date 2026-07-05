import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAlgorithmConfigs, useUpdateAlgorithmConfig } from "@/hooks/useAlgorithmConfig";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Save } from "lucide-react";
import { useState } from "react";

export const AlgorithmManagement = () => {
  const { data: algorithms, isLoading } = useAlgorithmConfigs();
  const updateConfig = useUpdateAlgorithmConfig();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ weight: number; enabled: boolean }>({
    weight: 1,
    enabled: true
  });

  const handleStartEdit = (id: string, weight: number, enabled: boolean) => {
    setEditingId(id);
    setEditValues({ weight, enabled });
  };

  const handleSave = async (id: string) => {
    await updateConfig.mutateAsync({
      id,
      updates: {
        weight: editValues.weight,
        is_enabled: editValues.enabled
      }
    });
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border/50 shadow-sm animate-fade-in hover:shadow-glow transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          Gestion des Algorithmes
        </CardTitle>
        <CardDescription className="text-base">
          Activez/désactivez les algorithmes et ajustez leurs poids
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {algorithms?.map((algo) => {
          const isEditing = editingId === algo.id;
          const currentWeight = isEditing ? editValues.weight : algo.weight;
          const currentEnabled = isEditing ? editValues.enabled : algo.is_enabled;

          return (
            <div
              key={algo.id}
              className={`p-4 rounded-lg border transition-all ${
                currentEnabled 
                  ? "bg-primary/5 border-primary/30" 
                  : "bg-muted/30 border-muted"
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-base">{algo.algorithm_name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {algo.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={currentEnabled}
                    onCheckedChange={(checked) => {
                      if (isEditing) {
                        setEditValues(prev => ({ ...prev, enabled: checked }));
                      } else {
                        handleStartEdit(algo.id, algo.weight, checked);
                      }
                    }}
                  />
                  <Label className="text-sm">
                    {currentEnabled ? "Activé" : "Désactivé"}
                  </Label>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm">Poids de l'algorithme</Label>
                    <span className="text-sm font-medium">{currentWeight.toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[currentWeight]}
                    onValueChange={(value) => {
                      if (!isEditing) {
                        handleStartEdit(algo.id, value[0], algo.is_enabled);
                      } else {
                        setEditValues(prev => ({ ...prev, weight: value[0] }));
                      }
                    }}
                    min={0}
                    max={2}
                    step={0.1}
                    className="w-full"
                    disabled={!currentEnabled}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Plus le poids est élevé, plus l'algorithme influence les prédictions
                  </p>
                </div>

                {isEditing && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleSave(algo.id)}
                      disabled={updateConfig.isPending}
                      className="gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Enregistrer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Annuler
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};