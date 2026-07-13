import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kmkdwivnymcumgoorsiv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2R3aXZueW1jdW1nb29yc2l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjM2MzQsImV4cCI6MjA3NzczOTYzNH0.LsdZ342a8rfbCCa0ScYeOGUwJONS7ZIaYAMLleTM9t4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const functionsToTest = [
  { name: "evaluate-algorithms", body: { drawName: "Wari" } },
  { name: "chronological-training", body: { drawName: "Wari", algorithm: "Stacking Ensemble" } },
  { name: "multi-draw-prediction", body: { drawNames: ["Wari"] } },
  { name: "ai-prediction-analyzer", body: { drawName: "Wari", predictions: [{ numbers: [3, 11, 21, 32, 50], confidence: 0.85, algorithm: "Stacking Ensemble", category: "ML" }] } },
  { name: "scrape-results", body: { drawName: "Wari" } },
  { name: "personalized-prediction", body: { drawName: "Wari", userId: "dummy" } },
  { name: "multi-algorithm-comparison", body: { drawName: "Wari" } },
  { name: "adaptive-orchestration", body: { drawName: "Wari" } },
  { name: "select-best-algorithm", body: { drawName: "Wari" } },
  { name: "forensic-audit", body: { drawName: "Wari" } }
];

async function run() {
  for (const fn of functionsToTest) {
    console.log(`\n--- Testing ${fn.name} ---`);
    try {
      const { data, error } = await supabase.functions.invoke(fn.name, { body: fn.body });
      if (error) {
        console.error(`❌ ${fn.name} returned error:`, error.message || error);
      } else {
        console.log(`✅ ${fn.name} Succeeded!`);
      }
    } catch (err) {
      console.error(`❌ ${fn.name} threw error:`, err);
    }
  }
}

run();
