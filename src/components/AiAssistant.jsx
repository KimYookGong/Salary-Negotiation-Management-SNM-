import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Sparkles, 
  Key, 
  User, 
  Send, 
  TrendingUp, 
  AlertTriangle, 
  MessageSquare, 
  CheckCircle, 
  FileText, 
  HelpCircle, 
  Coins, 
  BrainCircuit, 
  Lock,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 금액 포맷터
const formatCurrency = (value) => {
  if (!value && value !== 0) return '-';
  const num = Number(value);
  return num.toLocaleString() + '원';
};

const AiAssistant = ({ profile, userRole, currentYear }) => {
  // API Key 관련 상태
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  
  // 공통 상태
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [activeSubTab, setActiveSubTab] = useState(''); // evaluator: 'recommend', 'script', 'risk' / evaluatee: 'pr', 'objection', 'suggest'
  
  // 평가자(Evaluator) 측 상태
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedEmpData, setSelectedEmpData] = useState(null);
  
  // 피평가자(Evaluatee) 측 상태
  const [myHistory, setMyHistory] = useState([]);
  const [myBenchmark, setMyBenchmark] = useState(null);
  const [myJd, setMyJd] = useState('');
  const [myReason, setMyReason] = useState('');
  const [myHopeSalary, setMyHopeSalary] = useState('');

  // 1. API 키 초기화
  useEffect(() => {
    const savedKey = localStorage.getItem('vite_gemini_api_key');
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (savedKey) {
      setApiKey(savedKey);
    } else if (envKey) {
      setApiKey(envKey);
    } else {
      setShowKeyInput(true); // 키가 없으면 자동으로 입력란 표시
    }
  }, []);

  // API 키 저장 핸들러
  const handleSaveApiKey = (e) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('vite_gemini_api_key', apiKey.trim());
      setShowKeyInput(false);
      alert('API Key가 로컬에 안전하게 저장되었습니다.');
    } else {
      localStorage.removeItem('vite_gemini_api_key');
      alert('API Key가 비워졌습니다. 환경변수 값이 있다면 사용됩니다.');
    }
  };

  // 2. 초기 데이터 로딩
  useEffect(() => {
    if (userRole === 'evaluator') {
      fetchEmployees();
      setActiveSubTab('recommend');
    } else {
      fetchMyData();
      setActiveSubTab('pr');
    }
  }, [userRole, profile, currentYear]);

  // 평가자: 사원 목록 로드
  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'evaluatee')
        .order('full_name');
        
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  // 피평가자: 내 데이터(이력, 벤치마크, 기존협상안) 로드
  const fetchMyData = async () => {
    if (!profile) return;
    try {
      // 1) 고과/연봉 히스토리
      if (profile.employee_id) {
        const { data: histData } = await supabase
          .from('employee_history')
          .select('*')
          .eq('employee_id', profile.employee_id)
          .order('year', { ascending: false });
        setMyHistory(histData || []);
      }
      
      // 2) 시장 벤치마크 데이터
      const { data: benchData } = await supabase
        .from('market_benchmarks')
        .select('*')
        .eq('department', profile.department)
        .eq('position', profile.position)
        .eq('year', currentYear)
        .maybeSingle();
      setMyBenchmark(benchData);

      // 3) 현재 진행중인 연봉 협상 요구안
      let query = supabase.from('negotiations').select('*').eq('year', currentYear);
      if (profile.employee_id) {
        query = query.or(`evaluatee_id.eq.${profile.id},employee_id.eq.${profile.employee_id}`);
      } else {
        query = query.eq('evaluatee_id', profile.id);
      }
      const { data: negoData } = await query.maybeSingle();
      
      if (negoData) {
        setMyJd(negoData.jd || '');
        setMyReason(negoData.reason || '');
        setMyHopeSalary(negoData.evaluatee_proposal ? negoData.evaluatee_proposal.toString() : '');
      }
    } catch (err) {
      console.error('Error fetching my data:', err);
    }
  };

  // 평가자: 특정 사원 선택 시 맥락 데이터 쿼리
  const handleSelectEmployee = async (empId) => {
    setSelectedEmpId(empId);
    if (!empId) {
      setSelectedEmpData(null);
      return;
    }
    
    setLoading(true);
    try {
      const emp = employees.find(e => e.id === empId);
      if (!emp) return;

      // 1) 과거 이력 조회
      let historyData = [];
      if (emp.employee_id) {
        const { data } = await supabase
          .from('employee_history')
          .select('*')
          .eq('employee_id', emp.employee_id)
          .order('year', { ascending: false });
        historyData = data || [];
      }

      // 2) 이탈 위험군 데이터 조회
      const { data: riskData } = await supabase
        .from('risk_assessments')
        .select('*')
        .eq('employee_name', emp.full_name)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 3) 부서 예산 데이터 조회
      const { data: deptBudget } = await supabase
        .from('department_budgets')
        .select('*')
        .eq('department_name', emp.department)
        .eq('year', currentYear)
        .maybeSingle();

      // 4) 시장 벤치마크 데이터 조회
      const { data: benchmarkData } = await supabase
        .from('market_benchmarks')
        .select('*')
        .eq('department', emp.department)
        .eq('position', emp.position)
        .eq('year', currentYear)
        .maybeSingle();

      // 5) 현재 협상 진행 현황
      let query = supabase.from('negotiations').select('*').eq('year', currentYear);
      if (emp.employee_id) {
        query = query.or(`evaluatee_id.eq.${emp.id},employee_id.eq.${emp.employee_id}`);
      } else {
        query = query.eq('evaluatee_id', emp.id);
      }
      const { data: negotiationData } = await query.maybeSingle();

      setSelectedEmpData({
        profile: emp,
        history: historyData,
        risk: riskData,
        budget: deptBudget,
        benchmark: benchmarkData,
        negotiation: negotiationData
      });
      setAiResponse('');
    } catch (err) {
      console.error('Error fetching employee context:', err);
      alert('사원 정보 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Gemini API 호출 로직
  const callGemini = async (prompt) => {
    if (!apiKey) {
      alert('AI 기능을 이용하려면 Gemini API Key 설정이 필요합니다. 상단의 API Key 설정 버튼을 이용해 등록해 주세요.');
      setShowKeyInput(true);
      return;
    }

    setLoading(true);
    setAiResponse('');
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
            temperature: 0.3,
            topP: 0.95,
            maxOutputTokens: 2500
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'API 호출에 실패했습니다.');
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '답변을 생성할 수 없습니다.';
      setAiResponse(text);
    } catch (err) {
      console.error('Gemini API Error:', err);
      setAiResponse(`⚠️ **오류 발생**: ${err.message}\n\n입력하신 API Key가 올바른지 확인해 주시거나 잠시 후 다시 시도해 주세요.`);
    } finally {
      setLoading(false);
    }
  };

  // 4. 평가자 프롬프트 생성기
  const handleEvaluatorAiAction = (actionType) => {
    if (!selectedEmpData) {
      alert('먼저 사원을 선택해 주세요.');
      return;
    }

    const { profile: empProfile, history: empHistory, risk, budget, benchmark, negotiation } = selectedEmpData;
    
    const contextText = `
[대상 사원 정보]
- 성명: ${empProfile.full_name}
- 부서: ${empProfile.department}
- 현재 직급: ${empProfile.position}
- 현재 연봉: ${formatCurrency(empProfile.current_salary)}
- 올해 고과 등급: ${empProfile.performance_rating || '미정'}
- 입사일: ${empProfile.hire_date || '알수없음'}

[과거 협상 및 고과 이력]
${empHistory.length > 0 ? empHistory.map(h => `- ${h.year}년: 직급 ${h.position}, 연봉 ${formatCurrency(h.salary)}, 등급 ${h.performance_rating}`).join('\n') : '이력 없음'}

[시장 벤치마크 (동일 부서/직급)]
- 최소 연봉: ${benchmark ? formatCurrency(benchmark.min_salary) : '정보 없음'}
- 평균 연봉: ${benchmark ? formatCurrency(benchmark.avg_salary) : '정보 없음'}
- 최대 연봉: ${benchmark ? formatCurrency(benchmark.max_salary) : '정보 없음'}

[부서 예산 현황 (${currentYear}년)]
- 부서 총 연봉 인상 예산: ${budget ? formatCurrency(budget.total_budget) : '정보 없음'}
- 현재까지 기사용 예산: ${budget ? formatCurrency(budget.used_budget) : '정보 없음'}
- 잔여 예산: ${budget ? formatCurrency(budget.total_budget - budget.used_budget) : '정보 없음'}

[이탈 위험 정보]
${risk ? `- 위험도 등급: ${risk.risk_level} (사유: ${risk.reason})` : '검진 결과 특이사항 없음 (이탈 위험 낮음)'}

[사원의 현재 연봉 협상 요구안]
- 희망 인상 연봉: ${negotiation?.evaluatee_proposal ? formatCurrency(negotiation.evaluatee_proposal) : '미제출'}
- 승진 요청 여부: ${negotiation?.promotion_request ? '요청함' : '요청안함'}
- 직무 기술서 (JD): ${negotiation?.jd || '미작성'}
- 성과 및 기여 요약: ${negotiation?.reason || '미작성'}
`;

    let systemPrompt = '';
    
    if (actionType === 'recommend') {
      systemPrompt = `
당신은 대한민국 최고의 인사/보상 컨설턴트 및 HR 전문가입니다.
주어진 대상 사원의 데이터(성과 등급, 과거 이력, 시장 벤치마크, 부서 잔여 예산, 이탈 위험 등)를 입체적으로 분석하여,
올해 연도(${currentYear}년)에 가장 타당한 **"인상 제안액(원화)"**과 **"추천 이유"**를 구체적 수치에 근거하여 작성해 주세요.

작성 가이드라인:
1. **분석 요약**: 사원의 등급과 이력, 요구안을 한눈에 볼 수 있도록 핵심 강점과 리스크를 요약해 주세요.
2. **추천 제안**: 구체적인 원화 단위 추천 연봉과 인상률(%), 그리고 인상액을 명확히 제시하세요. (예산 상태 및 벤치마크 상의 백분율 위치를 반드시 고려)
3. **상세 제안 근거**: 왜 이 금액이어야 하는지를 고과 등급, 시장 가치(벤치마크), 부서 예산의 제약 사항, 이탈 위험 요소를 조화롭게 결합해 설득력 있게 제시하세요.
4. **대안 시나리오**: 만약 예산 한계로 타결이 어려울 경우 제공할 수 있는 비재무적 보상 방안(교육 지원, 유연 근무 등)을 가볍게 제언해 주세요.

모든 내용은 정중하고 격식 있는 비즈니스 톤의 한국어로 마크다운 스타일을 적용해 가독성 높게 출력해 주세요.
`;
    } else if (actionType === 'script') {
      systemPrompt = `
당신은 탁월한 커뮤니케이션 능력을 지닌 최고의 HR 파트너이자 리더십 코치입니다.
주어진 사원의 성과 등급, 희망안, 그리고 회사 추천안(임의 분석 필요)을 바탕으로, 연봉 면담 시 평가자가 대상 사원을 따뜻하게 격려하면서도 회사의 제안을 합리적으로 납득시키고 동기부여를 이끌어낼 수 있는 **"실제 면담 스크립트"**를 만들어 주세요.

작성 가이드라인:
1. **면담 전략 핵심 팁**: 이 사원의 성향과 평가 등급, 리스크를 감안했을 때 면담 시 어떤 태도와 전략을 취해야 하는지 3대 핵심 포인트를 먼저 짚어주세요.
2. **단계별 상세 스크립트 (실제 대화 대사 형태)**:
   - **Step 1: 면담 오프닝 & 공감대 형성 (1~2분)** - 따뜻한 인사와 올해의 노고에 대한 감사 표현.
   - **Step 2: 성과 피드백 & 긍정 평가 전달 (2~3분)** - 사원의 JD와 성과 요약을 바탕으로 구체적인 기여 부문 칭찬.
   - **Step 3: 회사의 제안 연봉 오픈 및 설명 (3~4분)** - 회사 안을 제시하며 성과 등급 기준과 시장 위치(벤치마크)를 연계해 객관적으로 타당함을 설득하는 정중한 멘트.
   - **Step 4: 사원의 반응별 모범 대처법 및 스크립트**
     * 만약 사원이 실망하거나 희망연봉과의 갭에 반발할 때 활용할 수 있는 쿠션어와 대안(성장 가능성 어필 등) 제시 멘트.
   - **Step 5: 마무리 & 동기 부여 클로징 (1~2분)** - 다음 연도 성장을 기원하고 격려하는 품격 있는 끝인사.

실제 면담에서 바로 소리 내어 읽어도 자연스럽도록 구어체의 품위 있는 비즈니스 대화 톤으로 작성해 주세요. (마크다운 적용)
`;
    } else if (actionType === 'risk') {
      systemPrompt = `
당신은 사내 인재 유출을 미연에 방지하는 핵심 리텐션(Retention) 전문가입니다.
주어진 사원의 이탈 위험 진단 정보(risk_assessments 기반)와 연봉 요구안, 그리고 벤치마크 데이터를 정밀 분석하여, 연봉 협상에서 이 사원의 불만을 해소하고 회사에 로열티를 가지고 롱런할 수 있도록 돕는 **"밀착 리텐션 액션 플랜"**을 설계해 주세요.

작성 가이드라인:
1. **이탈 위험 정밀 진단**: 사원의 고과 등급과 벤치마크 대비 현재 처우의 불만족 가능성, 그리고 보고서상의 이탈 사유를 종합하여 이탈 확률(상/중/하)과 주요 불만 요소를 구조적으로 진단해 주세요.
2. **협상 테이블 대응 카드**: 이번 연봉 협상 시 이 사원의 로열티를 회복하기 위해 협상가가 제시할 수 있는 카드를 전략적으로 제안해 주세요.
   - *재무적 카드*: 연봉 보정 범위, 특별 성과급 또는 내년도 우선 보상 약정 등.
   - *커리어 카드*: 승진 기회 가속화, 핵심 프로젝트 리딩 기회, 희망 부서 직무 재배치 등.
   - *환경적 카드*: 유연 근무 확대, 복지 포인트 추가 등.
3. **사후 밀착 관리 프로세스**: 협상이 타결된 후에도 마음을 열고 몰입할 수 있도록 향후 6개월간 팀장이나 인사팀이 취해야 할 단계적 모니터링 및 주기적 1:1 면담 가이드를 작성해 주세요.

신뢰할 수 있고 즉각 실천 가능한 실무 매뉴얼 스타일로, 격조 있는 한국어 마크다운으로 출력해 주세요.
`;
    }

    callGemini(`${systemPrompt}\n\n[제공된 데이터 컨텍스트]\n${contextText}`);
  };

  // 5. 피평가자 프롬프트 생성기
  const handleEvaluateeAiAction = (actionType) => {
    if (!profile) return;

    const contextText = `
[나의 기본 정보]
- 성명: ${profile.full_name}
- 부서: ${profile.department}
- 직급: ${profile.position}
- 현재 연봉: ${formatCurrency(profile.current_salary)}
- 올해 획득 등급: ${profile.performance_rating || 'B (기본)'}

[나의 과거 연봉 및 등급 이력]
${myHistory.length > 0 ? myHistory.map(h => `- ${h.year}년: 직급 ${h.position}, 연봉 ${formatCurrency(h.salary)}, 등급 ${h.performance_rating}`).join('\n') : '이력 없음'}

[시장 벤치마크 (나와 동일한 부서/직급의 시장 데이터)]
- 최소 연봉: ${myBenchmark ? formatCurrency(myBenchmark.min_salary) : '정보 없음'}
- 평균 연봉: ${myBenchmark ? formatCurrency(myBenchmark.avg_salary) : '정보 없음'}
- 최대 연봉: ${myBenchmark ? formatCurrency(myBenchmark.max_salary) : '정보 없음'}

[내가 작성한 현재의 희망 요구안]
- 희망 희망연봉: ${myHopeSalary ? formatCurrency(myHopeSalary) : '아직 미입력'}
- 직무 기술서 (JD): ${myJd || '아직 미입력'}
- 성과 및 제안 사유: ${myReason || '아직 미입력'}
`;

    let systemPrompt = '';
    
    if (actionType === 'pr') {
      systemPrompt = `
당신은 직원의 재능과 노고를 최고의 비즈니스 언어로 다듬어주는 탁월한 커리어 코치이자 PR 라이터입니다.
주어진 본인의 프로필, 과거 고과 등급, 그리고 작성 중이거나 작성한 '직무 기술(JD)'과 '성과 및 제안 사유'를 정밀 가공하여, 인사권자(평가자)가 보았을 때 깊은 인상을 받고 요구 연봉의 타당성을 100% 수긍할 수 있는 **"최고급 연봉 인상 제안서(자기 PR서) 초안"**을 작성해 주세요.

작성 가이드라인:
1. **헤드라인**: 본인의 가치를 명확히 관통하는 세련된 한 줄 슬로건을 뽑아주세요.
2. **핵심 기여 및 성과 요약 (수치 중심)**: 입력받은 성과 텍스트를 논리적인 구조(STAR 기법: Situation, Task, Action, Result)로 재배치하여, 정량적 지표와 정성적 기여도가 눈에 띄게 문장화해 주세요. (구체적인 지표가 부족하다면, 임시 수치 [X%] 등으로 가이드라인을 주어 채워 넣을 수 있게 해 주세요)
3. **희망 연봉의 합리성 제시**: 획득한 등급의 의미와 시장 벤치마크 데이터를 근거로 하여 왜 내가 제안한 희망 연봉이 회사 입장에서도 '합리적인 인재 투자'가 되는지 조리 있게 서술해 주세요.
4. **미래 기여 약속**: 단순히 돈을 더 달라는 요구에 그치지 않고, 인상된 연봉에 걸맞게 내년도에 부서와 회사에 어떻게 기여할 것인지 적극적인 R&R 및 포부를 작성해 주세요.

회사를 존중하면서도 자신의 프로페셔널한 자존감을 잃지 않는 당당하고 세련된 한국어 비즈니스 톤으로 마크다운 스타일을 적용해 작성해 주세요.
`;
    } else if (actionType === 'objection') {
      systemPrompt = `
당신은 평화적이면서도 실리를 챙기는 최고의 협상 테이블 중재자입니다.
연봉 면담 시 인사권자가 전형적으로 던지는 거절 및 연봉 삭감 유도 멘트에 대해, 직원이 감정적으로 위축되지 않고 자신의 페이스를 유지하며 모범적으로 방어 및 역제안을 할 수 있는 **"인사권자 반론 대비 대화집"**을 제공해 주세요.

특히 인사권자의 3대 단골 거절 멘트에 맞춤화된 방어 전략을 작성해 주세요:
1. **거절 시나리오 1: "올해 회사 및 부서 전체 예산이 동결 수준이라 더 올려주기가 곤란합니다."**
   - *대응 전략*: 예산 부족 프레임을 깨고 개별 기여도로 유도하는 법.
   - *실제 말하기 스크립트*: 정중한 공감 후 핵심 역량 어필 멘트.
2. **거절 시나리오 2: "동료 직원들과의 형평성(연봉 밴드)을 고려했을 때 급격한 인상은 내부 반발을 부릅니다."**
   - *대응 전략*: 형평성 논리를 존중하면서 우수 성과자 특별 보상 트랙을 제안하는 법.
   - *실제 말하기 스크립트*: 설득 멘트.
3. **거절 시나리오 3: "제시한 희망 연봉은 시장 평균(또는 등급 표준) 대비 다소 높은 편입니다."**
   - *대응 전략*: 시장 벤치마크 및 본인이 획득한 고등급(S, A)의 희소성을 바탕으로 역설하는 법.
   - *실제 말하기 스크립트*: 설득 멘트.

각 상황마다 **'인사권자의 숨은 의도 분석 -> 협상 꿀팁 -> 추천 쿠션어 -> 한 줄 핵심 대응 멘트 -> 풍부한 예시 대화록'** 순서로 구체적으로 작성해 주어, 실무에서 든든한 무기로 쓸 수 있도록 품위 있는 한국어 마크다운으로 가독성 높게 제공해 주세요.
`;
    } else if (actionType === 'suggest') {
      systemPrompt = `
당신은 데이터 분석에 기반하여 객관적인 몸값을 산정해 주는 최고의 HR 보상 분석가(Compensation Analyst)입니다.
본인의 현재 연봉, 올해 고과 등급, 과거 고과 이력, 그리고 시장 벤치마크 데이터를 종합적으로 비교·시뮬레이션하여, 이번 연봉 협상에서 목표로 삼아야 할 **"적정 희망 연봉 범위"**와 **"협상 포지셔닝 전략"**을 분석해 주세요.

작성 가이드라인:
1. **시장 포지션 진단**: 현재 나의 연봉이 시장 벤치마크(최소~최대)에서 어느 퍼센타일(하위 %, 평균 수준, 상위 %)에 속하는지 객관적으로 알려주고, 올해 획득한 등급 대비 적당한 위치인지를 엄정히 평가해 주세요.
2. **추천 인상 타겟 구간 제안**:
   - *최소 방어선 (Min Target)*: 물가 상승률과 기본 등급 인상을 고려한 최소 수용 금액 및 인상률.
   - *현실적 적정선 (Sweet Spot)*: 등급 성과와 벤치마크 평균을 조화시킨 가장 추천하는 협상 타결 목표 금액.
   - *최대 도전선 (Max Target)*: 뛰어난 성과 기여와 승진 요청 등을 가미하여 최대 어필해 볼 수 있는 적극적 공세 금액.
3. **전략적 포지셔닝 제언**: 면담 테이블에서 이 타겟들을 언제, 어떻게 오픈해야 하는지(오프닝 제안 기법 등)와 비재무적 조건(휴가, 성과급 조건 등)을 패키징하는 전략을 기술해 주세요.

실제 데이터 수치(원화)를 적극 활용하여 신뢰도를 배가시키고, 격조 높고 깔끔한 한국어 마크다운 양식으로 보기 쉽게 정리해 주세요.
`;
    }

    callGemini(`${systemPrompt}\n\n[제공된 데이터 컨텍스트]\n${contextText}`);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* 1. Header Banner with Key Management */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[var(--color-primary)] to-[#014421] rounded-3xl p-8 text-white shadow-xl shadow-primary/20">
        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 rounded-full bg-[var(--color-accent-1)]/10 blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[var(--color-accent-1)]/20 rounded-xl">
                <Sparkles size={24} className="text-[var(--color-accent-1)] animate-pulse" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-[var(--color-accent-1)]">AI Support Panel</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">SalarySync AI 어시스턴트</h1>
            <p className="text-white/80 text-sm font-medium">
              {userRole === 'evaluator' 
                ? '임직원의 성과와 예산, 시장 가치를 정밀 종합 분석하여 최적의 연봉 제안과 성공적인 협상 시나리오를 추천합니다.' 
                : '시장 데이터와 자신의 기여도를 입체적으로 연계하여, 나만의 프리미엄 제안서 작성과 면담 거절 반론을 완벽 대비합니다.'}
            </p>
          </div>
          
          <div>
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-sm font-black transition-all active:scale-95 shadow-inner"
            >
              <Key size={18} className="text-[var(--color-accent-1)]" />
              <span>API Key 설정</span>
            </button>
          </div>
        </div>

        {/* API Key Input Form */}
        <AnimatePresence>
          {showKeyInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative mt-6 pt-6 border-t border-white/10 z-10"
            >
              <form onSubmit={handleSaveApiKey} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 max-w-xl">
                <div className="flex items-center gap-2 text-xs font-black text-[var(--color-accent-1)] uppercase tracking-wider">
                  <Lock size={14} />
                  <span>Gemini API Key 등록 (Client-Side Safe)</span>
                </div>
                <p className="text-white/60 text-xs leading-relaxed">
                  입력하신 API Key는 서버로 전송되지 않으며 오직 사용자의 브라우저 로컬 스토리지에만 보관되어 안전합니다.
                  Gemini API는 Google AI Studio에서 무료로 발급받으실 수 있습니다.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={isKeyVisible ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIZAsy..."
                      className="w-full pl-4 pr-12 py-3 bg-white/10 focus:bg-white/15 border border-white/10 focus:border-[var(--color-accent-1)]/50 rounded-xl text-sm text-white font-mono outline-none transition-all placeholder-white/30"
                    />
                    <button
                      type="button"
                      onClick={() => setIsKeyVisible(!isKeyVisible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                    >
                      {isKeyVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[var(--color-accent-1)] text-[var(--color-primary)] font-black text-sm rounded-xl hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent/20"
                  >
                    저장하기
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Main Interaction Board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Context / Control Box (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {userRole === 'evaluator' ? (
            /* ================= EVALUATOR CONTROL ================= */
            <div className="card space-y-6 overflow-visible">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">분석 대상 사원 선택</label>
                <div className="relative">
                  <select
                    value={selectedEmpId}
                    onChange={(e) => handleSelectEmployee(e.target.value)}
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-black text-gray-800 outline-none focus:border-[var(--color-primary)] focus:bg-white transition-all shadow-sm cursor-pointer appearance-none"
                  >
                    <option value="">-- 사원을 선택해 주세요 --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.department} • {emp.position})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <User size={18} />
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {selectedEmpData ? (
                  <motion.div
                    key={selectedEmpId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-5"
                  >
                    {/* 사원 종합 미니 프로필 카드 */}
                    <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full flex items-center justify-center font-black">
                          {selectedEmpData.profile.full_name[0]}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-gray-900">{selectedEmpData.profile.full_name}</h4>
                          <p className="text-[10px] text-gray-400 font-bold">{selectedEmpData.profile.department} • {selectedEmpData.profile.position}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200/50 text-xs font-medium text-gray-600">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold block mb-0.5">현재 연봉</span>
                          <span className="font-black text-gray-800">{formatCurrency(selectedEmpData.profile.current_salary)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold block mb-0.5">올해 고과 등급</span>
                          <span className="font-black text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-md inline-block">
                            {selectedEmpData.profile.performance_rating || 'B (기본)'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold block mb-0.5">희망 요구안</span>
                          <span className="font-black text-[var(--color-secondary)]">
                            {selectedEmpData.negotiation?.evaluatee_proposal ? formatCurrency(selectedEmpData.negotiation.evaluatee_proposal) : '미제출'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold block mb-0.5">승진 요청 여부</span>
                          <span className="font-black text-gray-800">{selectedEmpData.negotiation?.promotion_request ? '요청함' : '요청안함'}</span>
                        </div>
                      </div>
                    </div>

                    {/* AI 기능 선택 버티컬 버튼 그룹 */}
                    <div className="space-y-3 pt-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">AI 도구 선택</p>
                      
                      <button
                        onClick={() => { setActiveSubTab('recommend'); handleEvaluatorAiAction('recommend'); }}
                        className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left ${
                          activeSubTab === 'recommend'
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] shadow-md shadow-primary/5'
                            : 'border-gray-100 bg-white hover:border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Coins size={18} className={activeSubTab === 'recommend' ? 'text-[var(--color-primary)]' : 'text-gray-400'} />
                          <div>
                            <p className="text-sm font-black">AI 추천 제안 연봉 산정</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">등급/예산/시장 평균 연계 시뮬레이션</p>
                          </div>
                        </div>
                        <ChevronRight size={16} />
                      </button>

                      <button
                        onClick={() => { setActiveSubTab('script'); handleEvaluatorAiAction('script'); }}
                        className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left ${
                          activeSubTab === 'script'
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] shadow-md shadow-primary/5'
                            : 'border-gray-100 bg-white hover:border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <MessageSquare size={18} className={activeSubTab === 'script' ? 'text-[var(--color-primary)]' : 'text-gray-400'} />
                          <div>
                            <p className="text-sm font-black">설득 & 협상 1:1 대화집</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">노고 칭찬부터 회사제안 납득까지 단계 스크립트</p>
                          </div>
                        </div>
                        <ChevronRight size={16} />
                      </button>

                      <button
                        onClick={() => { setActiveSubTab('risk'); handleEvaluatorAiAction('risk'); }}
                        className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left ${
                          activeSubTab === 'risk'
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] shadow-md shadow-primary/5'
                            : 'border-gray-100 bg-white hover:border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <AlertTriangle size={18} className={activeSubTab === 'risk' ? 'text-[var(--color-primary)]' : 'text-gray-400'} />
                          <div>
                            <p className="text-sm font-black">이탈 위험 사원 리텐션 방안</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">이탈요인 정밀 분석 및 대안 복지/보상 설계</p>
                          </div>
                        </div>
                        <ChevronRight size={16} />
                      </button>
                    </div>

                  </motion.div>
                ) : (
                  <div className="h-48 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-6 text-gray-400 text-center">
                    <BrainCircuit size={32} className="mb-2 opacity-35 animate-pulse" />
                    <p className="text-xs font-bold leading-relaxed">위 드롭다운에서 임직원을 선택하시면<br/>데이터 통합 분석 및 AI 패널이 활성화됩니다.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* ================= EVALUATEE CONTROL ================= */
            <div className="card space-y-6">
              <div className="p-5 bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-3xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] rounded-full flex items-center justify-center font-black">
                    {profile?.full_name[0]}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900">{profile?.full_name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold">{profile?.department} • {profile?.position}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200/50 text-xs font-medium text-gray-600">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block mb-0.5">현재 내 연봉</span>
                    <span className="font-black text-gray-800">{formatCurrency(profile?.current_salary)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block mb-0.5">올해 획득 등급</span>
                    <span className="font-black text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-md inline-block">
                      {profile?.performance_rating || 'B'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block mb-0.5">시장 평균 연봉</span>
                    <span className="font-black text-gray-800">{myBenchmark ? formatCurrency(myBenchmark.avg_salary) : '정보 없음'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block mb-0.5">협상 대상 연도</span>
                    <span className="font-black text-gray-800">{currentYear}년</span>
                  </div>
                </div>
              </div>

              {/* 입력 연동 확인 피드백 아코디언/알림 */}
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <FileText size={12} />
                  <span>협상 제안서 연계 상태</span>
                </div>
                {myJd || myReason ? (
                  <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle size={14} />
                    '연봉 협상' 탭에 기재한 성과 요약 및 JD가 연동되었습니다.
                  </p>
                ) : (
                  <p className="text-[11px] font-medium text-amber-600 flex items-center gap-1">
                    <AlertTriangle size={14} />
                    '연봉 협상' 탭에서 성과/JD를 적으시면 분석 품질이 고도화됩니다.
                  </p>
                )}
              </div>

              {/* AI 기능 선택 버티컬 버튼 그룹 */}
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">AI 도구 선택</p>
                
                <button
                  onClick={() => { setActiveSubTab('pr'); handleEvaluateeAiAction('pr'); }}
                  className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left ${
                    activeSubTab === 'pr'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] shadow-md shadow-primary/5'
                      : 'border-gray-100 bg-white hover:border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText size={18} className={activeSubTab === 'pr' ? 'text-[var(--color-primary)]' : 'text-gray-400'} />
                    <div>
                      <p className="text-sm font-black">나의 성과 자기 PR 제안서</p>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">STAR 기법 기반의 설득 초안 및 PR 문구</p>
                    </div>
                  </div>
                  <ChevronRight size={16} />
                </button>

                <button
                  onClick={() => { setActiveSubTab('objection'); handleEvaluateeAiAction('objection'); }}
                  className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left ${
                    activeSubTab === 'objection'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] shadow-md shadow-primary/5'
                      : 'border-gray-100 bg-white hover:border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle size={18} className={activeSubTab === 'objection' ? 'text-[var(--color-primary)]' : 'text-gray-400'} />
                    <div>
                      <p className="text-sm font-black">인사권자 반론 가이드북</p>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">예산 부족, 형평성 핑계 대처용 쿠션어 스크립트</p>
                    </div>
                  </div>
                  <ChevronRight size={16} />
                </button>

                <button
                  onClick={() => { setActiveSubTab('suggest'); handleEvaluateeAiAction('suggest'); }}
                  className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left ${
                    activeSubTab === 'suggest'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] shadow-md shadow-primary/5'
                      : 'border-gray-100 bg-white hover:border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp size={18} className={activeSubTab === 'suggest' ? 'text-[var(--color-primary)]' : 'text-gray-400'} />
                    <div>
                      <p className="text-sm font-black">적정 희망연봉 가이드라인</p>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">시장 벤치마크 및 등급 결합 현실성 시뮬레이터</p>
                    </div>
                  </div>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: AI Response Screen (7 cols) */}
        <div className="lg:col-span-7">
          <div className="card min-h-[500px] flex flex-col h-full relative overflow-hidden bg-white border border-gray-100 rounded-3xl">
            {/* AI Screen Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-1)] animate-ping" />
                <span className="text-xs font-black text-gray-800 tracking-tight">AI 실시간 분석 화면</span>
              </div>
              {aiResponse && !loading && (
                <button
                  onClick={() => {
                    if (userRole === 'evaluator') {
                      handleEvaluatorAiAction(activeSubTab);
                    } else {
                      handleEvaluateeAiAction(activeSubTab);
                    }
                  }}
                  className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5 text-xs font-bold"
                  title="다시 생성하기"
                >
                  <RefreshCw size={14} />
                  <span>다시 생성</span>
                </button>
              )}
            </div>

            {/* AI Screen Content */}
            <div className="flex-1 flex flex-col mt-6 overflow-y-auto">
              <AnimatePresence mode="wait">
                {loading ? (
                  /* ================= SKELETON LOADER STATE ================= */
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col justify-center space-y-6 py-12"
                  >
                    <div className="flex justify-center">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
                        <BrainCircuit size={28} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--color-primary)] animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-3 max-w-md mx-auto w-full text-center">
                      <p className="text-sm font-black text-gray-800 animate-bounce">
                        {userRole === 'evaluator' ? '사원 이력 및 예산 빅데이터 종합 정밀 분석 중...' : '시장 벤치마크 및 기여 가치 시뮬레이션 중...'}
                      </p>
                      <p className="text-[11px] text-gray-400 font-bold">인공지능 어시스턴트가 최적의 커스텀 분석 가이드를 빌드하고 있습니다. 약 5~10초 소요됩니다.</p>
                      
                      {/* 스켈레톤 라인 */}
                      <div className="pt-6 space-y-2 max-w-sm mx-auto">
                        <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-full" />
                        <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-11/12 mx-auto" />
                        <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-10/12 mx-auto" />
                      </div>
                    </div>
                  </motion.div>
                ) : aiResponse ? (
                  /* ================= AI RESPONSE STATE ================= */
                  <motion.div
                    key="response"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col"
                  >
                    {/* Rendered Styled Markdown Container */}
                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed font-medium pb-8 space-y-4">
                      {aiResponse.split('\n').map((line, idx) => {
                        // Title H1, H2, H3
                        if (line.startsWith('# ')) {
                          return <h1 key={idx} className="text-xl font-black text-[var(--color-primary)] pt-4 pb-2 border-b border-gray-100">{line.replace('# ', '')}</h1>;
                        }
                        if (line.startsWith('## ')) {
                          return <h2 key={idx} className="text-lg font-black text-gray-900 pt-4 pb-1">{line.replace('## ', '')}</h2>;
                        }
                        if (line.startsWith('### ')) {
                          return <h3 key={idx} className="text-sm font-black text-gray-800 pt-3 pb-0.5">{line.replace('### ', '')}</h3>;
                        }
                        
                        // Strong text highlight in blocks
                        let renderedLine = line;
                        
                        // Alert / Quote block
                        if (line.startsWith('> ')) {
                          return (
                            <blockquote key={idx} className="border-l-4 border-[var(--color-accent-1)] bg-gray-50 p-4 rounded-r-xl italic my-2 text-xs font-semibold text-gray-600">
                              {line.replace('> ', '')}
                            </blockquote>
                          );
                        }
                        
                        // List bullet
                        if (line.startsWith('- ') || line.startsWith('* ')) {
                          const cleanLine = line.replace(/^[-*]\s+/, '');
                          return (
                            <li key={idx} className="ml-4 list-disc text-xs font-medium py-0.5 text-gray-600">
                              {cleanLine.includes('**') ? parseStrongText(cleanLine) : cleanLine}
                            </li>
                          );
                        }

                        // Normal paragraph (supports double asterisks ** for bold)
                        if (line.trim() === '') return <div key={idx} className="h-2" />;
                        
                        return (
                          <p key={idx} className="text-xs text-gray-600 leading-relaxed font-medium">
                            {line.includes('**') ? parseStrongText(line) : line}
                          </p>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : (
                  /* ================= EMPTY STATE ================= */
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center py-12 text-center text-gray-400"
                  >
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                      <Sparkles size={28} className="opacity-25" />
                    </div>
                    <h3 className="text-sm font-black text-gray-800 mb-1">AI 도우미가 분석을 시작할 준비가 되었습니다</h3>
                    <p className="text-xs max-w-sm mx-auto leading-relaxed">
                      {userRole === 'evaluator' 
                        ? '왼쪽 패널에서 사원을 지정하고 원하시는 AI 분석 도구를 선택하시면, 해당 사원의 모든 데이터를 정밀 분석하여 결과를 생성합니다.' 
                        : '왼쪽 패널에서 원하시는 AI 분석 도구를 선택하시면, 내 이력과 벤치마크 데이터를 통합 종합 분석하여 결과를 생성합니다.'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// ** (Double asterisk) 파싱 헬퍼 함수
const parseStrongText = (text) => {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-black text-gray-950 bg-amber-50 px-1 py-0.5 rounded-md">{part}</strong>;
    }
    return part;
  });
};

export default AiAssistant;
