-- Fix 1: Remove public access to scraping_jobs, keep only admin access
DROP POLICY IF EXISTS "Anyone can view scraping jobs" ON public.scraping_jobs;

-- Fix 2: Enable RLS on algorithm_rankings materialized view and restrict to admins
-- Note: algorithm_rankings is a view, we need to handle it appropriately
-- First check if RLS can be enabled (views don't support RLS directly)
-- We'll revoke public access and grant only to authenticated users via function

-- Revoke direct access to the view from public roles
REVOKE ALL ON public.algorithm_rankings FROM anon, authenticated;

-- Grant access only through the existing RPC function (get_algorithm_rankings_detailed)
-- which already has SECURITY DEFINER

-- Fix 3: Restrict admin access to profiles - remove blanket admin SELECT policy
-- and rely on users viewing only their own profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;