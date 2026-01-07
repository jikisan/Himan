-- Create enum type for user roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
  END IF;
END $$;

-- Add role column to user_subscriptions table
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'user';

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_role ON user_subscriptions(role);

-- Update the initialize_user_subscription function to include role
CREATE OR REPLACE FUNCTION initialize_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default subscription (free tier, user role)
  INSERT INTO user_subscriptions (user_id, tier, role)
  VALUES (NEW.id, 'free', 'user')
  ON CONFLICT (user_id) DO NOTHING;

  -- Create default usage limits (all zeros)
  INSERT INTO usage_limits (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
