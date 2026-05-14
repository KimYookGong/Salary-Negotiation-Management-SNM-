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

DO $$ BEGIN
  CREATE TYPE performance_rating_type AS ENUM ('S', 'A', 'B', 'C', 'D');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. 사원 인증용 마스터 테이블 (고정 정보)
CREATE TABLE IF NOT EXISTS employees (
  employee_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  department department_type NOT NULL,
  hire_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 사원 히스토리 테이블 (연도별 변동 정보)
CREATE TABLE IF NOT EXISTS employee_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id TEXT REFERENCES employees(employee_id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  position position_type NOT NULL,
  salary BIGINT DEFAULT 0,
  performance_rating performance_rating_type,
  UNIQUE(employee_id, year)
);

-- 3. 연봉 협상 테이블
CREATE TABLE IF NOT EXISTS negotiations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluatee_id UUID REFERENCES auth.users(id),
  evaluatee_name TEXT NOT NULL,
  department department_type NOT NULL,
  position position_type,
  current_salary BIGINT DEFAULT 0,
  performance_rating performance_rating_type,
  year INTEGER NOT NULL DEFAULT 2026, -- 연도 정보 추가
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

-- 4. 사용자 프로필 테이블 (현재 상태 스냅샷)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  department department_type,
  position position_type,
  current_salary BIGINT DEFAULT 0,
  performance_rating performance_rating_type,
  employee_id TEXT,
  role TEXT DEFAULT 'evaluatee',
  hire_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 예산 테이블 (회사 전체)
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL UNIQUE,
  total_budget BIGINT NOT NULL DEFAULT 0,
  used_budget BIGINT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 부서별 예산 테이블
CREATE TABLE IF NOT EXISTS department_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_name department_type NOT NULL,
  year INTEGER NOT NULL DEFAULT 2026, -- 연도 정보 추가
  total_budget BIGINT NOT NULL DEFAULT 0,
  used_budget BIGINT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(department_name, year)
);

-- RLS 설정
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now" ON employees FOR ALL USING (true);

ALTER TABLE employee_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now" ON employee_history FOR ALL USING (true);

ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now" ON negotiations FOR ALL USING (true);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now" ON profiles FOR ALL USING (true);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now" ON budgets FOR ALL USING (true);

ALTER TABLE department_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now" ON department_budgets FOR ALL USING (true);

-- 7. 트리거 함수: 부서 예산 합계를 전체 예산에 반영
CREATE OR REPLACE FUNCTION sync_total_company_budget()
RETURNS TRIGGER AS $$
BEGIN
  -- 해당 연도의 전체 예산 레코드가 없으면 생성
  INSERT INTO budgets (year, total_budget)
  VALUES (NEW.year, 0)
  ON CONFLICT (year) DO NOTHING;

  -- 해당 연도의 모든 부서 예산 합계를 계산하여 업데이트
  UPDATE budgets
  SET total_budget = (SELECT COALESCE(SUM(total_budget), 0) FROM department_budgets WHERE year = NEW.year),
      updated_at = NOW()
  WHERE year = NEW.year;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_total_budget
AFTER INSERT OR UPDATE OR DELETE ON department_budgets
FOR EACH ROW EXECUTE FUNCTION sync_total_company_budget();

-- 8. 트리거 함수: 협상 상태에 따른 예산 자동 동기화
CREATE OR REPLACE FUNCTION sync_negotiation_budget_auto()
RETURNS TRIGGER AS $$
DECLARE
    old_impact BIGINT := 0;
    new_impact BIGINT := 0;
    diff BIGINT := 0;
    target_year INTEGER;
    target_dept department_type;
BEGIN
    -- 삭제 또는 업데이트 시 이전 영향력 계산
    IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
        IF OLD.status NOT IN ('rejected', 'cancelled') AND OLD.evaluator_proposal IS NOT NULL AND OLD.current_salary IS NOT NULL THEN
            old_impact := OLD.evaluator_proposal::BIGINT - OLD.current_salary::BIGINT;
        END IF;
        target_year := OLD.year;
        target_dept := OLD.department;
    END IF;

    -- 삽입 또는 업데이트 시 새로운 영향력 계산
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.status NOT IN ('rejected', 'cancelled') AND NEW.evaluator_proposal IS NOT NULL AND NEW.current_salary IS NOT NULL THEN
            new_impact := NEW.evaluator_proposal::BIGINT - NEW.current_salary::BIGINT;
        END IF;
        target_year := NEW.year;
        target_dept := NEW.department;
    END IF;

    diff := new_impact - old_impact;

    IF diff <> 0 THEN
        -- 부서 예산 업데이트
        UPDATE department_budgets
        SET used_budget = used_budget + diff,
            updated_at = NOW()
        WHERE department_name = target_dept AND year = target_year;

        -- 전체 예산 업데이트
        UPDATE budgets
        SET used_budget = used_budget + diff,
            updated_at = NOW()
        WHERE year = target_year;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_negotiation_budget
AFTER INSERT OR UPDATE OR DELETE ON negotiations
FOR EACH ROW EXECUTE FUNCTION sync_negotiation_budget_auto();
