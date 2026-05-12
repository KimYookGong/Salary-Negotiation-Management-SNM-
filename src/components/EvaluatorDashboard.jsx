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
  Filter,
  ArrowUpDown,
  LayoutDashboard
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative z-10 border border-gray-100"
      >
        <h3 className="text-2xl font-black text-gray-900 mb-2">{name}님께 역제시</h3>
        <p className="text-sm text-gray-400 font-bold mb-8">기존 요구안: <span className="text-[var(--color-primary)]">{currentProposal}</span></p>
        
        <div className="space-y-6">
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">수정 제안 조건</label>
            <input 
              type="text"
              className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 text-sm font-bold"
              placeholder="예: 7,200만원 / 재택 주 1회"
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">상세 사유 및 코멘트</label>
            <textarea 
              className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 text-sm font-bold h-32"
              placeholder="제안 주신 성과 데이터 검토 결과..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-10">
          <button onClick={onClose} className="flex-1 py-4 text-sm font-black text-gray-400 hover:bg-gray-50 rounded-2xl transition-all">취소</button>
          <button 
            onClick={() => onConfirm(offer, comment)}
            className="flex-2 py-4 px-8 bg-[var(--color-primary)] text-white text-sm font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            역제시 보내기
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const EvaluatorDashboard = ({ profile, currentTab }) => {
  const [negotiations, setNegotiations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dashboard states
  const [dbSearchTerm, setDbSearchTerm] = useState('');
  const [dbDeptFilter, setDbDeptFilter] = useState('전체');
  const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'asc' });

  // Negotiation Management states
  const [searchTerm, setSearchTerm] = useState('');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedNegotiation, setSelectedNegotiation] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. 협상 데이터
    const { data: negs } = await supabase
      .from('negotiations')
      .select('*')
      .order('updated_at', { ascending: false });
    if (negs) setNegotiations(negs);

    // 2. 전체 사원 데이터 (employees 테이블에서)
    const { data: emps } = await supabase
      .from('employees')
      .select('*');
    if (emps) setEmployees(emps);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusUpdate = async (id, status, extra = {}) => {
    const { error } = await supabase
      .from('negotiations')
      .update({ status, updated_at: new Date(), ...extra })
      .eq('id', id);

    if (error) {
      alert('업데이트 중 오류가 발생했습니다.');
    } else {
      alert('상태가 업데이트되었습니다.');
      setIsPopupOpen(false);
      setSelectedNegotiation(null);
      fetchData();
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filtering & Sorting for Dashboard
  const filteredEmployees = employees
    .filter(emp => {
      const matchSearch = emp.full_name.toLowerCase().includes(dbSearchTerm.toLowerCase());
      const matchDept = dbDeptFilter === '전체' || emp.department === dbDeptFilter;
      return matchSearch && matchDept;
    })
    .sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

  // Filtering for Negotiation Management
  const filteredNegotiations = negotiations.filter(neg => 
    neg.evaluatee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    neg.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const departments = ['운영팀', '인사팀', '마케팅팀', '개발팀', '디자인팀'];

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6 w-full max-w-[1600px] mx-auto overflow-hidden">
      {currentTab === 'dashboard' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Dashboard Header */}
          <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0 bg-gray-50/30">
            <div>
              <h3 className="text-2xl font-black text-[var(--color-primary)] mb-1 flex items-center gap-2">
                <Users size={24} /> 전체 사원 현황
              </h3>
              <p className="text-sm text-gray-400 font-bold">총 {employees.length}명의 인사 데이터 통합 관리</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[var(--color-primary)] transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="성명 검색..."
                  className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none w-64 transition-all focus:ring-2 focus:ring-[var(--color-primary)]/10 text-sm font-medium shadow-sm"
                  value={dbSearchTerm}
                  onChange={(e) => setDbSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                <Filter size={16} className="ml-2 text-gray-400" />
                <select 
                  className="text-sm font-bold text-gray-600 outline-none pr-2 bg-transparent"
                  value={dbDeptFilter}
                  onChange={(e) => setDbDeptFilter(e.target.value)}
                >
                  <option value="전체">전체 부서</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Dashboard Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-[var(--color-primary)] transition-colors" onClick={() => handleSort('full_name')}>
                    <div className="flex items-center gap-2">성명 <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-[var(--color-primary)]" onClick={() => handleSort('department')}>
                    <div className="flex items-center gap-2">부서 <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-[var(--color-primary)]" onClick={() => handleSort('position')}>
                    <div className="flex items-center gap-2">직급 <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-8 py-5 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-[var(--color-primary)]" onClick={() => handleSort('current_salary')}>
                    <div className="flex items-center justify-end gap-2">현재 연봉 <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-8 py-5 text-center text-[11px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-[var(--color-primary)]" onClick={() => handleSort('performance_rating')}>
                    <div className="flex items-center justify-center gap-2">이전 평가 등급 <ArrowUpDown size={12} /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-gray-50/50 transition-all group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/5 text-[var(--color-primary)] flex items-center justify-center font-black text-sm">
                          {emp.full_name[0]}
                        </div>
                        <p className="text-sm font-black text-gray-900">{emp.full_name}</p>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-bold text-gray-600">{emp.department}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-bold text-gray-600">{emp.position}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="text-sm font-black text-gray-900">{(emp.current_salary / 10000).toLocaleString()}만원</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black border ${
                        emp.performance_rating === 'S' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                        emp.performance_rating === 'A' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        emp.performance_rating === 'B' ? 'bg-green-50 text-green-600 border-green-100' :
                        'bg-gray-50 text-gray-400 border-gray-100'
                      }`}>
                        {emp.performance_rating || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredEmployees.length === 0 && (
              <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                  <Search size={32} />
                </div>
                <p className="text-sm text-gray-400 font-bold">검색 결과가 없습니다.</p>
              </div>
            )}
          </div>
        </motion.div>
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
              <input 
                type="text" 
                placeholder="대상자 검색..."
                className="pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl outline-none w-64 transition-all focus:ring-2 focus:ring-[var(--color-primary)]/10 text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 sticky top-0 z-10">
                <tr>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">대상자 정보</th>
                  <th className="px-8 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">평가등급</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">현재 진행 상태</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">희망 연봉 및 조건</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">최종 업데이트</th>
                  <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">상세 보기</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredNegotiations.map((neg) => (
                  <tr key={neg.id} className="hover:bg-gray-50/50 transition-all cursor-pointer group" onClick={() => setSelectedNegotiation(neg)}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 text-[var(--color-primary)] flex items-center justify-center font-black text-sm group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all">
                          {neg.evaluatee_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900">{neg.evaluatee_name}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{neg.department} {neg.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      {neg.performance_rating ? (
                        <span className="text-xs font-black text-[var(--color-primary)] bg-[var(--color-primary)]/5 px-3 py-1 rounded-lg border border-[var(--color-primary)]/10">
                          {neg.performance_rating}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black ${statusMap[neg.status]?.className}`}>
                        {statusMap[neg.status]?.label}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-black text-sm text-[var(--color-primary)]">
                      {neg.evaluatee_proposal}
                    </td>
                    <td className="px-8 py-5 text-[10px] text-gray-400 font-bold">
                      {new Date(neg.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="inline-flex p-1.5 rounded-lg text-gray-200 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all">
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

      {/* 상세 보기 Drawer */}
      <AnimatePresence>
        {selectedNegotiation && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setSelectedNegotiation(null)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-10">
                <div className="flex justify-between items-start mb-10">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-primary/20">
                      {selectedNegotiation.evaluatee_name[0]}
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-[var(--text-main)]">{selectedNegotiation.evaluatee_name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-bold text-[var(--text-muted)]">{selectedNegotiation.department} {selectedNegotiation.position}</p>
                        {selectedNegotiation.performance_rating && (
                          <span className="text-[10px] font-black bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-md">
                            {selectedNegotiation.performance_rating}등급
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedNegotiation(null)} className="p-2 hover:bg-gray-50 rounded-xl transition-all">
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>

                <div className="space-y-10">
                  <section>
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <FileText size={14} /> 주요 요구 사항
                    </h4>
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                      <p className="text-2xl font-black text-[var(--color-primary)] mb-2">{selectedNegotiation.evaluatee_proposal}</p>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed">{selectedNegotiation.jd || '직무 상세 정보 없음'}</p>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">인상 근거 및 성과 요약</h4>
                    <div className="p-6 bg-white border border-gray-100 rounded-3xl italic text-gray-600 leading-relaxed text-sm">
                      "{selectedNegotiation.reason || '입력된 근거가 없습니다.'}"
                    </div>
                  </section>

                  <div className="grid grid-cols-2 gap-4 pt-6">
                    <button 
                      onClick={() => handleStatusUpdate(selectedNegotiation.id, 'final_agreement')}
                      className="btn btn-primary w-full justify-center py-4 text-base shadow-lg shadow-primary/10"
                    >
                      즉시 수락 및 합의
                    </button>
                    <button onClick={() => setIsPopupOpen(true)} className="btn btn-outline w-full justify-center py-4 text-base">
                      조건 역제시
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CounterOfferPopup 
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        name={selectedNegotiation?.evaluatee_name}
        currentProposal={selectedNegotiation?.evaluatee_proposal}
        onConfirm={(offer, comment) => handleStatusUpdate(selectedNegotiation.id, 'counter_offer', {
          evaluator_proposal: offer,
          evaluator_comment: comment
        })}
      />
    </div>
  );
};

export default EvaluatorDashboard;
