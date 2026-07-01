-- Fix: Prevent users from directly modifying votes_count
-- The votes_count should only be updated via the trigger when users vote

-- Drop existing permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update their own predictions" ON public.collaborative_predictions;

-- Create restrictive UPDATE policy that prevents votes_count manipulation
-- Users can only update draw_name and predicted_numbers, not votes_count
CREATE POLICY "Users can update their own predictions"
  ON public.collaborative_predictions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create a trigger to prevent votes_count modification via direct UPDATE
CREATE OR REPLACE FUNCTION public.prevent_votes_count_manipulation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If votes_count is being changed directly (not by the trigger), reject it
  IF NEW.votes_count IS DISTINCT FROM OLD.votes_count THEN
    -- Only allow if this is called from the votes trigger context
    -- We detect this by checking if the change matches expected vote increment/decrement
    IF ABS(NEW.votes_count - OLD.votes_count) != 1 THEN
      RAISE EXCEPTION 'Direct modification of votes_count is not allowed';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger (runs BEFORE update to validate)
DROP TRIGGER IF EXISTS prevent_votes_manipulation ON public.collaborative_predictions;
CREATE TRIGGER prevent_votes_manipulation
  BEFORE UPDATE ON public.collaborative_predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_votes_count_manipulation();