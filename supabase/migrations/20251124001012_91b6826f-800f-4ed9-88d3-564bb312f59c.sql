-- ============================================================================
-- COMPREHENSIVE FIX MIGRATION (Fixed)
-- 1. Create collaborative_predictions table
-- 2. Remove duplicate algorithm_configurations table
-- ============================================================================

-- 1. Create collaborative_predictions table for community voting
CREATE TABLE IF NOT EXISTS public.collaborative_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  draw_name TEXT NOT NULL,
  predicted_numbers INTEGER[] NOT NULL,
  votes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on collaborative_predictions
ALTER TABLE public.collaborative_predictions ENABLE ROW LEVEL SECURITY;

-- Validation trigger function for predicted numbers
CREATE OR REPLACE FUNCTION public.validate_collaborative_prediction_numbers()
RETURNS TRIGGER AS $$
BEGIN
  -- Check array length is exactly 5
  IF array_length(NEW.predicted_numbers, 1) != 5 THEN
    RAISE EXCEPTION 'predicted_numbers must contain exactly 5 numbers';
  END IF;
  
  -- Check all numbers are between 1 and 90
  IF EXISTS (
    SELECT 1 FROM unnest(NEW.predicted_numbers) AS num 
    WHERE num < 1 OR num > 90
  ) THEN
    RAISE EXCEPTION 'All numbers must be between 1 and 90';
  END IF;
  
  -- Check for duplicates
  IF array_length(NEW.predicted_numbers, 1) != 
     (SELECT COUNT(DISTINCT unnest) FROM unnest(NEW.predicted_numbers)) THEN
    RAISE EXCEPTION 'predicted_numbers must not contain duplicates';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_collaborative_prediction_numbers_trigger
  BEFORE INSERT OR UPDATE ON public.collaborative_predictions
  FOR EACH ROW EXECUTE FUNCTION public.validate_collaborative_prediction_numbers();

-- RLS Policies for collaborative_predictions
CREATE POLICY "Anyone can view collaborative predictions"
  ON public.collaborative_predictions
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create predictions"
  ON public.collaborative_predictions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own predictions"
  ON public.collaborative_predictions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own predictions"
  ON public.collaborative_predictions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create votes table for tracking who voted for what
CREATE TABLE IF NOT EXISTS public.collaborative_prediction_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prediction_id UUID NOT NULL REFERENCES public.collaborative_predictions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, prediction_id)
);

-- Enable RLS on votes
ALTER TABLE public.collaborative_prediction_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view votes"
  ON public.collaborative_prediction_votes
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON public.collaborative_prediction_votes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their votes"
  ON public.collaborative_prediction_votes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update votes_count
CREATE OR REPLACE FUNCTION public.update_prediction_votes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.collaborative_predictions
    SET votes_count = votes_count + 1
    WHERE id = NEW.prediction_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.collaborative_predictions
    SET votes_count = votes_count - 1
    WHERE id = OLD.prediction_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_votes_count_trigger
  AFTER INSERT OR DELETE ON public.collaborative_prediction_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_prediction_votes_count();

-- 2. Remove duplicate algorithm_configurations table
-- First check if there's any data we need to preserve
DO $$
BEGIN
  -- If algorithm_configurations exists, copy its data to algorithm_config using dynamic SQL to prevent parser errors
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'algorithm_configurations') THEN
    EXECUTE '
      INSERT INTO public.algorithm_config (algorithm_name, is_enabled, weight, parameters, description)
      SELECT 
        ac.algorithm_name,
        COALESCE(ac.is_enabled, true),
        COALESCE(ac.weight, 1.0),
        COALESCE(ac.parameters, ''{}''::jsonb),
        NULL
      FROM public.algorithm_configurations ac
      WHERE NOT EXISTS (
        SELECT 1 FROM public.algorithm_config cfg
        WHERE cfg.algorithm_name = ac.algorithm_name
      )
      ON CONFLICT (algorithm_name) DO NOTHING;
    ';
  END IF;
END $$;

-- Now drop the duplicate table
DROP TABLE IF EXISTS public.algorithm_configurations CASCADE;

-- Add indexes for collaborative predictions performance
CREATE INDEX IF NOT EXISTS idx_collaborative_predictions_draw_name 
  ON public.collaborative_predictions(draw_name);
CREATE INDEX IF NOT EXISTS idx_collaborative_predictions_user_id 
  ON public.collaborative_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_predictions_votes 
  ON public.collaborative_predictions(votes_count DESC);
CREATE INDEX IF NOT EXISTS idx_collab_votes_prediction_id 
  ON public.collaborative_prediction_votes(prediction_id);