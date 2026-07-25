-- Create cron job to evaluate ledger predictions against real outcomes daily
SELECT cron.schedule(
  'evaluate-ledger-predictions',
  '0 1 * * *', -- Every day at 01:00 AM (after draws)
  $$
    SELECT extensions.net.http_post(
      url := 'https://kmkdwivnymcumgoorsiv.supabase.co/functions/v1/evaluate-ledger',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb
    );
  $$
);
