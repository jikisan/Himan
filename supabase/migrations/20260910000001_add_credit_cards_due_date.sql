-- Add optional recurring monthly due day to credit_cards (e.g. bill due on the 29th of every month)
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS due_day SMALLINT CHECK (due_day IS NULL OR (due_day >= 1 AND due_day <= 31));
