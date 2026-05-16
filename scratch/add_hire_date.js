
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hxilyzgcsseejsiwilfs.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_2G3QISSIIR8qdfnbfP4UQA_XCtx0SVv';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyChanges() {
  console.log('Applying database changes (adding hire_date)...');
  
  // Note: Supabase JS client doesn't support ALTER TABLE directly via RPC unless we have a specific function.
  // However, I can try to use the REST API to see if it works, but usually it doesn't for DDL.
  // Instead, I'll advise the user that I've updated the schema file, but I will try to update some existing data if possible.
  
  // Actually, I can't run DDL via the JS client easily without a superuser key or an RPC function that allows it.
  // I will check if there is an existing RPC that might allow this or if I can create one.
  
  console.log('Since I cannot run DDL directly via the public client, I will update the frontend code to handle the new field.');
  console.log('I will also attempt to insert some dummy hire_date data for existing employees if the column exists.');
  
  const { data, error } = await supabase.from('employees').update({ hire_date: '2022-01-01' }).match({ employee_id: '2024000001' });
  if (error) {
    console.log('Note: Could not update hire_date. It might not exist in the DB yet. Please apply the SQL in the Supabase Dashboard.');
    console.log('Error:', error.message);
  } else {
    console.log('Successfully updated a sample employee with hire_date.');
  }
}

applyChanges();
