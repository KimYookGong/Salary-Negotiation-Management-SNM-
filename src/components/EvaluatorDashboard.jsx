import React, { useState } from 'react';
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
  BrainCircuit,
  TrendingUp,
  Target,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// SVG 기반 육각형 역량 차트 컴포넌트
const RadarChart = ({ data, size = 300 }) => {
  const points = 6;
  const radius = size / 2 - 40;
  const center = size / 2;
  const angleStep = (Math.PI * 2) / points;

  const labels = ['기술적 탁월성', '협업 능력', '목표 달성', '전문성', '리더십', '조직 적합도'];
  
  const getCoordinates = (value, angle) => {
    const x = center + radius * (value / 10) * Math.cos(angle - Math.PI / 2);
    const y = center + radius * (value / 10) * Math.sin(angle - Math.PI / 2);
    return { x, y };
  };

  const polyPoints = data.map((val, i) => {
    const { x, y } = getCoordinates(val, i * angleStep);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex flex-col items-center py-4">
      <svg width={size} height={size} className="overflow-visible">
        {/* 가이드 라인 (거미줄) */}
        {[2, 4, 6, 8, 10].map(tick => (
          <polygon
            key={tick}
            points={Array.from({ length: points }).map((_, i) => {
              const { x, y } = getCoordinates(tick, i * angleStep);
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1"
          />
        ))}
        {/* 축 라인 */}
        {Array.from({ length: points }).map((_, i) => {
          const { x, y } = getCoordinates(10, i * angleStep);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#E5E7EB"
              strokeWidth="1"
            />
          );
        })}
        {/* 데이터 영역 */}
        <polygon
          points={polyPoints}
          fill="rgba(1, 68, 33, 0.2)"
          stroke="var(--color-primary)"
          strokeWidth="2.5"
          className="transition-all duration-700"
        />
        {/* 라벨 표시 */}
        {labels.map((label, i) => {
          const { x, y } = getCoordinates(12, i * angleStep);
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              className="text-[11px] font-bold fill-[var(--text-muted)]"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

const EvaluatorDashboard = ({ profile, currentTab }) => {
  const [negotiations, setNegotiations] = useState([]);
  const [selectedNegotiation, setSelectedNegotiation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchNegotiations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('negotiations')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching negotiations:', error);
    } else {
      setNegotiations(data);
    }
    setLoading(false);
  };

  React.useEffect(() => {
    fetchNegotiations();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    const { error } = await supabase
      .from('negotiations')
      .update({ status, updated_at: new Date() })
      .eq('id', id);

    if (error) {
      alert('업데이트 중 오류가 발생했습니다.');
    } else {
      alert('성공적으로 반영되었습니다.');
      fetchNegotiations();
      setSelectedNegotiation(null);
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

  // 상세 페이지 뷰
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
          {/* 왼쪽: 프로필 요약 및 액션 */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card border-l-8 border-l-[var(--color-primary)] shadow-xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-20 h-20 bg-[var(--color-secondary)] rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-lg">
                  {selectedNegotiation.evaluatee_name[0]}
                </div>
                <div>
                  <h2 className="text-3xl font-black text-[var(--text-main)]">{selectedNegotiation.evaluatee_name}</h2>
                  <p className="text-sm font-bold text-[var(--text-muted)] mt-1">{selectedNegotiation.department}</p>
                </div>
              </div>
              
              <div className="space-y-6 py-6 border-t border-gray-100">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[11px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">피평가자 요구안</p>
                    <p className="text-3xl font-black text-[var(--color-primary)]">{selectedNegotiation.evaluatee_proposal}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-black text-[var(--text-muted)] uppercase mb-2 tracking-widest">상태</p>
                    <span className="badge badge-submitted text-xs">{selectedNegotiation.status}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 mt-6">
                <button 
                  onClick={() => handleStatusUpdate(selectedNegotiation.id, 'final_agreement')}
                  className="btn btn-primary w-full justify-center py-4 text-base shadow-lg shadow-green-900/10"
                >
                  <Check size={20} className="mr-2" /> 즉시 수락 및 합의
                </button>
                <button 
                  onClick={() => alert('역제시 팝업 구현 예정')}
                  className="btn btn-outline w-full justify-center py-4 text-base"
                >
                  <MessageSquare size={20} className="mr-2" /> 조건 역제시
                </button>
                <button 
                  onClick={() => handleStatusUpdate(selectedNegotiation.id, 'rejected')}
                  className="btn btn-outline w-full justify-center py-4 text-base text-red-600 border-red-100 hover:bg-red-50"
                >
                  <X size={20} className="mr-2" /> 거절
                </button>
              </div>
            </motion.div>

            {/* 역량 육각형 차트 */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card shadow-xl overflow-hidden">
              <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-[var(--color-primary)]">
                <Target size={22} />
                역량 분석 데이터 (AI)
              </h3>
              <RadarChart data={[9, 8.5, 9.5, 8, 7.5, 9]} size={320} />
            </motion.div>
          </div>

          {/* 오른쪽: 상세 리포트 */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI 성과 분석 리포트 */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card ai-insight-detail border-none shadow-xl bg-gradient-to-br from-[#014421] to-[#003C71] text-white">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                  <BrainCircuit size={28} className="text-[var(--color-accent-1)]" />
                </div>
                <h3 className="text-2xl font-black tracking-tight">AI 성과 분석 리포트</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                <div className="p-5 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all">
                  <p className="text-[10px] font-black text-[var(--color-accent-1)] uppercase mb-3 tracking-widest">기술적 탁월성</p>
                  <p className="text-sm leading-relaxed opacity-90 font-medium">프론트엔드 아키텍처 고도화를 통한 서비스 로딩 속도 40% 개선 주도</p>
                </div>
                <div className="p-5 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all">
                  <p className="text-[10px] font-black text-[var(--color-accent-1)] uppercase mb-3 tracking-widest">협업 능력</p>
                  <p className="text-sm leading-relaxed opacity-90 font-medium">팀 내 기술 공유 세션 5회 진행 및 주니어 개발자 멘토링 우수 평가</p>
                </div>
                <div className="p-5 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all">
                  <p className="text-[10px] font-black text-[var(--color-accent-1)] uppercase mb-3 tracking-widest">목표 달성</p>
                  <p className="text-sm leading-relaxed opacity-90 font-medium">상반기 핵심 KPI 대비 125% 초과 달성 및 크리티컬 버그 0건 유지</p>
                </div>
              </div>
              
              <div className="p-6 bg-white/5 rounded-2xl border border-white/5 italic text-sm leading-relaxed opacity-80">
                "종합적으로 해당 피평가자는 기술적 전문성이 매우 뛰어나며, 조직의 성장을 견인하는 핵심 인재로 분석됩니다. 제안된 인상률은 시장 가치 및 성과 대비 합리적인 수준으로 판단됩니다."
              </div>
            </motion.div>

            {/* JD 및 성과 요약 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card shadow-xl">
                <h3 className="text-lg font-black mb-5 flex items-center gap-2 text-[var(--color-primary)]">
                  <FileText size={22} />
                  직무 기술서 (JD)
                </h3>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap font-medium">
                    {selectedNegotiation.jd || '등록된 JD 정보가 없습니다.'}
                  </p>
                </div>
              </motion.div>
              
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card shadow-xl">
                <h3 className="text-lg font-black mb-5 flex items-center gap-2 text-[var(--color-secondary)]">
                  <TrendingUp size={22} />
                  성과 요약 및 근거
                </h3>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap font-medium">
                    {selectedNegotiation.reason || '등록된 성과 정보가 없습니다.'}
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-[1600px] mx-auto pb-12">
      {/* 탭 구분: 대시보드 */}
      {currentTab === 'dashboard' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.1 }}
                className="card flex items-center gap-5 hover:shadow-2xl transition-all border-none bg-white shadow-lg"
              >
                <div className="p-4 rounded-2xl flex-shrink-0 shadow-inner" style={{ backgroundColor: `${stat.color}10`, color: stat.color }}>
                  <stat.icon size={28} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-[var(--text-muted)] font-black uppercase tracking-[0.1em] mb-1">{stat.label}</p>
                  <p className="text-3xl font-black text-[var(--color-primary)]">{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 card p-0 overflow-hidden border-none shadow-2xl">
              <div className="p-8 bg-white border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-xl font-black text-[var(--color-primary)] flex items-center gap-2">
                  <Check size={24} className="text-[var(--color-accent-1)]" />
                  최근 활동 로그
                </h3>
                <button className="text-xs font-bold text-[var(--color-secondary)] uppercase tracking-wider hover:underline">View All</button>
              </div>
              <div className="p-4 space-y-2">
                {negotiations.slice(0, 5).map((neg, i) => (
                  <div key={i} className="flex items-center gap-4 p-5 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer group">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)] transition-all">
                      <Users size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[var(--text-main)] mb-1">
                        <span className="text-[var(--color-primary)]">{neg.evaluatee_name}</span>님이 {neg.status === 'submitted' ? '요구안을 제출했습니다.' : '상태가 변경되었습니다.'}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wider">
                        {new Date(neg.updated_at).toLocaleString()}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-[var(--color-primary)] transition-all" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 탭 구분: 협상 관리 (리스트 뷰) */}
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
              <button className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-[var(--color-primary)] hover:bg-gray-100 transition-all shadow-inner">
                <Filter size={24} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-10 py-6 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">대상자 정보</th>
                  <th className="px-10 py-6 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">현재 진행 상태</th>
                  <th className="px-10 py-6 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">희망 연봉</th>
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
                          <p className="text-xs text-[var(--text-muted)] font-bold">{neg.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        neg.status === 'submitted' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {neg.status}
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
            {filteredNegotiations.length === 0 && (
              <div className="p-20 text-center text-[var(--text-muted)] font-bold">
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default EvaluatorDashboard;
