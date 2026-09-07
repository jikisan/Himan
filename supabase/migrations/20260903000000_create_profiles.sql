-- ============================================================
-- Profiles: one identity/bio row per user, plus a structured
-- "work" section (experience, skills, projects, certificates).
-- Each child table carries user_id directly so RLS stays a flat
-- auth.uid() = user_id check (no join back to profiles).
-- position orders rows within a section; ties allowed, client sorts
-- by (position, created_at).
-- ============================================================

CREATE TABLE profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  headline   TEXT,
  bio        TEXT,
  location   TEXT,
  email      TEXT,
  phone      TEXT,
  website    TEXT,
  links      JSONB NOT NULL DEFAULT '{}',   -- {github, linkedin, ...}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profile_experiences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company     TEXT NOT NULL,
  title       TEXT NOT NULL,
  location    TEXT,
  start_date  DATE,
  end_date    DATE,                          -- NULL = current role
  is_current  BOOLEAN NOT NULL DEFAULT FALSE,
  summary     TEXT,
  bullets     TEXT[] NOT NULL DEFAULT '{}',
  position    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profile_skills (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  category   TEXT,                            -- e.g. 'language', 'framework'
  level      TEXT,                            -- free text: 'expert', '5y', ...
  position   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE TABLE profile_projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  url         TEXT,
  tech        TEXT[] NOT NULL DEFAULT '{}',
  start_date  DATE,
  end_date    DATE,
  position    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profile_certificates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  issuer       TEXT,
  issue_date   DATE,
  expiry_date  DATE,
  credential_id  TEXT,
  credential_url TEXT,
  position     INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX profile_experiences_user_idx  ON profile_experiences  (user_id, position);
CREATE INDEX profile_skills_user_idx       ON profile_skills       (user_id, position);
CREATE INDEX profile_projects_user_idx     ON profile_projects     (user_id, position);
CREATE INDEX profile_certificates_user_idx ON profile_certificates (user_id, position);

-- ---------- updated_at triggers ----------
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER profile_experiences_updated_at BEFORE UPDATE ON profile_experiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER profile_skills_updated_at BEFORE UPDATE ON profile_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER profile_projects_updated_at BEFORE UPDATE ON profile_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER profile_certificates_updated_at BEFORE UPDATE ON profile_certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------- RLS: owner-only, one policy per table ----------
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_experiences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_skills        ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_certificates  ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_owner ON profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY profile_experiences_owner ON profile_experiences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY profile_skills_owner ON profile_skills
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY profile_projects_owner ON profile_projects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY profile_certificates_owner ON profile_certificates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
