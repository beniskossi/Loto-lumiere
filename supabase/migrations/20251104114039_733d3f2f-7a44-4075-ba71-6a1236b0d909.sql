-- Create table for algorithm performance tracking
CREATE TABLE IF NOT EXISTS public.algorithm_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draw_name TEXT NOT NULL,
  model_used TEXT NOT NULL,
  prediction_date DATE NOT NULL,
  draw_date DATE NOT NULL,
  predicted_numbers INTEGER[] NOT NULL,
  winning_numbers INTEGER[] NOT NULL,
  matches_count INTEGER NOT NULL DEFAULT 0,
  accuracy_score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(draw_name, model_used, prediction_date, draw_date)
);

-- Create index for better performance
CREATE INDEX idx_algorithm_performance_model ON public.algorithm_performance(model_used, draw_name);
CREATE INDEX idx_algorithm_performance_accuracy ON public.algorithm_performance(accuracy_score DESC);

-- Enable RLS
ALTER TABLE public.algorithm_performance ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing
CREATE POLICY "Anyone can view algorithm performance"
ON public.algorithm_performance
FOR SELECT
USING (true);

-- Create a function to calculate matches between two arrays
CREATE OR REPLACE FUNCTION public.count_array_matches(arr1 INTEGER[], arr2 INTEGER[])
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  match_count INTEGER := 0;
  element INTEGER;
BEGIN
  FOREACH element IN ARRAY arr1
  LOOP
    IF element = ANY(arr2) THEN
      match_count := match_count + 1;
    END IF;
  END LOOP;
  RETURN match_count;
END;
$$;

-- Create a view for algorithm rankings
CREATE OR REPLACE VIEW public.algorithm_rankings AS
SELECT 
  model_used,
  draw_name,
  COUNT(*) as total_predictions,
  AVG(accuracy_score) as avg_accuracy,
  SUM(matches_count) as total_matches,
  COUNT(CASE WHEN matches_count >= 3 THEN 1 END) as good_predictions,
  COUNT(CASE WHEN matches_count >= 4 THEN 1 END) as excellent_predictions,
  COUNT(CASE WHEN matches_count = 5 THEN 1 END) as perfect_predictions,
  MAX(matches_count) as best_match,
  MIN(created_at) as first_prediction,
  MAX(created_at) as last_prediction
FROM public.algorithm_performance
GROUP BY model_used, draw_name
ORDER BY avg_accuracy DESC, total_matches DESC;