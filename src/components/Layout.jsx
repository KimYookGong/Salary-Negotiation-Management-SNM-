import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  Settings, 
  LogOut, 
  User,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }) => (
  <div 
    className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
      active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
    }`}
    onClick={onClick}
    title={collapsed ? label : ''}
  >
    <Icon size={20} />
    {!collapsed && <span className="font-medium">{label}</span>}
  </div>
);

const Layout = ({ children, userRole, currentTab, setCurrentTab, session, profile }) => {
  const [collapsed, setCollapsed] = useState(false);
  
  useEffect(() => {
    // 알림 관련 로직 제거됨
  }, [session]);

  const menuItems = [
    { id: 'negotiation', label: userRole === 'evaluator' ? '협상 관리' : '연봉 협상', icon: MessageSquare },
  ];



  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      {/* Sidebar */}
      <aside 
        className={`bg-[var(--color-primary)] text-white transition-all duration-300 flex flex-col ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="p-6 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--color-accent-1)] rounded-lg flex items-center justify-center">
                <TrendingUp size={20} className="text-[var(--color-primary)]" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">SalarySync</h1>
            </div>
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 hover:bg-white/10 rounded"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 mt-4 space-y-1">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.id}
              {...item}
              active={currentTab === item.id}
              collapsed={collapsed}
              onClick={() => setCurrentTab(item.id)}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-[var(--border-color)] px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--color-primary)]">
              {menuItems.find(item => item.id === currentTab)?.label}
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                {/* 알림 버튼 제거됨 */}
              </div>
              
              <div className="flex items-center gap-3 pl-4 border-l border-[var(--border-color)]">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-[var(--text-main)] truncate max-w-[150px]">
                    {profile?.full_name || session?.user?.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] font-medium">
                    {profile?.department} {profile?.position}
                  </p>
                </div>
                <div className="w-10 h-10 bg-[var(--color-secondary)] rounded-full flex items-center justify-center text-white font-bold overflow-hidden shadow-inner">
                  {profile?.full_name ? profile.full_name[0] : <User size={20} />}
                </div>
              </div>

              <button 
                onClick={() => supabase.auth.signOut()}
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
              >
                <LogOut size={18} />
                <span>로그아웃</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
