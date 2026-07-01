-- Script pour peupler la base avec des données de démonstration
-- À exécuter dans l'éditeur SQL de Supabase : https://supabase.com/dashboard/project/kmkdwivnymcumgoorsiv/sql/new

-- Insérer des données historiques pour Reveil (7 tirages supplémentaires)
INSERT INTO draw_results (draw_name, draw_day, draw_time, draw_date, winning_numbers) VALUES
('Reveil', 'Lundi', '10:00', '2025-10-28', ARRAY[22, 45, 67, 12, 89]),
('Reveil', 'Lundi', '10:00', '2025-10-21', ARRAY[5, 33, 56, 78, 23]),
('Reveil', 'Lundi', '10:00', '2025-10-14', ARRAY[14, 27, 39, 61, 85]),
('Reveil', 'Lundi', '10:00', '2025-10-07', ARRAY[8, 19, 42, 55, 73]),
('Reveil', 'Lundi', '10:00', '2025-09-30', ARRAY[31, 46, 59, 72, 16]),
('Reveil', 'Lundi', '10:00', '2025-09-23', ARRAY[3, 25, 48, 64, 81]),
('Reveil', 'Lundi', '10:00', '2025-09-16', ARRAY[11, 34, 57, 69, 88])
ON CONFLICT DO NOTHING;

-- Insérer des données pour Prestige (12 tirages)
INSERT INTO draw_results (draw_name, draw_day, draw_time, draw_date, winning_numbers) VALUES
('Prestige', 'Dimanche', '13:00', '2025-11-03', ARRAY[7, 23, 41, 58, 76]),
('Prestige', 'Dimanche', '13:00', '2025-10-27', ARRAY[15, 32, 49, 65, 82]),
('Prestige', 'Dimanche', '13:00', '2025-10-20', ARRAY[9, 26, 44, 62, 79]),
('Prestige', 'Dimanche', '13:00', '2025-10-13', ARRAY[18, 35, 52, 68, 86]),
('Prestige', 'Dimanche', '13:00', '2025-10-06', ARRAY[4, 21, 38, 54, 71]),
('Prestige', 'Dimanche', '13:00', '2025-09-29', ARRAY[12, 29, 47, 63, 80]),
('Prestige', 'Dimanche', '13:00', '2025-09-22', ARRAY[6, 24, 40, 57, 74]),
('Prestige', 'Dimanche', '13:00', '2025-09-15', ARRAY[17, 33, 50, 66, 83]),
('Prestige', 'Dimanche', '13:00', '2025-09-08', ARRAY[10, 28, 45, 61, 78]),
('Prestige', 'Dimanche', '13:00', '2025-09-01', ARRAY[13, 30, 48, 64, 81]),
('Prestige', 'Dimanche', '13:00', '2025-08-25', ARRAY[19, 36, 53, 69, 87]),
('Prestige', 'Dimanche', '13:00', '2025-08-18', ARRAY[2, 22, 42, 62, 82])
ON CONFLICT DO NOTHING;

-- Insérer des données pour National (12 tirages)
INSERT INTO draw_results (draw_name, draw_day, draw_time, draw_date, winning_numbers) VALUES
('National', 'Samedi', '18:15', '2025-11-02', ARRAY[5, 22, 39, 56, 73]),
('National', 'Samedi', '18:15', '2025-10-26', ARRAY[14, 31, 48, 65, 82]),
('National', 'Samedi', '18:15', '2025-10-19', ARRAY[8, 25, 42, 59, 76]),
('National', 'Samedi', '18:15', '2025-10-12', ARRAY[16, 33, 50, 67, 84]),
('National', 'Samedi', '18:15', '2025-10-05', ARRAY[3, 20, 37, 54, 71]),
('National', 'Samedi', '18:15', '2025-09-28', ARRAY[11, 28, 45, 62, 79]),
('National', 'Samedi', '18:15', '2025-09-21', ARRAY[7, 24, 41, 58, 75]),
('National', 'Samedi', '18:15', '2025-09-14', ARRAY[15, 32, 49, 66, 83]),
('National', 'Samedi', '18:15', '2025-09-07', ARRAY[9, 26, 43, 60, 77]),
('National', 'Samedi', '18:15', '2025-08-31', ARRAY[12, 29, 46, 63, 80]),
('National', 'Samedi', '18:15', '2025-08-24', ARRAY[18, 35, 52, 68, 86]),
('National', 'Samedi', '18:15', '2025-08-17', ARRAY[4, 21, 38, 55, 72])
ON CONFLICT DO NOTHING;

-- Insérer des données pour Fortune (12 tirages)
INSERT INTO draw_results (draw_name, draw_day, draw_time, draw_date, winning_numbers) VALUES
('Fortune', 'Mercredi', '13:00', '2025-10-30', ARRAY[13, 27, 44, 61, 78]),
('Fortune', 'Mercredi', '13:00', '2025-10-23', ARRAY[6, 23, 40, 57, 74]),
('Fortune', 'Mercredi', '13:00', '2025-10-16', ARRAY[17, 34, 51, 68, 85]),
('Fortune', 'Mercredi', '13:00', '2025-10-09', ARRAY[9, 26, 43, 60, 77]),
('Fortune', 'Mercredi', '13:00', '2025-10-02', ARRAY[11, 28, 45, 62, 79]),
('Fortune', 'Mercredi', '13:00', '2025-09-25', ARRAY[5, 22, 39, 56, 73]),
('Fortune', 'Mercredi', '13:00', '2025-09-18', ARRAY[14, 31, 48, 65, 82]),
('Fortune', 'Mercredi', '13:00', '2025-09-11', ARRAY[8, 25, 42, 59, 76]),
('Fortune', 'Mercredi', '13:00', '2025-09-04', ARRAY[16, 33, 50, 67, 84]),
('Fortune', 'Mercredi', '13:00', '2025-08-28', ARRAY[3, 20, 37, 54, 71]),
('Fortune', 'Mercredi', '13:00', '2025-08-21', ARRAY[12, 29, 46, 63, 80]),
('Fortune', 'Mercredi', '13:00', '2025-08-14', ARRAY[7, 24, 41, 58, 75])
ON CONFLICT DO NOTHING;

-- Vérifier le nombre total d'entrées
SELECT draw_name, COUNT(*) as total_draws
FROM draw_results
GROUP BY draw_name
ORDER BY draw_name;
