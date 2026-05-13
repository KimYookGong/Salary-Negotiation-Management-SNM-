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

  const fetchProfile = async (userId) => {
    try {
      console.log('Fetching profile for:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('Profile not found for user:', userId);
          setUserRole('evaluatee'); 
        } else {
          throw error;
        }
      } else if (data) {
        console.log('Profile loaded with role:', data.role);
        setProfile(data);
        setUserRole(data.role || 'evaluatee');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setUserRole('evaluatee');
    }
  };

  useEffect(() => {
    let mounted = true;

    // 안전장치: 어떤 이유로든 8초 이상 로딩이 지속되면 강제로 로딩 해제
    const safetyTimer = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Loading safety timeout reached. Forcing loading to false.');
        setLoading(false);
      }
    }, 8000);

    const initialize = async () => {
      try {
        setLoading(true);
        console.log('Initializing app session...');
        
        // 연결 테스트는 비동기로만 실행 (차단 방지)
        testSupabaseConnection();

        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(initialSession);
        if (initialSession) {
          console.log('Initial session found for:', initialSession.user.email);
          await fetchProfile(initialSession.user.id);
        } else {
          console.log('No initial session found.');
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change event:', event);
      if (!mounted) return;
      
      setSession(session);
      try {
        if (session) {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            setLoading(true);
            await fetchProfile(session.user.id);
          } else {
            await fetchProfile(session.user.id);
          }
        } else {
          setProfile(null);
          setUserRole(null);
        }
      } catch (err) {
        console.error('Error in onAuthStateChange:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
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
    if (!userRole) return null;

    if (currentTab === 'dashboard' || currentTab === 'negotiation') {
      return userRole === 'evaluator' 
        ? <EvaluatorDashboard profile={profile} currentTab={currentTab} /> 
        : <EvaluateeDashboard profile={profile} />;
    }
    
    return (
      <div className="card text-center py-24 bg-gray-50 border-dashed flex flex-col items-center justify-center">
        <p className="text-[var(--text-muted)] font-medium">준비 중인 페이지입니다.</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-gray-400">데이터를 동기화하는 중...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

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
