-- 1. 연봉 협상 테이블
CREATE TABLE IF NOT EXISTS negotiations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluatee_id UUID REFERENCES auth.users(id),
  evaluatee_name TEXT NOT NULL,
  department TEXT NOT NULL,
  position TEXT, -- 직급 추가
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
  department TEXT,
  position TEXT, -- 직급 추가
  employee_id TEXT,
  role TEXT DEFAULT 'evaluatee',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 사원 인증용 마스터 테이블
CREATE TABLE IF NOT EXISTS employees (
  employee_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  department TEXT NOT NULL,
  position TEXT NOT NULL, -- 직급 추가
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 설정
ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all actions for now" ON negotiations FOR ALL USING (true);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profiles" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profiles" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees are viewable by everyone" ON employees FOR SELECT USING (true);
