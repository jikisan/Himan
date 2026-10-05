-- Run after the government migration. Fixtures and assertions are rolled back.
BEGIN;
-- SQL fixtures emulate Storage API deletion; this setting is transaction-local.
SET LOCAL storage.allow_delete_query = 'true';
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000f001', 'government-owner@example.com'),
  ('00000000-0000-0000-0000-00000000f002', 'government-other@example.com');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000f001', true);

INSERT INTO public.government_records (id, user_id, agency, label, registered_name, number) VALUES
  ('00000000-0000-0000-0000-00000000f101', auth.uid(), 'SSS', 'Current', 'Test Person', '001-234'),
  ('00000000-0000-0000-0000-00000000f102', auth.uid(), 'SSS', 'Previous', 'Test Person', '');
INSERT INTO public.government_documents (id, record_id, user_id, name, mime_type, size)
VALUES ('00000000-0000-0000-0000-00000000f201', '00000000-0000-0000-0000-00000000f101', auth.uid(), 'id.pdf', 'application/pdf', 100);
INSERT INTO storage.objects (bucket_id, name)
SELECT 'government-documents', storage_path FROM public.government_documents WHERE id = '00000000-0000-0000-0000-00000000f201';
UPDATE public.government_documents SET ready = true WHERE id = '00000000-0000-0000-0000-00000000f201';

DO $$ BEGIN
  IF (SELECT count(*) FROM public.government_records) <> 2 THEN RAISE EXCEPTION 'Duplicate types or document-only records failed'; END IF;
  BEGIN
    DELETE FROM public.government_records WHERE id = '00000000-0000-0000-0000-00000000f101';
    RAISE EXCEPTION 'Record deletion orphaned a file';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Remove the stored government file before deleting its metadata' THEN RAISE; END IF;
  END;
  BEGIN
    UPDATE public.government_documents SET record_id = '00000000-0000-0000-0000-00000000f102';
    RAISE EXCEPTION 'Document reassignment was allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Government document metadata cannot be reassigned' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO public.government_documents (record_id, user_id, name, mime_type, size)
    VALUES ('00000000-0000-0000-0000-00000000f101', auth.uid(), 'bad.html', 'text/html', 100);
    RAISE EXCEPTION 'Unsafe document type was allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.government_documents (record_id, user_id, name, mime_type, size)
    VALUES ('00000000-0000-0000-0000-00000000f101', auth.uid(), 'huge.pdf', 'application/pdf', 10485761);
    RAISE EXCEPTION 'Oversized document was allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

UPDATE public.government_records
SET label = 'Updated', issue_date = '2020-02-29', expiry_date = '2030-02-28'
WHERE id = '00000000-0000-0000-0000-00000000f102';
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.government_records
    WHERE id = '00000000-0000-0000-0000-00000000f102'
      AND label = 'Updated' AND issue_date = '2020-02-29' AND expiry_date = '2030-02-28'
  ) THEN RAISE EXCEPTION 'Owner record and date update failed'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000f002', true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.government_records) THEN RAISE EXCEPTION 'Records leaked across users'; END IF;
  IF EXISTS (SELECT 1 FROM public.government_documents) THEN RAISE EXCEPTION 'Document metadata leaked across users'; END IF;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'government-documents') THEN RAISE EXCEPTION 'Files leaked across users'; END IF;
  BEGIN
    INSERT INTO public.government_documents (record_id, user_id, name, mime_type, size)
    VALUES ('00000000-0000-0000-0000-00000000f101', auth.uid(), 'id.pdf', 'application/pdf', 100);
    RAISE EXCEPTION 'Cross-user attachment was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('government-documents',
      '00000000-0000-0000-0000-00000000f001/00000000-0000-0000-0000-00000000f101/new-file');
    RAISE EXCEPTION 'Cross-user storage upload was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  DELETE FROM public.government_records WHERE id = '00000000-0000-0000-0000-00000000f101';
  UPDATE public.government_records SET label = 'Changed' WHERE id = '00000000-0000-0000-0000-00000000f101';
END $$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000f001', true);
DO $$ BEGIN
  IF (SELECT label FROM public.government_records WHERE id = '00000000-0000-0000-0000-00000000f101') <> 'Current' THEN
    RAISE EXCEPTION 'Another user modified a record'; END IF;
END $$;
UPDATE public.government_records SET deleting = true WHERE id = '00000000-0000-0000-0000-00000000f101';
DO $$ BEGIN
  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
    SELECT 'government-documents', storage_path FROM public.government_documents;
    RAISE EXCEPTION 'Storage upload during deletion was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.government_documents (record_id, user_id, name, mime_type, size)
    VALUES ('00000000-0000-0000-0000-00000000f101', auth.uid(), 'new.pdf', 'application/pdf', 100);
    RAISE EXCEPTION 'Upload reservation during deletion was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
DELETE FROM storage.objects WHERE bucket_id = 'government-documents';
DELETE FROM public.government_records;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.government_documents) THEN RAISE EXCEPTION 'Document cleanup failed'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF (SELECT public FROM storage.buckets WHERE id = 'government-documents') THEN RAISE EXCEPTION 'Government bucket is public'; END IF;
END $$;
ROLLBACK;
