-- ============================================================
-- Profile Seed Data
-- Creates a sample profile (identity + experience + skills +
-- projects + certificates) for the first user.
-- To target a specific user, replace the lookup below with:
--   v_user_id := (SELECT id FROM auth.users WHERE email = 'your@email.com');
-- ============================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found. Sign up first before running this seed.';
  END IF;

  -- ============================================================
  -- Identity
  -- ============================================================
  INSERT INTO profiles (user_id, full_name, headline, bio, location, email, phone, website, links)
  VALUES (
    v_user_id,
    'June Kyle Santerna',
    'Senior Software Engineer',
    'Full-stack engineer focused on developer tooling and clean architecture. I build personal productivity software and enjoy simplifying complex systems.',
    'Manila, Philippines',
    'santernakyle@gmail.com',
    NULL,
    'https://himan.app',
    '{"github": "https://github.com/jikisan", "linkedin": "https://linkedin.com/in/santernakyle"}'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- ============================================================
  -- Experience
  -- ============================================================
  INSERT INTO profile_experiences (user_id, company, title, location, start_date, end_date, is_current, summary, bullets, position) VALUES
    (v_user_id, 'Acme Corp', 'Senior Software Engineer', 'Remote', '2023-06-01', NULL, TRUE,
      'Led backend platform work for a fintech product, owning payments infrastructure and developer experience.',
      ARRAY['Shipped a payments migration serving 200k+ users with zero downtime', 'Cut cloud infra cost 30% by rightsizing services and adding autoscaling', 'Mentored 3 junior engineers through their first on-call rotations'],
      0),
    (v_user_id, 'Globex Inc', 'Software Engineer', 'Manila, Philippines', '2021-01-15', '2023-05-30', FALSE,
      'Built and maintained internal tooling for a logistics platform.',
      ARRAY['Built a real-time tracking dashboard used by 50+ dispatchers daily', 'Reduced average API response time by 40% through query optimization'],
      1);

  -- ============================================================
  -- Skills
  -- ============================================================
  INSERT INTO profile_skills (user_id, name, category, level, position) VALUES
    (v_user_id, 'TypeScript', 'language', 'expert', 0),
    (v_user_id, 'React', 'framework', 'expert', 1),
    (v_user_id, 'PostgreSQL', 'database', 'advanced', 2),
    (v_user_id, 'Supabase', 'platform', 'advanced', 3),
    (v_user_id, 'Node.js', 'runtime', 'advanced', 4)
  ON CONFLICT (user_id, name) DO NOTHING;

  -- ============================================================
  -- Projects
  -- ============================================================
  INSERT INTO profile_projects (user_id, name, description, url, tech, start_date, end_date, position) VALUES
    (v_user_id, 'Himan', 'Personal productivity suite: notes, passwords, file storage, invoicing, and grocery lists in one app.',
      'https://himan.app', ARRAY['React', 'TypeScript', 'Supabase'], '2025-12-01', NULL, 0),
    (v_user_id, 'CareerLetters', 'Role-tailored cover letter generator built on reusable content blocks.',
      NULL, ARRAY['TypeScript', 'PostgreSQL'], '2026-08-01', '2026-08-31', 1);

  -- ============================================================
  -- Certificates
  -- ============================================================
  INSERT INTO profile_certificates (user_id, name, issuer, issue_date, expiry_date, credential_id, credential_url, position) VALUES
    (v_user_id, 'AWS Certified Solutions Architect – Associate', 'Amazon Web Services', '2024-03-15', '2027-03-15', 'AWS-SAA-123456', NULL, 0),
    (v_user_id, 'Professional Scrum Master I', 'Scrum.org', '2022-11-01', NULL, 'PSM-I-789012', NULL, 1);
END $$;
