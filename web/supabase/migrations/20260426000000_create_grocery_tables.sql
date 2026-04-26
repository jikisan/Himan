-- ============================================================
-- Grocery Collaboration Module
-- First multi-user collaboration feature in Himan
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Product catalog: per-user persistent memory of products
CREATE TABLE IF NOT EXISTS product_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  default_quantity NUMERIC DEFAULT 1,
  default_unit TEXT,
  lifespan_days INTEGER,
  last_purchased_at TIMESTAMP WITH TIME ZONE,
  purchase_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, name)
);

-- Grocery lists
CREATE TABLE IF NOT EXISTS grocery_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grocery list members: sharing model
CREATE TABLE IF NOT EXISTS grocery_list_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor',
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (list_id, user_id)
);

-- Grocery items on a list
CREATE TABLE IF NOT EXISTS grocery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
  product_id UUID REFERENCES product_catalog(id),
  name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC DEFAULT 1,
  unit TEXT,
  notes TEXT,
  is_checked BOOLEAN DEFAULT FALSE,
  checked_by UUID REFERENCES auth.users(id),
  checked_at TIMESTAMP WITH TIME ZONE,
  price NUMERIC,
  added_by UUID NOT NULL REFERENCES auth.users(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grocery shopping sessions (per-user, not per-list)
CREATE TABLE IF NOT EXISTS grocery_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_by UUID NOT NULL REFERENCES auth.users(id),
  store_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Session items: snapshot of grocery items at session start
CREATE TABLE IF NOT EXISTS grocery_session_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES grocery_sessions(id) ON DELETE CASCADE,
  grocery_item_id UUID REFERENCES grocery_items(id) ON DELETE SET NULL,
  list_name TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC DEFAULT 1,
  unit TEXT,
  notes TEXT,
  is_purchased BOOLEAN DEFAULT FALSE,
  purchased_at TIMESTAMP WITH TIME ZONE,
  price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grocery invitations
CREATE TABLE IF NOT EXISTS grocery_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (list_id, invited_email)
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

-- Membership lookups (critical for RLS performance)
CREATE INDEX idx_grocery_list_members_user_id ON grocery_list_members(user_id);
CREATE INDEX idx_grocery_list_members_list_id ON grocery_list_members(list_id);

-- Item queries
CREATE INDEX idx_grocery_items_list_id ON grocery_items(list_id);
CREATE INDEX idx_grocery_items_category ON grocery_items(category);
CREATE INDEX idx_grocery_items_unchecked ON grocery_items(is_checked) WHERE NOT is_checked;

-- Sessions: only one active session per user
CREATE UNIQUE INDEX idx_grocery_sessions_active ON grocery_sessions(started_by) WHERE status = 'active';

-- Session items
CREATE INDEX idx_session_items_session ON grocery_session_items(session_id);
CREATE INDEX idx_session_items_grocery_item ON grocery_session_items(grocery_item_id);

-- Product catalog
CREATE INDEX idx_product_catalog_user_id ON product_catalog(user_id);
CREATE INDEX idx_product_catalog_name ON product_catalog(user_id, name);
CREATE INDEX idx_product_catalog_category ON product_catalog(user_id, category);
CREATE INDEX idx_product_catalog_last_purchased ON product_catalog(user_id, last_purchased_at DESC);

-- Invitations
CREATE INDEX idx_grocery_invitations_email ON grocery_invitations(invited_email);
CREATE INDEX idx_grocery_invitations_list_id ON grocery_invitations(list_id);

-- ============================================================
-- 3. RLS HELPER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION is_grocery_list_member(p_list_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM grocery_list_members
    WHERE list_id = p_list_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 4. ENABLE RLS
-- ============================================================

ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_session_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

-- product_catalog: standard user-isolated
CREATE POLICY "Users can view their own products"
  ON product_catalog FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products"
  ON product_catalog FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
  ON product_catalog FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
  ON product_catalog FOR DELETE
  USING (auth.uid() = user_id);

-- grocery_lists: membership-based access
CREATE POLICY "Members can view their lists"
  ON grocery_lists FOR SELECT
  USING (is_grocery_list_member(id) OR auth.uid() = owner_id);

CREATE POLICY "Users can create lists"
  ON grocery_lists FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Members can update their lists"
  ON grocery_lists FOR UPDATE
  USING (is_grocery_list_member(id));

CREATE POLICY "Owners can delete their lists"
  ON grocery_lists FOR DELETE
  USING (auth.uid() = owner_id);

-- grocery_list_members: members can see co-members, owner manages
CREATE POLICY "Members can view list members"
  ON grocery_list_members FOR SELECT
  USING (is_grocery_list_member(list_id));

CREATE POLICY "Owners can add members"
  ON grocery_list_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM grocery_list_members
      WHERE list_id = grocery_list_members.list_id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
    -- Also allow the auto-insert trigger for new list owners
    OR (user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Owners can remove members"
  ON grocery_list_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM grocery_list_members m
      WHERE m.list_id = grocery_list_members.list_id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
    -- Members can remove themselves
    OR user_id = auth.uid()
  );

-- grocery_items: full CRUD for list members
CREATE POLICY "Members can view list items"
  ON grocery_items FOR SELECT
  USING (is_grocery_list_member(list_id));

CREATE POLICY "Members can add list items"
  ON grocery_items FOR INSERT
  WITH CHECK (is_grocery_list_member(list_id));

CREATE POLICY "Members can update list items"
  ON grocery_items FOR UPDATE
  USING (is_grocery_list_member(list_id));

CREATE POLICY "Members can delete list items"
  ON grocery_items FOR DELETE
  USING (is_grocery_list_member(list_id));

-- grocery_sessions: user-based access (sessions are per-user, not per-list)
CREATE POLICY "Users can view their own sessions"
  ON grocery_sessions FOR SELECT
  USING (auth.uid() = started_by);

CREATE POLICY "Users can create their own sessions"
  ON grocery_sessions FOR INSERT
  WITH CHECK (auth.uid() = started_by);

CREATE POLICY "Users can update their own sessions"
  ON grocery_sessions FOR UPDATE
  USING (auth.uid() = started_by);

CREATE POLICY "Users can delete their own sessions"
  ON grocery_sessions FOR DELETE
  USING (auth.uid() = started_by);

-- grocery_session_items: access through session ownership
CREATE POLICY "Users can view their session items"
  ON grocery_session_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM grocery_sessions
      WHERE id = grocery_session_items.session_id
        AND started_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert their session items"
  ON grocery_session_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM grocery_sessions
      WHERE id = grocery_session_items.session_id
        AND started_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their session items"
  ON grocery_session_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM grocery_sessions
      WHERE id = grocery_session_items.session_id
        AND started_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete their session items"
  ON grocery_session_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM grocery_sessions
      WHERE id = grocery_session_items.session_id
        AND started_by = auth.uid()
    )
  );

