BEGIN;

-- Fixture: one user with a profile, two projects, one item whose layout
-- selects only the second project.
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-0000000000a1', 'pf@example.com');
INSERT INTO public.profiles (user_id, full_name, email, phone)
  VALUES ('00000000-0000-0000-0000-0000000000a1', 'Test Person', 'pf@example.com', '+63 900 000 0000');
INSERT INTO public.profile_projects (id, user_id, name, position) VALUES
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'Hidden', 0),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 'Shown', 1);
INSERT INTO public.career_items (user_id, name, share_token, cv_layout, portfolio_enabled) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Role', 'tok_on',
   '[{"type":"project","id":"00000000-0000-0000-0000-0000000000b2"}]', true),
  ('00000000-0000-0000-0000-0000000000a1', 'Off', 'tok_off', NULL, false);

SET LOCAL ROLE anon;

DO $$
DECLARE r jsonb := public.get_career_portfolio('tok_on');
BEGIN
  IF r IS NULL THEN RAISE EXCEPTION 'Enabled portfolio returned null'; END IF;
  IF public.get_career_portfolio('tok_off') IS NOT NULL THEN RAISE EXCEPTION 'Disabled portfolio was served'; END IF;
  IF public.get_career_portfolio('nope') IS NOT NULL THEN RAISE EXCEPTION 'Unknown token was served'; END IF;
  IF r::text LIKE '%900 000%' THEN RAISE EXCEPTION 'Phone leaked'; END IF;
  IF r->'profile'->>'email' IS NOT NULL THEN RAISE EXCEPTION 'Email leaked while show_email is off'; END IF;
  IF jsonb_array_length(r->'projects') <> 1 OR r->'projects'->0->>'name' <> 'Shown' THEN
    RAISE EXCEPTION 'Layout selection not applied: %', r->'projects';
  END IF;
END;
$$;

ROLLBACK;
