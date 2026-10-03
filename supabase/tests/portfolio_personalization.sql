BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'portrait@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'other@example.com');
INSERT INTO public.profiles (user_id, full_name, bio, email, phone, links, portfolio_portrait_path) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Test Person', 'Default bio', 'portrait@example.com', 'PRIVATE_PHONE', '{"github":"https://github.com/test"}', '00000000-0000-0000-0000-0000000000a1/photo.png');
INSERT INTO public.profile_experiences (user_id, company, title, start_date) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Example', 'Developer', (current_date - interval '5 years')::date);
INSERT INTO public.career_cv_blocks (id, user_id, kind, title, body) VALUES
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'summary', 'Summary', '{{name}} | {{careerTitle}} | {{yearsOfWork}} | {{github}} | {{email}} | {{phone}} | {{unknown}}'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a2', 'summary', 'Other owner', 'PRIVATE_SUMMARY'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000a1', 'experience', 'Experience', 'Not a summary');
INSERT INTO public.career_items (user_id, name, share_token, cv_layout, portfolio_enabled, portfolio_show_email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Custom', 'pf_custom', '[{"type":"custom","id":"00000000-0000-0000-0000-0000000000c1"},{"type":"summary"}]', true, false),
  ('00000000-0000-0000-0000-0000000000a1', 'Builtin', 'pf_builtin', '[{"type":"summary"},{"type":"custom","id":"00000000-0000-0000-0000-0000000000c1"}]', true, false),
  ('00000000-0000-0000-0000-0000000000a1', 'Default', 'pf_default', NULL, true, false),
  ('00000000-0000-0000-0000-0000000000a1', 'Empty', 'pf_empty', '[]', true, false),
  ('00000000-0000-0000-0000-0000000000a1', 'Foreign', 'pf_foreign', '[{"type":"custom","id":"00000000-0000-0000-0000-0000000000c2"},{"type":"custom","id":"not-a-uuid"}]', true, false),
  ('00000000-0000-0000-0000-0000000000a1', 'Experience', 'pf_experience', '[{"type":"custom","id":"00000000-0000-0000-0000-0000000000c3"}]', true, false),
  ('00000000-0000-0000-0000-0000000000a1', 'Email', 'pf_email', '[{"type":"custom","id":"00000000-0000-0000-0000-0000000000c1"}]', true, true),
  ('00000000-0000-0000-0000-0000000000a1', 'Off', 'pf_disabled', NULL, false, false);

SET LOCAL ROLE anon;
DO $$
DECLARE r jsonb := public.get_career_portfolio('pf_custom');
BEGIN
  IF r->>'summary' IS DISTINCT FROM 'Test Person | Custom | 5 | https://github.com/test |  |  |' THEN
    RAISE EXCEPTION 'Custom summary order or tokens incorrect: %', r->>'summary';
  END IF;
  IF r->>'portraitPath' IS DISTINCT FROM '00000000-0000-0000-0000-0000000000a1/photo.png'
    OR public.get_career_portfolio('pf_builtin')->>'portraitPath' IS DISTINCT FROM '00000000-0000-0000-0000-0000000000a1/photo.png' THEN
    RAISE EXCEPTION 'Profile portrait not returned on every portfolio';
  END IF;
  IF r::text LIKE '%PRIVATE_PHONE%' OR r::text LIKE '%portrait@example.com%' THEN
    RAISE EXCEPTION 'Hidden contact information leaked';
  END IF;
  IF public.get_career_portfolio('pf_builtin')->>'summary' IS DISTINCT FROM 'Default bio'
    OR public.get_career_portfolio('pf_default')->>'summary' IS DISTINCT FROM 'Default bio' THEN
    RAISE EXCEPTION 'Built-in or default summary incorrect';
  END IF;
  IF public.get_career_portfolio('pf_empty')->>'summary' IS NOT NULL
    OR public.get_career_portfolio('pf_foreign')->>'summary' IS NOT NULL
    OR public.get_career_portfolio('pf_experience')->>'summary' IS NOT NULL THEN
    RAISE EXCEPTION 'Unselected, foreign or non-summary block published';
  END IF;
  IF public.get_career_portfolio('pf_email')->>'summary' NOT LIKE '%portrait@example.com%' THEN
    RAISE EXCEPTION 'Opted-in email token not resolved';
  END IF;
  IF public.get_career_portfolio('pf_disabled') IS NOT NULL THEN
    RAISE EXCEPTION 'Disabled portfolio returned';
  END IF;
END;
$$;
RESET ROLE;

DO $$
BEGIN
  BEGIN
    UPDATE public.profiles SET portfolio_portrait_path = '00000000-0000-0000-0000-0000000000a2/other.png' WHERE user_id = '00000000-0000-0000-0000-0000000000a1';
    RAISE EXCEPTION 'Foreign portrait path accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

INSERT INTO storage.objects (bucket_id, name) VALUES
  ('portfolio-media', '00000000-0000-0000-0000-0000000000a1/photo.png'),
  ('portfolio-media', '00000000-0000-0000-0000-0000000000a2/other.png');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
DO $$
DECLARE removed integer;
BEGIN
  DELETE FROM storage.objects WHERE bucket_id = 'portfolio-media';
  GET DIAGNOSTICS removed = ROW_COUNT;
  IF removed <> 1 THEN RAISE EXCEPTION 'Photo cleanup RLS incorrect: deleted % rows', removed; END IF;
END;
$$;
RESET ROLE;

ROLLBACK;
