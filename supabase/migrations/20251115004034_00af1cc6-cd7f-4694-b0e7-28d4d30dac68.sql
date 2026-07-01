-- Fix security definer view issue by enabling RLS on scraping_status view
-- The view accesses scraping_jobs table which has admin-only RLS policies
-- Without RLS on the view, it bypasses the underlying table's security

-- Enable RLS on the scraping_status view
ALTER VIEW public.scraping_status SET (security_barrier = true);

-- Since views don't support RLS directly in the same way as tables,
-- we need to recreate scraping_status as a security barrier view
-- or drop the view and rely on direct table access with proper RLS

-- Actually, the best solution is to drop the view since it's redundant
-- The scraping_jobs table already has the necessary columns and RLS policies
-- Applications should query scraping_jobs directly with proper RLS enforcement

DROP VIEW IF EXISTS public.scraping_status;

-- If the view is needed for a specific query pattern, recreate it with SECURITY INVOKER behavior
-- by using a function instead, but for now, dropping is the safest approach