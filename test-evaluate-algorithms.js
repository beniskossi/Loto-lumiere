const SUPABASE_URL = "https://kmkdwivnymcumgoorsiv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2R3aXZueW1jdW1nb29yc2l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjM2MzQsImV4cCI6MjA3NzczOTYzNH0.LsdZ342a8rfbCCa0ScYeOGUwJONS7ZIaYAMLleTM9t4";

async function run() {
  console.log("Fetching evaluate-algorithms...");
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/evaluate-algorithms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ drawName: "Wari" })
    });
    console.log(`Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    try {
      console.log(`Response (JSON):`, JSON.stringify(JSON.parse(text), null, 2));
    } catch {
      console.log(`Response (Text):`, text);
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

run();
