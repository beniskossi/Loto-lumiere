-- Create training control table
CREATE TABLE IF NOT EXISTS public.training_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_training_enabled boolean NOT NULL DEFAULT true,
  last_training_run timestamp with time zone,
  training_frequency_hours integer NOT NULL DEFAULT 24,
  auto_tune_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.training_control ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view training control
CREATE POLICY "Admins can view training control"
ON public.training_control
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Policy: Admins can update training control
CREATE POLICY "Admins can update training control"
ON public.training_control
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Policy: Admins can insert training control
CREATE POLICY "Admins can insert training control"
ON public.training_control
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert default configuration
INSERT INTO public.training_control (is_training_enabled, training_frequency_hours, auto_tune_enabled)
VALUES (true, 24, false)
ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at
CREATE TRIGGER update_training_control_updated_at
  BEFORE UPDATE ON public.training_control
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_training_control_enabled ON public.training_control(is_training_enabled);

COMMENT ON TABLE public.training_control IS 'Contrôle central de l''entraînement des modèles ML';
COMMENT ON COLUMN public.training_control.is_training_enabled IS 'Active ou désactive l''entraînement automatique';
COMMENT ON COLUMN public.training_control.training_frequency_hours IS 'Fréquence d''entraînement en heures';
COMMENT ON COLUMN public.training_control.auto_tune_enabled IS 'Active l''auto-tuning des hyperparamètres';