import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  MessageSquare, 
  Check, 
  CheckCircle,
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
  submitted: { label: '제안중', className: 'bg-blue-100 text-blue-700' },
  under_review: { label: '제안중', className: 'bg-blue-100 text-blue-700' },
  counter_offer: { label: '역제안중', className: 'bg-purple-100 text-purple-700' },
  final_agreement: { label: '협상 완료', className: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: '미제안', className: 'bg-gray-100 text-gray-600', icon: AlertCircle },
  cancelled: { label: '미제안', className: 'bg-gray-100 text-gray-600', icon: AlertCircle },
};

// 금액 포맷터
const formatCurrency = (value) => {
  if (!value && value !== 0) return '-';
  const num = Number(value);
  return num.toLocaleString() + '원';
};

// 단순 만원 포맷터 (예산 현황용)
const formatCurrencySimple = (value) => {
  if (!value && value !== 0) return '0원';
  const num = Number(value);
  return num.toLocaleString() + '원';
};

// 입력용 천단위 구분기호 포맷터 (순수 숫자만 반환/포맷)
const formatInputCurrency = (value) => {
  if (!value && value !== 0) return '';
  const num = value.toString().replace(/[^0-9]/g, '');
  if (!num) return '';
  return Number(num).toLocaleString();
};



const calculateTenure = (hireDate) => {
  if (!hireDate) return '-';
  const joinDate = new Date(hireDate);
  const now = new Date();
  
  let years = now.getFullYear() - joinDate.getFullYear();
  let months = now.getMonth() - joinDate.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  if (years === 0) return `${months}개월`;
  return `${years}년 ${months}개월`;
};

const POSITION_SEQUENCE = ['사원', '대리', '과장', '차장', '부장'];


