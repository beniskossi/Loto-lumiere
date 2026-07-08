import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kmkdwivnymcumgoorsiv.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2R3aXZueW1jdW1nb29yc2l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjM2MzQsImV4cCI6MjA3NzczOTYzNH0.LsdZ342a8rfbCCa0ScYeOGUwJONS7ZIaYAMLleTM9t4";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const data = [{
    draw_name: "Test",
    draw_day: "Lundi",
    draw_time: "10:00",
    draw_date: "2026-07-06",
    winning_numbers: [1, 2, 3, 4, 5]
  }];
  const { error } = await supabase.from("draw_results").upsert(data, { onConflict: "draw_name,draw_date" });
  console.log("error:", error);
}
run();
