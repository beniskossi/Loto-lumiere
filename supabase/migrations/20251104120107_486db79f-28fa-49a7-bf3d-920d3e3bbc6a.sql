-- Ajouter une contrainte unique pour éviter les doublons de résultats
-- Un résultat est unique par combinaison de draw_name et draw_date
ALTER TABLE public.draw_results
ADD CONSTRAINT draw_results_unique_draw_date UNIQUE (draw_name, draw_date);