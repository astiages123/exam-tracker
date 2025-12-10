
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase = null

if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
    console.log('Supabase Client Initialized Successfully');
} else {
    console.error('Supabase Initialization Failed');
    console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Exists' : 'Missing');
    console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Exists' : 'Missing');
    console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in .env');
}

export { supabase }
