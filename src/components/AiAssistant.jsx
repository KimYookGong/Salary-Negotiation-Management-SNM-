import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  Sparkles,
  Send,
  Key,
  Lock,
  DollarSign,
  FileText,
  AlertTriangle,
  ShieldAlert,
  Brain,
  HelpCircle,
  TrendingUp,
  User,
  Briefcase,
  Download,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AiAssistant({ profile, userRole, currentYear }) {
  // --- 상태 관리 ---
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(userRole === 'evaluator' ? 'recommend' : 'pr');

  // AI 응답 상태
  const [aiResponse, setAiResponse] = useState('');

  // 평가자(Evaluator) 전용 데이터 상태
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedEmployeeData, setSelectedEmployeeData] = useState(null);

  // 피평가자(Evaluatee) 전용 데이터 상태
  const [myContextData, setMyContextData] = useState(null);

  const fetchApiKeyFromDb = async () => {
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    const isLocal = import.meta.env.DEV; // Vite 로컬 개발 여부 감지

    // 1. 로컬 개발 환경(localhost)인 경우, .env 파일의 변경사항을 최우선으로 즉시 반영
    if (isLocal && envKey) {
      setApiKey(envKey);
      return;
    }

    // 2. 프로덕션(Vercel) 배포 환경인 경우, 재배포 없이 실시간 업데이트가 가능한 Supabase DB를 1순위로 조회
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'gemini_api_key')
        .maybeSingle();

      if (!error && data && data.value) {
        setApiKey(data.value);
        return;
      }
    } catch (err) {
      console.error('Error fetching API key from DB, falling back to env:', err);
    }

    // 3. 최종 Fallback으로 Vercel 환경변수 참조
    if (envKey) {
      setApiKey(envKey);
    }
  };

  useEffect(() => {
    fetchApiKeyFromDb();
  }, [userRole]);

  // --- 2. 데이터 초기 쿼리 (역할별) ---
  useEffect(() => {
    if (userRole === 'evaluator') {
      fetchEmployeesList();
    } else {
      fetchMyContextData();
    }
  }, [userRole, selectedEmployeeId]);

  // 평가자: 임직원 목록 조회 (모든 사원 목록을 employees 마스터 테이블에서 로드 및 profiles 병합)
  const fetchEmployeesList = async () => {
    try {
      // 1. employees 마스터 정보와 역사 기록 함께 가져오기
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
        `)
        .order('full_name');

      if (empsError) throw empsError;

      // 2. profiles 정보 추가 조회
      const { data: profs } = await supabase
        .from('profiles')
        .select('employee_id, current_salary, position, performance_rating');

      // 3. 최신 직급, 연봉 정보 등을 평탄화(Flatten)
      const flattenedEmps = emps?.map(emp => {
        const histories = emp.employee_history || [];
        const profileInfo = profs?.find(p => p.employee_id === emp.employee_id);
        
        // 최신 히스토리 찾기
        const activeHist = [...histories].sort((a, b) => b.year - a.year)[0];
        const data = activeHist || {};

        return {
          id: emp.employee_id, // select 옵션 등에서 사용할 고유 ID를 사번으로 통일
          employee_id: emp.employee_id,
          full_name: emp.full_name,
          department: emp.department,
          position: data.position || profileInfo?.position || '사원',
          current_salary: data.salary || profileInfo?.current_salary || 0,
          performance_rating: data.performance_rating || profileInfo?.performance_rating || '-'
        };
      }) || [];

      setEmployees(flattenedEmps);

      // 첫 번째 사원 자동 선택
      if (flattenedEmps.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(flattenedEmps[0].employee_id);
      }
    } catch (err) {
      console.error('사원 목록 조회 오류:', err);
    }
  };

  // 평가자: 선택된 사원의 연계 맥락 정보 실시간 통합 쿼리 (사번 employeeNo를 인풋으로 받음)
  const fetchSelectedEmployeeData = async (employeeNo) => {
    if (!employeeNo) return;
    setLoading(true);
    try {
      // 1. 프로필 조회 (사번 기준)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('employee_id', employeeNo)
        .maybeSingle();

      // 만약 profiles 테이블에 해당 사원의 회원가입 프로필이 없다면, employees 마스터 정보에서 조회하여 임시 프로필 객체 생성
      let finalProfile = profileData;
      if (!finalProfile) {
        const { data: empData } = await supabase
          .from('employees')
          .select('*')
          .eq('employee_id', employeeNo)
          .single();

        if (empData) {
          finalProfile = {
            id: null, // 아직 Auth 회원가입이 안 됨
            employee_id: empData.employee_id,
            full_name: empData.full_name,
            department: empData.department,
            position: '사원',
            current_salary: 0,
            performance_rating: '-'
          };
        }
      }

      if (!finalProfile) throw new Error('사원 프로필 및 마스터 정보를 찾을 수 없습니다.');

      // 2. 5개년 고과/연봉 히스토리 (사원 번호(TEXT) 기반 조회)
      const { data: historyData } = await supabase
        .from('employee_history')
        .select('*')
        .eq('employee_id', employeeNo)
        .order('year', { ascending: false });

      // 최신 이력이 존재한다면 프로필 데이터 보정
      if (historyData && historyData.length > 0 && !profileData) {
        finalProfile.position = historyData[0].position || finalProfile.position;
        finalProfile.current_salary = historyData[0].salary || finalProfile.current_salary;
        finalProfile.performance_rating = historyData[0].performance_rating || finalProfile.performance_rating;
      }

      // 3. 시장 벤치마크 (부서 + 직급 기반)
      let benchmarkData = null;
      if (finalProfile.department && finalProfile.position) {
        const { data: bench } = await supabase
          .from('market_benchmarks')
          .select('*')
          .eq('department', finalProfile.department)
          .eq('position', finalProfile.position)
          .eq('year', currentYear)
          .maybeSingle();
        benchmarkData = bench;
      }

      // 4. 이탈 위험도 (사번 기준 조회로 동명이인 및 비가입자 문제 원천 해결)
      let riskData = null;
      if (employeeNo) {
        const { data: risk } = await supabase
          .from('risk_assessments')
          .select('*')
          .eq('employee_id', employeeNo)
          .maybeSingle();
        riskData = risk;
      }

      // 5. 부서 잔여 예산 정보 (부서 예산 테이블 컬럼 department_name에 기반하여 조회)
      let budgetData = null;
      if (finalProfile.department) {
        const { data: budget } = await supabase
          .from('department_budgets')
          .select('*')
          .eq('department_name', finalProfile.department)
          .eq('year', currentYear)
          .maybeSingle();
        budgetData = budget;
      }

      // 6. 현재 협상 상태 (사번 또는 사용자 UUID로 유연하게 조회)
      let negotiationData = null;
      const { data: negByNo } = await supabase
        .from('negotiations')
        .select('*')
        .eq('employee_id', employeeNo)
        .eq('year', currentYear)
        .maybeSingle();
      
      negotiationData = negByNo;

      if (!negotiationData && finalProfile.id) {
        const { data: negById } = await supabase
          .from('negotiations')
          .select('*')
          .eq('evaluatee_id', finalProfile.id)
          .eq('year', currentYear)
          .maybeSingle();
        negotiationData = negById;
      }

      setSelectedEmployeeData({
        profile: finalProfile,
        history: historyData || [],
        benchmark: benchmarkData,
        risk: riskData,
        budget: budgetData,
        negotiation: negotiationData
      });
    } catch (err) {
      console.error('사원 다중 맥락 정보 통합 쿼리 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === 'evaluator' && selectedEmployeeId) {
      fetchSelectedEmployeeData(selectedEmployeeId);
    }
  }, [selectedEmployeeId]);

  // 피평가자: 로그인한 본인의 맥락 정보 조회
  const fetchMyContextData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const myEmpNo = profile.employee_id; // 사번 (TEXT)

      // 1. 과거 히스토리 (사번 기준 조회)
      let historyData = [];
      if (myEmpNo) {
        const { data: hist } = await supabase
          .from('employee_history')
          .select('*')
          .eq('employee_id', myEmpNo)
          .order('year', { ascending: false });
        historyData = hist || [];
      }

      // 2. 본인의 시장 벤치마크 (부서 + 직급 기준)
      const { data: benchmarkData } = await supabase
        .from('market_benchmarks')
        .select('*')
        .eq('department', profile.department)
        .eq('position', profile.position)
        .eq('year', currentYear)
        .maybeSingle();

      // 3. 기작성한 협상안 정보 (사번 또는 UUID 기준 유연하게 조회)
      let negotiationData = null;
      if (myEmpNo) {
        const { data: neg } = await supabase
          .from('negotiations')
          .select('*')
          .eq('employee_id', myEmpNo)
          .eq('year', currentYear)
          .maybeSingle();
        negotiationData = neg;
      }

      if (!negotiationData && profile.id) {
        const { data: negById } = await supabase
          .from('negotiations')
          .select('*')
          .eq('evaluatee_id', profile.id)
          .eq('year', currentYear)
          .maybeSingle();
        negotiationData = negById;
      }

      setMyContextData({
        history: historyData || [],
        benchmark: benchmarkData,
        negotiation: negotiationData
      });
    } catch (err) {
      console.error('내 맥락 정보 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. Gemini Flash API 통신 모듈 (Direct fetch) ---
  const callGemini = async (prompt) => {
    if (!apiKey) {
      alert('AI 기능을 이용하기 위한 시스템 마스터 AI API Key가 설정되지 않았습니다. 관리자에게 문의하여 Supabase DB에 gemini_api_key 설정을 등록해 주세요.');
      return;
    }

    setLoading(true);
    setAiResponse('');
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.2, // 논리적 연산과 제안 논거 생성을 위해 정밀도 향상
              maxOutputTokens: 2548
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API 호출 오류');
      }

      const data = await response.json();
      const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!outputText) {
        throw new Error('응답 형식 분석 실패');
      }
      setAiResponse(outputText);
    } catch (err) {
      console.error('Gemini API 통신 에러:', err);
      setAiResponse(`❌ **AI 어시스턴트 통신 실패**\n\n이유: ${err.message}\n\n*해결 팁: Supabase 데이터베이스의 app_settings 테이블에 gemini_api_key가 올바르게 등록되어 있거나 로컬 .env 파일의 VITE_GEMINI_API_KEY 설정이 올바른지 확인해 주시기 바랍니다.*`);
    } finally {
      setLoading(false);
    }
  };

  // --- 4. 프롬프트 생성기 (동적 빌드) ---
  const triggerAiAnalysis = (type) => {
    let prompt = '';

    if (userRole === 'evaluator') {
      if (!selectedEmployeeData || !selectedEmployeeData.profile) {
        alert('분석할 대상 임직원을 선택해 주세요.');
        return;
      }

      const emp = selectedEmployeeData.profile;
      const historyStr = selectedEmployeeData.history.map(h =>
        `- ${h.year}년: 고과 [${h.performance_rating}], 연봉 [${h.salary.toLocaleString()}원] (${h.position})`
      ).join('\n');

      const bench = selectedEmployeeData.benchmark;
      const benchStr = bench ?
        `- 시장 벤치마크 (최소 연봉: ${bench.min_salary.toLocaleString()}원, 평균 연봉: ${bench.avg_salary.toLocaleString()}원, 최대 연봉: ${bench.max_salary.toLocaleString()}원)`
        : '- 시장 벤치마크 데이터가 시스템에 현재 등록되지 않았습니다.';

      const risk = selectedEmployeeData.risk;
      const riskStr = risk ?
        `- 이탈 위험 등급: **[${risk.risk_level}]**, 사유: ${risk.reason}`
        : '- 이탈 위험 평가 미대상 또는 안정군입니다.';

      const budget = selectedEmployeeData.budget;
      const budgetStr = budget ?
        `- 소속 부서: ${budget.department_name} (총 예산: ${budget.total_budget.toLocaleString()}원, 소모 예산: ${budget.used_budget.toLocaleString()}원, 잔여 예산: ${(budget.total_budget - budget.used_budget).toLocaleString()}원)`
        : '- 부서 예산 미등록 상태입니다.';

      const neg = selectedEmployeeData.negotiation;
      const negStr = neg ?
        `- 사원 희망 연봉안: **${neg.proposed_salary ? neg.proposed_salary.toLocaleString() + '원' : '미정'}**\n- 사원 작성 성과 요약:\n"${neg.evaluatee_comment || '미작성'}"`
        : '- 사원이 제출한 올해 연봉 협상 제안서가 아직 존재하지 않습니다.';

      if (type === 'recommend') {
        prompt = `
당신은 연봉 협상 플랫폼 "SalarySync"의 최고 AI 인사 컨설턴트 및 수석 보상 전략가입니다.
평가자(인사권자)가 선택한 특정 사원의 다중 데이터 컨텍스트를 바탕으로, 올해의 **[최적 추천 제안 연봉]**을 도출하고 정밀한 논거 리포트를 작성해 주세요.

[사원 다중 정보 컨텍스트]
- 이름: ${emp.full_name} (소속: ${emp.department} / 직급: ${emp.position})
- 최근 5개년 고과 및 연봉 추이:
${historyStr}
- 소속 부서 예산 현황:
${budgetStr}
- 동종 업계 시장 벤치마크:
${benchStr}
- 핵심 인재 이탈 위험도:
${riskStr}
- 현재 협상 진행 현황 및 사원 주장:
${negStr}

[출력 요구 조건 (Markdown 형식으로 상세하게 작성)]
1. **[최적 AI 추천 제안 연봉]**: 부서 잔여 예산 적합도, 시장 벤치마크 포지셔닝(p25~p75), 과거 고과 추이를 복합 연산하여 구체적인 원화(KRW) 단위 금액과 인상률(%)을 굵은 글씨로 상단에 명시해 주세요. (잔여 예산 한도를 초과하지 않도록 보수성과 리텐션을 조율하십시오.)
2. **[다차원 근거 분석]**:
   - 고과 기여도 대비 보상 적합성 분석
   - 시장 시장가치 대비 포지셔닝 타당성
   - 이탈 위험 방어를 위한 재무적 영향성
3. **[대안 시나리오 제언]**:
   - 부서 예산 제약이 극심한 경우 차선책으로 제시할 수 있는 비재무적 특수 보상 옵션 (특별 휴가, 교육 기회 제공, 유연근무 우선권 등)
   - 최상의 시나리오와 최악의 절충안 제안.

모든 숫자와 원화 포맷은 100% 명확히 한국 정서에 맞게 구체적으로 표현하고 전문가적인 톤으로 성실하게 적어주세요.
        `;
      } else if (type === 'script') {
        prompt = `
당신은 베테랑 인사 부서장 및 비즈니스 협상 코치입니다.
평가자(인사권자)가 사원 **${emp.full_name}**과의 1:1 대면 연봉 협상 면담에 즉시 활용할 수 있는 실전용 **[1:1 설득 롤플레잉 스크립트]**를 제작해 주세요.

[사원 정보 컨텍스트]
- 사원명: ${emp.full_name} (직급: ${emp.position})
- 올해 고과 및 과거 히스토리:
${historyStr}
- 부서 예산 상황 및 시장 벤치마크:
${budgetStr}
${benchStr}
- 사원의 요구 요약:
${negStr}

[스크립트 단계별 구성 조건 (Markdown 형식)]
다음 5단계의 실제 대화 흐름을 "인사권자(말투: 정중함, 단호하면서도 따뜻함)"와 "사원(말투: 조심스러우면서도 자신의 성과를 관철하려 함)"의 티키타카 대화 형식으로 실감 나게 적어주세요.
1. **오프닝 (Opening)**: 사원의 노고에 깊은 감사 표명 및 면담의 따뜻한 분위기 유도.
2. **성과 피드백 (Feedback)**: 올해 사원이 올린 실적과 고과 등급에 대한 합당한 객관적 평가 분석 제시.
3. **제안액 제시 및 근거 공개 (Negotiation)**: 회사가 책정한 인상안을 조심스럽지만 명확하게 제시하고, 부서 예산 한계 및 시장 벤치마크 타당성에 기반하여 합리적임을 설명하는 대화.
4. **반론/우려 수용 및 쿠션 격려 (Mitigation)**: 사원이 예산이나 인상폭에 실망감을 드러낼 때, 이를 경청하고 감정적으로 수용하면서도 리텐션(경력 기회 확대, 미래 보장)을 자극하는 모범 쿠션어 스크립트.
5. **클로징 (Closing)**: 동기부여를 심어주며 기분 좋게 도장을 찍도록 유도하는 약속 맺기.
        `;
      } else if (type === 'retention') {
        prompt = `
당신은 글로벌 헤드헌팅 펌 출신의 인재 리텐션(Retention) 전략 전문가입니다.
인재 이탈 위험 정보가 감지된 사원 **${emp.full_name}**을 조직에 잔류시키기 위한 종합 **[인재 잔류 및 보상 액션플랜 리포트]**를 수립해 주세요.

[사원 맥락 정보]
- 사원명: ${emp.full_name} (직급: ${emp.position})
- 이탈 위험 정밀 진단:
${riskStr}
- 연봉 및 시장 가치:
${historyStr}
${benchStr}

[리포트 포함 조건 (Markdown 형식)]
1. **[이탈 동기 정밀 진단]**: 등록된 리스크 사유를 심리학적, 커리어적 관점에서 분석하여 이 사원이 가장 결핍을 느끼는 근본 요소를 진단해 주세요.
2. **[맞춤형 잔류 처방전 (3 Core Cards)]**:
   - **재무적 특별 카드**: 일시적 인센티브, 내년도 보장 인상율, 스톡옵션 등 적용 가능한 재무 처방.
   - **커리어 및 직무 카드**: 사원이 원하는 R&R 조정, 상위 포지션 조기 배정 가능성, 특별 직무 교육 예산 배정.
   - **조직 문화 및 정서적 케어**: 멘토링 매칭, 리더십과의 1:1 대화 정례화, 심리적 안정감을 심어주는 면담 약속.
3. **[향후 6개월 밀착 모니터링 가이드라인]**: 매월 체크해야 할 리스크 시그널과 예방적 피드백 주기 설계.
        `;
      }
    } else {
      // 피평가자 (Evaluatee) 모드 프롬프트
      if (!profile) return;

      const myHistoryStr = myContextData?.history.map(h =>
        `- ${h.year}년: 고과 [${h.performance_rating}], 연봉 [${h.salary.toLocaleString()}원] (${h.position})`
      ).join('\n') || '- 이력 없음';

      const myBench = myContextData?.benchmark;
      const myBenchStr = myBench ?
        `- 부서/직급 시장 벤치마크 (최소 연봉: ${myBench.min_salary.toLocaleString()}원, 평균 연봉: ${myBench.avg_salary.toLocaleString()}원, 최대 연봉: ${myBench.max_salary.toLocaleString()}원)`
        : '- 시장 벤치마크 데이터가 등록되지 않았습니다.';

      const myNeg = myContextData?.negotiation;
      const myNegStr = myNeg ?
        `- 내가 제안한 희망 연봉: **${myNeg.proposed_salary ? myNeg.proposed_salary.toLocaleString() + '원' : '미정'}**\n- 내가 기재한 성과 요약:\n"${myNeg.evaluatee_comment || '미작성'}"`
        : '- 아직 올해 협상 제안서를 작성 및 제출하지 않았습니다.';

      if (type === 'pr') {
        prompt = `
당신은 대기업 임원협상 및 직무 역량 PR 전문 라이터입니다.
피평가자(사원) 본인의 성과 추이와 작성 노트를 토대로, 올해 협상 테이블에서 인사권자의 마음을 열 수 있는 **[최고급 STAR 기반 자기 PR 제안서 초안]**을 수려하게 빌드해 주세요.

[나의 정보 컨텍스트]
- 내 이름: ${profile.name} (소속 부서: ${profile.department} / 직급: ${profile.position})
- 나의 연봉/고과 히스토리:
${myHistoryStr}
- 나의 기작성 성과 요약 및 희망 요구안:
${myNegStr}

[제안서 빌드 구조 (Markdown 형식)]
1. **[직무 역량 에센스 요약 (Executive Summary)]**: 내가 올해 회사에 기여한 핵심 기여 핵심지표(KPI)를 한 눈에 들어오도록 3줄 요약.
2. **[STAR 기법 기반의 성과 정밀 서술]**:
   - **S (Situation)**: 올해 부서가 직면했던 대내외적 과제와 상황.
   - **T (Task)**: 그 안에서 나에게 주어졌던 구체적인 미션과 과업.
   - **A (Action)**: 내가 리더십을 발휘하여 주도적으로 실행한 전문적 대책 및 문제 해결 과정 (수치 중심).
   - **R (Result)**: 나의 액션으로 인해 발생한 구체적인 비즈니스 성과와 가치 창출 (전년비 % 상승, 비용 절감액 등 정량화).
3. **[미래 성장 기여도 및 로드맵]**: 인상된 연봉을 승인받았을 때, 내년에 회사에 돌려줄 200%의 가치 창출 계획 및 R&R 확장 약속.
        `;
      } else if (type === 'objection') {
        prompt = `
당신은 대한민국 최고의 비즈니스 협상 아카데미 원장입니다.
인사권자(평가자)가 연봉 협상 테이블에서 단골로 꺼내는 거절/삭감 핑계에 대해, 사원이 기분을 상하게 하지 않으면서 자신의 정당한 가치를 입증하고 논리적으로 역제안할 수 있는 **[인사권자 3대 단골 거절 반론 가이드북]**을 집필해 주세요.

[나의 맥락 상황]
- 사원: ${profile.name} (${profile.position})
- 올해 나의 성과 요약 및 시장 벤치마크:
${myNegStr}
${myBenchStr}

[가이드북 포함 구조 (Markdown 형식)]
다음 3대 거절 상황 각각에 대해 ① **인사권자의 핑계 멘트**, ② **대응 핵심 로직(Do's & Don'ts)**, ③ **실전 즉시 활용 가능한 모범 말하기 스크립트**를 구체적 구어체로 제공해 주세요.
- **상황 1: [회사/부서 예산 동결로 인해 인상이 곤란하다는 핑계]** (대처법: 비재무적 보상 결합안 및 향후 성과 연동 인센티브 약속 역제안 등)
- **상황 2: [내부 동료들과의 형평성 및 회사 연봉 밴드 테이블 제한 핑계]** (대처법: 시장 벤치마크 데이터 인용 및 내 직급 이상의 R&R 소화 증명을 통한 밴드 예외 적용 근거 대화법)
- **상황 3: [올해 성과는 좋으나 요구한 인상폭이 평균 대비 너무 과하다는 핑계]** (대처법: 기여 성과의 정량화 가치 대비 보상 비중 계산법 및 협의 양보선 제시 조율 방법)
        `;
      } else if (type === 'simulate') {
        prompt = `
당신은 정밀 보상 컨설턴트 및 통계 데이터 분석가입니다.
등록된 시장 벤치마크 지표와 사원의 고과 히스토리를 대조하여, 타결 확률이 가장 높은 **[올해 적정 희망 연봉 가이드라인 시뮬레이션]**을 가동해 주세요.

[나의 지표 컨텍스트]
- 내 직무 및 직급: ${profile.department} / ${profile.position}
- 시장 벤치마크 분위수 현황:
${myBenchStr}
- 나의 고과 이력 및 현재 연봉:
${myHistoryStr}
- 나의 요구 희망안:
${myNegStr}

[시뮬레이션 결과 리포트 구조 (Markdown 형식)]
1. **[올해 나의 시장 가치 백분위(Percentile) 진단]**: 벤치마크 데이터 대비 현재 내 연봉이 시장의 하위, 중위, 상위 어디에 포지셔닝되어 있는지 정밀 계산하여 피드백해 주세요.
2. **[AI 추천 3대 협상 Target Line 제안]**:
   - **A. 공세적 도전선 (Max Target)**: 뛰어난 고과와 높은 시장가치를 입증할 때 지향할 수 있는 최대 타겟 금액 (인상률 포함).
   - **B. 합리적 타결선 (Sweet Spot)**: 인사권자가 예산 한도 내에서 현실적으로 고개를 끄덕일 가능성이 가장 높은 최적의 합의 금액.
   - **C. 마지노 방어선 (Min Target)**: 이직이나 커리어의 불만을 방지하기 위해 최소한으로 방어해야 할 최소 인상선.
3. **[구체적인 목표선별 연계 협상 포지셔닝 전략 가이드]**
        `;
      }
    }

    callGemini(prompt);
  };

  // --- 5. 마크다운 파서 및 예쁜 뱃지 스타일 렌더러 ---
  const parseStrongText = (text) => {
    if (!text) return '';

    // **텍스트** 패턴을 감지하여 고급스러운 뱃지 스타일의 스팬으로 변경하는 헬퍼
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const cleanText = part.slice(2, -2);

        // 원화 표시(원)나 퍼센트(%)가 들어가면 강조 뱃지 스타일로 변형
        if (cleanText.includes('원') || cleanText.includes('%') || cleanText.includes('추천') || cleanText.includes('선')) {
          return (
            <span key={index} className="inline-block px-2.5 py-0.5 mx-1 font-black text-sm bg-gradient-to-r from-[var(--color-accent-1)] to-[var(--color-accent-2)] text-white rounded-lg shadow-sm border border-white/20">
              {cleanText}
            </span>
          );
        }
        return <strong key={index} className="font-extrabold text-[var(--color-accent-1)]">{cleanText}</strong>;
      }
      return part;
    });
  };

  // 문단을 예쁘게 나누어 마크다운 리포트 카드 형태로 파싱
  const renderResponseBlocks = () => {
    if (!aiResponse) return null;

    const lines = aiResponse.split('\n');
    return (
      <div className="space-y-4 text-slate-800 font-medium">
        {lines.map((line, index) => {
          const trimmed = line.trim();

          if (!trimmed) return <div key={index} className="h-2" />;

          // 대제목 H1/H2
          if (trimmed.startsWith('###')) {
            return (
              <h3 key={index} className="text-lg font-black text-slate-900 mt-6 mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
                <Brain size={18} className="text-[var(--color-accent-1)]" />
                {parseStrongText(trimmed.replace('###', '').trim())}
              </h3>
            );
          }
          if (trimmed.startsWith('##')) {
            return (
              <h2 key={index} className="text-xl font-black text-slate-950 mt-8 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex items-center gap-2">
                <Sparkles size={20} className="text-[var(--color-accent-2)]" />
                {parseStrongText(trimmed.replace('##', '').trim())}
              </h2>
            );
          }

          // 리스트 항목
          if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
            return (
              <ul key={index} className="list-disc pl-6 space-y-1.5">
                <li className="leading-relaxed text-sm text-slate-800">
                  {parseStrongText(trimmed.substring(1).trim())}
                </li>
              </ul>
            );
          }

          // 번호 매기기 리스트
          if (/^\d+\./.test(trimmed)) {
            return (
              <div key={index} className="pl-2 py-1 flex gap-2 items-start text-sm leading-relaxed text-slate-800">
                <span className="font-black text-[var(--color-accent-2)] min-w-[20px]">{trimmed.match(/^\d+\./)[0]}</span>
                <p className="flex-1">{parseStrongText(trimmed.replace(/^\d+\./, '').trim())}</p>
              </div>
            );
          }

          // 일반 단락
          return (
            <p key={index} className="leading-relaxed text-sm text-slate-700 my-2">
              {parseStrongText(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-800">
      {/* 1. Header Banner */}
      <div className="relative rounded-3xl p-8 overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-accent-1)]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--color-accent-2)]/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-tr from-[var(--color-accent-1)] to-[var(--color-accent-2)] rounded-2xl shadow-lg shadow-indigo-500/20 text-white animate-pulse">
              <Sparkles size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-white/10 text-white text-xs font-black rounded-full uppercase tracking-wider">
                  {userRole === 'evaluator' ? 'Evaluator Expert' : 'Evaluatee PR Master'}
                </span>
                <span className="text-white/40 text-xs font-bold">|</span>
                <span className="text-white/80 text-xs font-bold">{currentYear}년 연도 협상 대응</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white mt-1 tracking-tight">
                AI 협상 전략 어시스턴트
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 메인 워크스페이스 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* 좌측 패널: 맥락 데이터 확인 영역 */}
        <div className="space-y-6 lg:col-span-1">

          {/* A. 사원 선택 패널 (평가자용) */}
          {userRole === 'evaluator' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <User size={16} className="text-[var(--color-accent-2)]" />
                <span>대상 사원 실시간 매핑</span>
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 font-bold block mb-2">분석할 사원 선택</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:border-[var(--color-accent-1)] transition-all cursor-pointer"
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id} className="bg-white text-slate-800">
                        {emp.full_name} ({emp.department} / {emp.position})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedEmployeeData && selectedEmployeeData.profile && (
                  <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                      <span className="text-sm font-black text-slate-900">{selectedEmployeeData.profile.full_name}</span>
                      <span className="text-xs font-bold text-slate-500">{selectedEmployeeData.profile.position}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block">부서</span>
                        <span className="text-slate-800 font-bold">{selectedEmployeeData.profile.department}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">이탈 위험</span>
                        <span className={`font-black uppercase ${
                          selectedEmployeeData.risk?.risk_level?.toUpperCase() === 'HIGH' ? 'text-red-500 animate-pulse' :
                          selectedEmployeeData.risk?.risk_level?.toUpperCase() === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-600'
                          }`}>
                          {selectedEmployeeData.risk?.risk_level || 'SAFE'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* B. 데이터 컨텍스트 요약 보드 */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText size={16} className="text-[var(--color-accent-1)]" />
              <span>AI 인풋 데이터 컨텍스트</span>
            </h2>

            {userRole === 'evaluator' ? (
              // 평가자용 데이터 요약 뷰어
              selectedEmployeeData ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-slate-500 font-bold block mb-1">최근 연봉 추이 (최대 5년)</span>
                    <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] font-mono">
                      {selectedEmployeeData.history.length > 0 ? (
                        selectedEmployeeData.history.map((h, i) => (
                          <div key={i} className="flex justify-between text-slate-700">
                            <span>{h.year}년 ({h.performance_rating})</span>
                            <span className="font-bold text-slate-900">{h.salary.toLocaleString()}원</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-400 text-center py-2">등록된 과거 연봉 이력이 없습니다.</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 font-bold block mb-1">소속 부서 잔여 예산</span>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                      {selectedEmployeeData.budget ? (
                        <div className="flex justify-between text-slate-700 font-bold">
                          <span>잔여 / 총 예산</span>
                          <span className="text-indigo-600">
                            {(selectedEmployeeData.budget.total_budget - selectedEmployeeData.budget.used_budget).toLocaleString()}원 / {selectedEmployeeData.budget.total_budget.toLocaleString()}원
                          </span>
                        </div>
                      ) : (
                        <div className="text-slate-400 text-center py-1">예산 정보 미등록</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 font-bold block mb-1">시장 연봉 평균 (동종)</span>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 font-bold flex justify-between">
                      <span>시장 평균값</span>
                      <span className="text-slate-900">{selectedEmployeeData.benchmark ? selectedEmployeeData.benchmark.avg_salary.toLocaleString() + '원' : '벤치마크 데이터 없음'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-xs text-center py-6">사원을 선택하시면 AI 입력 데이터가 바인딩됩니다.</div>
              )
            ) : (
              // 피평가자용 데이터 요약 뷰어
              myContextData ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-slate-500 font-bold block mb-1">나의 과거 이력 요약</span>
                    <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] font-mono">
                      {myContextData.history.length > 0 ? (
                        myContextData.history.map((h, i) => (
                          <div key={i} className="flex justify-between text-slate-700">
                            <span>{h.year}년 ({h.performance_rating})</span>
                            <span className="font-bold text-slate-900">{h.salary.toLocaleString()}원</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-400 text-center py-2">등록된 과거 연봉 이력이 없습니다.</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 font-bold block mb-1">내 직군 시장 연봉 기준</span>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 font-bold flex justify-between">
                      <span>시장 평균가</span>
                      <span className="text-slate-900">{myContextData.benchmark ? myContextData.benchmark.avg_salary.toLocaleString() + '원' : '벤치마크 미등록'}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[var(--color-accent-1)]/10 rounded-xl border border-[var(--color-accent-1)]/20 text-xs text-[var(--color-accent-1)] leading-relaxed font-semibold">
                    💡 기제출한 성과기술서 요약이 AI 프롬프트 입력 맥락으로 자동 바인딩되어 있습니다.
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-xs text-center py-6">데이터를 불러오는 중입니다...</div>
              )
            )}
          </div>
        </div>

        {/* 우측 패널: AI 도구 버튼 & 결과 리포트 출력 창 */}
        <div className="lg:col-span-2 space-y-6">

          {/* AI 분석 버튼 탭 카드 */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Brain size={16} className="text-[var(--color-accent-1)]" />
              <span>실행할 AI 협상 도구 선택</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {userRole === 'evaluator' ? (
                // 평가자(Evaluator) 전용 버튼 3개
                <>
                  <button
                    onClick={() => {
                      setActiveTab('recommend');
                      triggerAiAnalysis('recommend');
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all ${activeTab === 'recommend'
                      ? 'bg-indigo-900 border-indigo-600 shadow-md text-white'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                      }`}
                  >
                    <TrendingUp size={24} className="text-[var(--color-accent-1)] mb-2" />
                    <div className={`font-black text-sm ${activeTab === 'recommend' ? 'text-white' : 'text-slate-800'}`}>AI 추천 연봉 산정</div>
                    <div className={`text-[10px] mt-1 ${activeTab === 'recommend' ? 'text-slate-200' : 'text-slate-500'}`}>예산 및 기여도 복합 분석 추천액 도출</div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('script');
                      triggerAiAnalysis('script');
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all ${activeTab === 'script'
                      ? 'bg-indigo-900 border-indigo-600 shadow-md text-white'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                      }`}
                  >
                    <Briefcase size={24} className="text-[var(--color-accent-2)] mb-2" />
                    <div className={`font-black text-sm ${activeTab === 'script' ? 'text-white' : 'text-slate-800'}`}>1:1 면담 설득 대화집</div>
                    <div className={`text-[10px] mt-1 ${activeTab === 'script' ? 'text-slate-200' : 'text-slate-500'}`}>사원 성향/요구에 맞춘 면담 대본 빌드</div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('retention');
                      triggerAiAnalysis('retention');
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all ${activeTab === 'retention'
                      ? 'bg-indigo-900 border-indigo-600 shadow-md text-white'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                      }`}
                  >
                    <ShieldAlert size={24} className="text-red-500 mb-2" />
                    <div className={`font-black text-sm ${activeTab === 'retention' ? 'text-white' : 'text-slate-800'}`}>이탈 인재 리텐션안</div>
                    <div className={`text-[10px] mt-1 ${activeTab === 'retention' ? 'text-slate-200' : 'text-slate-500'}`}>핵심 인재 잔류 전략 및 맞춤 보상책</div>
                  </button>
                </>
              ) : (
                // 피평가자(Evaluatee) 전용 버튼 3개
                <>
                  <button
                    onClick={() => {
                      setActiveTab('pr');
                      triggerAiAnalysis('pr');
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all ${activeTab === 'pr'
                      ? 'bg-indigo-900 border-indigo-600 shadow-md text-white'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                      }`}
                  >
                    <FileText size={24} className="text-[var(--color-accent-1)] mb-2" />
                    <div className={`font-black text-sm ${activeTab === 'pr' ? 'text-white' : 'text-slate-800'}`}>나의 성과 자기 PR 초안</div>
                    <div className={`text-[10px] mt-1 ${activeTab === 'pr' ? 'text-slate-200' : 'text-slate-500'}`}>STAR 기법을 적용한 성과 설득서 제작</div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('objection');
                      triggerAiAnalysis('objection');
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all ${activeTab === 'objection'
                      ? 'bg-indigo-900 border-indigo-600 shadow-md text-white'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                      }`}
                  >
                    <HelpCircle size={24} className="text-[var(--color-accent-2)] mb-2" />
                    <div className={`font-black text-sm ${activeTab === 'objection' ? 'text-white' : 'text-slate-800'}`}>인사권자 반론 가이드북</div>
                    <div className={`text-[10px] mt-1 ${activeTab === 'objection' ? 'text-slate-200' : 'text-slate-500'}`}>예산동결/밴드제한에 대처하는 모범답변</div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('simulate');
                      triggerAiAnalysis('simulate');
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all ${activeTab === 'simulate'
                      ? 'bg-indigo-900 border-indigo-600 shadow-md text-white'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                      }`}
                  >
                    <DollarSign size={24} className="text-emerald-600 mb-2" />
                    <div className={`font-black text-sm ${activeTab === 'simulate' ? 'text-white' : 'text-slate-800'}`}>적정 희망연봉 시뮬레이터</div>
                    <div className={`text-[10px] mt-1 ${activeTab === 'simulate' ? 'text-slate-200' : 'text-slate-500'}`}>업계 벤치마크 기반 타결 가이드라인</div>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* AI 결과 리포트 출력 창 */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm min-h-[450px] relative flex flex-col justify-between overflow-hidden">
            <div className="relative">
              {/* 리포트 상단 타이틀 바 */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-200 mb-6">
                <div className="flex items-center gap-2">
                  <Brain className="text-indigo-600" size={20} />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-widest">AI 전략 분석 리포트 결과</span>
                </div>
                {aiResponse && !loading && (
                  <button
                    onClick={() => {
                      const element = document.createElement("a");
                      const file = new Blob([aiResponse], { type: 'text/plain' });
                      element.href = URL.createObjectURL(file);
                      element.download = `SalarySync_AI_Report_${activeTab}.md`;
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all active:scale-95"
                  >
                    <Download size={14} />
                    <span>Markdown 다운로드</span>
                  </button>
                )}
              </div>

              {/* 1. 로딩 맥동 및 스켈레톤 화면 */}
              {loading ? (
                <div className="space-y-6 py-6">
                  <div className="flex items-center gap-3 text-indigo-600 font-extrabold text-sm animate-pulse">
                    <RefreshCw className="animate-spin" size={18} />
                    <span>AI 컨설턴트가 다중 데이터 컨텍스트를 연산하여 전략을 도출하고 있습니다...</span>
                  </div>
                  <div className="space-y-3">
                    <div className="h-6 bg-slate-100 rounded-lg w-1/3 animate-pulse" />
                    <div className="h-4 bg-slate-100 rounded-lg w-full animate-pulse" />
                    <div className="h-4 bg-slate-100 rounded-lg w-5/6 animate-pulse" />
                    <div className="h-4 bg-slate-100 rounded-lg w-4/5 animate-pulse" />
                    <div className="h-24 bg-slate-100 rounded-2xl w-full animate-pulse mt-4" />
                  </div>
                </div>
              ) : aiResponse ? (
                // 2. 렌더링된 결과 출력
                <div className="prose prose-slate max-w-none text-slate-800">
                  {renderResponseBlocks()}
                </div>
              ) : (
                // 3. 대기 화면 (Default)
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-3xl text-slate-400">
                    <Sparkles size={48} className="text-slate-300" />
                  </div>
                  <div>
                    <h3 className="text-slate-800 font-black text-base">분석 대기 중</h3>
                    <p className="text-slate-500 text-xs max-w-xs mx-auto mt-1 leading-relaxed">
                      상단의 AI 도구 버튼 중 하나를 클릭하시면 Supabase의 실시간 보상 데이터와 연계되어 맞춤 보고서가 도출됩니다.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 하단 미세 서명 */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-semibold relative">
              <span>SalarySync AI Recommendation System v2.5</span>
              <span>Secure Session Binding Enabled</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
