-- Script pour créer un compte administrateur par défaut
-- À exécuter dans l'interface Supabase SQL Editor

-- 1. Insérer un utilisateur admin dans auth.users (remplacez l'UUID par un nouveau)
-- Note: Vous devez d'abord créer le compte via l'interface Supabase Auth ou via signUp

-- 2. Ajouter le rôle admin (remplacez 'USER_UUID_HERE' par l'UUID de l'utilisateur créé)
INSERT INTO public.admin_roles (user_id, role)
VALUES ('USER_UUID_HERE', 'admin')
ON CONFLICT (user_id) DO NOTHING;

-- 3. Créer le profil utilisateur (remplacez 'USER_UUID_HERE' par l'UUID de l'utilisateur créé)
INSERT INTO public.user_profiles (id, username, full_name)
VALUES ('USER_UUID_HERE', 'admin', 'Administrateur')
ON CONFLICT (id) DO NOTHING;

-- 4. Créer les préférences utilisateur (remplacez 'USER_UUID_HERE' par l'UUID de l'utilisateur créé)
INSERT INTO public.user_preferences (user_id, preferred_draw_name, has_completed_onboarding)
VALUES ('USER_UUID_HERE', 'Etoile', true)
ON CONFLICT (user_id) DO NOTHING;

-- Instructions:
-- 1. Allez dans Authentication > Users dans Supabase Dashboard
-- 2. Créez un nouvel utilisateur avec email/password
-- 3. Copiez l'UUID de l'utilisateur créé
-- 4. Remplacez 'USER_UUID_HERE' par cet UUID dans ce script
-- 5. Exécutez ce script dans SQL Editor