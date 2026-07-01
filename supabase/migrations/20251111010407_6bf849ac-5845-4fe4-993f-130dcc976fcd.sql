-- Restreindre l'accès à la table scraping_jobs aux admins uniquement
DROP POLICY IF EXISTS "Anyone can view scraping jobs" ON scraping_jobs;

CREATE POLICY "Admins can view scraping jobs"
  ON scraping_jobs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Créer une vue publique sanitisée pour le status des scraping jobs si nécessaire
CREATE OR REPLACE VIEW public.scraping_status AS
SELECT 
  id,
  job_date,
  CASE 
    WHEN status = 'completed' THEN 'completed'
    WHEN status = 'running' THEN 'running'
    ELSE 'pending'
  END as status,
  completed_at,
  results_count
FROM scraping_jobs
WHERE status IN ('completed', 'running', 'pending');

-- Permettre à tous de voir la vue sanitisée
GRANT SELECT ON public.scraping_status TO anon, authenticated;