import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Use environment variables for security
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
    console.error('Supabase keys are missing in .env file!');
}

export { supabase }
