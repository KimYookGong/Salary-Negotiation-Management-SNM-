import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Bell, 
  User,
  ChevronLeft,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

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

const Layout = ({ children, userRole, currentTab, setCurrentTab }) => {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'negotiation', label: userRole === 'evaluator' ? '협상 관리' : '연봉 협상', icon: MessageSquare },
    { id: 'documents', label: '평가 자료', icon: FileText },
    { id: 'settings', label: '설정', icon: Settings },
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

        <nav className="flex-1 px-4 mt-4 space-y-2">
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

        <div className="p-4 border-t border-white/10">
          <SidebarItem icon={LogOut} label="로그아웃" collapsed={collapsed} />
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
            <button className="relative text-[var(--text-muted)] hover:text-[var(--color-primary)]">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--color-accent-2)] rounded-full border-2 border-white"></span>
            </button>
            
            <div className="h-8 w-[1px] bg-[var(--border-color)]"></div>
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-[var(--text-main)]">홍길동</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {userRole === 'evaluator' ? '인사팀 팀장' : '프론트엔드 개발자'}
                </p>
              </div>
              <div className="w-10 h-10 bg-[var(--color-secondary)] rounded-full flex items-center justify-center text-white font-bold">
                <User size={20} />
              </div>
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
