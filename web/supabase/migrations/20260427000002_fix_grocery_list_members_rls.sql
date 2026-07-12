-- Fix: allow invited users to insert themselves as members when accepting an invitation.
-- The original "Owners can add members" policy had no path for an invitee (not yet a member,
-- inserting with role='editor'), causing a 403 on every invitation acceptance.

DROP POLICY IF EXISTS "Owners can add members" ON grocery_list_members;

CREATE POLICY "Owners can add members"
  ON grocery_list_members FOR INSERT
  WITH CHECK (
    -- Existing list owners can add anyone
    EXISTS (
      SELECT 1 FROM grocery_list_members existing
      WHERE existing.list_id = grocery_list_members.list_id
        AND existing.user_id = auth.uid()
        AND existing.role = 'owner'
    )
    -- Auto-insert trigger path for new list owners
    OR (user_id = auth.uid() AND role = 'owner')
    -- Invited users can accept their own invitation (insert themselves as editor)
    OR (
      user_id = auth.uid()
      AND role = 'editor'
      AND EXISTS (
        SELECT 1 FROM grocery_invitations
        WHERE list_id = grocery_list_members.list_id
          AND invited_email = auth.jwt() ->> 'email'
          AND status = 'pending'
      )
    )
  );
