-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule the auto-fetch-results function to run every 30 minutes
SELECT cron.schedule(
  'auto-fetch-lottery-results',
  '*/30 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://kmkdwivnymcumgoorsiv.supabase.co/functions/v1/auto-fetch-results',
        headers := ('{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}')::jsonb,
        body:=concat('{"triggered_at": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);