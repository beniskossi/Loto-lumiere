-- Create precalculated_predictions table to store pre-computed predictions
CREATE TABLE IF NOT EXISTS public.precalculated_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_name TEXT NOT NULL,
  predictions JSONB NOT NULL,
  optimized_prediction JSONB,
  explanations JSONB,
  warning TEXT,
  data_quality NUMERIC,
  freshness NUMERIC,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '6 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(draw_name, calculated_at)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_precalculated_predictions_draw_name 
  ON public.precalculated_predictions(draw_name);

CREATE INDEX IF NOT EXISTS idx_precalculated_predictions_expires_at 
  ON public.precalculated_predictions(expires_at);

-- Enable RLS
ALTER TABLE public.precalculated_predictions ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to view precalculated predictions
CREATE POLICY "Anyone can view precalculated predictions"
  ON public.precalculated_predictions
  FOR SELECT
  USING (true);

-- Policy to allow service role to insert/update precalculated predictions
CREATE POLICY "Service can manage precalculated predictions"
  ON public.precalculated_predictions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to clean up expired predictions
CREATE OR REPLACE FUNCTION public.cleanup_expired_predictions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.precalculated_predictions
  WHERE expires_at < now();
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON public.precalculated_predictions TO anon, authenticated;
GRANT ALL ON public.precalculated_predictions TO service_role;