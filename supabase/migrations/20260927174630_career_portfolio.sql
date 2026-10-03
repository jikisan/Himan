-- Public portfolio per career item, served at /p/:share_token.
-- The tables stay owner-only; the one public read path is
-- get_career_portfolio(), which whitelists every column it returns.

ALTER TABLE public.profile_projects
  ADD COLUMN outcome      text,
  ADD COLUMN proof_metric text,
  ADD COLUMN proof_label  text,
  ADD COLUMN category     text,
  ADD COLUMN featured     boolean NOT NULL DEFAULT false;

ALTER TABLE public.career_items
  ADD COLUMN portfolio_enabled    boolean NOT NULL DEFAULT false,
  ADD COLUMN portfolio_show_email boolean NOT NULL DEFAULT false;

-- Selection follows the item's cv_layout (the refs chosen for its CV), in
-- that order. A null layout means "everything", matching the CV default.
-- Rotating share_token is the revocation: the old token simply stops
-- matching a row.
CREATE FUNCTION public.get_career_portfolio(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item career_items%ROWTYPE;
  v_all  boolean;
BEGIN
  SELECT * INTO v_item
  FROM career_items
  WHERE share_token = p_token AND portfolio_enabled;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_all := v_item.cv_layout IS NULL;

  RETURN jsonb_build_object(
    'itemName', v_item.name,
    'profile', (
      SELECT jsonb_build_object(
        'fullName', p.full_name,
        'headline', p.headline,
        'bio',      p.bio,
        'location', p.location,
        'website',  p.website,
        'links',    coalesce(p.links, '{}'::jsonb),
        'email',    CASE WHEN v_item.portfolio_show_email THEN p.email END
      )
      FROM profiles p WHERE p.user_id = v_item.user_id
    ),
    'projects', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id',          pr.id,
        'name',        pr.name,
        'description', pr.description,
        'url',         pr.url,
        'tech',        pr.tech,
        'platform',    pr.platform,
        'startDate',   pr.start_date,
        'endDate',     pr.end_date,
        'outcome',     pr.outcome,
        'proofMetric', pr.proof_metric,
        'proofLabel',  pr.proof_label,
        'category',    pr.category,
        'featured',    pr.featured
      ) ORDER BY ord)
      FROM (
        SELECT pr.*, CASE WHEN v_all THEN pr.position ELSE l.ord END AS ord
        FROM profile_projects pr
        LEFT JOIN LATERAL (
          SELECT e.ord FROM jsonb_array_elements(v_item.cv_layout) WITH ORDINALITY AS e(ref, ord)
          WHERE e.ref->>'type' = 'project' AND e.ref->>'id' = pr.id::text
        ) l ON true
        WHERE pr.user_id = v_item.user_id AND (v_all OR l.ord IS NOT NULL)
      ) pr
    ), '[]'::jsonb),
    'experiences', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id',        ex.id,
        'company',   ex.company,
        'title',     ex.title,
        'location',  ex.location,
        'startDate', ex.start_date,
        'endDate',   ex.end_date,
        'isCurrent', ex.is_current,
        'summary',   ex.summary
      ) ORDER BY ord)
      FROM (
        SELECT ex.*, CASE WHEN v_all THEN ex.position ELSE l.ord END AS ord
        FROM profile_experiences ex
        LEFT JOIN LATERAL (
          SELECT e.ord FROM jsonb_array_elements(v_item.cv_layout) WITH ORDINALITY AS e(ref, ord)
          WHERE e.ref->>'type' = 'experience' AND e.ref->>'id' = ex.id::text
        ) l ON true
        WHERE ex.user_id = v_item.user_id AND (v_all OR l.ord IS NOT NULL)
      ) ex
    ), '[]'::jsonb),
    'skills', coalesce((
      SELECT jsonb_agg(s.name ORDER BY s.position, s.created_at)
      FROM profile_skills s
      WHERE s.user_id = v_item.user_id
        AND (v_all OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(v_item.cv_layout) e
          WHERE e->>'type' = 'skill'
            AND e->>'category' = ANY (
              CASE WHEN cardinality(s.categories) = 0 THEN ARRAY['Other'] ELSE s.categories END
            )
        ))
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_career_portfolio(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_career_portfolio(text) TO anon, authenticated;
