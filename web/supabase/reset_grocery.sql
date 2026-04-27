-- Reset all grocery tables so the migration can run cleanly.
-- WARNING: This deletes all grocery data.

-- Drop triggers first
DROP TRIGGER IF EXISTS update_product_on_item_check ON grocery_items;
DROP TRIGGER IF EXISTS update_grocery_items_updated_at ON grocery_items;
DROP TRIGGER IF EXISTS update_grocery_lists_updated_at ON grocery_lists;
DROP TRIGGER IF EXISTS update_product_catalog_updated_at ON product_catalog;
DROP TRIGGER IF EXISTS create_grocery_list_owner ON grocery_lists;
DROP TRIGGER IF EXISTS sync_item_on_session_purchase ON grocery_session_items;
DROP TRIGGER IF EXISTS create_session_starter_member ON grocery_sessions;

-- Drop functions
DROP FUNCTION IF EXISTS update_product_on_check();
DROP FUNCTION IF EXISTS auto_create_grocery_list_owner();
DROP FUNCTION IF EXISTS sync_grocery_item_on_session_purchase();
DROP FUNCTION IF EXISTS auto_create_session_starter_member();
DROP FUNCTION IF EXISTS is_grocery_list_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_grocery_session_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_id_by_email(text);

-- Drop tables (order matters due to FK constraints)
DROP TABLE IF EXISTS grocery_session_members CASCADE;
DROP TABLE IF EXISTS grocery_session_items CASCADE;
DROP TABLE IF EXISTS grocery_sessions CASCADE;
DROP TABLE IF EXISTS grocery_invitations CASCADE;
DROP TABLE IF EXISTS grocery_items CASCADE;
DROP TABLE IF EXISTS grocery_list_members CASCADE;
DROP TABLE IF EXISTS grocery_lists CASCADE;
DROP TABLE IF EXISTS product_catalog CASCADE;

-- Remove usage_limits columns
ALTER TABLE usage_limits
  DROP COLUMN IF EXISTS grocery_lists_count,
  DROP COLUMN IF EXISTS grocery_items_count;
