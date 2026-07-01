import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences, useUpdatePreferences } from "@/hooks/useUserPreferences";
import { useAlgorithmConfigs } from "@/hooks/useAlgorithmConfig";
import { Palette, Sparkles, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const PersonalizationSettings = () => {
  const { user } = useAuth();
  const { data: preferences } = useUserPreferences(user?.id);
  const { data: algorithms } = useAlgorithmConfigs();
  const updatePreferences = useUpdatePreferences();

  const [preferredAlgorithm, setPreferredAlgorithm] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1e3a5f");
  const [accentColor, setAccentColor] = useState("#d4af37");

  useEffect(() => {
    if (preferences) {
      setPreferredAlgorithm(preferences.preferred_algorithm || "");
      setPrimaryColor(preferences.theme_primary_color || "#1e3a5f");
      setAccentColor(preferences.theme_accent_color || "#d4af37");
    }
  }, [preferences]);

  const handleSave = async () => {
    if (!user) return;

    try {
      await updatePreferences.mutateAsync({
        userId: user.id,
        preferences: {
          preferred_algorithm: preferredAlgorithm,
          theme_primary_color: primaryColor,
          theme_accent_color: accentColor,
        }
      });
      toast.success("Préférences enregistrées");
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const enabledAlgorithms = algorithms?.filter(a => a.is_enabled) || [];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Algorithme Préféré
          </CardTitle>
          <CardDescription>
            Choisissez l'algorithme de prédiction que vous préférez utiliser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="algorithm">Algorithme de prédiction</Label>
              <Select
                value={preferredAlgorithm}
                onValueChange={setPreferredAlgorithm}
              >
                <SelectTrigger id="algorithm" className="w-full">
                  <SelectValue placeholder="Sélectionner un algorithme" />
                </SelectTrigger>
                <SelectContent>
                  {enabledAlgorithms.map((algo) => (
                    <SelectItem key={algo.id} value={algo.algorithm_name}>
                      {algo.algorithm_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                L'algorithme sélectionné sera utilisé en priorité pour générer vos prédictions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Thème Personnalisé
          </CardTitle>
          <CardDescription>
            Personnalisez les couleurs de l'application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="primary-color">Couleur Principale</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1"
                  placeholder="#1e3a5f"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="accent-color">Couleur d'Accent</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="accent-color"
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1"
                  placeholder="#d4af37"
                />
              </div>
            </div>

            <div className="p-4 rounded-lg border" style={{ 
              backgroundColor: primaryColor + "20",
              borderColor: accentColor
            }}>
              <p className="text-sm font-medium mb-2">Aperçu du thème</p>
              <div className="flex gap-2">
                <div 
                  className="w-12 h-12 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
                <div 
                  className="w-12 h-12 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              ⚠️ Les changements de thème nécessitent un rechargement de la page
            </p>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={updatePreferences.isPending}
        className="w-full gap-2"
      >
        <Save className="w-4 h-4" />
        Enregistrer les préférences
      </Button>
    </div>
  );
};