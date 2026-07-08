import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.example', 'utf-8');
const VITE_SUPABASE_URL = "https://kmkdwivnymcumgoorsiv.supabase.co" || envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1];
const VITE_SUPABASE_ANON_KEY = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1];

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
        .from("draw_results")
        .upsert([{ draw_name: "test", draw_date: "2026-07-06", winning_numbers: [1,2,3,4,5], draw_day: "Mardi", draw_time: "10:00" }], { onConflict: "draw_name,draw_date" });
  console.log("error:", error);
}
run();
