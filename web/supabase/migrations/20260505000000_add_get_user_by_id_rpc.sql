-- RPC: get user email + metadata by ID (used by mobile dev auth bypass)
CREATE OR REPLACE FUNCTION get_user_by_id(user_id uuid)
RETURNS TABLE (id uuid, email text, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, email, created_at FROM auth.users WHERE id = user_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_user_by_id(uuid) TO authenticated, anon;