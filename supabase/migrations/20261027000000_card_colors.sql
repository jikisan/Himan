-- Optional user-chosen face color for a credit card, stored as #RRGGBB. NULL keeps the brand-based default look.
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS color TEXT
  CONSTRAINT credit_cards_color_hex_check CHECK (color IS NULL OR color ~ '^#[0-9a-fA-F]{6}$');
