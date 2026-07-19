import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import "https://deno.land/std@0.168.0/dotenv/load.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const query = `
    ALTER TABLE public.predictions 
    ADD COLUMN IF NOT EXISTS target_draw_date DATE,
    ADD COLUMN IF NOT EXISTS target_draw_id UUID,
    ADD COLUMN IF NOT EXISTS data_cutoff_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS algorithm_version TEXT,
    ADD COLUMN IF NOT EXISTS prediction_run_id UUID DEFAULT gen_random_uuid();

    ALTER TABLE public.algorithm_performance
    ADD COLUMN IF NOT EXISTS prediction_id UUID,
    ADD COLUMN IF NOT EXISTS draw_result_id UUID;
    
    -- Normalize accuracy_score to 0-1
    UPDATE public.algorithm_performance 
    SET accuracy_score = accuracy_score / 100.0 
    WHERE accuracy_score > 1.0;
  `;
  
  // Note: we can't execute raw SQL directly with supabase-js unless via an RPC. 
  // Let's check if there's an RPC or we just use postgres.
}
run();
