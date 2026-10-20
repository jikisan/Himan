-- Members must not read the owner's saved signature directly (the owner reads it through rental_get_lessor_signature).
-- SELECT on rental_properties becomes column-level. Apply AFTER deploying the web build that selects explicit columns:
-- an older build running select('*') would fail with 'permission denied for column lessor_signature'.
-- A column added to rental_properties later needs its own GRANT SELECT.
REVOKE SELECT ON public.rental_properties FROM authenticated;
GRANT SELECT (id, created_by, name, address, owner_name, owner_address, lessor_name, lessor_civil_status, lessor_address,
  lessor_capacity, signing_city, invoice_prefix, archived_at, created_at, updated_at, late_fee_centavos, rent_due_day,
  payments_tracked_from) ON public.rental_properties TO authenticated;
