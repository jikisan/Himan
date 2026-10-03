-- Readable portfolio URLs: /p/{handle}/{slug}. The /p/{share_token} URL
-- keeps working. A slug link resolves only while the portfolio is enabled;
-- rotating share_token does not change it, so turning the portfolio off is
-- how a slug link is revoked.

CREATE FUNCTION public.portfolio_slugify(p text) RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT trim(both '-' from left(regexp_replace(lower(coalesce(p, '')), '[^a-z0-9]+', '-', 'g'), 40))
$$;

ALTER TABLE public.profiles ADD COLUMN handle text UNIQUE
  CONSTRAINT profiles_handle_format CHECK (handle ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' AND char_length(handle) BETWEEN 3 AND 40);

ALTER TABLE public.career_items ADD COLUMN portfolio_slug text
  CONSTRAINT career_items_portfolio_slug_format CHECK (portfolio_slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' AND char_length(portfolio_slug) <= 40),
  ADD CONSTRAINT career_items_user_portfolio_slug_key UNIQUE (user_id, portfolio_slug);

-- A null handle is filled from the first two words of the name
-- ("June Kyle Santerna" -> "junekyle"), numbered on collision.
CREATE FUNCTION public.set_profile_handle() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_base text;
  v_n int := 1;
BEGIN
  IF NEW.handle IS NOT NULL THEN
    RETURN NEW;
  END IF;
  v_base := replace(portfolio_slugify(array_to_string((regexp_split_to_array(trim(coalesce(NEW.full_name, '')), '\s+'))[1:2], ' ')), '-', '');
  IF char_length(v_base) < 3 THEN
    v_base := 'user' || left(replace(NEW.user_id::text, '-', ''), 8);
  END IF;
  v_base := left(v_base, 36);
  NEW.handle := v_base;
  WHILE EXISTS (SELECT 1 FROM profiles WHERE handle = NEW.handle AND id <> NEW.id) LOOP
    v_n := v_n + 1;
    NEW.handle := v_base || v_n;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_handle BEFORE INSERT OR UPDATE OF handle ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_profile_handle();

-- A null slug is filled from the item name, numbered per user on collision.
-- Renaming the item keeps the slug, so shared links don't break.
CREATE FUNCTION public.set_career_portfolio_slug() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_base text;
  v_n int := 1;
BEGIN
  IF NEW.portfolio_slug IS NOT NULL THEN
    RETURN NEW;
  END IF;
  v_base := left(coalesce(nullif(portfolio_slugify(NEW.name), ''), 'portfolio'), 36);
  NEW.portfolio_slug := v_base;
  WHILE EXISTS (
    SELECT 1 FROM career_items
    WHERE user_id = NEW.user_id AND portfolio_slug = NEW.portfolio_slug AND id <> NEW.id
  ) LOOP
    v_n := v_n + 1;
    NEW.portfolio_slug := v_base || '-' || v_n;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER career_items_portfolio_slug BEFORE INSERT OR UPDATE OF portfolio_slug ON public.career_items
  FOR EACH ROW EXECUTE FUNCTION public.set_career_portfolio_slug();

-- Backfill one row at a time, oldest first, so the oldest item keeps the
-- unnumbered slug.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles ORDER BY created_at LOOP
    UPDATE public.profiles SET handle = NULL WHERE id = r.id;
  END LOOP;
  FOR r IN SELECT id FROM public.career_items ORDER BY created_at LOOP
    UPDATE public.career_items SET portfolio_slug = NULL WHERE id = r.id;
  END LOOP;
END;
$$;

CREATE FUNCTION public.get_career_portfolio_by_slug(p_handle text, p_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_career_portfolio(c.share_token)
  FROM career_items c
  JOIN profiles p ON p.user_id = c.user_id
  WHERE p.handle = lower(p_handle) AND c.portfolio_slug = lower(p_slug)
$$;

REVOKE ALL ON FUNCTION public.get_career_portfolio_by_slug(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_career_portfolio_by_slug(text, text) TO anon, authenticated;
