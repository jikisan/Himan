-- ============================================================
-- Grocery Seed Data
-- Creates sample grocery lists with items for the first user.
-- To target a specific user, replace the lookup below with:
--   v_user_id := (SELECT id FROM auth.users WHERE email = 'your@email.com');
-- ============================================================

DO $$
DECLARE
  v_user_id   UUID;
  v_list_grocery  UUID;
  v_list_sinigang UUID;
  v_list_breakfast UUID;
BEGIN
  -- Get the first user (replace with specific email if needed)
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found. Sign up first before running this seed.';
  END IF;

  -- ============================================================
  -- Grocery List
  -- ============================================================
  INSERT INTO grocery_lists (name, owner_id)
  VALUES ('Grocery List', v_user_id)
  RETURNING id INTO v_list_grocery;

  INSERT INTO grocery_items (list_id, name, category, quantity, unit, added_by) VALUES
    (v_list_grocery, 'Rice',          'Pantry',   5,   'kg',  v_user_id),
    (v_list_grocery, 'Cooking Oil',   'Pantry',   1,   'L',   v_user_id),
    (v_list_grocery, 'Soy Sauce',     'Pantry',   1,   'btl', v_user_id),
    (v_list_grocery, 'Fish Sauce',    'Pantry',   1,   'btl', v_user_id),
    (v_list_grocery, 'Garlic',        'Produce',  2,   'heads', v_user_id),
    (v_list_grocery, 'Onions',        'Produce',  1,   'kg',  v_user_id),
    (v_list_grocery, 'Tomatoes',      'Produce',  500, 'g',   v_user_id),
    (v_list_grocery, 'Eggs',          'Dairy',    12,  'pcs', v_user_id),
    (v_list_grocery, 'Milk',          'Dairy',    1,   'L',   v_user_id),
    (v_list_grocery, 'Butter',        'Dairy',    1,   'bar', v_user_id),
    (v_list_grocery, 'Bread',         'Bakery',   1,   'loaf', v_user_id),
    (v_list_grocery, 'Chicken',       'Meat',     1,   'kg',  v_user_id),
    (v_list_grocery, 'Ground Pork',   'Meat',     500, 'g',   v_user_id),
    (v_list_grocery, 'Detergent',     'Household',1,   'pack', v_user_id),
    (v_list_grocery, 'Dishwashing Liquid', 'Household', 1, 'btl', v_user_id);

  -- ============================================================
  -- Sinigang List
  -- ============================================================
  INSERT INTO grocery_lists (name, owner_id)
  VALUES ('Sinigang List', v_user_id)
  RETURNING id INTO v_list_sinigang;

  INSERT INTO grocery_items (list_id, name, category, quantity, unit, notes, added_by) VALUES
    (v_list_sinigang, 'Pork Belly',      'Meat',    700, 'g',   'Liempo cut', v_user_id),
    (v_list_sinigang, 'Sinigang Mix',    'Pantry',  1,   'pack', 'Knorr tamarind', v_user_id),
    (v_list_sinigang, 'Eggplant',        'Produce', 2,   'pcs', NULL, v_user_id),
    (v_list_sinigang, 'Kangkong',        'Produce', 1,   'bundle', NULL, v_user_id),
    (v_list_sinigang, 'Sitaw (Long Beans)', 'Produce', 1, 'bundle', NULL, v_user_id),
    (v_list_sinigang, 'Radish (Labanos)','Produce', 1,   'pcs', NULL, v_user_id),
    (v_list_sinigang, 'Tomatoes',        'Produce', 3,   'pcs', NULL, v_user_id),
    (v_list_sinigang, 'Onions',          'Produce', 1,   'pcs', NULL, v_user_id),
    (v_list_sinigang, 'Fish Sauce',      'Pantry',  1,   'btl', 'For seasoning', v_user_id),
    (v_list_sinigang, 'Green Chili',     'Produce', 3,   'pcs', 'Siling pangsigang', v_user_id);

  -- ============================================================
  -- Breakfast List
  -- ============================================================
  INSERT INTO grocery_lists (name, owner_id)
  VALUES ('Breakfast List', v_user_id)
  RETURNING id INTO v_list_breakfast;

  INSERT INTO grocery_items (list_id, name, category, quantity, unit, notes, added_by) VALUES
    (v_list_breakfast, 'Eggs',           'Dairy',    12,  'pcs',  NULL, v_user_id),
    (v_list_breakfast, 'Bacon',          'Meat',     200, 'g',    NULL, v_user_id),
    (v_list_breakfast, 'Tocino',         'Meat',     500, 'g',    NULL, v_user_id),
    (v_list_breakfast, 'Longganisa',     'Meat',     500, 'g',    NULL, v_user_id),
    (v_list_breakfast, 'Bread',          'Bakery',   1,   'loaf', NULL, v_user_id),
    (v_list_breakfast, 'Pandesal',       'Bakery',   12,  'pcs',  'Fresh from bakery', v_user_id),
    (v_list_breakfast, 'Butter',         'Dairy',    1,   'bar',  NULL, v_user_id),
    (v_list_breakfast, 'Coffee',         'Pantry',   1,   'pack', '3-in-1', v_user_id),
    (v_list_breakfast, 'Evaporated Milk','Dairy',    2,   'cans', 'For coffee', v_user_id),
    (v_list_breakfast, 'Corned Beef',    'Pantry',   2,   'cans', NULL, v_user_id),
    (v_list_breakfast, 'Spam',           'Pantry',   1,   'can',  NULL, v_user_id),
    (v_list_breakfast, 'Garlic',         'Produce',  1,   'head', 'For sinangag', v_user_id),
    (v_list_breakfast, 'Banana Ketchup', 'Pantry',   1,   'btl',  NULL, v_user_id);

  RAISE NOTICE 'Seed complete. Created 3 lists for user %', v_user_id;
END;
$$;
