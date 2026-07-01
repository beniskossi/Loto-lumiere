-- Remove duplicate RLS policies from user_preferences table
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;

-- Keep only the cleaner named policies:
-- "Users can insert own preferences" (INSERT)
-- "Users can update own preferences" (UPDATE)
-- "Users can view own preferences" (SELECT)