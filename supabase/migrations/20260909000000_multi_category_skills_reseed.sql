-- ============================================================
-- Multi-category skills + real CV reseed
-- category (single TEXT) -> categories (TEXT[]) so a skill can
-- belong to multiple career tracks (e.g. Kotlin: Mobile + Android).
-- ============================================================

ALTER TABLE profile_skills ADD COLUMN categories TEXT[] NOT NULL DEFAULT '{}';
UPDATE profile_skills SET categories = ARRAY[category] WHERE category IS NOT NULL;
ALTER TABLE profile_skills DROP COLUMN category;

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'santernakyle@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found. Sign up first before running this seed.';
  END IF;

  DELETE FROM profile_skills WHERE user_id = v_user_id;

  INSERT INTO profile_skills (user_id, name, categories, level, position) VALUES
    (v_user_id, 'Java', ARRAY['Mobile', 'Android'], NULL, 0),
    (v_user_id, 'Kotlin', ARRAY['Mobile', 'Android'], NULL, 1),
    (v_user_id, 'Swift', ARRAY['Mobile', 'iOS'], NULL, 2),
    (v_user_id, 'React Native', ARRAY['Mobile', 'Web'], NULL, 3),
    (v_user_id, 'Jetpack Compose', ARRAY['Mobile', 'Android'], NULL, 4),
    (v_user_id, 'SwiftUI', ARRAY['Mobile', 'iOS'], NULL, 5),
    (v_user_id, 'Kotlin & Compose Multiplatform', ARRAY['Mobile', 'Android', 'iOS'], NULL, 6),
    (v_user_id, 'MVVM', ARRAY['Architecture'], NULL, 7),
    (v_user_id, 'Clean Architecture', ARRAY['Architecture'], NULL, 8),
    (v_user_id, 'Dependency Injection', ARRAY['Architecture'], NULL, 9),
    (v_user_id, 'HTML', ARRAY['Web'], NULL, 10),
    (v_user_id, 'CSS', ARRAY['Web'], NULL, 11),
    (v_user_id, 'JavaScript', ARRAY['Web'], NULL, 12),
    (v_user_id, 'React', ARRAY['Web', 'Mobile'], NULL, 13),
    (v_user_id, 'Firebase', ARRAY['Backend', 'Cloud'], NULL, 14),
    (v_user_id, 'Supabase', ARRAY['Backend', 'Cloud'], NULL, 15),
    (v_user_id, 'REST APIs', ARRAY['Backend'], NULL, 16),
    (v_user_id, 'Selenium', ARRAY['Testing', 'Automation'], NULL, 17),
    (v_user_id, 'JUnit', ARRAY['Testing'], NULL, 18),
    (v_user_id, 'n8n', ARRAY['Automation'], NULL, 19),
    (v_user_id, 'GHL', ARRAY['Automation'], NULL, 20),
    (v_user_id, 'Xcode', ARRAY['Tools', 'iOS'], NULL, 21),
    (v_user_id, 'Android Studio', ARRAY['Tools', 'Android'], NULL, 22),
    (v_user_id, 'Git & GitHub', ARRAY['Tools'], NULL, 23),
    (v_user_id, 'Claude Code', ARRAY['Tools', 'Automation'], NULL, 24),
    (v_user_id, 'Codex', ARRAY['Tools', 'Automation'], NULL, 25),
    (v_user_id, 'Lovable', ARRAY['Tools'], NULL, 26),
    (v_user_id, 'Framer', ARRAY['Tools', 'Web'], NULL, 27),
    (v_user_id, 'Jira', ARRAY['Project Management'], NULL, 28),
    (v_user_id, 'Trello', ARRAY['Project Management'], NULL, 29),
    (v_user_id, 'Agile / Scrum', ARRAY['Project Management'], NULL, 30),
    (v_user_id, 'App Store Deployment', ARRAY['Publishing', 'iOS'], NULL, 31),
    (v_user_id, 'Play Store Deployment', ARRAY['Publishing', 'Android'], NULL, 32),
    (v_user_id, 'Web Hosting', ARRAY['Publishing', 'Web'], NULL, 33);
END $$;
