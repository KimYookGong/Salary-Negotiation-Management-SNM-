import React, { useState } from 'react';
import { Send, History, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

import { supabase } from '../supabaseClient';

const StatusBadge = ({ status }) => {
  const configs = {
    submitted: { label: '제출 완료', className: 'badge-submitted', icon: CheckCircle },
    under_review: { label: '검토 중', className: 'badge-review', icon: Clock },
    counter_offer: { label: '역제시 수신', className: 'badge-counter', icon: AlertCircle },
    final_agreement: { label: '최종 합의', className: 'badge-final', icon: CheckCircle },
    rejected: { label: '거절됨', className: 'bg-red-100 text-red-600', icon: AlertCircle },
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

const EvaluateeDashboard = ({ profile }) => {
  const [negotiation, setNegotiation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    jd: '',
    proposal: '',
    reason: ''
  });

  const fetchNegotiation = async () => {
    if (!profile) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('negotiations')
      .select('*')
      .eq('evaluatee_id', profile.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching negotiation:', error);
    } else if (data) {
      setNegotiation(data);
      setFormData({
        jd: data.jd || '',
        proposal: data.evaluatee_proposal || '',
        reason: data.reason || ''
      });
    }
    setLoading(false);
  };

  React.useEffect(() => {
    fetchNegotiation();
  }, [profile]);

  const handleSubmit = async () => {
    if (!profile) return;

    const payload = {
      evaluatee_id: profile.id,
      evaluatee_name: profile.full_name,
      department: profile.department,
      position: profile.position,
      performance_rating: profile.performance_rating, // 추가
      jd: formData.jd,
      evaluatee_proposal: formData.proposal,
      reason: formData.reason,
      status: 'submitted',
      updated_at: new Date()
    };

    let error;
    if (negotiation) {
      const { error: updateError } = await supabase
        .from('negotiations')
        .update(payload)
        .eq('id', negotiation.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('negotiations')
        .insert([payload]);
      error = insertError;
    }

    if (error) {
      alert('제출 중 오류가 발생했습니다.');
    } else {


      alert('성공적으로 제출되었습니다.');
      fetchNegotiation();
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* User Info Bar */}
      <div className="bg-white px-8 py-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-x-12 gap-y-2">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">성명</p>
          <p className="text-sm font-black text-gray-900">{profile?.full_name}</p>
        </div>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">소속</p>
          <p className="text-sm font-bold text-gray-700">{profile?.department}</p>
        </div>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">직급</p>
          <p className="text-sm font-bold text-gray-700">{profile?.position}</p>
        </div>
        {profile?.performance_rating && (
          <div>
            <p className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest mb-0.5">평가등급</p>
            <p className="text-sm font-black text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-md inline-block">{profile?.performance_rating}</p>
          </div>
        )}
      </div>

      {/* Active Negotiation Card */}
      {negotiation ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card border-l-4 border-l-[var(--color-accent-2)]"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl mb-1">현재 진행 중인 협상</h3>
              <p className="text-sm text-[var(--text-muted)]">최근 업데이트: {new Date(negotiation.updated_at).toLocaleDateString()}</p>
            </div>
            <StatusBadge status={negotiation.status} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="p-4 bg-[var(--bg-main)] rounded-lg">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">나의 요구안</p>
                <p className="text-2xl font-bold text-[var(--color-primary)]">{negotiation.evaluatee_proposal}</p>
              </div>
              {negotiation.status === 'counter_offer' && (
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
                  <p className="text-xs font-semibold text-orange-800 uppercase mb-2">평가자 역제시</p>
                  <p className="text-2xl font-bold text-[var(--color-accent-2)]">{negotiation.evaluator_proposal}</p>
                  <p className="mt-3 text-sm text-gray-700 leading-relaxed italic">
                    "{negotiation.evaluator_comment}"
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-end gap-3">
              <button 
                onClick={() => alert('최종 합의 기능은 준비 중입니다.')}
                className="btn btn-primary w-full justify-center"
              >
                수락 및 최종 합의
              </button>
              <button 
                onClick={() => alert('추가 근거 제출 기능은 아래 폼을 이용해 주세요.')}
                className="btn btn-outline w-full justify-center"
              >
                추가 근거 제출 및 역제시
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="card text-center py-12 bg-gray-50 border-dashed">
          <p className="text-[var(--text-muted)]">진행 중인 협상이 없습니다. 아래에서 새로 작성해 주세요.</p>
        </div>
      )}

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
                  value={formData.jd}
                  onChange={(e) => setFormData({ ...formData, jd: e.target.value })}
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">희망 조건 (연봉/복지 등)</label>
                <input 
                  type="text"
                  className="w-full p-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                  placeholder="예: 7,500만원 / 재택근무 주 2회"
                  value={formData.proposal}
                  onChange={(e) => setFormData({ ...formData, proposal: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">인상 근거 및 성과 요약</label>
                <textarea 
                  className="w-full p-3 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none h-40"
                  placeholder="지난 기간 동안의 주요 성과와 이 대가를 받아야 하는 이유를 객관적으로 기재해주세요."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                ></textarea>
              </div>
              <div className="pt-2">
                <button 
                  onClick={handleSubmit}
                  className="btn btn-primary px-8"
                >
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
