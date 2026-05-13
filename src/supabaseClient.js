import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 디버깅을 위한 환경 변수 상태 로깅 (실제 키 전체를 노출하지 않도록 주의)
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key initialized:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase credentials are missing! Check your .env file or Environment Variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);

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
