import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import Layout from './components/Layout';
import EvaluateeDashboard from './components/EvaluateeDashboard';
import EvaluatorDashboard from './components/EvaluatorDashboard';
import Auth from './components/Auth';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userRole, setUserRole] = useState('evaluator'); // 'evaluatee' or 'evaluator'
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('Profile not found for user:', userId);
          // 프로필이 없는 경우 기본값 설정 또는 다른 처리
          setUserRole('evaluatee'); 
        } else {
          throw error;
        }
      } else if (data) {
        setProfile(data);
        setUserRole(data.role || 'evaluatee');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  React.useEffect(() => {
    let mounted = true;

    // 안전장치: 6초 후에는 무조건 로딩 해제
    const timer = setTimeout(() => {
      if (mounted) {
        console.warn('Loading safety timeout reached');
        setLoading(false);
      }
    }, 6000);

    const initialize = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(initialSession);
        if (initialSession) {
          await fetchProfile(initialSession.user.id);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
          clearTimeout(timer);
        }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      setSession(session);
      if (session) {
        if (event === 'SIGNED_IN') {
          setLoading(true);
          await fetchProfile(session.user.id);
          setLoading(false);
        } else {
          fetchProfile(session.user.id);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  // 실시간 알림 설정 (피평가자가 새로운 요구안을 제출했을 때)
  React.useEffect(() => {
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

  // Handle custom actions from sidebar
  React.useEffect(() => {
    if (currentTab === 'switch-role') {
      setUserRole(prev => prev === 'evaluator' ? 'evaluatee' : 'evaluator');
      setCurrentTab('negotiation');
    }
  }, [currentTab]);

  const renderContent = () => {
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
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="app-container">
      <Layout 
        userRole={userRole} 
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
