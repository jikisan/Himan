CREATE TABLE public.government_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency text NOT NULL CHECK (char_length(btrim(agency)) BETWEEN 1 AND 80),
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 120),
  registered_name text NOT NULL CHECK (char_length(btrim(registered_name)) BETWEEN 1 AND 160),
  number text NOT NULL DEFAULT '' CHECK (char_length(number) <= 100),
  issue_date date,
  expiry_date date,
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 10000),
  deleting boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id),
  CHECK (issue_date IS NULL OR expiry_date IS NULL OR expiry_date >= issue_date)
);
CREATE INDEX government_records_user_id_idx ON public.government_records(user_id);

CREATE TABLE public.government_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 255),
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png')),
  size integer NOT NULL CHECK (size BETWEEN 1 AND 10485760),
  storage_path text GENERATED ALWAYS AS (user_id::text || '/' || record_id::text || '/' || id::text) STORED UNIQUE,
  ready boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (record_id, user_id) REFERENCES public.government_records(id, user_id) ON DELETE CASCADE
);
CREATE INDEX government_documents_record_id_user_id_idx ON public.government_documents(record_id, user_id);
CREATE INDEX government_documents_user_id_idx ON public.government_documents(user_id);

ALTER TABLE public.government_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_documents ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.government_records, public.government_documents TO authenticated;

CREATE POLICY "Owners manage government records" ON public.government_records
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- A row lock makes beginning deletion wait for in-flight attachment reservations
-- and Storage inserts. Once marked deleting, the record cannot accept more files.
CREATE FUNCTION public.government_record_writable(p_record_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE writable boolean;
BEGIN
  SELECT NOT deleting INTO writable FROM public.government_records
  WHERE id = p_record_id AND user_id = (SELECT auth.uid()) FOR SHARE;
  RETURN coalesce(writable, false);
END;
$$;
REVOKE ALL ON FUNCTION public.government_record_writable(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.government_record_writable(uuid) TO authenticated;

CREATE POLICY "Owners read government documents" ON public.government_documents
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Owners reserve government documents" ON public.government_documents
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT auth.uid()) = user_id AND public.government_record_writable(record_id)
  );
CREATE POLICY "Owners finish government uploads" ON public.government_documents
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Owners delete government documents" ON public.government_documents
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE FUNCTION public.government_record_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER government_record_updated_at BEFORE UPDATE ON public.government_records
  FOR EACH ROW EXECUTE FUNCTION public.government_record_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('government-documents', 'government-documents', false, 10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']);

CREATE POLICY "Owners read government files" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'government-documents' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
CREATE POLICY "Owners upload reserved government files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'government-documents' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND EXISTS (
      SELECT 1 FROM public.government_documents d
      WHERE d.storage_path = storage.objects.name AND d.user_id = (SELECT auth.uid())
        AND public.government_record_writable(d.record_id)
      -- Keep the reservation until this upload commits, including during a
      -- concurrent removal of an individual incomplete attachment.
      FOR SHARE
    )
  );
CREATE POLICY "Owners delete government files" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'government-documents' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- Prevent direct API deletes or cascading record deletes from orphaning files.
-- Metadata also cannot be reassigned or repointed at a different file.
CREATE FUNCTION public.government_document_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.id, NEW.record_id, NEW.user_id, NEW.name, NEW.mime_type, NEW.size)
      IS DISTINCT FROM (OLD.id, OLD.record_id, OLD.user_id, OLD.name, OLD.mime_type, OLD.size) THEN
      RAISE EXCEPTION 'Government document metadata cannot be reassigned';
    END IF;
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'government-documents' AND name = OLD.storage_path) THEN
    RAISE EXCEPTION 'Remove the stored government file before deleting its metadata';
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER government_document_guard BEFORE UPDATE OR DELETE ON public.government_documents
  FOR EACH ROW EXECUTE FUNCTION public.government_document_guard();
