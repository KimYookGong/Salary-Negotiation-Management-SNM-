import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Users, 
  MessageSquare, 
  Check, 
  ArrowUpRight, 
  Search, 
  Filter, 
  ChevronRight, 
  X,
  FileText,
  TrendingUp,
  ChevronLeft,
  Bell,
  Clock,
  AlertCircle
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

const CounterOfferPopup = ({ isOpen, onClose, onConfirm, name, currentProposal }) => {
  const [offer, setOffer] = useState('');
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
        <h3 className="text-2xl font-black mb-2">조건 역제시</h3>
        <p className="text-sm text-[var(--text-muted)] mb-8">{name}님의 요구안({currentProposal})에 대해 새로운 조건을 제안합니다.</p>
        
        <div className="space-y-5 mb-8">
          <div>
            <label className="block text-sm font-bold mb-2">제안 금액/조건</label>
            <input 
              type="text"
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all font-bold"
              placeholder="예: 7,200만원"
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">제안 사유 및 의견</label>
            <textarea 
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-primary)] h-32 resize-none transition-all text-sm leading-relaxed"
              placeholder="피평가자가 납득할 수 있는 충분한 근거를 입력해주세요."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            ></textarea>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn btn-outline flex-1 justify-center py-4">취소</button>
          <button 
            onClick={() => onConfirm(offer, comment)} 
            disabled={!offer || !comment}
            className="btn btn-primary flex-1 justify-center py-4 disabled:opacity-50"
          >
            역제시 전송
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const EvaluatorDashboard = ({ profile, currentTab }) => {
  const [negotiations, setNegotiations] = useState([]);
  const [selectedNegotiation, setSelectedNegotiation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // 사원 관리 상태
  const [employees, setEmployees] = useState([]);
  const [newEmployee, setNewEmployee] = useState({ id: '', name: '', dept: '', pos: '' });
  const [empLoading, setEmpLoading] = useState(false);

  const departments = ['개발팀', '인사팀', '마케팅팀', '디자인팀', '영업팀', '경영지원팀', '기술지원팀', '데이터팀'];
  const positions = ['사원', '주임', '대리', '과장', '차장', '부장', '본부장'];

  // 탭 변경 시 상세 보기 초기화
  useEffect(() => {
    setSelectedNegotiation(null);
  }, [currentTab]);

  const fetchNegotiations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('negotiations')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) console.error('Error fetching:', error);
    else setNegotiations(data);
    setLoading(false);
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
    if (!error) setEmployees(data);
  };

  useEffect(() => {
    fetchNegotiations();
    fetchEmployees();
  }, []);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setEmpLoading(true);
    const { error } = await supabase
      .from('employees')
      .insert([{ 
        employee_id: newEmployee.id, 
        full_name: newEmployee.name, 
        department: newEmployee.dept, 
        position: newEmployee.pos 
      }]);
    
    if (error) alert('등록 실패: ' + error.message);
    else {
      alert('등록되었습니다.');
      setNewEmployee({ id: '', name: '', dept: '', pos: '' });
      fetchEmployees();
    }
    setEmpLoading(false);
  };

  const handleDeleteEmployee = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('employees').delete().eq('employee_id', id);
    if (!error) fetchEmployees();
  };

  const handleStatusUpdate = async (id, status, extra = {}) => {
    const { error } = await supabase
      .from('negotiations')
      .update({ status, updated_at: new Date(), ...extra })
      .eq('id', id);

    if (error) alert('오류 발생');
    else {
      alert('반영되었습니다.');
      fetchNegotiations();
      setSelectedNegotiation(null);
      setIsPopupOpen(false);
    }
  };

  const filteredNegotiations = negotiations.filter(n => 
    n.evaluatee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: '전체 검토 대상', value: `${negotiations.length}명`, icon: Users, color: 'var(--color-secondary)' },
    { label: '승인 대기', value: `${negotiations.filter(n => n.status === 'submitted').length}건`, icon: MessageSquare, color: 'var(--color-accent-2)' },
    { label: '최종 합의 완료', value: `${negotiations.filter(n => n.status === 'final_agreement').length}건`, icon: Check, color: 'var(--color-accent-1)' },
    { label: '참여 부서', value: `${new Set(negotiations.map(n => n.department)).size}개`, icon: ArrowUpRight, color: 'var(--color-primary)' },
  ];

  if (selectedNegotiation) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
        <button 
          onClick={() => setSelectedNegotiation(null)}
          className="flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 px-4 py-2 rounded-lg transition-all"
        >
          <ChevronLeft size={18} /> 목록으로 돌아가기
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="card border-l-8 border-l-[var(--color-primary)] shadow-xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-20 h-20 bg-[var(--color-secondary)] rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-lg">
                  {selectedNegotiation.evaluatee_name[0]}
                </div>
                <div>
                  <h2 className="text-3xl font-black text-[var(--text-main)]">{selectedNegotiation.evaluatee_name}</h2>
                  <p className="text-sm font-bold text-[var(--text-muted)] mt-1">{selectedNegotiation.department} {selectedNegotiation.position}</p>
                </div>
              </div>
              
              <div className="space-y-6 py-6 border-t border-gray-100">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[11px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">요구안</p>
                    <p className="text-3xl font-black text-[var(--color-primary)]">{selectedNegotiation.evaluatee_proposal}</p>
                  </div>
                    <div className="text-right shrink-0">
                    <p className="text-[11px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">상태</p>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black whitespace-nowrap ${statusMap[selectedNegotiation.status]?.className}`}>
                      {statusMap[selectedNegotiation.status]?.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 mt-6">
                <button 
                  onClick={() => handleStatusUpdate(selectedNegotiation.id, 'final_agreement')}
                  className="btn btn-primary w-full justify-center py-4 text-base"
                >
                  즉시 수락 및 합의
                </button>
                <button onClick={() => setIsPopupOpen(true)} className="btn btn-outline w-full justify-center py-4 text-base">
                  조건 역제시
                </button>
                <button 
                  onClick={() => handleStatusUpdate(selectedNegotiation.id, 'rejected')}
                  className="btn btn-outline w-full justify-center py-4 text-base text-red-600 border-red-100 hover:bg-red-50"
                >
                  거절
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="card shadow-xl">
                <h3 className="text-lg font-black mb-5 flex items-center gap-2 text-[var(--color-primary)]">
                  <FileText size={22} />
                  직무 기술서
                </h3>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap font-medium min-h-[250px]">
                    {selectedNegotiation.jd || '등록된 JD 정보가 없습니다.'}
                  </p>
                </div>
              </div>
              
              <div className="card shadow-xl">
                <h3 className="text-lg font-black mb-5 flex items-center gap-2 text-[var(--color-secondary)]">
                  <TrendingUp size={22} />
                  성과 요약 및 근거
                </h3>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap font-medium min-h-[250px]">
                    {selectedNegotiation.reason || '등록된 성과 정보가 없습니다.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <CounterOfferPopup 
          isOpen={isPopupOpen} 
          onClose={() => setIsPopupOpen(false)}
          name={selectedNegotiation.evaluatee_name}
          currentProposal={selectedNegotiation.evaluatee_proposal}
          onConfirm={(offer, comment) => handleStatusUpdate(selectedNegotiation.id, 'counter_offer', {
            evaluator_proposal: offer,
            evaluator_comment: comment
          })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-[1600px] mx-auto pb-12">
      {currentTab === 'dashboard' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="card flex items-center gap-5 hover:shadow-2xl transition-all border-none bg-white shadow-lg">
                <div className="p-4 rounded-2xl flex-shrink-0 shadow-inner" style={{ backgroundColor: `${stat.color}10`, color: stat.color }}>
                  <stat.icon size={28} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-[var(--text-muted)] font-black uppercase tracking-[0.1em] mb-1">{stat.label}</p>
                  <p className="text-3xl font-black text-[var(--color-primary)]">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-12 space-y-8">
            {/* 대시보드 보강: 부서별 협상 현황 차트 대용 UI */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="card shadow-xl border-none">
                <h3 className="text-xl font-black mb-8 flex items-center gap-2">
                  <TrendingUp size={24} className="text-[var(--color-primary)]" />
                  부서별 협상 진행도
                </h3>
                <div className="space-y-6">
                  {departments.map(dept => {
                    const deptNegs = negotiations.filter(n => n.department === dept);
                    const completed = deptNegs.filter(n => n.status === 'final_agreement').length;
                    const percent = deptNegs.length ? (completed / deptNegs.length) * 100 : 0;
                    return (
                      <div key={dept} className="space-y-2">
                        <div className="flex justify-between items-center text-sm font-bold">
                          <span>{dept}</span>
                          <span className="text-[var(--text-muted)]">{completed}/{deptNegs.length} 완료</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${percent}%` }} 
                            className="h-full bg-[var(--color-primary)] rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card p-0 overflow-hidden border-none shadow-2xl flex flex-col">
                <div className="p-8 bg-white border-b border-gray-50 flex justify-between items-center">
                  <h3 className="text-xl font-black text-[var(--color-primary)] flex items-center gap-2">
                    <Bell size={24} className="text-[var(--color-accent-2)]" />
                    실시간 협상 알림
                  </h3>
                </div>
                <div className="p-4 space-y-2 overflow-y-auto max-h-[600px]">
                  {negotiations.slice(0, 8).map((neg, i) => (
                    <div 
                      key={i} 
                      onClick={() => setSelectedNegotiation(neg)}
                      className="flex items-center gap-4 p-5 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)] transition-all">
                        {neg.status === 'submitted' ? <AlertCircle size={20} className="text-orange-500" /> : <Clock size={20} />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-[var(--text-main)] mb-1">
                          <span className="text-[var(--color-primary)]">{neg.evaluatee_name}</span> {neg.position}님이 {statusMap[neg.status]?.label} 상태입니다.
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase">
                          {new Date(neg.updated_at).toLocaleString()}
                        </p>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 group-hover:text-[var(--color-primary)] transition-all" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {currentTab === 'negotiation' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-0 border-none shadow-2xl overflow-hidden bg-white">
          <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl font-black text-[var(--color-primary)] tracking-tight mb-2">협상 프로세스 관리</h3>
              <p className="text-sm text-[var(--text-muted)] font-bold">전체 {filteredNegotiations.length}명의 피평가자 데이터를 관리 중입니다.</p>
            </div>
            <div className="flex gap-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--color-primary)] transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="대상자 검색..."
                  className="pl-12 pr-6 py-3 bg-gray-50 border-none rounded-2xl outline-none w-full md:w-80 transition-all focus:ring-2 focus:ring-[var(--color-primary)]/20 shadow-inner"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-10 py-6 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">대상자 정보</th>
                  <th className="px-10 py-6 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">현재 진행 상태</th>
                  <th className="px-10 py-6 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">희망 연봉 및 조건</th>
                  <th className="px-10 py-6 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">최종 업데이트</th>
                  <th className="px-10 py-6 text-right text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">상세 보기</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredNegotiations.map((neg) => (
                  <tr key={neg.id} className="hover:bg-[var(--color-primary)]/[0.02] transition-all cursor-pointer group" onClick={() => setSelectedNegotiation(neg)}>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-black text-lg shadow-sm">
                          {neg.evaluatee_name[0]}
                        </div>
                        <div>
                          <p className="text-base font-black text-[var(--text-main)] group-hover:text-[var(--color-primary)] transition-colors">{neg.evaluatee_name}</p>
                          <p className="text-xs text-[var(--text-muted)] font-bold">{neg.department} {neg.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black ${statusMap[neg.status]?.className}`}>
                        {statusMap[neg.status]?.label}
                      </span>
                    </td>
                    <td className="px-10 py-6 font-black text-base text-[var(--color-primary)]">
                      {neg.evaluatee_proposal}
                    </td>
                    <td className="px-10 py-6 text-xs text-[var(--text-muted)] font-bold">
                      {new Date(neg.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="inline-flex p-2 rounded-xl bg-gray-50 text-gray-300 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all shadow-inner">
                        <ChevronRight size={20} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {currentTab === 'employees' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="card shadow-xl sticky top-24">
              <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                <UserPlus size={24} className="text-[var(--color-primary)]" />
                신규 사원 등록
              </h3>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1.5">사번</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    placeholder="예: 20240101"
                    value={newEmployee.id}
                    onChange={(e) => setNewEmployee({...newEmployee, id: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5">이름</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    placeholder="성함 입력"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5">부서</label>
                  <select 
                    required 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    value={newEmployee.dept}
                    onChange={(e) => setNewEmployee({...newEmployee, dept: e.target.value})}
                  >
                    <option value="">부서 선택</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5">직급</label>
                  <select 
                    required 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    value={newEmployee.pos}
                    onChange={(e) => setNewEmployee({...newEmployee, pos: e.target.value})}
                  >
                    <option value="">직급 선택</option>
                    {positions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <button 
                  type="submit" 
                  disabled={empLoading}
                  className="btn btn-primary w-full justify-center py-4 mt-2"
                >
                  {empLoading ? '처리 중...' : '사원 등록하기'}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="card shadow-xl p-0 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                <h3 className="text-xl font-black">사원 마스터 데이터</h3>
                <span className="text-sm font-bold text-[var(--text-muted)]">전체 {employees.length}명</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">사번</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">이름</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">부서</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">직급</th>
                      <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-wider">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {employees.map((emp) => (
                      <tr key={emp.employee_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-gray-600">{emp.employee_id}</td>
                        <td className="px-6 py-4 text-sm font-black text-gray-900">{emp.full_name}</td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-600">{emp.department}</td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-600">{emp.position}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteEmployee(emp.employee_id)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <X size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluatorDashboard;
