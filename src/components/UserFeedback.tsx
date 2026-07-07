import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const UserFeedback = () => {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !feedback.trim()) return;

    setIsSubmitting(true);
    try {
      // Sauvegarder le feedback dans user_prediction_feedback
      const { error } = await supabase
        .from("user_prediction_feedback")
        .insert({
          user_id: user.id,
          rating: rating || null,
          comments: feedback.trim(),
        });

      if (error) throw error;
      
      toast.success("Merci pour votre retour !");
      setFeedback("");
      setRating(0);
    } catch (error) {
      console.error("Feedback error:", error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Votre Avis Compte
        </CardTitle>
        <CardDescription>
          Aidez-nous à améliorer LOTO LUMIÈRE avec vos suggestions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Note générale</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`p-1 rounded transition-colors ${
                  star <= rating 
                    ? "text-yellow-500" 
                    : "text-muted-foreground hover:text-yellow-400"
                }`}
              >
                <Star className="w-5 h-5 fill-current" />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <Badge variant="outline" className="mt-2">
              {rating === 5 ? "Excellent" : 
               rating === 4 ? "Très bien" :
               rating === 3 ? "Bien" :
               rating === 2 ? "Moyen" : "À améliorer"}
            </Badge>
          )}
        </div>

        <div>
          <Textarea
            placeholder="Partagez votre expérience, suggestions d'amélioration, bugs rencontrés..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!feedback.trim() || isSubmitting}
          className="w-full gap-2"
        >
          <Send className="w-4 h-4" />
          {isSubmitting ? "Envoi..." : "Envoyer le feedback"}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Vos commentaires nous aident à améliorer l'application
        </p>
      </CardContent>
    </Card>
  );
};
