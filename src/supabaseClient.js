import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hxilyzgcsseejsiwilfs.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_2G3QISSIIR8qdfnbfP4UQA_XCtx0SVv';

// 디버깅을 위한 환경 변수 상태 로깅
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key initialized:', !!supabaseAnonKey);

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('NOTE: Using fallback Supabase credentials. Make sure .env is correctly loaded.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 연결 테스트 함수 추가
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('employees').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('Supabase Connection Test Error:', error.message);
      return false;
    }
    console.log('Supabase Connection Success! Row count in employees:', data);
    return true;
  } catch (err) {
    console.error('Unexpected error during connection test:', err);
    return false;
  }
};
