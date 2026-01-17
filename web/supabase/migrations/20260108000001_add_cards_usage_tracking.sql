-- Add cards-related columns to usage_limits table
ALTER TABLE usage_limits
ADD COLUMN IF NOT EXISTS cards_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS card_categories_count INTEGER NOT NULL DEFAULT 0;

-- Update increment_usage_count function to handle cards tables
CREATE OR REPLACE FUNCTION increment_usage_count()
RETURNS TRIGGER AS $$
DECLARE
  count_column TEXT;
BEGIN
  -- Determine which counter to increment based on table name
  CASE TG_TABLE_NAME
    WHEN 'notes' THEN count_column := 'notes_count';
    WHEN 'folders' THEN count_column := 'folders_count';
    WHEN 'passwords' THEN count_column := 'passwords_count';
    WHEN 'password_categories' THEN count_column := 'categories_count';
    WHEN 'credit_cards' THEN count_column := 'cards_count';
    WHEN 'card_categories' THEN count_column := 'card_categories_count';
    WHEN 'files' THEN count_column := 'files_count';
    WHEN 'storage_folders' THEN count_column := 'storage_folders_count';
  END CASE;

  -- Increment the appropriate counter
  EXECUTE format(
    'UPDATE usage_limits SET %I = %I + 1 WHERE user_id = $1',
    count_column, count_column
  ) USING NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update decrement_usage_count function to handle cards tables
CREATE OR REPLACE FUNCTION decrement_usage_count()
RETURNS TRIGGER AS $$
DECLARE
  count_column TEXT;
BEGIN
  -- Determine which counter to decrement based on table name
  CASE TG_TABLE_NAME
    WHEN 'notes' THEN count_column := 'notes_count';
    WHEN 'folders' THEN count_column := 'folders_count';
    WHEN 'passwords' THEN count_column := 'passwords_count';
    WHEN 'password_categories' THEN count_column := 'categories_count';
    WHEN 'credit_cards' THEN count_column := 'cards_count';
    WHEN 'card_categories' THEN count_column := 'card_categories_count';
    WHEN 'files' THEN count_column := 'files_count';
    WHEN 'storage_folders' THEN count_column := 'storage_folders_count';
  END CASE;

  -- Decrement the appropriate counter (ensure it doesn't go below 0)
  EXECUTE format(
    'UPDATE usage_limits SET %I = GREATEST(%I - 1, 0) WHERE user_id = $1',
    count_column, count_column
  ) USING OLD.user_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for credit_cards table
CREATE TRIGGER increment_cards_count
  AFTER INSERT ON credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION increment_usage_count();

CREATE TRIGGER decrement_cards_count
  AFTER DELETE ON credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION decrement_usage_count();

-- Create triggers for card_categories table
CREATE TRIGGER increment_card_categories_count
  AFTER INSERT ON card_categories
  FOR EACH ROW
  EXECUTE FUNCTION increment_usage_count();

CREATE TRIGGER decrement_card_categories_count
  AFTER DELETE ON card_categories
  FOR EACH ROW
  EXECUTE FUNCTION decrement_usage_count();

-- Initialize cards counts for existing users
UPDATE usage_limits ul
SET 
  cards_count = COALESCE((SELECT COUNT(*) FROM credit_cards WHERE user_id = ul.user_id), 0),
  card_categories_count = COALESCE((SELECT COUNT(*) FROM card_categories WHERE user_id = ul.user_id), 0);