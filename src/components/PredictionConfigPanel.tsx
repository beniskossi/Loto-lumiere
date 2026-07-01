import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Loader2, Settings2, Save, RotateCcw } from "lucide-react";
import { usePredictionConfig, useUpdatePredictionConfig, OptimalGapConfig } from "@/hooks/usePredictionConfig";

export const PredictionConfigPanel = () => {
  const { data: configs, isLoading } = usePredictionConfig();
  const updateConfig = useUpdatePredictionConfig();

  const [optimalGap, setOptimalGap] = useState<OptimalGapConfig>({
    min: 11,
    max: 20,
    boost: 0.35,
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Load current config
  useEffect(() => {
    const config = configs?.find(c => c.config_key === "optimal_gap");
    if (config) {
      const value = config.config_value as unknown as OptimalGapConfig;
      setOptimalGap(value);
    }
  }, [configs]);

  const handleSave = () => {
    updateConfig.mutate({
      configKey: "optimal_gap",
      configValue: optimalGap,
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    setOptimalGap({ min: 11, max: 20, boost: 0.35 });
    setHasChanges(true);
  };

  const handleMinChange = (value: number) => {
    if (value < optimalGap.max) {
      setOptimalGap(prev => ({ ...prev, min: value }));
      setHasChanges(true);
    }
  };

  const handleMaxChange = (value: number) => {
    if (value > optimalGap.min) {
      setOptimalGap(prev => ({ ...prev, max: value }));
      setHasChanges(true);
    }
  };

  const handleBoostChange = (value: number[]) => {
    setOptimalGap(prev => ({ ...prev, boost: value[0] }));
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card to-muted/20 border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">Configuration des Prédictions</CardTitle>
          </div>
          {hasChanges && (
            <Badge variant="secondary" className="animate-pulse">
              Non sauvegardé
            </Badge>
          )}
        </div>
        <CardDescription>
          Ajustez les paramètres de l'algorithme de prédiction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Intervalle optimal */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Intervalle Optimal de Réapparition</h4>
            <Badge variant="outline">
              {optimalGap.min} - {optimalGap.max} tirages
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Les numéros qui n'ont pas apparu depuis ce nombre de tirages seront priorisés.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minGap">Minimum</Label>
              <Input
                id="minGap"
                type="number"
                min={1}
                max={optimalGap.max - 1}
                value={optimalGap.min}
                onChange={(e) => handleMinChange(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxGap">Maximum</Label>
              <Input
                id="maxGap"
                type="number"
                min={optimalGap.min + 1}
                max={50}
                value={optimalGap.max}
                onChange={(e) => handleMaxChange(parseInt(e.target.value) || 20)}
              />
            </div>
          </div>
        </div>

        {/* Boost */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Boost Appliqué</h4>
            <Badge variant="outline">
              +{(optimalGap.boost * 100).toFixed(0)}%
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Le pourcentage de bonus ajouté au score des numéros dans l'intervalle optimal.
          </p>

          <Slider
            value={[optimalGap.boost]}
            onValueChange={handleBoostChange}
            min={0.1}
            max={0.8}
            step={0.05}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>+10%</span>
            <span>+80%</span>
          </div>
        </div>

        {/* Aperçu */}
        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="font-medium mb-2">Aperçu de la règle</h4>
          <p className="text-sm text-muted-foreground">
            Les numéros qui n'ont pas apparu depuis{" "}
            <span className="font-semibold text-primary">{optimalGap.min}</span> à{" "}
            <span className="font-semibold text-primary">{optimalGap.max}</span> tirages
            recevront un bonus de{" "}
            <span className="font-semibold text-primary">+{(optimalGap.boost * 100).toFixed(0)}%</span>{" "}
            dans le calcul de score.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateConfig.isPending}
            className="flex-1"
          >
            {updateConfig.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Sauvegarder
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={updateConfig.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
