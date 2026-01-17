-- Remove credit_limit and current_balance columns from credit_cards table
-- This migration is safe to run even if columns don't exist (IF EXISTS)

ALTER TABLE credit_cards
DROP COLUMN IF EXISTS credit_limit,
DROP COLUMN IF EXISTS current_balance;