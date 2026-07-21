-- Create cron job to automatically prune weights every week
SELECT cron.schedule(
  'prune-weights-job',
  '0 2 * * 0', -- Every Sunday at 02:00 AM
  $$
    SELECT extensions.net.http_post(
      url := 'https://kmkdwivnymcumgoorsiv.supabase.co/functions/v1/prune-weights',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb
    );
  $$
);
