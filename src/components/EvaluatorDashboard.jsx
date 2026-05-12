import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Sparkles, 
  ArrowUpRight, 
  MessageSquare,
  Check,
  X,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AIInsightSection = ({ evaluationData }) => {
  return (
    <div className="card ai-insight relative overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-[var(--color-accent-1)] rounded-lg">
          <Sparkles size={18} className="text-[var(--color-primary)]" />
        </div>
        <h3 className="text-lg font-bold">AI 성과 분석 리포트</h3>
      </div>
      
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-main)] font-medium">
          "평가 텍스트 데이터를 분석한 결과, 해당 피평가자의 주요 강점은 다음과 같습니다:"
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: '기술적 탁월성', desc: '프론트엔드 아키텍처 개선을 통한 로딩 속도 40% 단축' },
            { title: '협업 능력', desc: '팀 내 코드 리뷰 참여율 1위 및 지식 공유 세션 주도' },
            { title: '목표 달성', desc: '상반기 KPI 대비 120% 초과 달성 및 신규 기능 적기 배포' }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 bg-white/50 border border-[var(--color-accent-1)]/30 rounded-xl"
            >
              <h4 className="text-[var(--color-primary)] text-sm font-bold mb-1">{item.title}</h4>
              <p className="text-xs text-[var(--text-muted)]">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DecisionPopup = ({ isOpen, onClose, onConfirm, currentProposal }) => {
  const [counterProposal, setCounterProposal] = useState('');
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl"
      >
        <h3 className="text-2xl font-bold mb-2">역제시 조건 입력</h3>
        <p className="text-[var(--text-muted)] mb-6">피평가자의 요구안({currentProposal})에 대해 새로운 조건을 제안합니다.</p>
        
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-semibold mb-2">제안 연봉/조건</label>
            <input 
              type="text"
              className="w-full p-3 border border-[var(--border-color)] rounded-lg outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder="예: 7,000만원 / 사이닝 보너스 별도"
              value={counterProposal}
              onChange={(e) => setCounterProposal(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">제안 근거</label>
            <textarea 
              className="w-full p-3 border border-[var(--border-color)] rounded-lg outline-none focus:ring-2 focus:ring-[var(--color-primary)] h-32"
              placeholder="피평가자가 납득할 수 있는 충분한 근거를 입력해주세요."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            ></textarea>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn btn-outline flex-1 justify-center">취소</button>
          <button onClick={() => onConfirm(counterProposal, reason)} className="btn btn-primary flex-1 justify-center">역제시 보내기</button>
        </div>
      </motion.div>
    </div>
  );
};

const EvaluatorDashboard = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const users = [
    { id: 1, name: '홍길동', dept: '개발팀', status: 'submitted', proposal: '₩75,000,000', score: 4.8 },
    { id: 2, name: '이영희', dept: '디자인팀', status: 'under_review', proposal: '₩68,000,000', score: 4.5 },
    { id: 3, name: '김철수', dept: '마케팅팀', status: 'counter_offer', proposal: '₩62,000,000', score: 4.2 },
  ];

  return (
    <div className="space-y-8 w-full max-w-[1600px] mx-auto">
      {/* Stats Overview - 4 columns in a row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: '전체 검토 대상', value: '12명', icon: Users, color: 'var(--color-secondary)' },
          { label: '승인 대기', value: '5건', icon: MessageSquare, color: 'var(--color-accent-2)' },
          { label: '최종 합의 완료', value: '7건', icon: Check, color: 'var(--color-accent-1)' },
          { label: '평균 인상률', value: '7.2%', icon: ArrowUpRight, color: 'var(--color-primary)' },
        ].map((stat, i) => (
          <div key={i} className="card flex items-center gap-4 hover:shadow-lg transition-shadow">
            <div className="p-3 rounded-xl flex-shrink-0" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
              <stat.icon size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider truncate">{stat.label}</p>
              <p className="text-2xl font-black text-[var(--color-primary)]">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area - 2 Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Panel - Evaluatee List (4 columns) */}
        <div className="lg:col-span-4 space-y-4 sticky top-24">
          <div className="card p-0 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-[var(--border-color)] rounded-xl shadow-sm">
                <Search size={18} className="text-[var(--text-muted)]" />
                <input type="text" placeholder="이름 또는 부서 검색..." className="bg-transparent border-none outline-none text-sm w-full font-medium" />
                <Filter size={18} className="text-[var(--text-muted)]" />
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              {users.map((user) => (
                <div 
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-5 cursor-pointer transition-all border-b border-[var(--border-color)] last:border-0 ${
                    selectedUser?.id === user.id ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-base">{user.name}</p>
                    <p className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                      selectedUser?.id === user.id ? 'bg-white/20 text-white' : 'bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]'
                    }`}>
                      {user.dept}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-xs font-medium ${selectedUser?.id === user.id ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                      희망: {user.proposal}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-yellow-400">★</span>
                      <span className={`text-xs font-bold ${selectedUser?.id === user.id ? 'text-white' : 'text-[var(--color-primary)]'}`}>{user.score}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Detail View (8 columns) */}
        <div className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {selectedUser ? (
              <motion.div 
                key={selectedUser.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* AI Insight Section */}
                <AIInsightSection />

                {/* Main Data Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card">
                    <h4 className="text-sm font-bold text-[var(--color-secondary)] uppercase mb-4">직무 기술서 (JD)</h4>
                    <p className="text-sm leading-relaxed text-gray-700">
                      신규 서비스의 프론트엔드 아키텍처 설계 및 핵심 UI 컴포넌트 개발을 담당하고 있습니다. 
                      재사용 가능한 컴포넌트 라이브러리를 구축하여 개발 생산성을 30% 향상시켰습니다.
                    </p>
                  </div>
                  <div className="card">
                    <h4 className="text-sm font-bold text-[var(--color-accent-2)] uppercase mb-4">요구 사항 및 근거</h4>
                    <div className="space-y-3">
                      <p className="text-lg font-bold text-[var(--color-primary)]">{selectedUser.proposal}</p>
                      <p className="text-sm text-gray-600 italic">
                        "지난 1년간 프로젝트 기여도와 시장 평균 연봉 대비 성과를 고려하여 제안합니다."
                      </p>
                    </div>
                  </div>
                </div>

                {/* Decision Actions */}
                <div className="flex gap-4 pt-4">
                  <button className="btn btn-outline flex-1 justify-center text-red-600 hover:bg-red-50 hover:border-red-200">
                    <X size={18} /> 거절
                  </button>
                  <button 
                    onClick={() => setIsPopupOpen(true)}
                    className="btn btn-outline flex-1 justify-center text-[var(--color-secondary)]"
                  >
                    <RefreshCw size={18} /> 역제시
                  </button>
                  <button className="btn btn-primary flex-1 justify-center">
                    <Check size={18} /> 즉시 수락
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="card h-96 flex flex-col items-center justify-center text-[var(--text-muted)] bg-gray-50 border-dashed">
                <Users size={48} className="mb-4 opacity-20" />
                <p>피평가자를 선택하여 상세 데이터를 확인하세요.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <DecisionPopup 
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        currentProposal={selectedUser?.proposal}
        onConfirm={(prop, reason) => {
          console.log('Counter Offer:', prop, reason);
          setIsPopupOpen(false);
        }}
      />
    </div>
  );
};

export default EvaluatorDashboard;
