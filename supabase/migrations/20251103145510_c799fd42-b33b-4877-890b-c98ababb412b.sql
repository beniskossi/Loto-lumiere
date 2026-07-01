-- Create validation functions
CREATE OR REPLACE FUNCTION public.validate_numbers_array(numbers integer[])
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF numbers IS NULL THEN
    RETURN true;
  END IF;
  
  IF array_length(numbers, 1) IS NULL OR array_length(numbers, 1) != 5 THEN
    RETURN false;
  END IF;
  
  -- Check if all numbers are in range 1-90
  IF EXISTS (SELECT 1 FROM unnest(numbers) AS num WHERE num < 1 OR num > 90) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Create table for draw results
CREATE TABLE public.draw_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_name text NOT NULL,
  draw_day text NOT NULL,
  draw_time text NOT NULL,
  draw_date date NOT NULL,
  winning_numbers integer[] NOT NULL,
  machine_numbers integer[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_draw_results_draw_name ON public.draw_results(draw_name);
CREATE INDEX idx_draw_results_draw_date ON public.draw_results(draw_date DESC);
CREATE INDEX idx_draw_results_combined ON public.draw_results(draw_name, draw_date DESC);

-- Enable RLS
ALTER TABLE public.draw_results ENABLE ROW LEVEL SECURITY;

-- Allow public read access to results
CREATE POLICY "Anyone can view draw results"
  ON public.draw_results
  FOR SELECT
  USING (true);

-- Create validation trigger
CREATE OR REPLACE FUNCTION public.validate_draw_results()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT validate_numbers_array(NEW.winning_numbers) THEN
    RAISE EXCEPTION 'winning_numbers must contain exactly 5 numbers between 1 and 90';
  END IF;
  
  IF NEW.machine_numbers IS NOT NULL AND NOT validate_numbers_array(NEW.machine_numbers) THEN
    RAISE EXCEPTION 'machine_numbers must contain exactly 5 numbers between 1 and 90';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_draw_results_trigger
  BEFORE INSERT OR UPDATE ON public.draw_results
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_draw_results();

-- Create table for number statistics
CREATE TABLE public.number_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_name text NOT NULL,
  number integer NOT NULL CHECK (number >= 1 AND number <= 90),
  frequency integer DEFAULT 0,
  last_appearance date,
  days_since_last integer DEFAULT 0,
  associated_numbers jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(draw_name, number)
);

CREATE INDEX idx_number_statistics_draw_name ON public.number_statistics(draw_name);
CREATE INDEX idx_number_statistics_frequency ON public.number_statistics(frequency DESC);

ALTER TABLE public.number_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view statistics"
  ON public.number_statistics
  FOR SELECT
  USING (true);

-- Create table for predictions
CREATE TABLE public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_name text NOT NULL,
  prediction_date date NOT NULL,
  predicted_numbers integer[] NOT NULL,
  confidence_score numeric(5,2),
  model_used text NOT NULL,
  model_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_prediction_per_draw_date UNIQUE(draw_name, prediction_date, model_used)
);

CREATE INDEX idx_predictions_draw_name ON public.predictions(draw_name, prediction_date DESC);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view predictions"
  ON public.predictions
  FOR SELECT
  USING (true);

-- Function to update statistics after insert
CREATE OR REPLACE FUNCTION public.update_number_statistics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  num integer;
BEGIN
  -- Update statistics for winning numbers
  FOREACH num IN ARRAY NEW.winning_numbers
  LOOP
    INSERT INTO public.number_statistics (draw_name, number, frequency, last_appearance, days_since_last)
    VALUES (NEW.draw_name, num, 1, NEW.draw_date, 0)
    ON CONFLICT (draw_name, number)
    DO UPDATE SET
      frequency = number_statistics.frequency + 1,
      last_appearance = NEW.draw_date,
      days_since_last = 0,
      updated_at = now();
  END LOOP;
  
  -- Update days_since_last for all other numbers
  UPDATE public.number_statistics
  SET days_since_last = days_since_last + 1
  WHERE draw_name = NEW.draw_name
    AND number <> ALL(NEW.winning_numbers);
  
  RETURN NEW;
END;
$$;

-- Trigger to update statistics
CREATE TRIGGER update_statistics_on_draw_insert
  AFTER INSERT ON public.draw_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_number_statistics();

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_draw_results_updated_at
  BEFORE UPDATE ON public.draw_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for scraping jobs tracking
CREATE TABLE public.scraping_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  results_count integer DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_scraping_jobs_date ON public.scraping_jobs(job_date DESC);

ALTER TABLE public.scraping_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scraping jobs"
  ON public.scraping_jobs
  FOR SELECT
  USING (true);