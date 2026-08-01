-- Create password_categories table
CREATE TABLE IF NOT EXISTS password_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create passwords table
CREATE TABLE IF NOT EXISTS passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  username TEXT,
  encrypted_password TEXT NOT NULL,
  url TEXT,
  notes TEXT,
  category_id UUID REFERENCES password_categories(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_password_categories_user_id ON password_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_passwords_user_id ON passwords(user_id);
CREATE INDEX IF NOT EXISTS idx_passwords_category_id ON passwords(category_id);
CREATE INDEX IF NOT EXISTS idx_passwords_is_favorite ON passwords(is_favorite);
CREATE INDEX IF NOT EXISTS idx_passwords_created_at ON passwords(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_passwords_updated_at ON passwords(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE password_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE passwords ENABLE ROW LEVEL SECURITY;

-- RLS Policies for password_categories table
CREATE POLICY "Users can view their own categories"
  ON password_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON password_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON password_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON password_categories FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for passwords table
CREATE POLICY "Users can view their own passwords"
  ON passwords FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own passwords"
  ON passwords FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own passwords"
  ON passwords FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own passwords"
  ON passwords FOR DELETE
  USING (auth.uid() = user_id);

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_password_categories_updated_at
  BEFORE UPDATE ON password_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_passwords_updated_at
  BEFORE UPDATE ON passwords
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
