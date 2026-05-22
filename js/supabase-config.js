// Supabase Configuration
const SUPABASE_URL = 'https://qzbzqszxsswpvfxgknjt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6Ynpxc3p4c3N3cHZmeGdrbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4ODA5MzEsImV4cCI6MjA5MzQ1NjkzMX0._Lqv75i2bMqi1CNxDkBnRjNrFpSiTQfZVgpV1Ep4DGk';

console.log("Initializing Supabase Client...");

function initSupabase() {
  const lib = window.supabase;
  if (!lib) {
    console.warn("Supabase SDK not ready yet, retrying...");
    setTimeout(initSupabase, 100);
    return;
  }
  
  try {
    window.supabaseClient = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Supabase Client initialized successfully.");
  } catch (err) {
    console.error("❌ Error initializing Supabase:", err);
  }
}

initSupabase();
