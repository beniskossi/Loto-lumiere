-- Update the adaptive orchestration trigger to actually call the Edge Function using pg_net

CREATE OR REPLACE FUNCTION public.trigger_adaptive_orchestration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recent_draws_count INTEGER;
  req_id BIGINT;
BEGIN
  -- Check if we have enough recent draws to trigger adaptation (every 5 draws)
  SELECT COUNT(DISTINCT draw_date) INTO recent_draws_count
  FROM public.draw_results
  WHERE draw_name = NEW.draw_name
    AND draw_date <= NEW.draw_date;
  
  -- Trigger adaptation every 5 draws or on exceptional performance changes
  IF recent_draws_count % 5 = 0 THEN
    -- 1. Insert the pending_analysis row
    INSERT INTO public.orchestration_history (
      draw_name,
      draw_date,
      trigger_metrics,
      algorithms_analyzed,
      adjustment_strategy,
      notes
    ) VALUES (
      NEW.draw_name,
      NEW.draw_date,
      jsonb_build_object(
        'trigger_type', 'scheduled',
        'draws_evaluated', recent_draws_count,
        'timestamp', NOW()
      ),
      '[]'::jsonb,
      'pending_analysis',
      'Triggered by scheduled interval (every 5 draws)'
    );

    -- 2. Call the Edge Function asynchronously via pg_net
    -- Using the existing anon/service key format and project ID found in other cron jobs
    SELECT extensions.net.http_post(
      url := 'https://kmkdwivnymcumgoorsiv.supabase.co/functions/v1/adaptive-orchestration',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2R3aXZueW1jdW1nb29yc2l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjM2MzQsImV4cCI6MjA3NzczOTYzNH0.LsdZ342a8rfbCCa0ScYeOGUwJONS7ZIaYAMLleTM9t4"}'::jsonb,
      body := jsonb_build_object('drawName', NEW.draw_name, 'drawDate', NEW.draw_date)
    ) INTO req_id;

  END IF;
  
  RETURN NEW;
END;
$function$;
