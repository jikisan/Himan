-- Run after the receipts migration. Fixtures and assertions are rolled back.
BEGIN;
-- SQL fixtures emulate Storage API deletion; this setting is transaction-local.
SET LOCAL storage.allow_delete_query = 'true';
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000e001', 'receipts-owner@example.com'),
  ('00000000-0000-0000-0000-00000000e002', 'receipts-other@example.com');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e001', true);

INSERT INTO public.receipts (id, user_id, merchant, amount, purchased_on, tags, warranty_ends_on)
VALUES ('00000000-0000-0000-0000-00000000e101', auth.uid(), 'Appliance Hub', 1299.50, '2026-10-01',
  ARRAY['appliance', 'warranty'], '2027-10-01');
INSERT INTO storage.objects (bucket_id, name)
VALUES ('receipts', auth.uid()::text || '/00000000-0000-0000-0000-00000000e101.jpg');

DO $$ BEGIN
  IF (SELECT photo_path FROM public.receipts) <> '00000000-0000-0000-0000-00000000e001/00000000-0000-0000-0000-00000000e101.jpg'
    THEN RAISE EXCEPTION 'Photo path not derived from owner and id'; END IF;
  BEGIN
    INSERT INTO public.receipts (user_id, merchant, amount, purchased_on) VALUES (auth.uid(), 'X', -1, '2026-10-01');
    RAISE EXCEPTION 'Negative amount allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.receipts (user_id, merchant, amount, purchased_on, warranty_ends_on)
    VALUES (auth.uid(), 'X', 1, '2026-10-01', '2026-09-01');
    RAISE EXCEPTION 'Warranty before purchase allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.receipts (user_id, merchant, amount, purchased_on, tags) VALUES (auth.uid(), 'X', 1, '2026-10-01', ARRAY['  ']);
    RAISE EXCEPTION 'Blank tag allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.receipts (user_id, merchant, amount, purchased_on, tags)
    VALUES (auth.uid(), 'X', 1, '2026-10-01', ARRAY(SELECT 't' || i FROM generate_series(1, 11) i));
    RAISE EXCEPTION 'Eleven tags allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('receipts', '00000000-0000-0000-0000-00000000e002/x.jpg');
    RAISE EXCEPTION 'Upload into another user folder allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e002', true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.receipts) THEN RAISE EXCEPTION 'Receipts leaked across users'; END IF;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'receipts') THEN RAISE EXCEPTION 'Photos leaked across users'; END IF;
  BEGIN
    INSERT INTO public.receipts (user_id, merchant, amount, purchased_on)
    VALUES ('00000000-0000-0000-0000-00000000e001', 'Forged', 1, '2026-10-01');
    RAISE EXCEPTION 'Insert as another user allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.receipts SET merchant = 'Hacked';
  DELETE FROM public.receipts;
  DELETE FROM storage.objects WHERE bucket_id = 'receipts';
END $$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e001', true);
DO $$ BEGIN
  IF (SELECT merchant FROM public.receipts) <> 'Appliance Hub' THEN RAISE EXCEPTION 'Another user modified or deleted a receipt'; END IF;
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'receipts') <> 1 THEN RAISE EXCEPTION 'Another user deleted a photo'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF (SELECT public FROM storage.buckets WHERE id = 'receipts') THEN RAISE EXCEPTION 'Receipts bucket is public'; END IF;
END $$;
ROLLBACK;
