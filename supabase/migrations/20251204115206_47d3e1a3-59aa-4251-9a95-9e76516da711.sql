-- Fix the overly permissive RLS policy on orchestration_history
-- Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "Service can insert orchestration history" ON public.orchestration_history;

-- Create a new policy that restricts INSERT to service_role only
CREATE POLICY "Service role can insert orchestration history"
ON public.orchestration_history
FOR INSERT
TO service_role
WITH CHECK (true);