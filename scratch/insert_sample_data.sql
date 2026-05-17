-- ====================================================================
-- SalarySync 대시보드 개편용 스키마 생성 및 실시간 테스트 데이터 삽입 스크립트
-- 이 스크립트를 Supabase Dashboard -> SQL Editor에 복사하여 붙여넣고 
-- [Run]을 클릭해 실행하면 테이블 생성부터 데이터 연동까지 한 번에 완료됩니다.
-- ====================================================================

-- [1단계] 테이블 생성 (테이블이 없을 경우에만 자동 생성됩니다)

-- 1. 이탈 고위험군 (risk_assessments) 테이블 생성
CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    reason TEXT NOT NULL,
    risk_level VARCHAR(50) NOT NULL CHECK (risk_level IN ('High', 'Medium', 'Low')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 시장 벤치마크 (market_benchmarks) 테이블 생성
-- (기존에 정의된 position_type ENUM 타입을 재사용하여 유효성을 보장합니다)
CREATE TABLE IF NOT EXISTS market_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department VARCHAR(100) NOT NULL,
    position position_type NOT NULL,
    min_salary BIGINT NOT NULL,
    avg_salary BIGINT NOT NULL,
    max_salary BIGINT NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_dept_pos_year UNIQUE (department, position, year)
);

-- RLS (Row Level Security) 설정 변경 (모든 사용자가 익명/인증 토큰으로 조회할 수 있도록 기본 허용)
-- (만약 특정 권한이 필요할 경우 Supabase 콘솔에서 추가 RLS를 적용할 수 있습니다)
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all users on risk_assessments" ON risk_assessments
    FOR SELECT USING (true);
CREATE POLICY "Allow read access to all users on market_benchmarks" ON market_benchmarks
    FOR SELECT USING (true);

-- [2단계] 실시간 테스트 데이터 삽입 (기본 데이터 누적 방지를 위해 테이블 비우기 포함)
TRUNCATE TABLE risk_assessments;
TRUNCATE TABLE market_benchmarks;

-- 1. 이탈 고위험군 (risk_assessments) 데이터 삽입
INSERT INTO risk_assessments (employee_name, department, reason, risk_level, created_at)
VALUES 
  ('홍길동', '개발팀', '최근 연봉 협상 지연 및 주요 경쟁사 헤드헌팅 제안 수신 감지', 'High', NOW()),
  ('김철수', '마케팅팀', '핵심 성과 기여자이나 업계 평균 대비 연봉 수준 하위 10%', 'High', NOW() - INTERVAL '1 hour'),
  ('이영희', '디자인팀', '동료 다수 퇴사로 인한 업무 과중 및 직무 만족도 급감', 'High', NOW() - INTERVAL '2 hours'),
  ('박민수', '운영팀', '최근 인사 평가 결과 피드백 불만족 및 연봉 제안 거부 의사 표현', 'Medium', NOW() - INTERVAL '1 day'),
  ('최지우', '인사팀', '기존 연봉 대비 외부 스카우트 제안 금액 25% 이상 격차 발생', 'Low', NOW() - INTERVAL '2 days');

-- 2. 시장 벤치마크 (market_benchmarks) 데이터 삽입
INSERT INTO market_benchmarks (department, position, min_salary, avg_salary, max_salary, year)
VALUES
  -- 개발팀
  ('개발팀', '사원', 35000000, 42000000, 48000000, 2026),
  ('개발팀', '대리', 48000000, 55000000, 62000000, 2026),
  ('개발팀', '과장', 62000000, 72000000, 85000000, 2026),
  ('개발팀', '차장', 85000000, 98000000, 115000000, 2026),
  ('개발팀', '부장', 115000000, 130000000, 160000000, 2026),
  
  -- 디자인팀
  ('디자인팀', '사원', 32000000, 38000000, 43000000, 2026),
  ('디자인팀', '대리', 42000000, 48000000, 55000000, 2026),
  ('디자인팀', '과장', 55000000, 65000000, 78000000, 2026),
  ('디자인팀', '차장', 78000000, 88000000, 105000000, 2026),
  ('디자인팀', '부장', 105000000, 120000000, 145000000, 2026),

  -- 마케팅팀
  ('마케팅팀', '사원', 30000000, 36000000, 42000000, 2026),
  ('마케팅팀', '대리', 40000000, 46000000, 52000000, 2026),
  ('마케팅팀', '과장', 52000000, 62000000, 72000000, 2026),
  ('마케팅팀', '차장', 72000000, 82000000, 98000000, 2026),
  ('마케팅팀', '부장', 98000000, 115000000, 135000000, 2026),

  -- 운영팀
  ('운영팀', '사원', 28000000, 34000000, 38000000, 2026),
  ('운영팀', '대리', 38000000, 44000000, 50000000, 2026),
  ('운영팀', '과장', 50000000, 60000000, 70000000, 2026),
  ('운영팀', '차장', 70000000, 80000000, 95000000, 2026),
  ('운영팀', '부장', 95000000, 110000000, 125000000, 2026),

  -- 인사팀
  ('인사팀', '사원', 30000000, 36000000, 40000000, 2026),
  ('인사팀', '대리', 40000000, 46000000, 52000000, 2026),
  ('인사팀', '과장', 52000000, 62000000, 72000000, 2026),
  ('인사팀', '차장', 72000000, 82000000, 95000000, 2026),
  ('인사팀', '부장', 95000000, 110000000, 130000000, 2026);
