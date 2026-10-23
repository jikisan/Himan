-- Receipts: one photo per receipt, owner-only. Tags live in a text[] column.
-- A future link to a Finances transaction would be a nullable
-- `transaction_id uuid REFERENCES finance_transactions` added by the Finances change.
-- Max 10 tags, each 1-30 characters with no surrounding spaces; a CHECK cannot hold a subquery.
CREATE FUNCTION public.receipt_tags_valid(p_tags text[])
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT cardinality(p_tags) <= 10 AND NOT EXISTS (
    SELECT 1 FROM unnest(p_tags) AS t
    WHERE t IS NULL OR char_length(t) NOT BETWEEN 1 AND 30 OR t <> btrim(t));
$$;

CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant text NOT NULL CHECK (char_length(btrim(merchant)) BETWEEN 1 AND 120),
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  purchased_on date NOT NULL,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 2000),
  tags text[] NOT NULL DEFAULT '{}' CHECK (public.receipt_tags_valid(tags)),
  warranty_ends_on date,
  expires_on date,
  -- The photo always lives at <user>/<receipt>.jpg in the receipts bucket.
  photo_path text GENERATED ALWAYS AS (user_id::text || '/' || id::text || '.jpg') STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (warranty_ends_on IS NULL OR warranty_ends_on >= purchased_on)
);
CREATE INDEX receipts_user_purchased_idx ON public.receipts (user_id, purchased_on DESC);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
CREATE POLICY "Owners manage receipts" ON public.receipts
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE FUNCTION public.receipts_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER receipts_updated_at BEFORE UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.receipts_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('receipts', 'receipts', false, 5242880, ARRAY['image/jpeg']);

CREATE POLICY "Owners read receipt photos" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'receipts' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "Owners upload receipt photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'receipts' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "Owners replace receipt photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text)
  WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "Owners delete receipt photos" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'receipts' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
