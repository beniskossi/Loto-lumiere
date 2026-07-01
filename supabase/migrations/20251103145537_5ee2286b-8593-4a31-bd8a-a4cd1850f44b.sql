-- Fix search_path security warnings for functions

CREATE OR REPLACE FUNCTION public.validate_numbers_array(numbers integer[])
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.validate_draw_results()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;