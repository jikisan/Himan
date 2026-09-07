-- ============================================================
-- Career: role-tailored cover letter generation.
-- An item is a selection of shared blocks, not a stored document.
-- ============================================================

CREATE TYPE career_block_kind AS ENUM (
  'greeting', 'opening', 'experience_line', 'proof',
  'portfolio_line', 'close', 'cv_summary'
);

-- A concrete variant, never a filter. NULL on career_item_blocks means
-- "always include"; there is deliberately no 'any' member.
CREATE TYPE career_length AS ENUM ('short', 'long');

-- Reusable text blocks. Body may contain {{placeholders}}.
CREATE TABLE career_blocks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind       career_block_kind NOT NULL,
  label      TEXT NOT NULL,
  body       TEXT NOT NULL,
  tags       TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, label)
);

-- A role item. share_token is both the storage folder name and the
-- revocation handle: rotating it deletes the old folder.
CREATE TABLE career_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  cv_file_path TEXT,
  -- gen_random_uuid() is built into PG13+; gen_random_bytes() would need
  -- pgcrypto, which no migration in this repo has ever enabled. 122 bits
  -- of entropy, and the signed-URL signature is the real gate anyway.
  share_token  TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

-- Which blocks an item uses, and in what order.
-- PK on (item_id, position) makes ordering total: no ties, and the same
-- block may legitimately appear at two positions.
-- length NULL = always include; 'short'/'long' = only in that variant.
CREATE TABLE career_item_blocks (
  item_id  UUID NOT NULL REFERENCES career_items(id)  ON DELETE CASCADE,
  -- RESTRICT, not CASCADE: deleting a block must not silently rewrite
  -- letters. The blocks UI blocks the delete instead (Task 5, Step 2).
  block_id UUID NOT NULL REFERENCES career_blocks(id) ON DELETE RESTRICT,
  position INT  NOT NULL,
  length   career_length,
  PRIMARY KEY (item_id, position)
);

-- One row per generated letter: what you actually claimed, to whom, when.
-- v1 only ever writes kind = 'cover_letter'.
CREATE TABLE career_renders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id        UUID NOT NULL REFERENCES career_items(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN ('cover_letter', 'cv')),
  length         career_length NOT NULL,
  job_title      TEXT,
  company        TEXT,
  hiring_manager TEXT,
  hook           TEXT,
  body_text      TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX career_renders_item_idx ON career_renders (item_id, created_at DESC);

CREATE TRIGGER career_blocks_updated_at BEFORE UPDATE ON career_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER career_items_updated_at BEFORE UPDATE ON career_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Replaces an item's full block selection in one call so a reorder or
-- re-pick can't be split across two round trips: a client-side delete then
-- insert would leave the item with zero blocks if the insert failed after
-- the delete succeeded. SECURITY INVOKER (the default) means this runs as
-- the calling user and the RLS policies below still apply to both statements.
CREATE OR REPLACE FUNCTION replace_career_item_blocks(p_item_id UUID, p_blocks JSONB)
RETURNS VOID AS $$
BEGIN
  DELETE FROM career_item_blocks WHERE item_id = p_item_id;

  INSERT INTO career_item_blocks (item_id, block_id, position, length)
  SELECT
    p_item_id,
    (b->>'block_id')::UUID,
    (b->>'position')::INT,
    NULLIF(b->>'length', '')::career_length
  FROM jsonb_array_elements(p_blocks) AS b;
END;
$$ LANGUAGE plpgsql;

-- ---------- RLS ----------
ALTER TABLE career_blocks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_item_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_renders     ENABLE ROW LEVEL SECURITY;

CREATE POLICY career_blocks_owner ON career_blocks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY career_items_owner ON career_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY career_item_blocks_owner ON career_item_blocks
  FOR ALL USING (EXISTS (
    SELECT 1 FROM career_items i WHERE i.id = item_id AND i.user_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM career_items i WHERE i.id = item_id AND i.user_id = auth.uid()
  ));

CREATE POLICY career_renders_owner ON career_renders
  FOR ALL USING (EXISTS (
    SELECT 1 FROM career_items i WHERE i.id = item_id AND i.user_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM career_items i WHERE i.id = item_id AND i.user_id = auth.uid()
  ));

-- ---------- Storage ----------
-- Private. Sharing is a 10-year signed URL, not a public object, so a CV
-- carrying a name, phone number and employment history never becomes
-- world-readable or crawlable.
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES ('career', 'career', FALSE, ARRAY['text/html', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Split per command to match 20260107000000_create_storage_bucket.sql.
CREATE POLICY "Users can view their own career files"
ON storage.objects FOR SELECT
USING (bucket_id = 'career' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own career files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'career' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own career files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'career' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'career' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own career files"
ON storage.objects FOR DELETE
USING (bucket_id = 'career' AND auth.uid()::text = (storage.foldername(name))[1]);
