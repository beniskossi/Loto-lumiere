import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authentication check - require CRON_SECRET or service role key
    const authHeader = req.headers.get('authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`;
    
    // Allow if valid cron secret, service role key, or authenticated admin
    let isAuthorized = isCronCall;

    if (!isAuthorized && authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      if (!authError && user) {
        const { data: roleData } = await supabaseClient
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();
        if (roleData && roleData.role === 'admin') {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Requires cron secret or admin role.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch all algorithms config
    const { data: algos, error: fetchError } = await supabaseClient
      .from('algorithm_config')
      .select('*');
      
    if (fetchError) throw fetchError;

    // 2. Fetch recent performance metrics to determine if an algorithm is constantly failing
    const { data: evaluations, error: evalError } = await supabaseClient
      .from('algorithm_evaluations')
      .select('algorithm, accuracy_score, draw_date')
      .order('draw_date', { ascending: false })
      .limit(200);

    if (evalError) throw evalError;

    const prunes = [];
    
    for (const algo of algos) {
      // Find evaluations for this algo
      const algoEvals = evaluations.filter(e => e.algorithm === algo.algorithm_name);
      
      if (algoEvals.length >= 5) {
        // Calculate average accuracy over recent evaluations
        const recentEvals = algoEvals.slice(0, 10);
        const avgAccuracy = recentEvals.reduce((sum, e) => sum + e.accuracy_score, 0) / recentEvals.length;
        
        // Elagage: If weight is extremely low (< 0.1) or accuracy is extremely poor (< 5% consistently)
        if (algo.weight < 0.15 || avgAccuracy < 5.0) {
          prunes.push({
            name: algo.algorithm_name,
            reason: `Performance chroniquement basse (Précision moyenne: ${avgAccuracy.toFixed(2)}%, Poids actuel: ${algo.weight})`
          });
          
          // Disable or lower weight to minimal
          await supabaseClient
            .from('algorithm_config')
            .update({ 
              is_enabled: false, 
              weight: 0.05,
              description: `${algo.description || ''} [ÉLAGUÉ AUTOMATIQUEMENT LE ${new Date().toISOString()}]`
            })
            .eq('algorithm_name', algo.algorithm_name);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Élagage automatique exécuté avec succès.",
        pruned_algorithms: prunes
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error during automatic pruning:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
