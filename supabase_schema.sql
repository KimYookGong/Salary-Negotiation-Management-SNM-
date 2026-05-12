-- 연봉 협상 테이블 생성
CREATE TABLE IF NOT EXISTS negotiations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluatee_name TEXT NOT NULL,
  department TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted', -- 'submitted', 'under_review', 'counter_offer', 'final_agreement', 'rejected'
  evaluatee_proposal TEXT,
  evaluator_proposal TEXT,
  evaluator_comment TEXT,
  score DECIMAL(3, 2),
  jd TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 설정 (데모를 위해 모든 작업 허용)
ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all actions for now" ON negotiations FOR ALL USING (true);

-- 더미 데이터 삽입 (선택 사항)
INSERT INTO negotiations (evaluatee_name, department, status, evaluatee_proposal, score)
VALUES 
('홍길동', '개발팀', 'submitted', '₩75,000,000', 4.8),
('이영희', '디자인팀', 'under_review', '₩68,000,000', 4.5),
('김철수', '마케팅팀', 'counter_offer', '₩62,000,000', 4.2);
