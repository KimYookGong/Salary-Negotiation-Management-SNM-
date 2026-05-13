import React, { useState, useEffect } from 'react';
import { supabase, testSupabaseConnection } from './supabaseClient';
import Layout from './components/Layout';
import EvaluateeDashboard from './components/EvaluateeDashboard';
import EvaluatorDashboard from './components/EvaluatorDashboard';
import Auth from './components/Auth';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // 프로필 정보를 가져오거나 없으면 생성하는 함수
  const fetchProfile = async (userId) => {
    try {
      console.log('Fetching profile for:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // 프로필이 없는 경우 자동 생성 로직
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
          console.log('Default profile created successfully');
          setProfile(newProfile);
          setUserRole(newProfile.role);
        }
      } else if (data) {
        console.log('Profile loaded with role:', data.role);
        setProfile(data);
        setUserRole(data.role || 'evaluatee');
      }
    } catch (error) {
      console.error('Critical profile error:', error);
      setUserRole('evaluatee');
    }
  };

  useEffect(() => {
    let mounted = true;

    const safetyTimer = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Safety timeout: forcing loading off');
        setLoading(false);
      }
    }, 5000);

    const initialize = async () => {
      try {
        setLoading(true);
        console.log('Initializing app...');
        
        // 연결 테스트
        testSupabaseConnection();

        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(initialSession);
          if (initialSession) {
            console.log('Session exists, fetching profile...');
            await fetchProfile(initialSession.user.id);
          } else {
            console.log('No active session.');
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      console.log('Auth event:', event);
      setSession(session);
      
      if (session) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setLoading(true);
          await fetchProfile(session.user.id);
          setLoading(false);
        } else {
          await fetchProfile(session.user.id);
        }
      } else {
        setProfile(null);
        setUserRole(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
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

  // Sidebar 액션 처리
  useEffect(() => {
    if (currentTab === 'switch-role') {
      setUserRole(prev => prev === 'evaluator' ? 'evaluatee' : 'evaluator');
      setCurrentTab('negotiation');
    }
  }, [currentTab]);

  const renderContent = () => {
    if (!userRole) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-sm">사용자 정보를 확인하고 있습니다...</p>
        </div>
      );
    }

    if (currentTab === 'dashboard' || currentTab === 'negotiation') {
      return userRole === 'evaluator' 
        ? <EvaluatorDashboard profile={profile} currentTab={currentTab} /> 
        : <EvaluateeDashboard profile={profile} />;
    }
    
    return <div className="p-12 text-center text-gray-400">준비 중인 페이지입니다.</div>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
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
      >
        {renderContent()}
      </Layout>
    </div>
  );
}

export default App;
