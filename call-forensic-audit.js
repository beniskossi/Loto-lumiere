import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kmkdwivnymcumgoorsiv.supabase.co";
// Let's use anon key first
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2R3aXZueW1jdW1nb29yc2l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjM2MzQsImV4cCI6MjA3NzczOTYzNH0.LsdZ342a8rfbCCa0ScYeOGUwJONS7ZIaYAMLleTM9t4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log("Invoking forensic-audit edge function...");
  try {
    const { data, error } = await supabase.functions.invoke('forensic-audit', {
      body: {
        drawName: undefined,
        days: 30,
        applyAdjustments: true,
        runGeminiAnalysis: false
      }
    });

    if (error) {
      console.error("Function error:", error);
    } else {
      console.log("Function response data:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

run();
