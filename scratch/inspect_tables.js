import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  console.log('--- Inspecting risk_assessments ---');
  try {
    const { data, error } = await supabase.from('risk_assessments').select('*').limit(3);
    if (error) {
      console.error('Error querying risk_assessments:', error.message);
    } else {
      console.log('risk_assessments data count:', data.length);
      console.log('risk_assessments columns & sample:', data[0] || 'No rows found');
    }
  } catch (e) {
    console.error('Exception querying risk_assessments:', e);
  }

  console.log('\n--- Inspecting market_benchmarks ---');
  try {
    const { data, error } = await supabase.from('market_benchmarks').select('*').limit(3);
    if (error) {
      console.error('Error querying market_benchmarks:', error.message);
    } else {
      console.log('market_benchmarks data count:', data.length);
      console.log('market_benchmarks columns & sample:', data[0] || 'No rows found');
    }
  } catch (e) {
    console.error('Exception querying market_benchmarks:', e);
  }
}

inspect();
