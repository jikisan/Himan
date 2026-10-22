CREATE TABLE public.weight_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  kg numeric(4,1) NOT NULL CHECK (kg BETWEEN 20 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);

CREATE TABLE public.weight_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  height_cm numeric(4,1) CHECK (height_cm BETWEEN 50 AND 260),
  goal_kg numeric(4,1) CHECK (goal_kg BETWEEN 20 AND 500),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_entries, public.weight_settings TO authenticated;

CREATE POLICY "Owners manage weight entries" ON public.weight_entries
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Owners manage weight settings" ON public.weight_settings
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE FUNCTION public.weight_settings_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER weight_settings_updated_at BEFORE UPDATE ON public.weight_settings
  FOR EACH ROW EXECUTE FUNCTION public.weight_settings_updated_at();
