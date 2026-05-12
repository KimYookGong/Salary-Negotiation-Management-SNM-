-- 0. 부서 및 직급 드롭다운(ENUM) 타입 생성 
DO $$ BEGIN
  CREATE TYPE department_type AS ENUM ('운영팀', '인사팀', '마케팅팀', '개발팀', '디자인팀');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE position_type AS ENUM ('사원', '주임', '대리', '과장', '차장', '부장', '본부장');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. 연봉 협상 테이블
CREATE TABLE IF NOT EXISTS negotiations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluatee_id UUID REFERENCES auth.users(id),
  evaluatee_name TEXT NOT NULL,
  department department_type NOT NULL,
  position position_type,
  current_salary BIGINT DEFAULT 0, -- [ADD] 현재 연봉 컬럼 추가
  status TEXT NOT NULL DEFAULT 'submitted',
  evaluatee_proposal TEXT,
  evaluator_proposal TEXT,
  evaluator_comment TEXT,
  score DECIMAL(3, 2),
  jd TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  department department_type,
  position position_type,
  current_salary BIGINT DEFAULT 0, -- [ADD] 현재 연봉 컬럼 추가
  employee_id TEXT,
  role TEXT DEFAULT 'evaluatee',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 사원 인증용 마스터 테이블
CREATE TABLE IF NOT EXISTS employees (
  employee_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  department department_type NOT NULL,
  position position_type NOT NULL,
  current_salary BIGINT DEFAULT 0, -- [ADD] 현재 연봉 컬럼 추가
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 예산 테이블
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL,
  total_budget BIGINT NOT NULL,
  used_budget BIGINT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 인재 리스크 테이블
CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  department department_type NOT NULL,
  risk_level TEXT NOT NULL, -- 'High', 'Medium', 'Low'
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 시장 벤치마크 테이블
CREATE TABLE IF NOT EXISTS market_benchmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department department_type NOT NULL,
  market_avg BIGINT NOT NULL,
  company_avg BIGINT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 알림 테이블 (영속성용)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 설정 및 정책 초기화
ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all actions for now" ON negotiations;
CREATE POLICY "Allow all actions for now" ON negotiations FOR ALL USING (true);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update their own profiles" ON profiles;
CREATE POLICY "Users can update their own profiles" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert their own profiles" ON profiles;
CREATE POLICY "Users can insert their own profiles" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Employees are viewable by everyone" ON employees;
CREATE POLICY "Employees are viewable by everyone" ON employees FOR SELECT USING (true);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Budgets are viewable by everyone" ON budgets;
CREATE POLICY "Budgets are viewable by everyone" ON budgets FOR SELECT USING (true);

ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Risk assessments are viewable by everyone" ON risk_assessments;
CREATE POLICY "Risk assessments are viewable by everyone" ON risk_assessments FOR SELECT USING (true);

ALTER TABLE market_benchmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Market benchmarks are viewable by everyone" ON market_benchmarks;
CREATE POLICY "Market benchmarks are viewable by everyone" ON market_benchmarks FOR SELECT USING (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can see their own notifications" ON notifications;
CREATE POLICY "Users can see their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