const BudgetDonut = ({ percentage, label, color = "var(--color-primary)" }) => {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const remainingPercentage = Math.max(0, 100 - percentage);
  const offset = circumference - (remainingPercentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <svg className="w-20 h-20 transform -rotate-90">
        <circle cx="40" cy="40" r={radius} stroke="rgba(0,0,0,0.05)" strokeWidth="6" fill="transparent" />
        <circle 
          cx="40" cy="40" r={radius} stroke={color} strokeWidth="6" fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <span className="text-sm font-black text-gray-900">{Math.round(remainingPercentage)}%</span>
        <p className="text-[7px] font-black text-gray-400 uppercase tracking-tighter">{label}</p>
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
            <h3 className="text-2xl font-black text-gray-900 mb-1">조건 제시</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl transition-all">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-lg font-black text-gray-900">{currentProposal}</p>
          </div>

          <div>
            <input 
              type="text" className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 text-lg font-black text-[var(--color-primary)]"
              placeholder="제시 연봉 (예: 72,000,000원)" 
              value={formatInputCurrency(offer)} 
              onChange={(e) => {
                const rawValue = e.target.value.replace(/[^0-9]/g, '');
                setOffer(rawValue);
              }}
            />
          </div>

          <div>
            <textarea 
              className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 h-32 text-sm font-medium"
              placeholder="검토 의견을 입력하세요."
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
            제시안 전송
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
  const [isPromoted, setIsPromoted] = useState(false);
  const [proposedPosition, setProposedPosition] = useState(employee?.position || '');

  useEffect(() => {
    if (employee) {
      setProposedRating(employee.performance_rating || 'A');
      setProposedPosition(employee.position || '');
      setIsPromoted(false);
      setProposedSalary('');
    }
  }, [employee, isOpen]);

  useEffect(() => {
    if (isPromoted) {
      const currentIdx = POSITION_SEQUENCE.indexOf(employee?.position);
      if (currentIdx !== -1 && currentIdx < POSITION_SEQUENCE.length - 1) {
        setProposedPosition(POSITION_SEQUENCE[currentIdx + 1]);
      }
    } else {
      setProposedPosition(employee?.position || '');
    }
  }, [isPromoted, employee]);

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
  const totalUsage = budgetData.total && budgetData.total.limit > 0 
    ? Math.max(0, ((budgetData.total.used + additionalCost) / budgetData.total.limit * 100)).toFixed(1) 
    : 0;
  const deptUsage = budgetData.dept && budgetData.dept.limit > 0 
    ? Math.max(0, ((budgetData.dept.used + additionalCost) / budgetData.dept.limit * 100)).toFixed(1) 
    : 0;

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
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl transition-all">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-6">
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
              <div className="flex justify-between">
                <span className="text-sm font-bold text-gray-400">입사일 / 근속</span>
                <span className="text-sm font-bold text-gray-600">{employee.hire_date || '-'} ({calculateTenure(employee.hire_date)})</span>
              </div>
            </div>

            {/* Budget Impact Alert */}
            <div className="mt-8 p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">전체 예산 사용률</span>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900">{totalUsage}% <span className="text-[10px] text-gray-400 font-bold">사용 중</span></p>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  <div className={`h-full ${totalUsage > 100 ? 'bg-red-500' : 'bg-[var(--color-primary)]'} transition-all duration-500 ease-out`} style={{ width: `${Math.min(totalUsage, 100)}%` }} />
                </div>
                
                <div className="flex justify-between items-end pt-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">부서 예산 사용률</span>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900">{deptUsage}% <span className="text-[10px] text-gray-400 font-bold">사용 중</span></p>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  <div className={`h-full ${deptUsage > 100 ? 'bg-red-500' : 'bg-[var(--color-secondary)]'} transition-all duration-500 ease-out`} style={{ width: `${Math.min(deptUsage, 100)}%` }} />
                </div>
              </div>
              { (totalUsage > 100 || deptUsage > 100) && (
                <div className="flex items-center gap-2 text-red-600 mt-3 pt-3 border-t border-red-100">
                  <ShieldAlert size={14} />
                  <span className="text-[10px] font-black">예산 한도를 초과했습니다.</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">평가 등급</p>
                <div className="flex gap-2">
                  {['S', 'A', 'B', 'C', 'D'].map(r => (
                    <button 
                      key={r} onClick={() => setProposedRating(r)}
                      className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                        proposedRating === r ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-lg shadow-primary/20' : 'bg-gray-50 text-gray-400 border-gray-100'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">승진 여부</p>
                <button 
                  onClick={() => setIsPromoted(!isPromoted)}
                  className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                    isPromoted ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)]/5' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${isPromoted ? 'bg-[var(--color-secondary)] text-white' : 'bg-white text-gray-200'}`}>
                      <Check size={14} strokeWidth={4} />
                    </div>
                    <span className={`text-sm font-black ${isPromoted ? 'text-[var(--color-secondary)]' : 'text-gray-400'}`}>당해 연도 승진 대상</span>
                  </div>
                  {isPromoted && <span className="text-xs font-black text-[var(--color-secondary)]">{employee.position} → {proposedPosition}</span>}
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">제안 연봉</p>
                <div className="relative group">
                  <input 
                    type="text" className="w-full p-4 pr-12 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-[var(--color-primary)] focus:bg-white transition-all text-lg font-black text-[var(--color-primary)] shadow-sm"
                    placeholder="50,000,000" 
                    value={formatInputCurrency(proposedSalary)} 
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/[^0-9]/g, '');
                      setProposedSalary(rawValue);
                    }}
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-black text-gray-300 group-focus-within:text-[var(--color-primary)]">원</span>
                </div>
              </div>

              <div className="p-5 bg-[var(--color-primary)]/5 rounded-2xl border border-[var(--color-primary)]/10 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">현재 대비 인상률</span>
                <span className={`text-xl font-black ${Number(increaseRate) > 0 ? 'text-red-500' : 'text-[var(--color-primary)]'}`}>
                  {Number(increaseRate) > 0 ? `+${increaseRate}%` : `${increaseRate}%`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-12 pt-8 border-t border-gray-50">
          <button onClick={onClose} className="flex-1 py-4 text-sm font-black text-gray-400 hover:bg-gray-50 rounded-2xl transition-all">닫기</button>
          <button 
            disabled={totalUsage > 100 || deptUsage > 100}
            onClick={() => {
              onConfirm(proposedRating, proposedSalary, increaseRate, { isPromoted, position: proposedPosition });
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

const EvaluatorDashboard = ({ profile, currentTab, currentYear }) => {
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
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 협상 데이터 조회 (현재 연도 필터링)
      const { data: negs, error: negsError } = await supabase
        .from('negotiations')
        .select('*')
        .eq('year', currentYear)
        .order('updated_at', { ascending: false });
      
      if (negsError) throw negsError;
      if (negs) setNegotiations(negs);

      // 사원 및 히스토리 조회 (현재 연도 및 전년도 데이터 조인)
      const { data: emps, error: empsError } = await supabase
        .from('employees')
        .select(`
          *,
          employee_history (
            year,
            position,
            salary,
            performance_rating
          )
        `);
        // .eq('employee_history.year', currentYear); // 특정 연도 필터 대신 전체/범위 조회 후 JS에서 처리

      if (empsError) throw empsError;
      
      // 데이터 평탄화 (현재 연도 데이터 우선, 없으면 전년도 데이터 사용)
      const flattenedEmps = emps?.map(emp => {
        const histories = emp.employee_history || [];
        // 1순위: 현재 선택된 연도 데이터
        const currentHist = histories.find(h => h.year === currentYear);
        // 2순위: 전년도 데이터
        const prevHist = histories.find(h => h.year === currentYear - 1);
        
        const activeHist = currentHist || prevHist || {};

        return {
          ...emp,
          position: activeHist.position || emp.position,
          current_salary: activeHist.salary || 0,
          performance_rating: activeHist.performance_rating || '-'
        };
      }) || [];
      
      setEmployees(flattenedEmps);

      // 예산 조회 (현재 연도)
      const { data: companyBudget, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('year', currentYear)
        .maybeSingle();
      
      const { data: deptBudgets, error: deptError } = await supabase
        .from('department_budgets')
        .select('*')
        .eq('year', currentYear);
      
      if (!companyBudget && (!budgetError)) {
        // 해당 연도 예산이 없으면 초기화 (트리거가 자동 생성하겠지만 명시적 처리)
        setBudgets(prev => ({ ...prev, company: { year: currentYear, total_budget: 0, used_budget: 0 } }));
      } else {
        setBudgets(prev => ({ ...prev, company: companyBudget }));
      }

      if (!deptBudgets || deptBudgets.length === 0) {
        // 부서 예산 초기화 (샘플 데이터)
        const depts = ['개발팀', '디자인팀', '마케팅팀', '운영팀', '인사팀'];
        const dummyDepts = depts.map(d => ({ department_name: d, year: currentYear, total_budget: 200000000, used_budget: 0 }));
        const { data: newDepts } = await supabase.from('department_budgets').upsert(dummyDepts).select();
        setBudgets(prev => ({ ...prev, depts: newDepts || [] }));
      } else {
        setBudgets(prev => ({ ...prev, depts: deptBudgets }));
      }

    } catch (error) {
      console.error('CRITICAL: Error fetching data in EvaluatorDashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentTab, currentYear]); // currentYear 변경 시 리프레시

  const handleStatusUpdate = async (id, status, extra = {}) => {
    const { error } = await supabase.from('negotiations').update({ status, updated_at: new Date(), ...extra }).eq('id', id);
    if (error) alert('업데이트 중 오류가 발생했습니다.');
    else { alert('상태가 업데이트되었습니다. (예산이 자동 동기화되었습니다)'); setIsPopupOpen(false); setSelectedNegotiation(null); fetchData(); }
  };

  const handleDeleteNegotiation = async (id) => {
    if (!window.confirm('정말 이 협상 제안을 삭제하시겠습니까? 삭제 시 사용된 예산도 복구됩니다.')) return;
    
    try {
      // 협상 데이터 삭제 (트리거가 예산 복구를 자동으로 처리함)
      const { error: deleteError } = await supabase.from('negotiations').delete().eq('id', id);
      if (deleteError) throw deleteError;

      alert('삭제되었습니다. 예산이 자동으로 복구되었습니다.');
      setSelectedNegotiation(null);
      fetchData();
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제 또는 예산 복구 중 오류가 발생했습니다.');
    }
  };

  const handleSalaryProposal = async (rating, salary, rate, promotionData = {}) => {
    if (!selectedEmployeeForSalary) return;
    
    const { data: userProfile } = await supabase.from('profiles').select('id').eq('employee_id', selectedEmployeeForSalary.employee_id).single();
    const payload = {
      employee_id: selectedEmployeeForSalary.employee_id, // 사번 추가
      evaluatee_name: selectedEmployeeForSalary.full_name,
      department: selectedEmployeeForSalary.department,
      position: promotionData.position || selectedEmployeeForSalary.position,
      current_salary: selectedEmployeeForSalary.current_salary,
      performance_rating: rating,
      evaluator_proposal: salary.replace(/[^0-9]/g, ''),
      year: currentYear,
      status: 'submitted',
      updated_at: new Date()
    };

    if (userProfile) payload.evaluatee_id = userProfile.id;

    const { data: existingNeg } = await supabase
      .from('negotiations')
      .select('id')
      .eq('evaluatee_name', selectedEmployeeForSalary.full_name)
      .eq('year', currentYear) // 해당 연도 협상만 확인
      .single();

    if (existingNeg) {
      await supabase.from('negotiations').update(payload).eq('id', existingNeg.id);
    } else {
      await supabase.from('negotiations').insert([payload]);
    }

    setIsSalaryPopupOpen(false); 
    setSelectedEmployeeForSalary(null); 
    fetchData();
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredEmployees = React.useMemo(() => {
    return employees.filter(emp => {
      const matchSearch = !dbSearchTerm || emp.full_name.toLowerCase().includes(dbSearchTerm.toLowerCase());
      const matchDept = dbDeptFilter === '전체' || emp.department === dbDeptFilter;
      return matchSearch && matchDept;
    }).sort((a, b) => {
      if (sortConfig.key === 'performance_rating') {
        const ratingOrder = { 'S': 1, 'A': 2, 'B': 3, 'C': 4, 'D': 5 };
        const valA = ratingOrder[a[sortConfig.key]] || 99;
        const valB = ratingOrder[b[sortConfig.key]] || 99;
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [employees, dbSearchTerm, dbDeptFilter, sortConfig]);

  const categorizedEmployees = React.useMemo(() => {
    const cats = {
      not_proposed: [],
      proposed: [],
      countering: [],
      finalized: []
    };

    employees.forEach(emp => {
      // 검색 및 부서 필터링 적용
      const searchMatch = !dbSearchTerm || emp.full_name.toLowerCase().includes(dbSearchTerm.toLowerCase());
      const deptMatch = dbDeptFilter === '전체' || emp.department === dbDeptFilter;
      
      if (!searchMatch || !deptMatch) return;

      const neg = negotiations.find(n => n.employee_id === emp.employee_id || (n.evaluatee_name === emp.full_name && n.department === emp.department));
      
      const baseInfo = {
        id: emp.employee_id,
        name: emp.full_name,
        dept: emp.department,
        pos: emp.position,
        salary: emp.current_salary
      };

      if (!neg || neg.status === 'rejected' || neg.status === 'cancelled') {
        cats.not_proposed.push({ ...baseInfo, type: 'employee', data: emp });
      } else if (neg.status === 'submitted' || neg.status === 'under_review') {
        cats.proposed.push({ ...baseInfo, type: 'negotiation', data: neg, proposal: neg.evaluator_proposal });
      } else if (neg.status === 'counter_offer') {
        cats.countering.push({ ...baseInfo, type: 'negotiation', data: neg, proposal: neg.evaluator_proposal });
      } else if (neg.status === 'final_agreement') {
        cats.finalized.push({ ...baseInfo, type: 'negotiation', data: neg, proposal: neg.evaluator_proposal });
      }
    });

    return cats;
  }, [employees, negotiations, dbSearchTerm, dbDeptFilter]);

  const filteredNegotiations = negotiations.filter(neg => neg.evaluatee_name.toLowerCase().includes(searchTerm.toLowerCase()) || neg.department.toLowerCase().includes(searchTerm.toLowerCase()));
  const departments = ['개발팀', '디자인팀', '마케팅팀', '운영팀', '인사팀'];

  const totalDeptsUsed = budgets.depts.reduce((sum, d) => sum + (d.used_budget || 0), 0);
  const currentBudgetContext = dbDeptFilter === '전체' 
    ? { limit: budgets.company?.total_budget || 1, used: totalDeptsUsed, label: '회사 전체' }
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

          <div className="flex flex-col gap-3 shrink-0">
            <h3 className="text-xl font-black text-[var(--color-primary)] px-2 flex items-center gap-2">
              <Wallet size={20} /> 예산 현황
            </h3>
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex items-center gap-16">
              <BudgetDonut percentage={budgetPercentage} label={currentBudgetContext.label} color={dbDeptFilter === '전체' ? "var(--color-primary)" : "var(--color-secondary)"} />
              <div className="flex items-center gap-16">
                <div>
                  <p className="text-[11px] font-black text-gray-400 mb-2 uppercase tracking-widest">배정 총예산</p>
                  <p className="text-3xl font-black text-gray-900">{formatCurrencySimple(currentBudgetContext.limit)}</p>
                </div>
                <div className="w-[1px] h-12 bg-gray-100" />
                <div>
                  <p className="text-[11px] font-black text-gray-400 mb-2 uppercase tracking-widest">현재 사용액</p>
                  <p className="text-3xl font-black text-[var(--color-primary)]">{formatCurrencySimple(currentBudgetContext.used)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {currentTab === 'employees' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
            <div>
              <h3 className="text-xl font-black text-[var(--color-primary)] mb-1">전체 사원 현황 및 이력</h3>
              <p className="text-xs text-gray-400 font-medium">사원을 클릭하여 상세 연봉 및 고과 히스토리를 확인하세요.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm">
                <Filter size={16} className="text-gray-400" />
                <select 
                  className="text-sm font-black text-[var(--color-primary)] outline-none bg-transparent cursor-pointer min-w-[120px]" 
                  value={dbDeptFilter} 
                  onChange={(e) => setDbDeptFilter(e.target.value)}
                >
                  <option value="전체">전체 부서</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[var(--color-primary)] transition-colors" size={18} />
                <input type="text" placeholder="사원 검색..." className="pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl w-64 text-sm font-medium outline-none" value={dbSearchTerm} onChange={(e) => setDbSearchTerm(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 sticky top-0 z-10">
                <tr>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-[var(--color-primary)] transition-colors" onClick={() => handleSort('full_name')}>성명</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-[var(--color-primary)] transition-colors" onClick={() => handleSort('department')}>부서 / 직급</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-[var(--color-primary)] transition-colors" onClick={() => handleSort('hire_date')}>입사일</th>
                  <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-[var(--color-primary)] transition-colors" onClick={() => handleSort('current_salary')}>현재 연봉</th>
                  <th className="px-8 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-[var(--color-primary)] transition-colors" onClick={() => handleSort('performance_rating')}>현재 등급</th>
                  <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">상세 이력</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-gray-50/50 cursor-pointer group" onClick={() => setSelectedEmployeeForHistory(emp)}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-300 flex items-center justify-center group-hover:bg-[var(--color-secondary)] group-hover:text-white transition-colors">
                          <User size={20} />
                        </div>
                        <p className="text-sm font-black text-gray-900">{emp.full_name}</p>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-gray-600">{emp.department}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{emp.position}</p>
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-gray-500">{emp.hire_date || '-'}</td>
                    <td className="px-8 py-5 text-right text-sm font-black text-gray-900">{formatCurrency(emp.current_salary)}</td>
                    <td className="px-8 py-5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                        emp.performance_rating === 'S' ? 'bg-purple-100 text-purple-700' :
                        emp.performance_rating === 'A' ? 'bg-blue-100 text-blue-700' :
                        emp.performance_rating === 'B' ? 'bg-green-100 text-green-700' :
                        emp.performance_rating === 'C' ? 'bg-orange-100 text-orange-700' :
                        emp.performance_rating === 'D' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'
                      }`}>{emp.performance_rating || '-'}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="inline-flex p-1.5 rounded-lg text-gray-200 group-hover:bg-[var(--color-secondary)] group-hover:text-white transition-colors">
                        <ChevronRight size={18} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {currentTab === 'negotiation' && (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="flex items-center justify-between shrink-0 px-2">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-black text-[var(--color-primary)]">협상 관리 프로세스</h3>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-sm">
                <Filter size={16} className="text-gray-400" />
                <select 
                  className="text-sm font-black text-[var(--color-primary)] outline-none bg-transparent cursor-pointer min-w-[120px]" 
                  value={dbDeptFilter} 
                  onChange={(e) => setDbDeptFilter(e.target.value)}
                >
                  <option value="전체">전체 부서</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[var(--color-primary)] transition-colors" size={18} />
              <input type="text" placeholder="사원 검색..." className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl w-64 text-sm font-medium shadow-sm outline-none" value={dbSearchTerm} onChange={(e) => setDbSearchTerm(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 flex gap-4 overflow-hidden pb-4">
            {[
              { id: 'not_proposed', label: '미제안', color: 'bg-gray-400' },
              { id: 'proposed', label: '제안중', color: 'bg-blue-500' },
              { id: 'countering', label: '역제안중', color: 'bg-purple-500' },
              { id: 'finalized', label: '협상 완료', color: 'bg-green-500' }
            ].map(column => (
              <div key={column.id} className="flex-1 min-w-[250px] flex flex-col bg-gray-50/30 rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-gray-100 bg-white flex items-center justify-between">
                  <span className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${column.color} shadow-sm`} />
                    {column.label}
                  </span>
                  <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                    {categorizedEmployees[column.id].length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {categorizedEmployees[column.id].map(item => (
                    <motion.div 
                      key={item.id} 
                      whileHover={{ y: -4, shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                      onClick={() => item.type === 'employee' ? (setSelectedEmployeeForSalary(item.data), setIsSalaryPopupOpen(true)) : setSelectedNegotiation(item.data)}
                      className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-[var(--color-primary)] transition-all"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900">{item.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{item.dept} {item.pos}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                        <div>
                          <p className="text-[9px] font-black text-gray-300 uppercase mb-0.5">현재 연봉</p>
                          <p className="text-[11px] font-black text-gray-500">{formatCurrencySimple(item.salary)}</p>
                        </div>
                        {item.proposal ? (
                          <div className="text-right">
                            <p className="text-[9px] font-black text-[var(--color-primary)]/40 uppercase mb-0.5">인사팀 제안</p>
                            <p className="text-[11px] font-black text-[var(--color-primary)]">{formatCurrencySimple(item.proposal)}</p>
                          </div>
                        ) : (
                          <div className="text-right">
                             <p className="text-[9px] font-black text-gray-300 uppercase mb-0.5">상태</p>
                             <p className="text-[10px] font-black text-gray-400 italic">제안 대기</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedNegotiation && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelectedNegotiation(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl z-50 overflow-y-auto">
              <div className="p-10">
                <div className="flex justify-between items-start mb-10"><div className="flex items-center gap-5"><div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300"><User size={32} /></div><div><h2 className="text-3xl font-black text-gray-900">{selectedNegotiation.evaluatee_name}</h2><div className="flex items-center gap-2 mt-1"><p className="text-sm font-bold text-gray-500">{selectedNegotiation.department} {selectedNegotiation.position}</p>{selectedNegotiation.performance_rating && <span className="text-[10px] font-black bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-md">{selectedNegotiation.performance_rating}등급</span>}</div></div></div><button onClick={() => setSelectedNegotiation(null)} className="p-2 hover:bg-gray-50 rounded-xl"><X size={24} className="text-gray-400" /></button></div>
                <div className="space-y-10">
                  <section><h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FileText size={14} /> 주요 요구 사항</h4><div className="p-6 bg-gray-50 rounded-3xl border border-gray-100"><p className="text-2xl font-black text-[var(--color-primary)] mb-2">{selectedNegotiation.evaluatee_proposal}</p><p className="text-sm text-gray-500 font-medium">{selectedNegotiation.jd || '직무 상세 정보 없음'}</p></div></section>
                  {selectedNegotiation.evaluator_proposal && (
                    <section><h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingUp size={14} /> 인사팀 제안</h4><div className="p-6 bg-blue-50 rounded-3xl border border-blue-100"><p className="text-2xl font-black text-[var(--color-secondary)] mb-1">{formatInputCurrency(selectedNegotiation.evaluator_proposal)}</p><p className="text-xs text-blue-600 font-bold">인상액: {formatCurrencySimple(Number(selectedNegotiation.evaluator_proposal) - Number(selectedNegotiation.current_salary))}</p></div></section>
                  )}
                  <section><h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">인상 근거 및 성과 요약</h4><div className="p-6 bg-white border border-gray-100 rounded-3xl italic text-gray-600 text-sm">"{selectedNegotiation.reason || '입력된 근거가 없습니다.'}"</div></section>

                  {selectedNegotiation.status === 'counter_offer' && (
                    <div className="grid grid-cols-2 gap-4 pt-6">
                      <button onClick={() => handleStatusUpdate(selectedNegotiation.id, 'final_agreement')} className="btn btn-primary w-full justify-center py-4 text-sm">즉시 수락 및 합의</button>
                      <button onClick={() => setIsPopupOpen(true)} className="btn btn-outline w-full justify-center py-4 text-sm">조건 제시</button>
                    </div>
                  )}
                  <div className="pt-6 border-t border-gray-50">
                    <button 
                      onClick={() => handleDeleteNegotiation(selectedNegotiation.id)}
                      className="w-full py-4 text-sm font-black text-red-500 hover:bg-red-50 rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <X size={18} /> 제안 취소 및 평가 초기화
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEmployeeForHistory && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelectedEmployeeForHistory(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 h-full w-[600px] bg-white shadow-2xl z-50 overflow-y-auto">
              <div className="p-10">
                <div className="flex justify-between items-start mb-10">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">
                      <User size={32} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-gray-900">{selectedEmployeeForHistory.full_name}</h2>
                      <p className="text-sm font-bold text-gray-500 mt-1">{selectedEmployeeForHistory.department} {selectedEmployeeForHistory.position}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedEmployeeForHistory(null)} className="p-2 hover:bg-gray-50 rounded-xl">
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>

                <div className="space-y-8">
                  <section>
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <TrendingUp size={14} /> 연도별 인사 히스토리
                    </h4>
                    <div className="relative border-l-2 border-gray-100 ml-4 pl-8 space-y-10">
                      {[...selectedEmployeeForHistory.employee_history].sort((a,b) => b.year - a.year).map((h, idx, arr) => {
                        const prevYearData = arr[idx + 1];
                        let increaseRate = 0;
                        if (prevYearData && prevYearData.salary > 0) {
                          increaseRate = ((h.salary - prevYearData.salary) / prevYearData.salary) * 100;
                        }
                        
                        return (
                          <div key={h.year} className="relative">
                            <div className="absolute -left-[41px] top-0 w-5 h-5 bg-white border-4 border-[var(--color-secondary)] rounded-full shadow-sm" />
                            <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 group hover:border-[var(--color-secondary)] transition-colors">
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-lg font-black text-[var(--color-primary)]">{h.year}년</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                  h.performance_rating === 'S' ? 'bg-purple-100 text-purple-700' :
                                  h.performance_rating === 'A' ? 'bg-blue-100 text-blue-700' :
                                  h.performance_rating === 'B' ? 'bg-green-100 text-green-700' :
                                  h.performance_rating === 'C' ? 'bg-orange-100 text-orange-700' :
                                  h.performance_rating === 'D' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'
                                }`}>성과등급: {h.performance_rating}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase">연봉</p>
                                  <p className="text-base font-black text-gray-900">{formatCurrency(h.salary)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase">인상률</p>
                                  <p className={`text-base font-black ${increaseRate > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                    {increaseRate > 0 ? `+${increaseRate.toFixed(1)}%` : '0%'}
                                  </p>
                                </div>
                                <div className="col-span-2 pt-2 border-t border-gray-100 mt-2">
                                  <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase">발령 정보</p>
                                  <p className="text-sm font-bold text-gray-700">{h.position} 발령</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CounterOfferPopup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)} name={selectedNegotiation?.evaluatee_name} currentProposal={selectedNegotiation?.evaluatee_proposal} onConfirm={(offer, comment) => handleStatusUpdate(selectedNegotiation.id, 'submitted', { evaluator_proposal: offer, evaluator_comment: comment })} />

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
