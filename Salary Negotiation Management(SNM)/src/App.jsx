import React, { useState } from 'react';
import Layout from './components/Layout';
import EvaluateeDashboard from './components/EvaluateeDashboard';
import EvaluatorDashboard from './components/EvaluatorDashboard';

function App() {
  // Simple role and tab management for demo purposes
  // In a real app, this would come from Supabase Auth
  const [userRole, setUserRole] = useState('evaluator'); // 'evaluatee' or 'evaluator'
  const [currentTab, setCurrentTab] = useState('dashboard');

  // Handle custom actions from sidebar
  if (currentTab === 'switch-role') {
    setUserRole(userRole === 'evaluator' ? 'evaluatee' : 'evaluator');
    setCurrentTab('dashboard');
  }

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

  return (
    <div className="app-container">
      <Layout 
        userRole={userRole} 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab}
      >
        {renderContent()}
      </Layout>
    </div>
  );
}

export default App;
