-- Create invoice_folders table
CREATE TABLE IF NOT EXISTS invoice_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) <= 100),
  invoice_number_prefix TEXT,
  invoice_number_format TEXT NOT NULL DEFAULT 'INV-{YYYY}-{NNN}',
  next_sequence_number INTEGER NOT NULL DEFAULT 1,
  invoices_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES invoice_folders(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  po_number TEXT,
  company_details TEXT,
  bill_to TEXT,
  invoice_date DATE,
  due_date DATE,
  currency TEXT NOT NULL DEFAULT 'PHP',
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  tax_rate NUMERIC,
  discount NUMERIC,
  shipping_fee NUMERIC,
  subtotal NUMERIC,
  tax_amount NUMERIC,
  total NUMERIC,
  notes TEXT,
  bank_details TEXT,
  storage_path TEXT,
  file_size BIGINT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoice_saved_options table
CREATE TABLE IF NOT EXISTS invoice_saved_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_type TEXT NOT NULL CHECK (option_type IN ('company_details', 'bill_to', 'notes', 'bank_details')),
  label TEXT NOT NULL CHECK (char_length(label) <= 100),
  value TEXT NOT NULL CHECK (char_length(value) <= 2000),
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoice_folders_user_id ON invoice_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_folder_id ON invoices(folder_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_is_favorite ON invoices(is_favorite);
CREATE INDEX IF NOT EXISTS idx_invoice_saved_options_user_id ON invoice_saved_options(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_saved_options_type ON invoice_saved_options(user_id, option_type);

-- Enable Row Level Security
ALTER TABLE invoice_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_saved_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoice_folders
CREATE POLICY "Users can view their own invoice folders"
  ON invoice_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoice folders"
  ON invoice_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoice folders"
  ON invoice_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoice folders"
  ON invoice_folders FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for invoices
CREATE POLICY "Users can view their own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
  ON invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
  ON invoices FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for invoice_saved_options
CREATE POLICY "Users can view their own invoice saved options"
  ON invoice_saved_options FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoice saved options"
  ON invoice_saved_options FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoice saved options"
  ON invoice_saved_options FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoice saved options"
  ON invoice_saved_options FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at triggers
CREATE TRIGGER update_invoice_folders_updated_at
  BEFORE UPDATE ON invoice_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_saved_options_updated_at
  BEFORE UPDATE ON invoice_saved_options
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to update invoice folder counts
CREATE OR REPLACE FUNCTION update_invoice_folder_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.folder_id IS NOT NULL THEN
      UPDATE invoice_folders
      SET invoices_count = invoices_count + 1
      WHERE id = NEW.folder_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.folder_id IS NOT NULL THEN
      UPDATE invoice_folders
      SET invoices_count = GREATEST(invoices_count - 1, 0)
      WHERE id = OLD.folder_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.folder_id IS DISTINCT FROM NEW.folder_id THEN
      IF OLD.folder_id IS NOT NULL THEN
        UPDATE invoice_folders
        SET invoices_count = GREATEST(invoices_count - 1, 0)
        WHERE id = OLD.folder_id;
      END IF;
      IF NEW.folder_id IS NOT NULL THEN
        UPDATE invoice_folders
        SET invoices_count = invoices_count + 1
        WHERE id = NEW.folder_id;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for invoice folder counts
CREATE TRIGGER update_invoice_folder_count_on_insert
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_folder_count();

CREATE TRIGGER update_invoice_folder_count_on_delete
  AFTER DELETE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_folder_count();

CREATE TRIGGER update_invoice_folder_count_on_update
  AFTER UPDATE OF folder_id ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_folder_count();

-- Create invoices storage bucket (private, PDF only, 10MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for invoices bucket
CREATE POLICY "Users can view their own invoices storage"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'invoices' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own invoices storage"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invoices' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own invoices storage"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'invoices' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'invoices' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own invoices storage"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'invoices' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
