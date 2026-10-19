-- The owner can dismiss the "write a contract" nudge for a tenant: the contract stays optional.
-- Only managers can set it: "Managers update tenancies" (RLS) already limits UPDATE to managers.
ALTER TABLE public.rental_tenancies ADD COLUMN contract_not_needed boolean NOT NULL DEFAULT false;
GRANT UPDATE (contract_not_needed) ON public.rental_tenancies TO authenticated;
