INSERT INTO public.algorithm_config (algorithm_name, description, is_enabled, weight, parameters, category)
VALUES (
  'Séquence des Écarts',
  'Analyse des patterns séquentiels d''écarts d''apparition groupés par tranches (ex: 0-10, 10-20) combiné au filtrage bayésien',
  true,
  1.6,
  '{"binSize": 10}'::jsonb,
  'statistical'
) ON CONFLICT (algorithm_name) DO UPDATE SET
  description = EXCLUDED.description,
  is_enabled = true,
  weight = 1.6;
