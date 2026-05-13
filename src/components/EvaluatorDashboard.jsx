import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  MessageSquare, 
  Check, 
  Search, 
  ChevronRight, 
  X,
  FileText,
  AlertCircle,
  Users,
  User,
  Filter,
  ArrowUpDown,
  LayoutDashboard,
  TrendingUp,
  Percent,
  Wallet,
  ArrowUpRight,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 상태 한글화 맵핑
const statusMap = {
  submitted: { label: '대기중', className: 'bg-orange-100 text-orange-700' },
  under_review: { label: '검토중', className: 'bg-blue-100 text-blue-700' },
  counter_offer: { label: '역제시중', className: 'bg-purple-100 text-purple-700' },
  final_agreement: { label: '수락됨', className: 'bg-green-100 text-green-700' },
  rejected: { label: '거절됨', className: 'bg-red-100 text-red-700' },
};

// 금액 포맷터
const formatCurrency = (value) => {
  if (!value && value !== 0) return '-';
  const num = Number(value);
  if (num >= 100000000) {
    return (num / 100000000).toFixed(1) + '억';
  }
  return (num / 10000).toLocaleString() + '만원';
};

const BudgetDonut = ({ percentage, label, color = "var(--color-primary)" }) => {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  // 100%에서 사용률만큼 차감된 잔여량을 표시
  const remainingPercentage = Math.max(0, 100 - percentage);
  const offset = circumference - (remainingPercentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <svg className="w-32 h-32 transform -rotate-90">
        <circle cx="64" cy="64" r={radius} stroke="rgba(0,0,0,0.05)" strokeWidth="8" fill="transparent" />
        <circle 
          cx="64" cy="64" r={radius} stroke={color} strokeWidth="8" fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <span className="text-xl font-black text-gray-900">{Math.round(percentage)}%</span>
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{label}</p>
      </div>
    </div>
  );
};

