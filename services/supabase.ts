
import { createClient } from '@supabase/supabase-js';

// WARNING: It is strongly recommended to use environment variables for these keys.
// Hardcoding them here is a security risk and should only be done for local development.
// In a production environment, use something like VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
// in a .env file and access them via import.meta.env.VITE_SUPABASE_URL.
const supabaseUrl = "https://rymdmjueuxfafjbshcdu.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5bWRtanVldXhmYWZqYnNoY2R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwOTk3ODksImV4cCI6MjA3ODY3NTc4OX0.go5g8FJMqqWQ2sDqxRbOTBe44J0lkEe5pssfMdiv83E";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided.");
}


// The Supabase client is initialized here. For client-side applications,
// it's standard practice to use the public 'anon' key.
// Security is not managed by hiding this key, but by enabling and correctly
// configuring Row Level Security (RLS) in your Supabase project dashboard.
// All tables should have RLS enabled with appropriate policies.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Automatically refreshes the token shortly before it expires.
    autoRefreshToken: true,
    // Stores the session in localStorage.
    persistSession: true,
  },
});
