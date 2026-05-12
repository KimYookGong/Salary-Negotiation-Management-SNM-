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

  // 심층 데이터 상태
  const [budget, setBudget] = useState({ total_budget: 1, used_budget: 0 });
  const [risks, setRisks] = useState([]);
  const [benchmarks, setBenchmarks] = useState([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('전체');

  const departments = ['개발팀', '인사팀', '마케팅팀', '디자인팀', '영업팀', '경영지원팀', '기술지원팀', '데이터팀'];

  // 탭 변경 시 상세 보기 초기화
  useEffect(() => {
    setSelectedNegotiation(null);
  }, [currentTab]);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. 협상 데이터
    const { data: negs } = await supabase.from('negotiations').select('*').order('updated_at', { ascending: false });
    if (negs) setNegotiations(negs);

    // 2. 예산 데이터 (최신 연도 하나만)
    const { data: bud } = await supabase.from('budgets').select('*').order('year', { ascending: false }).limit(1).single();
    if (bud) setBudget(bud);

    // 3. 리스크 데이터 (High 레벨만)
    const { data: rsk } = await supabase.from('risk_assessments').select('*').eq('risk_level', 'High');
    if (rsk) setRisks(rsk);

    // 4. 벤치마크 데이터
    const { data: bmk } = await supabase.from('market_benchmarks').select('*');
    if (bmk) setBenchmarks(bmk);

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

  const budgetPercent = (budget.used_budget / budget.total_budget) * 100;

  return (
    <div className="space-y-8 w-full max-w-[1600px] mx-auto pb-12">
      {currentTab === 'dashboard' && (
        <>
          {/* 상단 (요약 카드) */}
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

          {/* 중단 (인사이트 영역) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 좌측: 예산 통제 현황 */}
            <div className="card shadow-xl border-none">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <TrendingUp size={24} className="text-[var(--color-primary)]" />
                  예산 통제 현황
                </h3>
                <span className="text-sm font-bold text-[var(--text-muted)]">{budget.year}년 기준</span>
              </div>
              <div className="space-y-8 py-4">
                <div className="relative pt-12 flex flex-col items-center justify-center">
                  {/* 도넛 차트 대용 시각화 */}
                  <div className="relative w-48 h-48 rounded-full border-[16px] border-gray-100 flex items-center justify-center">
                    <svg className="absolute inset-[-16px] w-[calc(100%+32px)] h-[calc(100%+32px)] -rotate-90">
                      <circle 
                        cx="112" cy="112" r="96" fill="transparent" stroke="var(--color-primary)" strokeWidth="16"
                        strokeDasharray={`${(budgetPercent * 603) / 100} 603`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="text-center">
                      <p className="text-4xl font-black text-[var(--color-primary)]">{Math.round(budgetPercent)}%</p>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Used</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                  <div>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase mb-1">총 인상 예산</p>
                    <p className="text-lg font-black">{(budget.total_budget / 100000000).toFixed(1)}억원</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase mb-1">현재 사용액</p>
                    <p className="text-lg font-black text-[var(--color-secondary)]">{(budget.used_budget / 100000000).toFixed(1)}억원</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 우측: AI 인재 리스크 관리 */}
            <div className="card shadow-xl border-none">
              <h3 className="text-xl font-black mb-8 flex items-center gap-2">
                <AlertCircle size={24} className="text-red-500" />
                AI 인재 리스크 관리 (High)
              </h3>
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                {risks.length > 0 ? risks.map((risk) => (
                  <div key={risk.id} className="p-5 rounded-2xl bg-red-50/30 border border-red-50 flex gap-4 hover:bg-red-50 transition-all cursor-default">
                    <div className="p-2 h-fit bg-red-100 rounded-xl text-red-600">
                      <AlertCircle size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-black text-sm text-gray-900">{risk.employee_name} <span className="text-xs font-bold text-gray-500 ml-1">({risk.department})</span></p>
                        <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-full">RISK</span>
                      </div>
                      <p className="text-xs text-red-700 font-medium leading-relaxed">{risk.reason}</p>
                    </div>
                  </div>
                )) : (
                  <div className="py-20 text-center text-gray-400 font-medium">현재 고위험 대상자가 없습니다.</div>
                )}
              </div>
            </div>
          </div>

          {/* 하단 (심층 데이터 영역) */}
          <div className="card shadow-xl border-none">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
              <div>
                <h3 className="text-2xl font-black text-[var(--color-primary)]">시장 벤치마크 비교 분석</h3>
                <p className="text-sm font-bold text-[var(--text-muted)]">업계 평균 대비 자사 보상 수준을 부서별로 확인합니다.</p>
              </div>
              <select 
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-bold text-sm"
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
              >
                <option value="전체">전체 부서</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="relative h-[400px] flex items-end justify-between gap-4 px-4 pt-10 pb-12 border-b border-gray-100">
              {/* 차트 배경 가로선 */}
              <div className="absolute inset-0 flex flex-col justify-between py-10 pointer-events-none opacity-5">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-full border-t border-black"></div>)}
              </div>

              {benchmarks
                .filter(b => selectedDeptFilter === '전체' || b.department === selectedDeptFilter)
                .map((b) => {
                  const max = Math.max(b.market_avg, b.company_avg) * 1.2;
                  const marketH = (b.market_avg / max) * 100;
                  const companyH = (b.company_avg / max) * 100;
                  return (
                    <div key={b.id} className="flex-1 flex flex-col items-center group relative h-full">
                      <div className="flex-1 w-full flex items-end justify-center gap-2 px-2">
                        {/* 시장 평균 바 */}
                        <div className="relative group/market w-full max-w-[40px]">
                          <motion.div 
                            initial={{ height: 0 }} animate={{ height: `${marketH}%` }} 
                            className="w-full bg-gray-200 rounded-t-lg group-hover/market:bg-gray-300 transition-colors"
                          />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/market:opacity-100 transition-opacity bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 font-bold">
                            시장: {(b.market_avg / 10000).toLocaleString()}만
                          </div>
                        </div>
                        {/* 자사 평균 바 */}
                        <div className="relative group/company w-full max-w-[40px]">
                          <motion.div 
                            initial={{ height: 0 }} animate={{ height: `${companyH}%` }} 
                            className="w-full bg-[var(--color-primary)] rounded-t-lg shadow-lg group-hover/company:bg-[var(--color-secondary)] transition-colors"
                          />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/company:opacity-100 transition-opacity bg-[var(--color-primary)] text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 font-bold">
                            자사: {(b.company_avg / 10000).toLocaleString()}만
                          </div>
                        </div>
                      </div>
                      <p className="mt-4 text-xs font-black text-gray-700 truncate w-full text-center">{b.department}</p>
                    </div>
                  );
                })}
            </div>
            
            <div className="flex justify-center gap-6 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-200 rounded-sm"></div>
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Market Avg</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[var(--color-primary)] rounded-sm"></div>
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Our Company</span>
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
    </div>
  );
};

export default EvaluatorDashboard;
