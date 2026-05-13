import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hxilyzgcsseejsiwilfs.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_2G3QISSIIR8qdfnbfP4UQA_XCtx0SVv';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('NOTE: Using fallback Supabase credentials.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
