CREATE TABLE profile_education (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school        TEXT NOT NULL,
  degree        TEXT,
  field         TEXT,
  location      TEXT,
  start_date    DATE,
  end_date      DATE,
  gpa           TEXT,
  achievements  TEXT[] NOT NULL DEFAULT '{}',
  position      INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX profile_education_user_idx ON profile_education (user_id, position);

CREATE TRIGGER profile_education_updated_at BEFORE UPDATE ON profile_education
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE profile_education ENABLE ROW LEVEL SECURITY;
CREATE POLICY profile_education_owner ON profile_education
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
