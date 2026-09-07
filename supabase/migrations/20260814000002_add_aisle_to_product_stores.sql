-- product_stores.aisle was introduced inside a CREATE TABLE IF NOT EXISTS in
-- 20260731000000_grocery_redesign_phase_a.sql. If the table already existed,
-- that CREATE was a no-op and the column was never added, so per-store aisle
-- edits silently no-op (PostgREST drops the unknown key without erroring).
-- Ensure the column exists and refresh the PostgREST schema cache.

ALTER TABLE product_stores ADD COLUMN IF NOT EXISTS aisle TEXT;

NOTIFY pgrst, 'reload schema';
