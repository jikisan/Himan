CREATE TABLE career_cv_blocks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  position   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX career_cv_blocks_user_idx ON career_cv_blocks (user_id, position);

CREATE TRIGGER career_cv_blocks_updated_at BEFORE UPDATE ON career_cv_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE career_cv_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY career_cv_blocks_owner ON career_cv_blocks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
