-- Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Move pg_net to extensions schema (pg_cron stays in cron schema by design)
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Grant execute permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, service_role;

-- Recreate cron jobs (pg_cron uses cron schema, not extensions)
-- First cleanup any existing jobs with these names
SELECT cron.unschedule('cleanup-expired-predictions') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-predictions');
SELECT cron.unschedule('refresh-enhanced-stats') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-enhanced-stats');
SELECT cron.unschedule('auto-fetch-results') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-fetch-results');
SELECT cron.unschedule('precalculate-predictions') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'precalculate-predictions');

-- Cleanup expired predictions - every hour
SELECT cron.schedule(
  'cleanup-expired-predictions',
  '0 * * * *',
  $$SELECT public.cleanup_expired_predictions()$$
);

-- Refresh enhanced stats materialized view - every 6 hours
SELECT cron.schedule(
  'refresh-enhanced-stats',
  '0 */6 * * *',
  $$SELECT public.refresh_enhanced_stats()$$
);

-- Auto-fetch results - every 30 minutes during draw times (13h-14h and 21h-22h)
SELECT cron.schedule(
  'auto-fetch-results',
  '*/30 10-21 * * *',
  $$
  SELECT extensions.net.http_post(
    url := 'https://kmkdwivnymcumgoorsiv.supabase.co/functions/v1/auto-fetch-results',
    headers := ('{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}')::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Pre-calculate predictions - every 4 hours
SELECT cron.schedule(
  'precalculate-predictions',
  '0 */4 * * *',
  $$
  SELECT extensions.net.http_post(
    url := 'https://kmkdwivnymcumgoorsiv.supabase.co/functions/v1/precalculate-predictions',
    headers := ('{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}')::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);