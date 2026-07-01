-- ============================================================================
-- UNIFY ADMIN ROLE SYSTEM
-- Migrate from admin_roles table to user_roles in user_profiles
-- ============================================================================

-- 1. Add role column to user_profiles if it doesn't exist
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));

-- 2. Migrate existing admins from admin_roles to user_profiles
UPDATE public.user_profiles
SET role = COALESCE(ar.role, 'user')
FROM public.admin_roles ar
WHERE public.user_profiles.id = ar.user_id;

-- 3. Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- 4. Update RLS policies for user_profiles to include admin checks
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles 
FOR UPDATE USING (auth.uid() = id OR (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin');

-- 5. Drop deprecated admin_roles table
DROP TABLE IF EXISTS public.admin_roles CASCADE;

-- ============================================================================
-- COMPLETE - Admin role system unified
-- ============================================================================
