import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import Layout from './components/Layout';
import EvaluateeDashboard from './components/EvaluateeDashboard';
import EvaluatorDashboard from './components/EvaluatorDashboard';
import Auth from './components/Auth';
import AiAssistant from './components/AiAssistant';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear()); // 현재 연도 자동 설정
  const isInitializing = useRef(false); // 중복 초기화 방지용

  const fetchProfile = async (userId) => {
    try {
      console.log('Fetching profile for:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code === 'PGRST116') {
        console.log('No profile found, creating default profile...');
        const { data: { user } } = await supabase.auth.getUser();
        
        const defaultName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
        const defaultRole = user?.user_metadata?.role || 'evaluatee';
        const defaultDept = user?.user_metadata?.department || '인사팀';

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ 
            id: userId, 
            full_name: defaultName,
            role: defaultRole,
            department: defaultDept,
            position: '사원'
          }])
          .select()
          .single();

        if (createError) {
          console.error('Profile creation failed:', createError);
          setUserRole('evaluatee');
          return;
        }
        
        if (newProfile) {
          setProfile(newProfile);
          setUserRole(newProfile.role);
        }
      } else if (data) {
        let profileData = data;
        
        // [강화] 사원 번호가 없는 경우 이름으로 사원 테이블에서 찾아 연동 시도
        if (!profileData.employee_id) {
          const { data: empData } = await supabase
            .from('employees')
            .select('employee_id, hire_date')
            .eq('full_name', profileData.full_name)
            .maybeSingle();
          
          if (empData) {
            const { data: updatedProfile } = await supabase
              .from('profiles')
              .update({ 
                employee_id: empData.employee_id,
                hire_date: empData.hire_date 
              })
              .eq('id', userId)
              .select()
              .single();
            if (updatedProfile) profileData = updatedProfile;
          }
        }

        // [강화] 사원 번호가 존재하지만 연봉이 0인 경우, employee_history에서 최신 데이터를 가져와 프로필 업데이트
        if (profileData.employee_id && (!profileData.current_salary || Number(profileData.current_salary) === 0)) {
          const { data: latestHist } = await supabase
            .from('employee_history')
            .select('salary, position, performance_rating')
            .eq('employee_id', profileData.employee_id)
            .order('year', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (latestHist) {
            const { data: updatedProfile } = await supabase
              .from('profiles')
              .update({
                current_salary: latestHist.salary || 0,
                position: latestHist.position || profileData.position,
                performance_rating: latestHist.performance_rating || profileData.performance_rating
              })
              .eq('id', userId)
              .select()
              .single();
            if (updatedProfile) profileData = updatedProfile;
          }
        }

        setProfile(profileData);
        const role = profileData.role || 'evaluatee';
        setUserRole(role);
        
        // 역할에 따른 초기 탭 설정
        if (role === 'evaluatee') {
          setCurrentTab('negotiation');
        } else if (role === 'evaluator') {
          setCurrentTab('dashboard');
        }
      }


    } catch (error) {
      console.error('Profile error:', error);
      setUserRole('evaluatee');
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // [강력한 안전장치] 어떤 경우에도 4초 후에는 로딩을 강제 종료
    const timer = setTimeout(() => {
      if (mounted) {
        console.warn('Safety timeout reached - forcing loading screen off');
        setLoading(false);
      }
    }, 4000);

    const initApp = async () => {
      if (isInitializing.current) return;
      isInitializing.current = true;

      try {
        console.log('Initializing application session...');
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        setSession(currentSession);
        if (currentSession) {
          await fetchProfile(currentSession.user.id);
        }
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
          clearTimeout(timer);
        }
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      console.log('Auth event notification:', event);
      
      setSession(newSession);
      if (newSession) {
        // 인증 이벤트 시 프로필만 조용히 업데이트 (로딩 화면 간섭 방지)
        fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
        setUserRole(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  // 실시간 알림 설정
  useEffect(() => {
    if (!session || !userRole) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'negotiations',
        },
        (payload) => {
          if (userRole === 'evaluator') {
            alert(`새로운 협상 요구안이 접수되었습니다: ${payload.new.evaluatee_name}님`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, session]);

  // Sidebar 액션
  useEffect(() => {
    if (currentTab === 'switch-role') {
      const nextRole = userRole === 'evaluator' ? 'evaluatee' : 'evaluator';
      setUserRole(nextRole);
      setCurrentTab(nextRole === 'evaluator' ? 'dashboard' : 'negotiation');
    }
  }, [currentTab, userRole]);

  const renderContent = () => {
    if (!userRole && !loading) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
          <p className="font-bold">사용자 권한을 확인 중입니다...</p>
        </div>
      );
    }
    if (!userRole) return null;

    if (currentTab === 'dashboard' || currentTab === 'negotiation' || currentTab === 'employees') {
      return userRole === 'evaluator' 
        ? <EvaluatorDashboard profile={profile} currentTab={currentTab} currentYear={currentYear} /> 
        : <EvaluateeDashboard profile={profile} currentYear={currentYear} />;
    }

    if (currentTab === 'ai') {
      return <AiAssistant profile={profile} userRole={userRole} currentYear={currentYear} />;
    }
    
    return <div className="p-12 text-center text-gray-400">준비 중인 페이지입니다.</div>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA]">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-bold animate-pulse">시스템 최적화 중...</p>
      </div>
    );
  }

  if (!session) return <Auth />;

  return (
    <div className="app-container">
      <Layout 
        userRole={userRole || 'evaluatee'} 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        session={session} 
        profile={profile}
        currentYear={currentYear}
        setCurrentYear={setCurrentYear}
      >
        {renderContent()}
      </Layout>
    </div>
  );
}

export default App;
