import { supabase } from './src/integrations/supabase/client.ts';

async function run() {
  const { data, error } = await supabase.from('draw_results').select('*').limit(1);
  console.log("row:", data, "error:", error);
}
run();
