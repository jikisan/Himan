-- Members of a grocery list, with email joined from auth.users.
-- Scoped to callers who are themselves a member of the list.
CREATE OR REPLACE FUNCTION get_grocery_list_members(p_list_id uuid)
RETURNS TABLE (
  id uuid, user_id uuid, email text, role text, joined_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.id, m.user_id, u.email::text, m.role, m.joined_at
  FROM grocery_list_members m
  JOIN auth.users u ON u.id = m.user_id
  WHERE m.list_id = p_list_id
    AND EXISTS (
      SELECT 1 FROM grocery_list_members me
      WHERE me.list_id = p_list_id AND me.user_id = auth.uid()
    )
  ORDER BY m.joined_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_grocery_list_members(uuid) TO authenticated;
