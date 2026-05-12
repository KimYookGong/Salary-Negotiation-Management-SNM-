CREATE TABLE IF NOT EXISTS negotiations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluatee_id UUID REFERENCES auth.users(id), -- 연동을 위해 추가
  evaluatee_name TEXT NOT NULL,
  department TEXT NOT NULL,
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

-- 사용자 프로필 테이블 생성
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  department TEXT,
  employee_id TEXT,
  role TEXT DEFAULT 'evaluatee', -- 'evaluatee', 'evaluator'
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 설정
ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all actions for now" ON negotiations FOR ALL USING (true);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profiles" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profiles" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 더미 데이터 삽입 (생략 가능)
INSERT INTO negotiations (evaluatee_name, department, status, evaluatee_proposal, score)
VALUES 
('홍길동', '개발팀', 'submitted', '₩75,000,000', 4.8),
('이영희', '디자인팀', 'under_review', '₩68,000,000', 4.5),
('김철수', '마케팅팀', 'counter_offer', '₩62,000,000', 4.2);
