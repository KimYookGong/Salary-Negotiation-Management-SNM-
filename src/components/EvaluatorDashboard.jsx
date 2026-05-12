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
  AlertCircle,
  BarChart2,
  RefreshCw,
  Target
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

// 직급별 가중치 (X축 좌표용)
const positionWeight = {
  '사원': 1,
  '주임': 2,
  '대리': 3,
  '과장': 4,
  '차장': 5,
  '부장': 6,
  '본부장': 7
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
  const [allProfiles, setAllProfiles] = useState([]);
  const [selectedNegotiation, setSelectedNegotiation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // 심층 데이터 상태
  const [budget, setBudget] = useState({ total_budget: 1, used_budget: 0 });


  const departments = ['운영팀', '인사팀', '마케팅팀', '개발팀', '디자인팀'];
  const deptColors = {
    '운영팀': '#6366f1',
    '인사팀': '#ec4899',
    '마케팅팀': '#f59e0b',
    '개발팀': '#10b981',
    '디자인팀': '#8b5cf6'
  };

  // 탭 변경 시 상세 보기 초기화
  useEffect(() => {
    setSelectedNegotiation(null);
  }, [currentTab]);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. 협상 데이터
    const { data: negs } = await supabase.from('negotiations').select('*').order('updated_at', { ascending: false });
    if (negs) setNegotiations(negs);

    // 2. 전체 임직원 프로필 (산점도용)
    const { data: profs } = await supabase.from('profiles').select('*').eq('role', 'evaluatee');
    if (profs) setAllProfiles(profs);

    // 3. 예산 데이터 (최신 연도 하나만)
    const { data: bud } = await supabase.from('budgets').select('*').order('year', { ascending: false }).limit(1).single();
    if (bud) setBudget(bud);



    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    
    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'negotiations' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);



  const handleStatusUpdate = async (id, status, extra = {}) => {
    const { error } = await supabase
      .from('negotiations')
      .update({ status, updated_at: new Date(), ...extra })
      .eq('id', id);

    if (error) alert('오류 발생');
    else {
      alert('반영되었습니다.');
      fetchData();
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
      <div className="space-y-6 max-w-[1400px] mx-auto pb-12 h-full flex flex-col">
        <button 
          onClick={() => setSelectedNegotiation(null)}
          className="flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 px-4 py-2 rounded-lg transition-all w-fit"
        >
          <ChevronLeft size={18} /> 목록으로 돌아가기
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
          <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2">
            <div className="card border-l-8 border-l-[var(--color-primary)] shadow-xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-20 h-20 bg-[var(--color-secondary)] rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-lg">
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

          <div className="lg:col-span-2 space-y-6 overflow-y-auto pr-2">
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

  const budgetPercent = budget.total_budget > 0 ? (budget.used_budget / budget.total_budget) * 100 : 0;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6 w-full max-w-[1600px] mx-auto overflow-hidden">
      {currentTab === 'dashboard' && (
        <>
          {/* 상단: 요약 카드 */}
          <div className="grid grid-cols-4 gap-4 shrink-0">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4 border border-gray-100">
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${stat.color}10`, color: stat.color }}>
                  <stat.icon size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{stat.label}</p>
                  <p className="text-xl font-black text-gray-900">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 주요 현황 위젯 한 줄 배치 */}
          <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
            {/* 1. 예산 통제 현황 (4/12) */}
            <div className="col-span-4 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
              <h3 className="text-base font-black flex items-center gap-3 mb-8">
                <TrendingUp size={20} className="text-[var(--color-primary)]" />
                예산 통제 현황
              </h3>
              <div className="flex-1 flex flex-col items-center justify-center relative">
                <div className="relative w-52 h-52 flex items-center justify-center">
                  <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle 
                      cx="50" cy="50" r="40" fill="transparent" stroke="#f9fafb" strokeWidth="10"
                    />
                    <circle 
                      cx="50" cy="50" r="40" fill="transparent" stroke="var(--color-primary)" strokeWidth="10"
                      strokeDasharray={`${(budgetPercent * 251.3) / 100} 251.3`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="text-center z-10">
                    <p className="text-5xl font-black text-[var(--color-primary)]">{Math.round(budgetPercent)}%</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Used</p>
                  </div>
                </div>
                <div className="w-full mt-10 grid grid-cols-2 gap-8 text-center border-t border-gray-50 pt-8">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase mb-2 tracking-tight">총 인상 예산</p>
                    <p className="text-xl font-black text-gray-900">{(budget.total_budget / 10000).toLocaleString()}만원</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase mb-2 tracking-tight">현재 사용액</p>
                    <p className="text-xl font-black text-[var(--color-secondary)]">{(budget.used_budget / 10000).toLocaleString()}만원</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. 부서별 협상 진행도 (4/12) */}
            <div className="col-span-4 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
              <h3 className="text-base font-black flex items-center gap-3 mb-8">
                <RefreshCw size={20} className="text-[var(--color-secondary)]" />
                협상 진행도
              </h3>
              <div className="flex-1 space-y-5 overflow-y-auto pr-2">
                {departments.map(dept => {
                  const deptNegs = negotiations.filter(n => n.department === dept);
                  const completed = deptNegs.filter(n => n.status === 'final_agreement').length;
                  const percent = deptNegs.length ? (completed / deptNegs.length) * 100 : 0;
                  return (
                    <div key={dept} className="space-y-2">
                      <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-gray-600">{dept}</span>
                        <span className="text-[var(--color-primary)]">{Math.round(percent)}%</span>
                      </div>
                      <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-primary)] transition-all duration-1000" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. 실시간 알림 (4/12) */}
            <div className="col-span-4 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
              <h3 className="text-base font-black flex items-center gap-3 mb-8 text-[var(--color-accent-2)]">
                <Bell size={20} />
                협상 알림
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {negotiations.slice(0, 8).map((neg, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer group border border-transparent hover:border-gray-100">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[var(--color-accent-2)]/10 group-hover:text-[var(--color-accent-2)] transition-all">
                      <Clock size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-gray-900 truncate">
                        <span className="text-[var(--color-primary)]">{neg.evaluatee_name}</span>님의 새로운 활동
                      </p>
                      <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                        {new Date(neg.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
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
    </div>
  );
};

export default EvaluatorDashboard;
