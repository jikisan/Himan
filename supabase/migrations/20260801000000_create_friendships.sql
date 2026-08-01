-- ============================================================
-- Friends: mutual (request + accept) social graph.
-- Discovery layer only — grants no list/errand access.
-- ============================================================

CREATE TABLE IF NOT EXISTS friendships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'declined'
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships"
  ON friendships FOR SELECT
  USING (auth.uid() IN (requester_id, addressee_id));

CREATE POLICY "Users can create requests they send"
  ON friendships FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Addressee can respond to requests"
  ON friendships FOR UPDATE
  USING (addressee_id = auth.uid());

CREATE POLICY "Either party can delete"
  ON friendships FOR DELETE
  USING (auth.uid() IN (requester_id, addressee_id));

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Send a friend request by email. Dedupes across both directions.
CREATE OR REPLACE FUNCTION send_friend_request(lookup_email text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_id uuid;
  existing  friendships%ROWTYPE;
BEGIN
  SELECT id INTO target_id
  FROM auth.users WHERE email = lower(btrim(lookup_email)) LIMIT 1;

  IF target_id IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
  IF target_id = auth.uid() THEN RAISE EXCEPTION 'CANNOT_FRIEND_SELF'; END IF;

  SELECT * INTO existing FROM friendships
  WHERE (requester_id = auth.uid() AND addressee_id = target_id)
     OR (requester_id = target_id AND addressee_id = auth.uid())
  LIMIT 1;

  IF existing.id IS NOT NULL THEN
    IF existing.status = 'accepted' THEN RAISE EXCEPTION 'ALREADY_FRIENDS'; END IF;
    IF existing.status = 'pending'  THEN RAISE EXCEPTION 'REQUEST_ALREADY_PENDING'; END IF;
    -- declined: revive as a fresh pending request from the current user
    UPDATE friendships
      SET requester_id = auth.uid(), addressee_id = target_id,
          status = 'pending', updated_at = NOW()
      WHERE id = existing.id;
    RETURN 'pending';
  END IF;

  INSERT INTO friendships (requester_id, addressee_id, status)
  VALUES (auth.uid(), target_id, 'pending');
  RETURN 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION send_friend_request(text) TO authenticated;

-- Accepted friendships for the current user, with both emails.
CREATE OR REPLACE FUNCTION get_friends()
RETURNS TABLE (
  id uuid, requester_id uuid, addressee_id uuid,
  requester_email text, addressee_email text, status text, created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT f.id, f.requester_id, f.addressee_id,
         ru.email::text, au.email::text, f.status, f.created_at
  FROM friendships f
  JOIN auth.users ru ON ru.id = f.requester_id
  JOIN auth.users au ON au.id = f.addressee_id
  WHERE f.status = 'accepted'
    AND auth.uid() IN (f.requester_id, f.addressee_id);
$$;

GRANT EXECUTE ON FUNCTION get_friends() TO authenticated;

-- Pending requests involving the current user (either direction), with both emails.
CREATE OR REPLACE FUNCTION get_friend_requests()
RETURNS TABLE (
  id uuid, requester_id uuid, addressee_id uuid,
  requester_email text, addressee_email text, status text, created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT f.id, f.requester_id, f.addressee_id,
         ru.email::text, au.email::text, f.status, f.created_at
  FROM friendships f
  JOIN auth.users ru ON ru.id = f.requester_id
  JOIN auth.users au ON au.id = f.addressee_id
  WHERE f.status = 'pending'
    AND auth.uid() IN (f.requester_id, f.addressee_id);
$$;

GRANT EXECUTE ON FUNCTION get_friend_requests() TO authenticated;
