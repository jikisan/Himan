-- ============================================================
-- Grocery Redesign — Phase A: Data Model
-- Digital shopping notebook: stores, per-store product info,
-- list templates, errand sessions with purchase details,
-- user preferences. Prepares columns for offline LWW sync.
-- ============================================================

-- ============================================================
-- 1. STORES
-- ============================================================

CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_stores_user_id ON stores(user_id);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stores"
  ON stores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own stores"
  ON stores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stores"
  ON stores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own stores"
  ON stores FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Backfill stores from distinct session store names
INSERT INTO stores (user_id, name)
SELECT DISTINCT started_by, store_name
FROM grocery_sessions
WHERE store_name IS NOT NULL AND btrim(store_name) <> ''
ON CONFLICT (user_id, name) DO NOTHING;

-- ============================================================
-- 2. PRODUCT_STORES (per-store product info)
-- ============================================================

CREATE TABLE IF NOT EXISTS product_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES product_catalog(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  price NUMERIC,
  aisle TEXT,
  availability BOOLEAN DEFAULT TRUE,
  sku TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (product_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_product_stores_product ON product_stores(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stores_store ON product_stores(store_id);

ALTER TABLE product_stores ENABLE ROW LEVEL SECURITY;

-- Access gated through owning product_catalog row (user-isolated)
CREATE POLICY "Users can view their product stores"
  ON product_stores FOR SELECT USING (
    EXISTS (SELECT 1 FROM product_catalog p
            WHERE p.id = product_stores.product_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Users can insert their product stores"
  ON product_stores FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM product_catalog p
            WHERE p.id = product_stores.product_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Users can update their product stores"
  ON product_stores FOR UPDATE USING (
    EXISTS (SELECT 1 FROM product_catalog p
            WHERE p.id = product_stores.product_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Users can delete their product stores"
  ON product_stores FOR DELETE USING (
    EXISTS (SELECT 1 FROM product_catalog p
            WHERE p.id = product_stores.product_id AND p.user_id = auth.uid())
  );

CREATE TRIGGER update_product_stores_updated_at
  BEFORE UPDATE ON product_stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. PRODUCT_CATALOG extensions
-- ============================================================

ALTER TABLE product_catalog
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS package_size TEXT,
  ADD COLUMN IF NOT EXISTS image_path TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_product_catalog_barcode ON product_catalog(user_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_catalog_brand ON product_catalog(user_id, brand);
CREATE INDEX IF NOT EXISTS idx_product_catalog_favorite ON product_catalog(user_id) WHERE is_favorite;

-- ============================================================
-- 4. GROCERY_SESSIONS extensions (errands)
-- ============================================================

ALTER TABLE grocery_sessions
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TRIGGER update_grocery_sessions_updated_at
  BEFORE UPDATE ON grocery_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Link existing sessions to backfilled stores by name
UPDATE grocery_sessions s
SET store_id = st.id
FROM stores st
WHERE s.store_id IS NULL
  AND s.store_name IS NOT NULL
  AND st.user_id = s.started_by
  AND st.name = s.store_name;

-- ============================================================
-- 5. GROCERY_SESSION_ITEMS extensions (purchase details)
-- ============================================================

ALTER TABLE grocery_session_items
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES product_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price_paid NUMERIC,
  ADD COLUMN IF NOT EXISTS quantity_purchased NUMERIC,
  ADD COLUMN IF NOT EXISTS aisle TEXT,
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_session_items_product ON grocery_session_items(product_id);

CREATE TRIGGER update_grocery_session_items_updated_at
  BEFORE UPDATE ON grocery_session_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. USER_PREFERENCES
-- ============================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT '₱',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. TRIGGER CHANGES
-- Lists become pure templates: session purchases no longer
-- write back to grocery_items. Drop the old sync trigger.
-- Purchase tracking (product_catalog.purchase_count /
-- last_purchased_at) now flows from session-item purchases.
-- ============================================================

DROP TRIGGER IF EXISTS sync_item_on_session_purchase ON grocery_session_items;
DROP FUNCTION IF EXISTS sync_grocery_item_on_session_purchase();

-- Update product catalog when a session item is purchased
CREATE OR REPLACE FUNCTION update_product_on_session_purchase()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_purchased = TRUE
     AND (OLD.is_purchased = FALSE OR OLD.is_purchased IS NULL)
     AND NEW.product_id IS NOT NULL THEN
    UPDATE product_catalog
    SET last_purchased_at = NOW(),
        purchase_count = purchase_count + 1
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_product_on_session_item_purchase
  AFTER UPDATE OF is_purchased ON grocery_session_items
  FOR EACH ROW EXECUTE FUNCTION update_product_on_session_purchase();

-- ============================================================
-- 8. REALTIME PUBLICATION additions
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'grocery_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE grocery_sessions;
  END IF;
END;
$$;
