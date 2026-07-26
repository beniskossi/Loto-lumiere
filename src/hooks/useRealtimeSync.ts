import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useRealtimeSync = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // S'abonner aux changements sur la table draw_results
    const channel = supabase
      .channel('public:draw_results')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'draw_results'
        },
        (payload) => {
          console.log('Changement en temps réel détecté :', payload);
          
          if (payload.eventType === 'INSERT') {
            toast.info(`Nouveau tirage disponible : ${payload.new.draw_name}`);
          } else if (payload.eventType === 'UPDATE') {
            toast.info(`Tirage mis à jour : ${payload.new.draw_name}`);
          }

          // Invalider les requêtes pour forcer un rafraîchissement des données
          queryClient.invalidateQueries({ queryKey: ['draw-results'] });
          queryClient.invalidateQueries({ queryKey: ['latest-results'] });
          queryClient.invalidateQueries({ queryKey: ['paginated-draw-results'] });
          // Invalider les prédictions calculées car elles dépendent des résultats
          queryClient.invalidateQueries({ queryKey: ['advanced-predictions'] });
          queryClient.invalidateQueries({ queryKey: ['enhanced-predictions'] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Connecté au flux de données en temps réel');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
