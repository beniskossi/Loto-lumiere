import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { useSubmitFeedback } from "@/hooks/usePredictionFeedback";

interface PredictionFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  predictionId: string;
  predictedNumbers: number[];
}

export const PredictionFeedbackDialog = ({
  open,
  onOpenChange,
  predictionId,
  predictedNumbers,
}: PredictionFeedbackDialogProps) => {
  const [rating, setRating] = useState(0);
  const [matches, setMatches] = useState(0);
  const [comments, setComments] = useState("");
  const submitFeedback = useSubmitFeedback();

  const handleSubmit = async () => {
    if (rating === 0) return;

    await submitFeedback.mutateAsync({
      prediction_id: predictionId,
      rating,
      matches,
      comments: comments || undefined,
    });

    setRating(0);
    setMatches(0);
    setComments("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Évaluer cette prédiction</DialogTitle>
          <DialogDescription>
            Votre feedback nous aide à améliorer les algorithmes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Note globale</Label>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-colors"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Numéros matchés (0-5)</Label>
            <div className="flex gap-2 mt-2">
              {[0, 1, 2, 3, 4, 5].map((num) => (
                <Button
                  key={num}
                  variant={matches === num ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMatches(num)}
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label>Commentaires (optionnel)</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Partagez votre expérience..."
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={rating === 0 || submitFeedback.isPending}>
            {submitFeedback.isPending ? "Envoi..." : "Envoyer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
