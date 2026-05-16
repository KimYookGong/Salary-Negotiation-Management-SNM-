import React, { useState } from 'react';
import { Send, History, CheckCircle, Clock, AlertCircle, Check, ChevronRight, FileText, MessageSquare } from 'lucide-react';

import { motion } from 'framer-motion';

import { supabase } from '../supabaseClient';

const StatusBadge = ({ status }) => {
  const configs = {
    submitted: { label: '제안중', className: 'badge-submitted', icon: CheckCircle },
    under_review: { label: '제안중', className: 'badge-review', icon: Clock },
    counter_offer: { label: '역제안중', className: 'badge-counter', icon: AlertCircle },
    final_agreement: { label: '협상 완료', className: 'badge-final', icon: CheckCircle },
    rejected: { label: '미제안', className: 'bg-gray-100 text-gray-600', icon: AlertCircle },
    cancelled: { label: '미제안', className: 'bg-gray-100 text-gray-600', icon: AlertCircle },
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

// 금액 포맷터
const formatCurrency = (value) => {
  if (!value && value !== 0) return '-';
  const num = Number(value);
  return num.toLocaleString() + '원';
};

// 근속연수 계산기
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

// 입력용 천단위 구분기호 포맷터
const POSITION_SEQUENCE = ['사원', '주임', '대리', '과장', '차장', '부장'];

const formatInputCurrency = (value) => {
  if (!value && value !== 0) return '';
  const num = value.toString().replace(/[^0-9]/g, '');
  if (!num) return '';
  return Number(num).toLocaleString();
};




const EvaluateeDashboard = ({ profile, currentYear }) => {
  const positions = ['사원', '주임', '대리', '과장', '차장', '부장'];
  const getNextPosition = (current) => {
    const idx = positions.indexOf(current);
    if (idx === -1 || idx === positions.length - 1) return current;
    return positions[idx + 1];
  };

  const [negotiation, setNegotiation] = useState(null);
  const [masterSalary, setMasterSalary] = useState(0); // 마스터 데이터 연봉 추가
  const [lastYearRating, setLastYearRating] = useState('-'); // 직전 등급 추가
  const [history, setHistory] = useState([]); // 히스토리 상태 추가
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    hopeSalary: '',
    rating: '',
    isPromoted: false,
    jd: '',
    achievement: ''
  });



  const fetchNegotiation = async () => {
    if (!profile) return;
    setLoading(true);
    
    // 현재 연도 협상 조회 (ID 또는 사번으로 조회)
    let query = supabase.from('negotiations').select('*');
    
    if (profile.employee_id) {
      query = query.or(`evaluatee_id.eq.${profile.id},employee_id.eq.${profile.employee_id}`);
    } else {
      query = query.eq('evaluatee_id', profile.id);
    }

    const { data, error } = await query
      .eq('year', currentYear)
      .maybeSingle();

    if (error) {
      console.error('Error fetching negotiation:', error);
    } else {
      setNegotiation(data);
      if (data) {
        setFormData({
          hopeSalary: data.evaluatee_proposal || '',
          rating: data.performance_rating || profile?.performance_rating || '',
          isPromoted: data.promotion_request === true || data.promotion_request === 'true' || data.promotion_request === '1',
          jd: data.jd || '',
          achievement: data.reason || ''
        });
      } else {
        setFormData(prev => ({ 
          ...prev,
          hopeSalary: '', 
          rating: (profile?.performance_rating && ['S','A','B','C','D'].includes(profile.performance_rating)) ? profile.performance_rating : 'B', 
          isPromoted: false, 
          jd: '', 
          achievement: '' 
        }));
      }
    }

    // 연봉 및 등급 정보 보충을 위한 히스토리 데이터 조회
    if (profile.employee_id) {
      const { data: lastYearData } = await supabase
        .from('employee_history')
        .select('salary, performance_rating')
        .eq('employee_id', profile.employee_id)
        .lt('year', currentYear)
        .order('year', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (lastYearData) {
        if (lastYearData.salary && (profile.current_salary === 0 || !profile.current_salary)) {
          setMasterSalary(lastYearData.salary);
        }
        if (lastYearData.performance_rating) {
          setLastYearRating(lastYearData.performance_rating);
        }
      }
    }

    // 전체 히스토리 조회 (최근 5년) - employee_id가 있을 때만 실행
    if (profile.employee_id) {
      const { data: histData } = await supabase
        .from('employee_history')
        .select('*')
        .eq('employee_id', profile.employee_id)
        .order('year', { ascending: false });
      
      if (histData) setHistory(histData);
    }

    setLoading(false);
  };

  React.useEffect(() => {
    fetchNegotiation();
  }, [profile, currentYear]);

  const handleSubmit = async () => {
    if (!profile) return;

    // 유효한 등급인지 확인 (ENUM 타입 안전성)
    const validRatings = ['S', 'A', 'B', 'C', 'D'];
    const finalRating = validRatings.includes(formData.rating) ? formData.rating : null;

    const payload = {
      evaluatee_id: profile.id,
      employee_id: profile.employee_id,
      evaluatee_name: profile.full_name,
      department: profile.department,
      position: profile.position,
      current_salary: profile.current_salary || 0, // 현재 연봉 정보 추가
      performance_rating: finalRating,
      year: currentYear,
      jd: formData.jd,
      evaluatee_proposal: formData.hopeSalary,
      reason: formData.achievement,
      promotion_request: formData.isPromoted,
      // 관리자 제안이 이미 있는 경우 'counter_offer', 없는 경우 'submitted'
      status: (negotiation && negotiation.evaluator_proposal) ? 'counter_offer' : 'submitted',
      updated_at: new Date().toISOString()
    };

    // employee_id가 없거나 빈 문자열이면 payload에서 제거하여 외래키 제약 오류 방지
    if (!payload.employee_id) {
      delete payload.employee_id;
    }




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
      console.error('Submission error:', error);
      alert(`제출 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
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
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">입사일</p>
          <p className="text-sm font-bold text-gray-700">{profile?.hire_date || '-'}</p>
        </div>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">근속연수</p>
          <p className="text-sm font-black text-[var(--color-secondary)]">{calculateTenure(profile?.hire_date)}</p>
        </div>
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

          {/* 현재 연봉 보정 로직 (프로필 -> 마스터데이터 -> 협상데이터 순으로 확인) */}
          {(() => {
            const actualCurrentSalary = profile?.current_salary || masterSalary || negotiation.current_salary || 0;
            const hopeProposal = Number(negotiation.evaluatee_proposal || 0);
            const evalProposal = Number(negotiation.evaluator_proposal || 0);
            
            return (
              <div className="space-y-6">
                {/* 3단 통합 비교 카드 */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                    
                    {/* 1. 현재 상태 (기준) */}
                    <div className="p-8 bg-gray-50/50">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">현재 상태 (기준)</p>
                      <div className="space-y-6">
                         <div>
                          <p className="text-xs font-bold text-gray-400 mb-1">현재 연봉</p>
                          <p className="text-xl font-black text-gray-700">{formatCurrency(actualCurrentSalary)}</p>
                        </div>
                        <div className="pt-6 border-t border-gray-200/50">
                          <p className="text-xs font-bold text-gray-400 mb-2">현재 직급 / 직전 등급</p>
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-black text-gray-600">{profile?.position}</span>
                            <span className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-black text-gray-600">{lastYearRating} 등급</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. 나의 요구안 */}
                    <div className="p-8 relative">
                      <p className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest mb-6">나의 요구안 상세</p>
                      {hopeProposal > 0 ? (
                        <div className="space-y-6">
                          <div>
                            <p className="text-xs font-bold text-gray-400 mb-1">희망 연봉</p>
                            <p className="text-2xl font-black text-[var(--color-primary)]">{formatCurrency(hopeProposal)}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] font-black text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-md">
                                +{formatCurrency(hopeProposal - actualCurrentSalary)} 인상
                              </span>
                              <span className="text-[10px] font-black text-[var(--color-secondary)] bg-[var(--color-secondary)]/10 px-2 py-0.5 rounded-md">
                                {actualCurrentSalary > 0 ? `+${(((hopeProposal - actualCurrentSalary) / actualCurrentSalary) * 100).toFixed(1)}%` : '-%'}
                              </span>
                            </div>
                          </div>
                          <div className="pt-6 border-t border-gray-100">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">희망 등급</p>
                                <p className="text-sm font-black text-gray-900">{negotiation.performance_rating || '-'} 등급</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">승진 요청</p>
                                <p className={`text-sm font-black ${negotiation.promotion_request ? 'text-[var(--color-secondary)]' : 'text-gray-400'}`}>
                                  {negotiation.promotion_request ? `${getNextPosition(profile?.position)} 승진 요청` : '미요청'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center py-4 text-gray-300">
                          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                            <FileText size={18} className="opacity-20" />
                          </div>
                          <p className="text-[11px] font-bold text-center leading-relaxed">아직 제출된 요구안이<br/>없습니다.</p>
                        </div>
                      )}
                    </div>

                    {/* 3. 평가자 제안 (오피셜) */}
                    <div className={`p-8 relative transition-all ${evalProposal > 0 ? 'bg-[var(--color-primary)]/5' : 'bg-gray-50/30'}`}>
                      {evalProposal > 0 && (
                        <div className="absolute top-4 right-4">
                          <div className="bg-[var(--color-primary)] text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter shadow-lg shadow-primary/20 animate-pulse">OFFICIAL</div>
                        </div>
                      )}
                      
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">평가자 제안 상세</p>
                      
                      {evalProposal > 0 ? (
                        <div className="space-y-6">
                          <div>
                            <p className="text-xs font-bold text-gray-400 mb-1">제안 연봉</p>
                            <p className="text-2xl font-black text-[var(--color-primary)]">{formatCurrency(evalProposal)}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] font-black text-[var(--color-primary)] bg-white border border-[var(--color-primary)]/20 px-2 py-0.5 rounded-md">
                                +{formatCurrency(evalProposal - actualCurrentSalary)}
                              </span>
                              <span className="text-[10px] font-black text-[var(--color-secondary)] bg-white border border-[var(--color-secondary)]/20 px-2 py-0.5 rounded-md">
                                {actualCurrentSalary > 0 ? `+${(((evalProposal - actualCurrentSalary) / actualCurrentSalary) * 100).toFixed(1)}%` : '-%'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="pt-6 border-t border-[var(--color-primary)]/10">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">확정 등급</p>
                                <p className="text-sm font-black text-gray-900">{negotiation.performance_rating} 등급</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">직급 변동</p>
                                <p className="text-sm font-black text-gray-900">{negotiation.position || profile?.position}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center py-4 text-gray-400">
                          <Clock size={24} className="mb-2 opacity-20" />
                          <p className="text-xs font-bold text-center leading-relaxed">평가자가 제안을<br/>검토 중입니다.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 검토 의견 (제안이 있는 경우만 하단에 길게 표시) */}
                  {evalProposal > 0 && negotiation.evaluator_comment && (
                    <div className="px-8 py-6 bg-white border-t border-gray-100">
                      <div className="flex gap-4">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                          <MessageSquare size={14} className="text-gray-400" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase">인사팀 검토 의견</p>
                          <p className="text-sm text-gray-700 leading-relaxed font-medium italic">
                            "{negotiation.evaluator_comment}"
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 하단 액션 버튼 */}
                {evalProposal > 0 && (
                  <div className="pt-4">
                    <button 
                      onClick={() => alert('최종 합의 기능은 준비 중입니다.')}
                      className="w-full py-5 bg-gradient-to-r from-[var(--color-primary)] to-[#014421] text-white text-lg font-black rounded-3xl shadow-2xl shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 group"
                    >
                      <Check size={24} className="group-hover:scale-110 transition-transform" />
                      제안 수락 및 최종 합의 완료하기
                    </button>
                    <p className="text-center mt-4 text-[11px] font-bold text-gray-400">
                      최종 합의를 누르시면 이번 연도 연봉 협상이 확정되며 수정이 불가능합니다.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

        </motion.div>
      ) : (
        <div className="card text-center py-12 bg-gray-50 border-dashed">
          <p className="text-[var(--text-muted)]">진행 중인 협상이 없습니다. 아래에서 새로 작성해 주세요.</p>
        </div>
      )}

      {/* New Submission Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card overflow-hidden">
            <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] px-6 py-4 -mx-6 -mt-6 mb-6">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Send size={20} />
                협상 요구안 작성
              </h3>
            </div>

            <div className="space-y-6">
              {/* 상단 3개 필드 그리드 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">희망 연봉</label>
                  <div className="relative group h-[72px]">
                    <input 
                      type="text"
                      className="w-full h-full p-4 pr-14 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-[var(--color-primary)] focus:bg-white transition-all text-xl font-black text-[var(--color-primary)] shadow-sm"
                      placeholder="50,000,000"
                      value={formatInputCurrency(formData.hopeSalary)}
                      onChange={(e) => setFormData({ ...formData, hopeSalary: e.target.value.replace(/[^0-9]/g, '') })}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                      <div className="w-[1px] h-4 bg-gray-200 mx-1" />
                      <span className="text-sm font-black text-gray-400 group-focus-within:text-[var(--color-primary)] transition-colors">원</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">희망 등급</label>
                  <div className="flex items-center gap-1.5 p-1.5 bg-gray-50 border-2 border-gray-100 rounded-2xl h-[72px]">
                    {['S', 'A', 'B', 'C', 'D'].map(r => (
                      <button 
                        key={r}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: r })}
                        className={`flex-1 h-full rounded-xl text-xs font-black transition-all ${
                          formData.rating === r 
                            ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-primary/20 scale-105' 
                            : 'text-gray-400 hover:bg-white hover:text-gray-600'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">승진 요청</label>
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, isPromoted: !formData.isPromoted })}
                    className={`w-full h-[72px] px-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                      formData.isPromoted 
                        ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)]/5' 
                        : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                        formData.isPromoted ? 'bg-[var(--color-secondary)] text-white' : 'bg-white text-gray-200 border border-gray-200 shadow-inner'
                      }`}>
                        <Check size={14} strokeWidth={4} />
                      </div>
                      <div className="flex flex-col items-start min-w-0">
                        <span className={`text-sm font-black transition-colors whitespace-nowrap ${formData.isPromoted ? 'text-[var(--color-secondary)]' : 'text-gray-400'}`}>
                          {formData.isPromoted ? '승진 요청됨' : '승진 요청하기'}
                        </span>
                        {formData.isPromoted && profile?.position && (
                          <div className="flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-300 mt-0.5">
                            <span className="text-[9px] font-bold text-gray-400 line-through leading-none">{profile.position}</span>
                            <ChevronRight size={10} className="text-gray-300" />
                            <span className="text-[10px] font-black text-[var(--color-secondary)] leading-none">
                              {POSITION_SEQUENCE[POSITION_SEQUENCE.indexOf(profile.position) + 1] || profile.position}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              </div>



              {/* 하단 2개 텍스트영역 */}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">직무기술서</label>
                <textarea 
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-[var(--color-primary)] focus:bg-white transition-all h-32 text-sm font-medium leading-relaxed shadow-sm"
                  placeholder="현재 담당하고 있는 핵심 업무와 책임을 구체적으로 설명해주세요."
                  value={formData.jd}
                  onChange={(e) => setFormData({ ...formData, jd: e.target.value })}
                ></textarea>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">성과 요약 및 근거</label>
                <textarea 
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-[var(--color-primary)] focus:bg-white transition-all h-40 text-sm font-medium leading-relaxed shadow-sm"
                  placeholder="지난 기간 동안의 주요 성과와 지표, 그리고 제안한 조건의 근거를 객관적으로 기재해주세요."
                  value={formData.achievement}
                  onChange={(e) => setFormData({ ...formData, achievement: e.target.value })}
                ></textarea>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button 
                  onClick={handleSubmit}
                  className="w-full md:w-auto px-12 py-4 bg-[var(--color-primary)] text-white text-base font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Send size={18} />
                  요구안 제출 및 전송
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
              과거 협상 및 고과 이력
            </h3>
            <div className="space-y-4">
              {history.length > 0 ? history.map((item) => (
                <div key={item.id} className="p-3 border-b border-[var(--border-color)] last:border-0">
                  <div className="flex justify-between mb-1">
                    <p className="text-sm font-semibold">{item.year}년 정보</p>
                    <span className="text-xs text-[var(--color-primary)] font-bold">{item.position}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>연봉: {formatCurrency(item.salary)}</span>
                    <span className="font-bold">등급: {item.performance_rating}</span>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-gray-400 text-center py-4">조회된 이력이 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluateeDashboard;
