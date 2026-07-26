import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RateLimiter, getClientIdentifier, createRateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiter: 2 requests per minute (restrictive for cron-style endpoint)
const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 2 });

// Planning des tirages avec les heures en UTC (Côte d'Ivoire = UTC+0)
const DRAW_SCHEDULE: Record<string, { name: string; time: string }[]> = {
  0: [ // Dimanche
    { name: "Benediction", time: "10:00" },
    { name: "Prestige", time: "13:00" },
    { name: "Awale", time: "16:00" },
    { name: "Espoir", time: "19:50" },
  ],
  1: [ // Lundi
    { name: "Reveil", time: "10:00" },
    { name: "Etoile", time: "13:00" },
    { name: "Akwaba", time: "16:00" },
    { name: "Monday Special", time: "19:50" },
  ],
  2: [ // Mardi
    { name: "La Matinale", time: "10:00" },
    { name: "Emergence", time: "13:00" },
    { name: "Sika", time: "16:00" },
    { name: "Lucky Tuesday", time: "19:50" },
  ],
  3: [ // Mercredi
    { name: "Premiere Heure", time: "10:00" },
    { name: "Fortune", time: "13:00" },
    { name: "Baraka", time: "16:00" },
    { name: "Midweek", time: "19:50" },
  ],
  4: [ // Jeudi
    { name: "Kado", time: "10:00" },
    { name: "Privilege", time: "13:00" },
    { name: "Monni", time: "16:00" },
    { name: "Fortune Thursday", time: "19:50" },
  ],
  5: [ // Vendredi
    { name: "Cash", time: "10:00" },
    { name: "Solution", time: "13:00" },
    { name: "Wari", time: "16:00" },
    { name: "Friday Bonanza", time: "19:50" },
  ],
  6: [ // Samedi
    { name: "Soutra", time: "10:00" },
    { name: "Diamant", time: "13:00" },
    { name: "Moaye", time: "16:00" },
    { name: "National", time: "19:50" },
  ],
};

const FRENCH_DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

interface DrawToFetch {
  name: string;
  day: string;
  time: string;
  minutesSinceDraw: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authentication check - require CRON_SECRET
  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('CRON_SECRET');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if ((!cronSecret || authHeader !== `Bearer ${cronSecret}`) && authHeader !== `Bearer ${anonKey}` && authHeader !== `Bearer ${serviceRoleKey}`) {
    console.log('[auto-fetch-results] Unauthorized access attempt');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Rate limiting check
  const clientId = getClientIdentifier(req);
  const rateInfo = rateLimiter.getInfo(clientId);
  if (!rateLimiter.check(clientId)) {
    console.log(`[auto-fetch-results] Rate limit exceeded for ${clientId}`);
    return createRateLimitResponse(rateInfo.resetIn, corsHeaders);
  }

  try {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    const todayDraws = DRAW_SCHEDULE[dayOfWeek] || [];
    const drawsToFetch: DrawToFetch[] = [];
    
    // Trouver les tirages passés depuis 30-60 minutes
    for (const draw of todayDraws) {
      const [drawHour, drawMinute] = draw.time.split(':').map(Number);
      const drawTimeMinutes = drawHour * 60 + drawMinute;
      const minutesSinceDraw = currentTimeMinutes - drawTimeMinutes;
      
      // Récupérer les résultats entre 30 et 60 minutes après le tirage
      if (minutesSinceDraw >= 30 && minutesSinceDraw <= 60) {
        drawsToFetch.push({
          name: draw.name,
          day: FRENCH_DAYS[dayOfWeek],
          time: draw.time,
          minutesSinceDraw
        });
      }
    }

    console.log(`[auto-fetch-results] Current time: ${currentHour}:${currentMinute} UTC`);
    console.log(`[auto-fetch-results] Draws to fetch: ${drawsToFetch.length}`);

    if (drawsToFetch.length === 0) {
      return new Response(JSON.stringify({ 
        message: "Aucun tirage à récupérer pour le moment",
        currentTime: `${currentHour}:${currentMinute} UTC`,
        dayOfWeek: FRENCH_DAYS[dayOfWeek]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const results: { draw: string; status: string; message: string }[] = [];
    const today = now.toISOString().split('T')[0];

    for (const draw of drawsToFetch) {
      // Vérifier si le résultat existe déjà pour aujourd'hui
      const { data: existing } = await supabase
        .from('draw_results')
        .select('id')
        .eq('draw_name', draw.name)
        .eq('draw_date', today)
        .maybeSingle();

      if (existing) {
        results.push({
          draw: draw.name,
          status: 'skipped',
          message: 'Résultat déjà existant'
        });
        continue;
      }

      // Appeler la fonction de scraping pour récupérer les résultats
      console.log(`[auto-fetch-results] Tirage ${draw.name} nécessite récupération (${draw.minutesSinceDraw} min après)`);
      
      // Appeler la fonction de scraping si disponible
      try {
        const { data: scrapingResult, error: scrapingError } = await supabase.functions.invoke('scrape-results', {
          body: { drawName: draw.name, drawDate: today }
        });
        
        if (scrapingError) {
          results.push({
            draw: draw.name,
            status: 'error',
            message: `Erreur scraping: ${scrapingError.message}`
          });
        } else {
          results.push({
            draw: draw.name,
            status: 'fetched',
            message: 'Résultat récupéré avec succès'
          });
        }
      } catch (err) {
        results.push({
          draw: draw.name,
          status: 'pending',
          message: `À récupérer manuellement (${draw.minutesSinceDraw} min après tirage)`
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      timestamp: now.toISOString(),
      drawsProcessed: results.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[auto-fetch-results] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
