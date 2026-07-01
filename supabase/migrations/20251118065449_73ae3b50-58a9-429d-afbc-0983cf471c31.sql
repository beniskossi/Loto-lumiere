-- Supprimer la table user_profiles dépréciée
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Ajouter search_path aux 3 fonctions INVOKER pour sécurité
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.validate_draw_results() SET search_path = public;
ALTER FUNCTION public.validate_numbers_array(integer[]) SET search_path = public;