
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseAnonKey);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing connection to "employees" table...');
  const { data, error } = await supabase.from('employees').select('*').limit(5);
  
  if (error) {
    console.error('Error fetching employees:', error);
  } else {
    console.log('Employees found:', data.length);
    console.log('First 5 employees:', data);
  }

  console.log('\nTesting connection to "negotiations" table...');
  const { data: negs, error: negError } = await supabase.from('negotiations').select('*').limit(5);
  if (negError) {
    console.error('Error fetching negotiations:', negError);
  } else {
    console.log('Negotiations found:', negs.length);
  }
}

testConnection();
