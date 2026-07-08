import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.rpc('get_schema_info', {}); // if exists
  console.log("error:", error);
  // or just fetch 1 row
  const { data: row, error: err2 } = await supabase.from('draw_results').select('*').limit(1);
  console.log("row:", row, "error:", err2);
}
run();
