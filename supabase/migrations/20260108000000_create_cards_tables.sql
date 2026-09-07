-- Create card_categories table
CREATE TABLE IF NOT EXISTS card_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create credit_cards table
CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_name TEXT NOT NULL,
  encrypted_card_number TEXT NOT NULL,
  encrypted_cvv TEXT NOT NULL,
  expiry_month INTEGER NOT NULL CHECK (expiry_month >= 1 AND expiry_month <= 12),
  expiry_year INTEGER NOT NULL,
  bank_name TEXT,
  card_issuer TEXT,
  card_type TEXT,
  category_id UUID REFERENCES card_categories(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_card_categories_user_id ON card_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_category_id ON credit_cards(category_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_is_favorite ON credit_cards(is_favorite);
CREATE INDEX IF NOT EXISTS idx_credit_cards_created_at ON credit_cards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_cards_updated_at ON credit_cards(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_cards_expiry ON credit_cards(expiry_year, expiry_month);

-- Enable Row Level Security
ALTER TABLE card_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for card_categories table
CREATE POLICY "Users can view their own card categories"
  ON card_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own card categories"
  ON card_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own card categories"
  ON card_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own card categories"
  ON card_categories FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for credit_cards table
CREATE POLICY "Users can view their own credit cards"
  ON credit_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit cards"
  ON credit_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit cards"
  ON credit_cards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit cards"
  ON credit_cards FOR DELETE
  USING (auth.uid() = user_id);

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_card_categories_updated_at
  BEFORE UPDATE ON card_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_cards_updated_at
  BEFORE UPDATE ON credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();