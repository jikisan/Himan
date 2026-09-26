BEGIN;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.before_user_created_allowlist(jsonb)', 'EXECUTE')
     OR has_table_privilege('authenticated', 'public.signup_allowlist', 'SELECT') THEN
    RAISE EXCEPTION 'Signup allowlist is exposed to clients';
  END IF;
END;
$$;

INSERT INTO public.signup_allowlist (email) VALUES ('approved@example.com');
SET LOCAL ROLE supabase_auth_admin;

DO $$
BEGIN
  IF public.before_user_created_allowlist('{"user":{"email":"APPROVED@example.com"}}'::jsonb) <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Approved email was rejected';
  END IF;

  IF public.before_user_created_allowlist('{"user":{"email":"other@example.com"}}'::jsonb)->'error'->>'http_code' <> '403' THEN
    RAISE EXCEPTION 'Unlisted email was allowed';
  END IF;
END;
$$;

ROLLBACK;