const CounterOfferPopup = ({ isOpen, onClose, name, currentProposal, onConfirm }) => {
  const [offer, setOffer] = useState('');
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-10 w-full max-w-lg shadow-2xl relative z-10 border border-gray-100"
      >
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-2xl font-black text-gray-900 mb-1">조건 역제시</h3>
            <p className="text-sm text-gray-400 font-bold">{name}님의 요구안에 대한 역제시안을 작성합니다.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl transition-all">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">현재 요구안</p>
            <p className="text-lg font-black text-gray-900">{currentProposal}</p>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">역제시 연봉/조건</label>
            <input 
              type="text" className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 text-lg font-black text-[var(--color-primary)]"
              placeholder="예: 7,200만원" value={offer} onChange={(e) => setOffer(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">검토 의견</label>
            <textarea 
              className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 h-32 text-sm font-medium"
              placeholder="역제시 사유 및 추가 검토 의견을 입력하세요."
              value={comment} onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-10">
          <button onClick={onClose} className="flex-1 py-4 text-sm font-black text-gray-400 hover:bg-gray-50 rounded-2xl transition-all">취소</button>
          <button 
            onClick={() => onConfirm(offer, comment)}
            className="flex-2 py-4 px-8 bg-[var(--color-primary)] text-white text-base font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            역제시안 전송
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const SalaryNegotiationPopup = ({ isOpen, onClose, onConfirm, employee, budgetData }) => {
  const [proposedRating, setProposedRating] = useState(employee?.performance_rating || 'A');
  const [proposedSalary, setProposedSalary] = useState('');
  const [increaseRate, setIncreaseRate] = useState(0);

  useEffect(() => {
    if (employee && employee.current_salary && proposedSalary) {
      const current = Number(employee.current_salary);
      const proposed = Number(proposedSalary.replace(/[^0-9]/g, ''));
      if (current > 0) {
        const rate = ((proposed - current) / current) * 100;
        setIncreaseRate(rate.toFixed(1));
      }
    } else {
      setIncreaseRate(0);
    }
  }, [proposedSalary, employee]);

  if (!isOpen || !employee) return null;

  const additionalCost = Number(proposedSalary.replace(/[^0-9]/g, '')) - Number(employee.current_salary);
  const totalUsage = budgetData.total ? ((budgetData.total.used + additionalCost) / budgetData.total.limit * 100).toFixed(1) : 0;
  const deptUsage = budgetData.dept ? ((budgetData.dept.used + additionalCost) / budgetData.dept.limit * 100).toFixed(1) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-10 w-full max-w-2xl shadow-2xl relative z-10 border border-gray-100 overflow-hidden"
      >
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-3xl font-black text-gray-900 mb-1">연봉 협상 제안</h3>
            <p className="text-sm text-gray-400 font-bold">대상자 인사 정보를 기반으로 협상을 시작합니다.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl transition-all">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-6">
            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">기본 정보</h4>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm font-bold text-gray-400">성명</span>
                <span className="text-sm font-black text-gray-900">{employee.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-bold text-gray-400">부서 / 직급</span>
                <span className="text-sm font-bold text-gray-600">{employee.department} / {employee.position}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-bold text-gray-400">현재 연봉</span>
                <span className="text-sm font-black text-gray-900">{formatCurrency(employee.current_salary)}</span>
              </div>
            </div>

            {/* Budget Impact Alert */}
            <div className="mt-8 p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
              <h5 className="text-[10px] font-black text-gray-400 uppercase">예산 영향도 분석</h5>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500">전체 예산 사용률</span>
                  <span className={`text-xs font-black ${totalUsage > 100 ? 'text-red-600' : 'text-gray-900'}`}>{totalUsage}%</span>
                </div>
                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full ${totalUsage > 100 ? 'bg-red-500' : 'bg-[var(--color-primary)]'} transition-all`} style={{ width: `${Math.min(totalUsage, 100)}%` }} />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs font-bold text-gray-500">부서 예산 사용률</span>
                  <span className={`text-xs font-black ${deptUsage > 100 ? 'text-red-600' : 'text-gray-900'}`}>{deptUsage}%</span>
                </div>
                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full ${deptUsage > 100 ? 'bg-red-500' : 'bg-[var(--color-secondary)]'} transition-all`} style={{ width: `${Math.min(deptUsage, 100)}%` }} />
                </div>
              </div>
              { (totalUsage > 100 || deptUsage > 100) && (
                <div className="flex items-center gap-2 text-red-600 mt-3 pt-3 border-t border-red-100">
                  <ShieldAlert size={14} />
                  <span className="text-[10px] font-black">예산 한도를 초과했습니다. 제안을 재검토하세요.</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-[11px] font-black text-[var(--color-primary)] uppercase tracking-widest border-b border-[var(--color-primary)]/20 pb-2">협상 제안서 작성</h4>
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">현 제안 등급</label>
                <div className="flex gap-2">
                  {['S', 'A', 'B', 'C', 'D'].map(r => (
                    <button 
                      key={r} onClick={() => setProposedRating(r)}
                      className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                        proposedRating === r ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-gray-50 text-gray-400 border-gray-100'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">제안 연봉 (원)</label>
                <input 
                  type="text" className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 text-lg font-black text-[var(--color-primary)]"
                  placeholder="예: 75000000" value={proposedSalary} onChange={(e) => setProposedSalary(e.target.value)}
                />
              </div>
              <div className="p-4 bg-[var(--color-primary)]/5 rounded-2xl border border-[var(--color-primary)]/10 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">인상률</span>
                <span className="text-lg font-black text-[var(--color-primary)]">{increaseRate}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-12 pt-8 border-t border-gray-50">
          <button onClick={onClose} className="flex-1 py-4 text-sm font-black text-gray-400 hover:bg-gray-50 rounded-2xl transition-all">닫기</button>
          <button 
            disabled={totalUsage > 100 || deptUsage > 100}
            onClick={() => {
              alert(`전체 예산의 ${totalUsage}%, ${employee.department} 예산의 ${deptUsage}%를 사용합니다.`);
              onConfirm(proposedRating, proposedSalary, increaseRate);
            }}
            className={`flex-2 py-4 px-8 text-white text-base font-black rounded-2xl shadow-xl transition-all ${
              (totalUsage > 100 || deptUsage > 100) ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-[var(--color-primary)] shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            제안서 저장 및 전송
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const EvaluatorDashboard = ({ profile, currentTab }) => {
  const [negotiations, setNegotiations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [budgets, setBudgets] = useState({ company: null, depts: [] });
  const [loading, setLoading] = useState(true);
  
  const [dbSearchTerm, setDbSearchTerm] = useState('');
  const [dbDeptFilter, setDbDeptFilter] = useState('전체');
  const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'asc' });
  const [isSalaryPopupOpen, setIsSalaryPopupOpen] = useState(false);
  const [selectedEmployeeForSalary, setSelectedEmployeeForSalary] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedNegotiation, setSelectedNegotiation] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Starting fetchData in EvaluatorDashboard...');
      
      const { data: negs, error: negsError } = await supabase.from('negotiations').select('*').order('updated_at', { ascending: false });
      if (negsError) {
        console.error('Negotiations fetch error:', negsError);
        throw negsError;
      }
      console.log('Negotiations fetched:', negs?.length || 0);
      if (negs) setNegotiations(negs);

      const { data: emps, error: empsError } = await supabase.from('employees').select('*');
      if (empsError) {
        console.error('Employees fetch error:', empsError);
        throw empsError;
      }
      console.log('Employees fetched:', emps?.length || 0);
      if (emps) setEmployees(emps);

      const { data: companyBudget, error: budgetError } = await supabase.from('budgets').select('*').order('year', { ascending: false }).limit(1).single();
      if (budgetError && budgetError.code !== 'PGRST116') {
        console.error('Budget fetch error:', budgetError);
      }
      
      const { data: deptBudgets, error: deptError } = await supabase.from('department_budgets').select('*');
      if (deptError) {
        console.error('Dept budgets fetch error:', deptError);
      }
      
      // 더미 데이터 초기화 (데이터가 없을 경우)
      if (!companyBudget && (!budgetError || budgetError.code === 'PGRST116')) {
        console.log('No company budget found, attempting to initialize...');
        const { data: newBudget, error: insError } = await supabase.from('budgets').insert([{ year: 2026, total_budget: 1000000000, used_budget: 0 }]).select().single();
        if (insError) console.error('Budget initialization failed:', insError);
        if (newBudget) setBudgets(prev => ({ ...prev, company: newBudget }));
      } else {
        setBudgets(prev => ({ ...prev, company: companyBudget }));
      }

      if (!deptBudgets || deptBudgets.length === 0) {
        console.log('No department budgets found, attempting to initialize...');
        const depts = ['개발팀', '디자인팀', '마케팅팀', '운영팀', '인사팀'];
        const dummyDepts = depts.map(d => ({ department_name: d, total_budget: 200000000, used_budget: 0 }));
        const { data: newDepts, error: upsertError } = await supabase.from('department_budgets').upsert(dummyDepts).select();
        if (upsertError) console.error('Dept budget initialization failed:', upsertError);
        setBudgets(prev => ({ ...prev, depts: newDepts || [] }));
      } else {
        setBudgets(prev => ({ ...prev, depts: deptBudgets }));
      }

    } catch (error) {
      console.error('CRITICAL: Error fetching data in EvaluatorDashboard:', error);
      alert(`데이터를 불러오는 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentTab]);

  const handleStatusUpdate = async (id, status, extra = {}) => {
    const { error } = await supabase.from('negotiations').update({ status, updated_at: new Date(), ...extra }).eq('id', id);
    if (error) alert('업데이트 중 오류가 발생했습니다.');
    else { alert('상태가 업데이트되었습니다.'); setIsPopupOpen(false); setSelectedNegotiation(null); fetchData(); }
  };

  const handleSalaryProposal = async (rating, salary, rate) => {
    if (!selectedEmployeeForSalary) return;
    const additionalCost = Number(salary.replace(/[^0-9]/g, '')) - Number(selectedEmployeeForSalary.current_salary);
    
    // 예산 업데이트 로직 포함
    await supabase.rpc('increment_budget', { amount: additionalCost, dept: selectedEmployeeForSalary.department });
    
    const { data: userProfile } = await supabase.from('profiles').select('id').eq('employee_id', selectedEmployeeForSalary.employee_id).single();
    const payload = {
      evaluatee_name: selectedEmployeeForSalary.full_name,
      department: selectedEmployeeForSalary.department,
      position: selectedEmployeeForSalary.position,
      current_salary: selectedEmployeeForSalary.current_salary,
      performance_rating: rating,
      evaluator_proposal: formatCurrency(salary),
      status: 'counter_offer',
      updated_at: new Date()
    };
    if (userProfile) payload.evaluatee_id = userProfile.id;

    const { data: existingNeg } = await supabase.from('negotiations').select('id').eq('evaluatee_name', selectedEmployeeForSalary.full_name).single();
    if (existingNeg) await supabase.from('negotiations').update(payload).eq('id', existingNeg.id);
    else await supabase.from('negotiations').insert([payload]);

    setIsSalaryPopupOpen(false); setSelectedEmployeeForSalary(null); fetchData();
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredEmployees = employees.filter(emp => {
    const matchSearch = emp.full_name.toLowerCase().includes(dbSearchTerm.toLowerCase());
    const matchDept = dbDeptFilter === '전체' || emp.department === dbDeptFilter;
    return matchSearch && matchDept;
  }).sort((a, b) => {
    if (sortConfig.key === 'performance_rating') {
      const ratingOrder = { 'S': 1, 'A': 2, 'B': 3, 'C': 4, 'D': 5 };
      const valA = ratingOrder[a[sortConfig.key]] || 99; const valB = ratingOrder[b[sortConfig.key]] || 99;
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    }
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredNegotiations = negotiations.filter(neg => neg.evaluatee_name.toLowerCase().includes(searchTerm.toLowerCase()) || neg.department.toLowerCase().includes(searchTerm.toLowerCase()));
  const departments = ['개발팀', '디자인팀', '마케팅팀', '운영팀', '인사팀'];

  // Current Budget View based on filter
  const currentBudgetContext = dbDeptFilter === '전체' 
    ? { limit: budgets.company?.total_budget || 1, used: budgets.company?.used_budget || 0, label: '회사 전체' }
    : { 
        limit: budgets.depts.find(d => d.department_name === dbDeptFilter)?.total_budget || 1, 
        used: budgets.depts.find(d => d.department_name === dbDeptFilter)?.used_budget || 0, 
        label: dbDeptFilter 
      };
  const budgetPercentage = (currentBudgetContext.used / currentBudgetContext.limit) * 100;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6 w-full max-w-[1600px] mx-auto overflow-hidden">
      {currentTab === 'dashboard' && (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {/* Dashboard Header with Filter */}
          <div className="flex items-center justify-between shrink-0 px-2">
            <button 
              onClick={() => fetchData()} 
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-all text-xs font-bold"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              데이터 새로고침
            </button>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-sm">
              <Filter size={16} className="text-gray-400" />
              <span className="text-xs font-black text-gray-400 uppercase tracking-tighter mr-2">부서 필터</span>
              <select 
                className="text-sm font-black text-[var(--color-primary)] outline-none bg-transparent cursor-pointer min-w-[120px]" 
                value={dbDeptFilter} 
                onChange={(e) => setDbDeptFilter(e.target.value)}
              >
                <option value="전체">회사 전체</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Budget Widget Row */}
          <div className="grid grid-cols-1 gap-6 shrink-0">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-black text-gray-900 mb-6 px-2">예산 현황</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-12">
                  <BudgetDonut percentage={budgetPercentage} label={currentBudgetContext.label} color={dbDeptFilter === '전체' ? "var(--color-primary)" : "var(--color-secondary)"} />
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">총 인상 예산 (한도)</h4>
                      <p className="text-3xl font-black text-gray-900">{formatCurrency(currentBudgetContext.limit)}</p>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">현재 예산 사용액</h4>
                      <p className="text-3xl font-black text-[var(--color-primary)]">{formatCurrency(currentBudgetContext.used)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="h-24 w-[1px] bg-gray-100 mx-8 hidden lg:block" />
                
                <div className="flex-1 flex flex-col justify-center">
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-center max-w-xs ml-auto">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">잔여 가용 예산</p>
                    <p className="text-2xl font-black text-gray-900">{formatCurrency(currentBudgetContext.limit - currentBudgetContext.used)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Table Area */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0 bg-gray-50/30">
              <h3 className="text-2xl font-black text-[var(--color-primary)] mb-1 flex items-center gap-2"><Users size={24} /> 사원 현황</h3>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[var(--color-primary)] transition-colors" size={18} />
                  <input type="text" placeholder="성명 검색..." className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none w-64 text-sm font-medium shadow-sm" value={dbSearchTerm} onChange={(e) => setDbSearchTerm(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest cursor-pointer" onClick={() => handleSort('full_name')}>성명</th>
                    <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest cursor-pointer" onClick={() => handleSort('department')}>부서</th>
                    <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest cursor-pointer" onClick={() => handleSort('position')}>직급</th>
                    <th className="px-8 py-5 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest cursor-pointer" onClick={() => handleSort('current_salary')}>현재 연봉</th>
                    <th className="px-8 py-5 text-center text-[11px] font-black text-gray-400 uppercase tracking-widest cursor-pointer" onClick={() => handleSort('performance_rating')}>평가 등급</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.employee_id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => { setSelectedEmployeeForSalary(emp); setIsSalaryPopupOpen(true); }}>
                      <td className="px-8 py-5"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-300 flex items-center justify-center"><User size={20} /></div><p className="text-sm font-black text-gray-900">{emp.full_name}</p></div></td>
                      <td className="px-8 py-5 text-sm font-bold text-gray-600">{emp.department}</td>
                       <td className="px-8 py-5 text-sm font-bold text-gray-600">{emp.position}</td>
                      <td className="px-8 py-5 text-right text-sm font-black text-gray-900">{formatCurrency(emp.current_salary)}</td>
                      <td className="px-8 py-5 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black border ${
                          emp.performance_rating === 'S' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                          emp.performance_rating === 'A' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          emp.performance_rating === 'B' ? 'bg-green-50 text-green-600 border-green-100' :
                          emp.performance_rating === 'C' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                          emp.performance_rating === 'D' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-400 border-gray-100'
                        }`}>{emp.performance_rating || '-'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

      {currentTab === 'negotiation' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
            <div>
              <h3 className="text-xl font-black text-[var(--color-primary)] mb-1">협상 프로세스 관리</h3>
              <p className="text-xs text-gray-400 font-bold">전체 {filteredNegotiations.length}명의 데이터 관리 중</p>
            </div>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[var(--color-primary)] transition-colors" size={18} />
              <input type="text" placeholder="대상자 검색..." className="pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl w-64 text-sm font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 sticky top-0 z-10">
                <tr><th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">대상자 정보</th><th className="px-8 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">평가등급</th><th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">현재 진행 상태</th><th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">희망 연봉 및 조건</th><th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">최종 업데이트</th><th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">상세 보기</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredNegotiations.map((neg) => (
                  <tr key={neg.id} className="hover:bg-gray-50/50 cursor-pointer group" onClick={() => setSelectedNegotiation(neg)}>
                    <td className="px-8 py-5"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-300 flex items-center justify-center group-hover:bg-[var(--color-primary)] group-hover:text-white"><User size={20} /></div><div><p className="text-sm font-black text-gray-900">{neg.evaluatee_name}</p><p className="text-[10px] text-gray-400 font-bold">{neg.department} {neg.position}</p></div></div></td>
                    <td className="px-8 py-5 text-center">{neg.performance_rating ? <span className="text-xs font-black text-[var(--color-primary)] bg-[var(--color-primary)]/5 px-3 py-1 rounded-lg border border-[var(--color-primary)]/10">{neg.performance_rating}</span> : '-'}</td>
                    <td className="px-8 py-5"><span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black ${statusMap[neg.status]?.className}`}>{statusMap[neg.status]?.label}</span></td>
                    <td className="px-8 py-5 font-black text-sm text-[var(--color-primary)]">{neg.evaluatee_proposal}</td>
                    <td className="px-8 py-5 text-[10px] text-gray-400 font-bold">{new Date(neg.updated_at).toLocaleDateString()}</td>
                    <td className="px-8 py-5 text-right"><div className="inline-flex p-1.5 rounded-lg text-gray-200 group-hover:bg-[var(--color-primary)] group-hover:text-white"><ChevronRight size={18} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {selectedNegotiation && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelectedNegotiation(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl z-50 overflow-y-auto">
              <div className="p-10">
                <div className="flex justify-between items-start mb-10"><div className="flex items-center gap-5"><div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300"><User size={32} /></div><div><h2 className="text-3xl font-black text-gray-900">{selectedNegotiation.evaluatee_name}</h2><div className="flex items-center gap-2 mt-1"><p className="text-sm font-bold text-gray-500">{selectedNegotiation.department} {selectedNegotiation.position}</p>{selectedNegotiation.performance_rating && <span className="text-[10px] font-black bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-md">{selectedNegotiation.performance_rating}등급</span>}</div></div></div><button onClick={() => setSelectedNegotiation(null)} className="p-2 hover:bg-gray-50 rounded-xl"><X size={24} className="text-gray-400" /></button></div>
                <div className="space-y-10"><section><h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FileText size={14} /> 주요 요구 사항</h4><div className="p-6 bg-gray-50 rounded-3xl border border-gray-100"><p className="text-2xl font-black text-[var(--color-primary)] mb-2">{selectedNegotiation.evaluatee_proposal}</p><p className="text-sm text-gray-500 font-medium">{selectedNegotiation.jd || '직무 상세 정보 없음'}</p></div></section><section><h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">인상 근거 및 성과 요약</h4><div className="p-6 bg-white border border-gray-100 rounded-3xl italic text-gray-600 text-sm">"{selectedNegotiation.reason || '입력된 근거가 없습니다.'}"</div></section><div className="grid grid-cols-2 gap-4 pt-6"><button onClick={() => handleStatusUpdate(selectedNegotiation.id, 'final_agreement')} className="btn btn-primary w-full justify-center py-4">즉시 수락 및 합의</button><button onClick={() => setIsPopupOpen(true)} className="btn btn-outline w-full justify-center py-4">조건 역제시</button></div></div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CounterOfferPopup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)} name={selectedNegotiation?.evaluatee_name} currentProposal={selectedNegotiation?.evaluatee_proposal} onConfirm={(offer, comment) => handleStatusUpdate(selectedNegotiation.id, 'counter_offer', { evaluator_proposal: offer, evaluator_comment: comment })} />

      <SalaryNegotiationPopup 
        isOpen={isSalaryPopupOpen} onClose={() => { setIsSalaryPopupOpen(false); setSelectedEmployeeForSalary(null); }}
        employee={selectedEmployeeForSalary}
        budgetData={{
          total: { used: budgets.company?.used_budget || 0, limit: budgets.company?.total_budget || 1 },
          dept: { 
            used: budgets.depts.find(d => d.department_name === selectedEmployeeForSalary?.department)?.used_budget || 0, 
            limit: budgets.depts.find(d => d.department_name === selectedEmployeeForSalary?.department)?.total_budget || 1 
          }
        }}
        onConfirm={handleSalaryProposal}
      />
    </div>
  );
};

export default EvaluatorDashboard;
