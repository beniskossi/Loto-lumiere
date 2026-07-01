
-- Fix 1: Add INSERT policy on profiles table (users can insert their own profile)
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Fix 2: Add UPDATE and DELETE policies on prediction_tracking table
CREATE POLICY "Users can update own tracking"
ON public.prediction_tracking
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tracking"
ON public.prediction_tracking
FOR DELETE
USING (auth.uid() = user_id);
