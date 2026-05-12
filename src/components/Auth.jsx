import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { LogIn, UserPlus, Mail, Lock, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (isSignUp) {
        // 1. 사원 마스터 테이블에서 정보 일치 여부 확인
        const { data: employee, error: empError } = await supabase
          .from('employees')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('full_name', fullName)
          .eq('department', department)
          .single();

        if (empError || !employee) {
          throw new Error('사원 정보가 일치하지 않습니다. 이름, 부서, 사번을 다시 확인해주세요.');
        }

        // 2. 인사팀 여부에 따라 역할 설정
        const assignedRole = department === '인사팀' ? 'evaluator' : 'evaluatee';

        // 3. Supabase Auth 가입
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              department: department,
              employee_id: employeeId,
              role: assignedRole
            }
          }
        });
        if (authError) throw authError;

        // 4. 프로필 생성
        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: authData.user.id, 
                full_name: fullName, 
                department: department, 
                position: employee.position, // 추가
                employee_id: employeeId,
                role: assignedRole
              }
            ]);
          if (profileError) console.error('Profile creation error:', profileError);
        }

        setMessage({ type: 'success', text: '회원가입 확인 메일을 보냈습니다. (인증 비활성화 시 바로 로그인 가능)' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || '인증 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--color-accent-1)]/10 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] rounded-full bg-[var(--color-primary)]/10 blur-[100px]"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-primary)] rounded-2xl shadow-xl mb-4 text-white">
            <Sparkles size={32} />
          </div>
          <h1 className="text-3xl font-black text-[var(--color-primary)] tracking-tight mb-2">SalarySync</h1>
          <p className="text-[var(--text-muted)] font-medium">데이터 기반의 스마트한 연봉 협상 솔루션</p>
        </div>

        <div className="card shadow-2xl p-8 backdrop-blur-lg bg-white/80 border-white">
          <h2 className="text-2xl font-bold mb-6 text-center">
            {isSignUp ? '회원가입' : '로그인'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-[var(--text-main)] mb-1.5">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input 
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--text-main)] mb-1.5">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input 
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <AnimatePresence>
              {isSignUp && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="pt-2 border-t border-gray-100 mt-4">
                    <label className="block text-sm font-bold text-[var(--text-main)] mb-1.5">이름</label>
                    <input 
                      type="text"
                      required={isSignUp}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
                      placeholder="홍길동"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--text-main)] mb-1.5">부서</label>
                    <select 
                      required={isSignUp}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      <option value="">부서 선택</option>
                      <option value="운영팀">운영팀</option>
                      <option value="인사팀">인사팀</option>
                      <option value="마케팅팀">마케팅팀</option>
                      <option value="개발팀">개발팀</option>
                      <option value="디자인팀">디자인팀</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--text-main)] mb-1.5">사번</label>
                    <input 
                      type="text"
                      required={isSignUp}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
                      placeholder="20240101"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {message.text && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`text-sm p-3 rounded-lg ${
                    message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                  }`}
                >
                  {message.text}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full btn btn-primary justify-center py-4 text-lg shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : isSignUp ? (
                <>
                  <UserPlus size={20} /> 가입하기
                </>
              ) : (
                <>
                  <LogIn size={20} /> 로그인
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              {isSignUp ? '이미 계정이 있으신가요?' : '아직 계정이 없으신가요?'}
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="ml-2 font-bold text-[var(--color-primary)] hover:underline"
              >
                {isSignUp ? '로그인하기' : '회원가입하기'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
