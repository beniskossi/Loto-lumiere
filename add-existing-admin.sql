-- Script pour ajouter le rôle admin à un compte existant
-- Remplacez 'VOTRE_USER_ID' par l'ID de votre compte

-- 1. Vérifier si l'utilisateur existe déjà dans admin_roles
SELECT * FROM public.admin_roles WHERE user_id = 'VOTRE_USER_ID';

-- 2. Ajouter le rôle admin (remplacez 'VOTRE_USER_ID' par votre vrai ID utilisateur)
INSERT INTO public.admin_roles (user_id, role)
VALUES ('VOTRE_USER_ID', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- 3. Vérifier que le profil utilisateur existe
SELECT * FROM public.user_profiles WHERE id = 'VOTRE_USER_ID';

-- 4. Si le profil n'existe pas, le créer
INSERT INTO public.user_profiles (id, username, full_name)
VALUES ('VOTRE_USER_ID', 'admin', 'Administrateur')
ON CONFLICT (id) DO NOTHING;

-- Instructions pour trouver votre USER_ID :
-- 1. Allez dans Supabase Dashboard > Authentication > Users
-- 2. Trouvez votre compte et copiez l'UUID
-- 3. Remplacez 'VOTRE_USER_ID' dans ce script par cet UUID