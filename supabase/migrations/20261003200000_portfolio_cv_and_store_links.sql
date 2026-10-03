-- Per-project store links, shown as Android / iOS buttons on the portfolio.
ALTER TABLE public.profile_projects ADD COLUMN android_url text, ADD COLUMN ios_url text;

-- The portfolio offers the career's CV for download from the portfolio page.
-- The PDF carries the phone number the portfolio itself hides, so it can be
-- turned off per career.
ALTER TABLE public.career_items ADD COLUMN portfolio_show_cv boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.get_career_portfolio(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item career_items%ROWTYPE;
  v_all boolean;
  v_profile profiles%ROWTYPE;
  v_summary text;
  v_custom boolean;
  v_tokens jsonb;
  v_token text;
BEGIN
  SELECT * INTO v_item
  FROM career_items
  WHERE share_token = p_token AND portfolio_enabled;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_all := v_item.cv_layout IS NULL;

  SELECT * INTO v_profile FROM profiles WHERE user_id = v_item.user_id;

  IF v_all THEN
    v_summary := v_profile.bio;
  ELSE
    -- Match the first selected, nonempty summary in CV order. Custom blocks
    -- are joined by owner as well as id; another user's block cannot be read.
    SELECT candidate.body, candidate.custom INTO v_summary, v_custom
    FROM (
      SELECT l.ord,
        CASE WHEN l.ref->>'type' = 'summary' THEN v_profile.bio ELSE b.body END AS body,
        l.ref->>'type' = 'custom' AS custom
      FROM jsonb_array_elements(v_item.cv_layout) WITH ORDINALITY AS l(ref, ord)
      LEFT JOIN career_cv_blocks b ON b.id::text = l.ref->>'id'
        AND b.user_id = v_item.user_id AND b.kind = 'summary'
      WHERE l.ref->>'type' = 'summary'
        OR (l.ref->>'type' = 'custom' AND b.id IS NOT NULL)
    ) candidate
    WHERE nullif(btrim(candidate.body), '') IS NOT NULL
    ORDER BY candidate.ord LIMIT 1;
  END IF;

  IF v_custom THEN
    -- Resolve the same profile placeholders as the CV, without publishing
    -- a private phone or an email that the owner chose to hide.
    v_tokens := coalesce(v_profile.links, '{}'::jsonb) || jsonb_build_object(
      'name', v_profile.full_name,
      'email', CASE WHEN v_item.portfolio_show_email THEN v_profile.email END,
      'phone', NULL,
      'website', v_profile.website,
      'location', v_profile.location,
      'careerTitle', v_item.name,
      'yearsOfWork', (
        SELECT extract(year FROM age(current_date, min(start_date)))::text
        FROM profile_experiences WHERE user_id = v_item.user_id
      )
    );
    FOR v_token IN
      SELECT DISTINCT m[1] FROM regexp_matches(v_summary, '\{\{(\w+)\}\}', 'g') AS m
    LOOP
      v_summary := replace(v_summary, '{{' || v_token || '}}', coalesce(v_tokens->>v_token, ''));
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'itemName', v_item.name,
    'summary', nullif(btrim(v_summary), ''),
    'portraitPath', v_item.portfolio_portrait_path,
    'cvToken', CASE WHEN v_item.portfolio_show_cv AND v_item.cv_file_path IS NOT NULL THEN v_item.share_token END,
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
        'androidUrl',  pr.android_url,
        'iosUrl',      pr.ios_url,
        'tech',        pr.tech,
        'platform',    pr.platform,
        'startDate',   pr.start_date,
        'endDate',     pr.end_date,
        'outcome',     pr.outcome,
        'proofMetric', pr.proof_metric,
        'proofLabel',  pr.proof_label,
        'category',    pr.category,
        'featured',    pr.featured,
        'images',      pr.images
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
