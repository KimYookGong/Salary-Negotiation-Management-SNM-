import React, { useState } from 'react';
import Layout from './components/Layout';
import EvaluateeDashboard from './components/EvaluateeDashboard';
import EvaluatorDashboard from './components/EvaluatorDashboard';

function App() {
  // Simple role and tab management for demo purposes
  // In a real app, this would come from Supabase Auth
  const [userRole, setUserRole] = useState('evaluator'); // 'evaluatee' or 'evaluator'
  const [currentTab, setCurrentTab] = useState('dashboard');

  const renderContent = () => {
    if (currentTab === 'dashboard' || currentTab === 'negotiation') {
      return userRole === 'evaluator' ? <EvaluatorDashboard /> : <EvaluateeDashboard />;
    }
    
    return (
      <div className="card text-center py-20 bg-gray-50 border-dashed">
        <p className="text-[var(--text-muted)]">준비 중인 페이지입니다.</p>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Role Switcher Demo Tool */}
      <div className="fixed bottom-4 right-4 z-50 flex gap-2">
        <button 
          onClick={() => setUserRole(userRole === 'evaluator' ? 'evaluatee' : 'evaluator')}
          className="bg-white shadow-lg border border-[var(--border-color)] px-4 py-2 rounded-full text-xs font-bold hover:bg-gray-50 flex items-center gap-2"
        >
          <div className={`w-2 h-2 rounded-full ${userRole === 'evaluator' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
          {userRole === 'evaluator' ? '평가자 모드' : '피평가자 모드'}로 전환
        </button>
      </div>

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
