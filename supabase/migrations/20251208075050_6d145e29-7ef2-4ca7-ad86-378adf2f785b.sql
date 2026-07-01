-- Fix PUBLIC_DATA_EXPOSURE: Restrict algorithm_training_history to admins only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view training history" ON public.algorithm_training_history;

-- Create a new policy that restricts access to admins only
CREATE POLICY "Only admins can view training history"
ON public.algorithm_training_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));