import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PredictionInput {
  algorithm: string;
  numbers: number[];
  confidence: number;
  factors: string[];
  score: number;
}

interface PatternAnalysis {
  type: string;
  description: string;
  strength: number;
  affectedNumbers: number[];
  icon?: string;
}

interface AdvancedInsight {
  category: "statistical" | "temporal" | "spatial" | "behavioral";
  title: string;
  description: string;
  impact: "positive" | "neutral" | "negative";
  confidence: number;
}

export interface AIAnalysisResult {
  recommendedNumbers: number[];
  analysis: string;
  confidenceScore: number;
  patterns: PatternAnalysis[];
  reasoning: string[];
  advancedInsights: AdvancedInsight[];
  timestamp: string;
  executionTime: number;
  mode: "ai" | "quick";
  modelUsed?: string;
}

export const useAIPredictionAnalyzer = () => {
  return useMutation({
    mutationFn: async ({ 
      predictions, 
      drawName,
      useQuickAnalysis = false,
    }: { 
      predictions: PredictionInput[]; 
      drawName: string;
      useQuickAnalysis?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('ai-prediction-analyzer', {
        body: { predictions, drawName, useQuickAnalysis },
      });

      if (error) {
        console.error('Erreur fonction AI analyzer:', error);
        
        // Gérer les erreurs spécifiques
        if (error.message?.includes('401')) {
          throw new Error('Authentification requise pour l\'analyse IA');
        }
        if (error.message?.includes('429')) {
          throw new Error('RATE_LIMIT_EXCEEDED');
        }
        if (error.message?.includes('402')) {
          throw new Error('CREDITS_EXHAUSTED');
        }
        throw error;
      }

      return data as AIAnalysisResult;
    },
    onError: (error: Error) => {
      console.error('Erreur analyse IA:', error);
      
      if (error.message === 'RATE_LIMIT_EXCEEDED' || error.message?.includes('429')) {
        toast.error("Trop de requêtes. Réessayez dans quelques instants.", {
          description: "Limite de requêtes IA atteinte",
        });
      } else if (error.message === 'CREDITS_EXHAUSTED' || error.message?.includes('402')) {
        toast.error("Crédits IA épuisés", {
          description: "Veuillez recharger votre compte Lovable AI",
        });
      } else if (error.message?.includes('Authentification')) {
        toast.error("Connexion requise", {
          description: "Veuillez vous connecter pour utiliser l'analyse IA",
        });
      } else {
        toast.error("Erreur lors de l'analyse IA", {
          description: "Une erreur inattendue s'est produite",
        });
      }
    },
  });
};