-- grocery_invitations: owner manages, invitee can view
CREATE POLICY "Members and invitees can view invitations"
  ON grocery_invitations FOR SELECT
  USING (
    is_grocery_list_member(list_id)
    OR invited_email = auth.jwt()->>'email'
  );

CREATE POLICY "Owners can create invitations"
  ON grocery_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM grocery_list_members
      WHERE list_id = grocery_invitations.list_id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

CREATE POLICY "Owners can manage invitations"
  ON grocery_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM grocery_list_members
      WHERE list_id = grocery_invitations.list_id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
    OR invited_email = auth.jwt()->>'email'
  );

CREATE POLICY "Owners can delete invitations"
  ON grocery_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM grocery_list_members
      WHERE list_id = grocery_invitations.list_id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- ============================================================
-- 6. TRIGGERS
-- ============================================================

-- Auto-update updated_at (reuse existing function if available)
CREATE TRIGGER update_product_catalog_updated_at
  BEFORE UPDATE ON product_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grocery_lists_updated_at
  BEFORE UPDATE ON grocery_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grocery_items_updated_at
  BEFORE UPDATE ON grocery_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create owner membership row when a grocery list is created
CREATE OR REPLACE FUNCTION auto_create_grocery_list_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO grocery_list_members (list_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_grocery_list_owner
  AFTER INSERT ON grocery_lists
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_grocery_list_owner();

-- Update product catalog when item is checked off
CREATE OR REPLACE FUNCTION update_product_on_check()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_checked = TRUE AND (OLD.is_checked = FALSE OR OLD.is_checked IS NULL) AND NEW.product_id IS NOT NULL THEN
    UPDATE product_catalog
    SET last_purchased_at = NOW(),
        purchase_count = purchase_count + 1
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_product_on_item_check
  AFTER UPDATE OF is_checked ON grocery_items
  FOR EACH ROW
  EXECUTE FUNCTION update_product_on_check();

-- ============================================================
-- 7. USAGE LIMITS
-- ============================================================

ALTER TABLE usage_limits
  ADD COLUMN IF NOT EXISTS grocery_lists_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grocery_items_count INTEGER DEFAULT 0;
