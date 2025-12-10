
import { createClient } from '@supabase/supabase-js'

// Hardcoded fallback because Vercel env vars are failing
const supabaseUrl = 'https://kkltszpzflyqyvxkjtqc.supabase.co';
const supabaseAnonKey = 'sb_publishable_zA1HdsKbRoSoFyjek6MtSw_Pl5p7ejE';

let supabase = null

try {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
    console.log('Supabase Client Initialized with hardcoded values');
} catch (error) {
    console.error('Supabase Initialization Failed:', error);
}

export { supabase }
