-- Add strict target tracking to predictions table
ALTER TABLE public.predictions 
ADD COLUMN IF NOT EXISTS target_draw_date DATE,
ADD COLUMN IF NOT EXISTS target_draw_id UUID REFERENCES public.draw_results(id),
ADD COLUMN IF NOT EXISTS data_cutoff_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS algorithm_version TEXT,
ADD COLUMN IF NOT EXISTS prediction_run_id UUID DEFAULT gen_random_uuid();

-- Add prediction_id and draw_result_id to algorithm_performance to enforce uniqueness
ALTER TABLE public.algorithm_performance
ADD COLUMN IF NOT EXISTS prediction_id UUID REFERENCES public.predictions(id),
ADD COLUMN IF NOT EXISTS draw_result_id UUID REFERENCES public.draw_results(id);

-- Normalize accuracy_score to 0-1
UPDATE public.algorithm_performance 
SET accuracy_score = accuracy_score / 100.0 
WHERE accuracy_score > 1.0;
