import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LotoBonheurResult {
  game: string;
  date: string;
  winningNumbers: number[];
  machineNumbers?: number[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting scraping job");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    let user;
    let isAdmin = false;

    const isServiceRole = token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (isServiceRole) {
      user = { id: "00000000-0000-0000-0000-000000000000", email: "admin@local.test" };
      isAdmin = true;
    } else {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authUser) {
        console.error("Authentication failed", { error: authError?.message });
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }), 
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      user = authUser;

      // Check admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleData && roleData.role === 'admin') {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      console.error("Admin check failed: User is not admin");
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }), 
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Admin user authorized to scrape");

    // Create scraping job record
    const { data: job, error: jobError } = await supabase
      .from("scraping_jobs")
      .insert({
        job_date: new Date().toISOString().split("T")[0],
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) {
      console.error("Error creating job:", jobError);
      throw jobError;
    }

    console.log("Job created", { jobId: job.id });

    // Fetch data from Loto Bonheur API
    const apiUrl = "https://lotobonheur.ci/api/results";
    console.log("Fetching from API");
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://lotobonheur.ci/resultats',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API returned status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Received data structure", { hasData: !!data, success: data?.success });
    
    if (!data.success) {
      throw new Error('API response not successful');
    }

    // Map draw names from API to our standardized names (case-insensitive keys)
    const drawNameMap: Record<string, string> = {
      "reveil": "Reveil",
      "etoile": "Etoile",
      "akwaba": "Akwaba",
      "monday special": "Monday Special",
      "la matinale": "La Matinale",
      "emergence": "Emergence",
      "sika": "Sika",
      "lucky tuesday": "Lucky Tuesday",
      "premiere heure": "Premiere Heure",
      "fortune": "Fortune",
      "baraka": "Baraka",
      "midweek": "Midweek",
      "kado": "Kado",
      "privilege": "Privilege",
      "monni": "Monni",
      "fortune thursday": "Fortune Thursday",
      "cash": "Cash",
      "solution": "Solution",
      "wari": "Wari",
      "friday bonanza": "Friday Bonanza",
      "soutra": "Soutra",
      "diamant": "Diamant",
      "moaye": "Moaye",
      "national": "National",
      "benediction": "Benediction",
      "prestige": "Prestige",
      "awale": "Awale",
      "espoir": "Espoir",
    };

    const results: LotoBonheurResult[] = [];
    
    // Parse API response - handle the nested structure
    if (data && data.drawsResultsWeekly && Array.isArray(data.drawsResultsWeekly)) {
      console.log("Processing weekly draws...");
      
      for (const week of data.drawsResultsWeekly) {
        if (!week.drawResultsDaily || !Array.isArray(week.drawResultsDaily)) continue;
        
        // Extract year from week.startDate (format: "dd/MM/yyyy")
        let year = new Date().getFullYear();
        if (week.startDate) {
          const yearMatch = week.startDate.match(/\/(\d{4})$/);
          if (yearMatch) {
            year = parseInt(yearMatch[1]);
          }
        }
        
        for (const dailyDraw of week.drawResultsDaily) {
          const dateStr = dailyDraw.date; // Format: "lundi 03/11"
          
          // Parse date with extracted year
          let drawDate = new Date().toISOString().split("T")[0];
          if (dateStr) {
            const match = dateStr.match(/(\d{2})\/(\d{2})/);
            if (match) {
              const [_, day, month] = match;
              drawDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }
          
          // Process standardDraws only
          const drawResults = dailyDraw.drawResults || {};
          const allDraws = drawResults.standardDraws || [];
          
          for (const draw of allDraws) {
            if (!draw.drawName || !draw.winningNumbers) continue;
            
            // Skip invalid draws (those starting with '.')
            if (typeof draw.winningNumbers === 'string' && draw.winningNumbers.startsWith('.')) {
              continue;
            }
            
            // Match draw name directly (case-sensitive)
            const mappedName = drawNameMap[draw.drawName.toLowerCase()];
            if (!mappedName) {
              console.log("Unknown draw name encountered");
              continue;
            }
            
            // Parse winning numbers using regex
            let winningNumbers: number[] = [];
            if (typeof draw.winningNumbers === 'string') {
              winningNumbers = (draw.winningNumbers.match(/\d+/g) || [])
                .map((n: string) => parseInt(n))
                .filter((n: number) => !isNaN(n) && n >= 1 && n <= 90)
                .slice(0, 5);
            } else if (Array.isArray(draw.winningNumbers)) {
              winningNumbers = draw.winningNumbers
                .map((n: unknown) => typeof n === 'number' ? n : parseInt(String(n)))
                .filter((n: number) => !isNaN(n) && n >= 1 && n <= 90)
                .slice(0, 5);
            }
            
            // Parse machine numbers if available
            let machineNumbers: number[] | undefined = undefined;
            if (draw.machineNumbers && typeof draw.machineNumbers === 'string') {
              const parsed = (draw.machineNumbers.match(/\d+/g) || [])
                .map((n: string) => parseInt(n))
                .filter((n: number) => !isNaN(n) && n >= 1 && n <= 90)
                .slice(0, 5);
              if (parsed.length === 5) {
                machineNumbers = parsed;
              }
            }
            
            if (winningNumbers.length === 5) {
              results.push({
                game: mappedName,
                date: drawDate,
                winningNumbers,
                machineNumbers,
              });
            } else {
              console.log("Invalid numbers detected", { expectedCount: 5, actualCount: winningNumbers.length });
            }
          }
        }
      }
    }

    console.log("Parsed results", { count: results.length });

    // Insert results into database
    let insertedCount = 0;
    const errors: string[] = [];

    for (const result of results) {
      try {
        // Check if result already exists
        const { data: existing } = await supabase
          .from("draw_results")
          .select("id")
          .eq("draw_name", result.game)
          .eq("draw_date", result.date)
          .maybeSingle();

        if (existing) {
          console.log("Skipping duplicate result");
          continue;
        }

        // Get draw schedule info
        const scheduleInfo = getDrawScheduleInfo(result.game);
        
        const { error: insertError } = await supabase
          .from("draw_results")
          .insert({
            draw_name: result.game,
            draw_day: scheduleInfo.day,
            draw_time: scheduleInfo.time,
            draw_date: result.date,
            winning_numbers: result.winningNumbers,
            machine_numbers: result.machineNumbers || null,
          });

        if (insertError) {
          console.error("Error inserting result", { error: insertError.message });
          errors.push(`${result.game}: ${insertError.message}`);
        } else {
          insertedCount++;
        }
      } catch (error) {
        console.error("Error processing result", { error: error instanceof Error ? error.message : String(error) });
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`${result.game}: ${errorMessage}`);
      }
    }

    // Update job status
    const { error: updateError } = await supabase
      .from("scraping_jobs")
      .update({
        status: errors.length > 0 ? "failed" : "completed",
        results_count: insertedCount,
        error_message: errors.length > 0 ? errors.join("; ") : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (updateError) {
      console.error("Error updating job", { error: updateError.message });
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        resultsFound: results.length,
        resultsInserted: insertedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scraping error", { error: error instanceof Error ? error.message : String(error) });
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

function getDrawScheduleInfo(drawName: string): { day: string; time: string } {
  const schedule: Record<string, { day: string; time: string }> = {
    "Reveil": { day: "Lundi", time: "10:00" },
    "Etoile": { day: "Lundi", time: "13:00" },
    "Akwaba": { day: "Lundi", time: "16:00" },
    "Monday Special": { day: "Lundi", time: "19:50" },
    "La Matinale": { day: "Mardi", time: "10:00" },
    "Emergence": { day: "Mardi", time: "13:00" },
    "Sika": { day: "Mardi", time: "16:00" },
    "Lucky Tuesday": { day: "Mardi", time: "19:50" },
    "Premiere Heure": { day: "Mercredi", time: "10:00" },
    "Fortune": { day: "Mercredi", time: "13:00" },
    "Baraka": { day: "Mercredi", time: "16:00" },
    "Midweek": { day: "Mercredi", time: "19:50" },
    "Kado": { day: "Jeudi", time: "10:00" },
    "Privilege": { day: "Jeudi", time: "13:00" },
    "Monni": { day: "Jeudi", time: "16:00" },
    "Fortune Thursday": { day: "Jeudi", time: "19:50" },
    "Cash": { day: "Vendredi", time: "10:00" },
    "Solution": { day: "Vendredi", time: "13:00" },
    "Wari": { day: "Vendredi", time: "16:00" },
    "Friday Bonanza": { day: "Vendredi", time: "19:50" },
    "Soutra": { day: "Samedi", time: "10:00" },
    "Diamant": { day: "Samedi", time: "13:00" },
    "Moaye": { day: "Samedi", time: "16:00" },
    "National": { day: "Samedi", time: "19:50" },
    "Benediction": { day: "Dimanche", time: "10:00" },
    "Prestige": { day: "Dimanche", time: "13:00" },
    "Awale": { day: "Dimanche", time: "16:00" },
    "Espoir": { day: "Dimanche", time: "19:50" },
  };

  return schedule[drawName] || { day: "Unknown", time: "00:00" };
}
