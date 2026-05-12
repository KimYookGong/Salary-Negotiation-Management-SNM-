import React, { useState } from 'react';
import { Send, History, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const StatusBadge = ({ status }) => {
  const configs = {
    submitted: { label: '제출 완료', className: 'badge-submitted', icon: CheckCircle },
    under_review: { label: '검토 중', className: 'badge-review', icon: Clock },
    counter_offer: { label: '역제시 수신', className: 'badge-counter', icon: AlertCircle },
    final_agreement: { label: '최종 합의', className: 'badge-final', icon: CheckCircle },
  };

  const config = configs[status] || configs.submitted;
  const Icon = config.icon;

  return (
    <span className={`badge ${config.className} flex items-center gap-1.5`}>
      <Icon size={14} />
      {config.label}
    </span>
  );
};

const EvaluateeDashboard = () => {
  const [activeNegotiation, setActiveNegotiation] = useState({
    status: 'counter_offer',
    lastUpdate: '2026-05-10',
    currentProposal: '₩75,000,000',
    evaluatorProposal: '₩70,000,000',
    evaluatorComment: '현재 예산 상황상 제안하신 금액은 어렵지만, 성과를 고려하여 10% 인상을 제안합니다.'
  });

  const [formData, setFormData] = useState({
    jd: '',
    requirements: '',
    reason: ''
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Active Negotiation Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card border-l-4 border-l-[var(--color-accent-2)]"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl mb-1">현재 진행 중인 협상</h3>
            <p className="text-sm text-[var(--text-muted)]">최근 업데이트: {activeNegotiation.lastUpdate}</p>
          </div>
          <StatusBadge status={activeNegotiation.status} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="p-4 bg-[var(--bg-main)] rounded-lg">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">나의 요구안</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{activeNegotiation.currentProposal}</p>
            </div>
            {activeNegotiation.status === 'counter_offer' && (
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
                <p className="text-xs font-semibold text-orange-800 uppercase mb-2">평가자 역제시</p>
                <p className="text-2xl font-bold text-[var(--color-accent-2)]">{activeNegotiation.evaluatorProposal}</p>
                <p className="mt-3 text-sm text-gray-700 leading-relaxed italic">
                  "{activeNegotiation.evaluatorComment}"
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-end gap-3">
            <button className="btn btn-primary w-full justify-center">
              수락 및 최종 합의
            </button>
            <button className="btn btn-outline w-full justify-center">
              추가 근거 제출 및 역제시
            </button>
          </div>
        </div>
      </motion.div>

      {/* New Submission Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg mb-6 flex items-center gap-2">
              <Send size={20} className="text-[var(--color-primary)]" />
              협상 요구안 작성
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2">직무기술서 (JD)</label>
                <textarea 
                  className="w-full p-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all h-32"
                  placeholder="현재 담당하고 있는 핵심 업무와 책임을 설명해주세요."
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">희망 조건 (연봉/복지 등)</label>
                <input 
                  type="text"
                  className="w-full p-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                  placeholder="예: 7,500만원 / 재택근무 주 2회"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">인상 근거 및 성과 요약</label>
                <textarea 
                  className="w-full p-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none h-40"
                  placeholder="지난 기간 동안의 주요 성과와 이 대가를 받아야 하는 이유를 객관적으로 기재해주세요."
                ></textarea>
              </div>
              <div className="pt-2">
                <button className="btn btn-primary px-8">
                  요구안 제출하기
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card ai-insight">
            <h3 className="text-lg mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-[var(--color-accent-1)]" />
              작성 가이드
            </h3>
            <ul className="space-y-3 text-sm text-[var(--text-muted)]">
              <li className="flex gap-2">
                <span className="text-[var(--color-accent-1)] font-bold">•</span>
                구체적인 수치로 성과를 증명하세요.
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--color-accent-1)] font-bold">•</span>
                회사의 목표와 자신의 기여도를 연결하세요.
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--color-accent-1)] font-bold">•</span>
                시장 가치(Market Value)를 참고하여 제안하세요.
              </li>
            </ul>
          </div>

          <div className="card">
            <h3 className="text-lg mb-4 flex items-center gap-2">
              <History size={20} className="text-[var(--color-secondary)]" />
              과거 협상 이력
            </h3>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="p-3 border-b border-[var(--border-color)] last:border-0">
                  <div className="flex justify-between mb-1">
                    <p className="text-sm font-semibold">2025년 정기 연봉 협상</p>
                    <span className="text-xs text-green-600 font-bold">합의 완료</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">인상률: 8.5%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluateeDashboard;
