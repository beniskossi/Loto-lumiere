-- Fix overly permissive RLS policy on precalculated_predictions
-- Drop the permissive policy that allows anyone to manage data
DROP POLICY IF EXISTS "Service can manage precalculated predictions" ON public.precalculated_predictions;

-- Create a restrictive policy for service_role only
-- Note: Edge functions using SUPABASE_SERVICE_ROLE_KEY bypass RLS anyway,
-- but this prevents direct API access from anonymous/authenticated users
CREATE POLICY "Service role can manage precalculated predictions" 
ON public.precalculated_predictions 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');