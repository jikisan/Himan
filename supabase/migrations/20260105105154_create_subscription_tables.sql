-- Create enum type for subscription tiers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
    CREATE TYPE subscription_tier AS ENUM ('free', 'beta', 'pro', 'enterprise');
  END IF;
END $$;

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tier subscription_tier NOT NULL DEFAULT 'free',
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage_limits table
CREATE TABLE IF NOT EXISTS usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  notes_count INTEGER NOT NULL DEFAULT 0,
  folders_count INTEGER NOT NULL DEFAULT 0,
  passwords_count INTEGER NOT NULL DEFAULT 0,
  categories_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier ON user_subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_usage_limits_user_id ON usage_limits(user_id);

-- Enable Row Level Security
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions table
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for usage_limits table
CREATE POLICY "Users can view their own usage limits"
  ON usage_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage limits"
  ON usage_limits FOR UPDATE
  USING (auth.uid() = user_id);

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_limits_updated_at
  BEFORE UPDATE ON usage_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to initialize subscription and usage limits for new users
CREATE OR REPLACE FUNCTION initialize_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default subscription (free tier)
  INSERT INTO user_subscriptions (user_id, tier)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;

  -- Create default usage limits (all zeros)
  INSERT INTO usage_limits (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-initialize subscription for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_subscription();

-- Function to increment usage counts
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
  END CASE;

  -- Increment the appropriate counter
  EXECUTE format(
    'UPDATE usage_limits SET %I = %I + 1 WHERE user_id = $1',
    count_column, count_column
  ) USING NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement usage counts
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
  END CASE;

  -- Decrement the appropriate counter (ensure it doesn't go below 0)
  EXECUTE format(
    'UPDATE usage_limits SET %I = GREATEST(%I - 1, 0) WHERE user_id = $1',
    count_column, count_column
  ) USING OLD.user_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for notes table
CREATE TRIGGER increment_notes_count
  AFTER INSERT ON notes
  FOR EACH ROW
  EXECUTE FUNCTION increment_usage_count();

CREATE TRIGGER decrement_notes_count
  AFTER DELETE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_usage_count();

-- Create triggers for folders table
CREATE TRIGGER increment_folders_count
  AFTER INSERT ON folders
  FOR EACH ROW
  EXECUTE FUNCTION increment_usage_count();

CREATE TRIGGER decrement_folders_count
  AFTER DELETE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION decrement_usage_count();

-- Create triggers for passwords table
CREATE TRIGGER increment_passwords_count
  AFTER INSERT ON passwords
  FOR EACH ROW
  EXECUTE FUNCTION increment_usage_count();

CREATE TRIGGER decrement_passwords_count
  AFTER DELETE ON passwords
  FOR EACH ROW
  EXECUTE FUNCTION decrement_usage_count();

-- Create triggers for password_categories table
CREATE TRIGGER increment_categories_count
  AFTER INSERT ON password_categories
  FOR EACH ROW
  EXECUTE FUNCTION increment_usage_count();

CREATE TRIGGER decrement_categories_count
  AFTER DELETE ON password_categories
  FOR EACH ROW
  EXECUTE FUNCTION decrement_usage_count();

-- Initialize subscriptions and usage for existing users
INSERT INTO user_subscriptions (user_id, tier)
SELECT id, 'free' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO usage_limits (user_id, notes_count, folders_count, passwords_count, categories_count)
SELECT
  u.id,
  COALESCE((SELECT COUNT(*) FROM notes WHERE user_id = u.id), 0),
  COALESCE((SELECT COUNT(*) FROM folders WHERE user_id = u.id), 0),
  COALESCE((SELECT COUNT(*) FROM passwords WHERE user_id = u.id), 0),
  COALESCE((SELECT COUNT(*) FROM password_categories WHERE user_id = u.id), 0)
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;
