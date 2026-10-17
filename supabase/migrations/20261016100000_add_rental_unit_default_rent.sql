-- Usual monthly rent for a room (per bed for shared rooms); 0 = not set. Pre-fills "Add tenant".
-- Extra rent per added person (rent = usual + extra × (people − 1)); 0 = same price for any headcount.
ALTER TABLE public.rental_units
  ADD COLUMN default_rent_centavos integer NOT NULL DEFAULT 0
    CHECK (default_rent_centavos BETWEEN 0 AND 2000000000),
  ADD COLUMN extra_person_rent_centavos integer NOT NULL DEFAULT 0
    CHECK (extra_person_rent_centavos BETWEEN 0 AND 2000000000);
GRANT UPDATE (default_rent_centavos, extra_person_rent_centavos) ON public.rental_units TO authenticated;
