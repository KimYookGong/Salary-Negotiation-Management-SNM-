import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import Layout from './components/Layout';
import EvaluateeDashboard from './components/EvaluateeDashboard';
import EvaluatorDashboard from './components/EvaluatorDashboard';
import Auth from './components/Auth';

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState('evaluator'); // 'evaluatee' or 'evaluator'
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle custom actions from sidebar
  React.useEffect(() => {
    if (currentTab === 'switch-role') {
      setUserRole(prev => prev === 'evaluator' ? 'evaluatee' : 'evaluator');
      setCurrentTab('dashboard');
    }
  }, [currentTab]);

  const renderContent = () => {
    if (currentTab === 'dashboard' || currentTab === 'negotiation') {
      return userRole === 'evaluator' ? <EvaluatorDashboard /> : <EvaluateeDashboard />;
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
      >
        {renderContent()}
      </Layout>
    </div>
  );
}

export default App;
