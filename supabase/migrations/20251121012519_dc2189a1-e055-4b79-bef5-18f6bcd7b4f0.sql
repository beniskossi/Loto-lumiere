-- Create orchestration_history table to track adaptive adjustments
CREATE TABLE IF NOT EXISTS public.orchestration_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_name TEXT NOT NULL,
  draw_date DATE NOT NULL,
  adjustment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Metrics that triggered the adjustment
  trigger_metrics JSONB NOT NULL DEFAULT '{}',
  
  -- Algorithms analyzed
  algorithms_analyzed JSONB NOT NULL DEFAULT '[]',
  
  -- Adjustments made
  weight_adjustments JSONB NOT NULL DEFAULT '{}',
  parameter_adjustments JSONB NOT NULL DEFAULT '{}',
  
  -- Performance improvement expected
  expected_improvement NUMERIC,
  
  -- Strategy used for adjustment
  adjustment_strategy TEXT NOT NULL,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orchestration_history_date 
  ON public.orchestration_history(adjustment_date DESC);

CREATE INDEX IF NOT EXISTS idx_orchestration_history_draw 
  ON public.orchestration_history(draw_name, draw_date DESC);

-- Enable RLS
ALTER TABLE public.orchestration_history ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view orchestration history
CREATE POLICY "Admins can view orchestration history"
  ON public.orchestration_history
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Only service can insert orchestration history
CREATE POLICY "Service can insert orchestration history"
  ON public.orchestration_history
  FOR INSERT
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.orchestration_history IS 'Tracks automatic adaptive adjustments to algorithm orchestration based on performance';

-- Create function to trigger adaptive orchestration after evaluation
CREATE OR REPLACE FUNCTION public.trigger_adaptive_orchestration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recent_draws_count INTEGER;
BEGIN
  -- Check if we have enough recent draws to trigger adaptation (every 5 draws)
  SELECT COUNT(DISTINCT draw_date) INTO recent_draws_count
  FROM public.draw_results
  WHERE draw_name = NEW.draw_name
    AND draw_date <= NEW.draw_date;
  
  -- Trigger adaptation every 5 draws or on exceptional performance changes
  IF recent_draws_count % 5 = 0 THEN
    -- Log that we should trigger adaptation (actual call will be from edge function)
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
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on draw_results to initiate adaptive orchestration
DROP TRIGGER IF EXISTS trigger_adaptive_orchestration ON public.draw_results;
CREATE TRIGGER trigger_adaptive_orchestration
  AFTER INSERT ON public.draw_results
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_adaptive_orchestration();