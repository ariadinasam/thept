
-- 1) Wallets: revoke user UPDATE; only service_role (server-side) can change balance
DROP POLICY IF EXISTS "Users update own wallet" ON public.wallets;

-- 2) Profiles: block self-assignment of special_permissions via trigger
CREATE OR REPLACE FUNCTION public.guard_profile_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_claim text;
BEGIN
  role_claim := nullif(current_setting('request.jwt.claims', true), '')::json->>'role';
  -- Only service_role bypasses this guard
  IF role_claim IS DISTINCT FROM 'service_role' THEN
    NEW.special_permissions := OLD.special_permissions;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_permissions_trg ON public.profiles;
CREATE TRIGGER guard_profile_permissions_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_permissions();

-- 3) Reservations: enforce server-side price, duration and status
CREATE OR REPLACE FUNCTION public.validate_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pph numeric;
  role_claim text;
BEGIN
  role_claim := nullif(current_setting('request.jwt.claims', true), '')::json->>'role';

  IF NEW.duration_hours IS NULL OR NEW.duration_hours < 1 OR NEW.duration_hours > 24 THEN
    RAISE EXCEPTION 'Duração inválida: deve ser entre 1 e 24 horas';
  END IF;

  SELECT price_per_hour INTO pph FROM public.parking_locations WHERE id = NEW.location_id;
  IF pph IS NULL THEN
    RAISE EXCEPTION 'Local de estacionamento não encontrado';
  END IF;

  -- Always recompute price from the authoritative source
  NEW.total_price := NEW.duration_hours * pph;

  -- Clients may not arbitrarily set status; only service_role may
  IF role_claim IS DISTINCT FROM 'service_role' THEN
    NEW.status := 'confirmed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_reservation_trg ON public.reservations;
CREATE TRIGGER validate_reservation_trg
BEFORE INSERT OR UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.validate_reservation();

-- 4) Storage: add missing UPDATE policy for permission-docs (owner-scoped)
DROP POLICY IF EXISTS "Users update own permission-docs" ON storage.objects;
CREATE POLICY "Users update own permission-docs"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'permission-docs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'permission-docs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
