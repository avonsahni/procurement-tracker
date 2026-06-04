-- 037_seat_count.sql
-- Adds billed seat count to organizations so the app can enforce the
-- number of users allowed based on what was purchased.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS seat_count integer;

-- For already-active orgs that pre-date this migration: default to the
-- plan maximum so existing users are not accidentally blocked.
-- The correct value will be written on the next subscription renewal.
UPDATE public.organizations
SET seat_count = CASE
  WHEN plan = 'starter'    THEN 10
  WHEN plan = 'pro'        THEN 50
  WHEN plan = 'enterprise' THEN 200
  ELSE NULL  -- trial: no seat limit
END
WHERE seat_count IS NULL AND subscription_status = 'active';
