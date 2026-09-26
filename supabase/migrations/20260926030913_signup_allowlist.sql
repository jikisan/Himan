-- Manage approved emails in the SQL Editor:
-- INSERT INTO public.signup_allowlist (email) VALUES ('person@example.com');
-- DELETE FROM public.signup_allowlist WHERE email = 'person@example.com';
-- Existing users keep access; removing an email only blocks new account creation.
CREATE TABLE public.signup_allowlist (
  email text PRIMARY KEY CHECK (email = lower(btrim(email)))
);

ALTER TABLE public.signup_allowlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.signup_allowlist FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.signup_allowlist TO supabase_auth_admin;

CREATE POLICY "Auth can check the signup allowlist"
  ON public.signup_allowlist FOR SELECT TO supabase_auth_admin
  USING (true);

CREATE FUNCTION public.before_user_created_allowlist(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.signup_allowlist
    WHERE email = lower(btrim(event->'user'->>'email'))
  ) THEN
    RETURN '{}'::jsonb;
  END IF;

  RETURN jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Registration is by invitation only.'
  ));
END;
$$;

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
REVOKE ALL ON FUNCTION public.before_user_created_allowlist(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.before_user_created_allowlist(jsonb) TO supabase_auth_admin;
