-- =============================================================
-- FIX 1: Protect profiles table from unauthorized access
-- Issue: profiles_table_public_exposure (error level)
-- =============================================================

-- Drop the existing permissive SELECT policy  
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a stricter policy that:
-- 1. Requires authentication (auth.uid() IS NOT NULL)
-- 2. Only allows users to see their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

-- Add policy for admins to view all profiles (needed for admin dashboard)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================================
-- FIX 2: Restrict prediction_config to authenticated users only
-- Issue: prediction_config_business_logic (error level)
-- =============================================================

-- Drop the existing public SELECT policy
DROP POLICY IF EXISTS "Anyone can view prediction config" ON public.prediction_config;

-- Create policy requiring authentication for viewing
CREATE POLICY "Authenticated users can view prediction config" 
ON public.prediction_config 
FOR SELECT 
USING (auth.uid() IS NOT NULL);