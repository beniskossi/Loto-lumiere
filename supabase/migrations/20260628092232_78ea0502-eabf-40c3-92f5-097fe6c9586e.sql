-- Trigger function : rafraîchit mv_enhanced_stats en mode CONCURRENTLY après insertion d'un tirage.
-- CONCURRENTLY évite de bloquer les SELECT sur la vue pendant le refresh.
CREATE OR REPLACE FUNCTION public.refresh_mv_enhanced_stats_after_draw()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Tente un refresh CONCURRENTLY (non bloquant pour les lecteurs).
  -- En cas d'échec (ex: vue jamais peuplée), fallback sur refresh standard.
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_enhanced_stats;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      REFRESH MATERIALIZED VIEW public.mv_enhanced_stats;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to refresh mv_enhanced_stats: %', SQLERRM;
    END;
  END;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_refresh_mv_enhanced_stats ON public.draw_results;
CREATE TRIGGER trg_refresh_mv_enhanced_stats
AFTER INSERT ON public.draw_results
FOR EACH ROW
EXECUTE FUNCTION public.refresh_mv_enhanced_stats_after_draw();