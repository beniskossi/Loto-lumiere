-- Create types for draw validation
CREATE TYPE draw_status AS ENUM ('Brouillon', 'En_validation', 'Rejete', 'Approuve', 'Publie', 'Corrige');
CREATE TYPE draw_source AS ENUM ('officielle', 'import_auto', 'saisie_manuelle', 'demo', 'suspecte');

-- Add columns to draw_results
ALTER TABLE public.draw_results 
ADD COLUMN IF NOT EXISTS status draw_status DEFAULT 'Publie'::draw_status,
ADD COLUMN IF NOT EXISTS source draw_source DEFAULT 'saisie_manuelle'::draw_source,
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS validation_notes TEXT,
ADD COLUMN IF NOT EXISTS raw_data JSONB;

-- Create index for faster filtering on valid draws
CREATE INDEX IF NOT EXISTS idx_draw_results_status ON public.draw_results(status);
