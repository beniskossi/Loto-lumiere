import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://kmkdwivnymcumgoorsiv.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2R3aXZueW1jdW1nb29yc2l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjM2MzQsImV4cCI6MjA3NzczOTYzNH0.LsdZ342a8rfbCCa0ScYeOGUwJONS7ZIaYAMLleTM9t4";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('get_policies', { table_name: 'algorithm_training_history' });
  console.log("Policies:", data, error);
}
run();
