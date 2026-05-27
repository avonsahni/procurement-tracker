-- 012_org_registration_details.sql
-- Adds rich organisation profile fields collected at registration time.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS org_type      text,
  ADD COLUMN IF NOT EXISTS website       text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS city          text,
  ADD COLUMN IF NOT EXISTS state_region  text,
  ADD COLUMN IF NOT EXISTS country       text,
  ADD COLUMN IF NOT EXISTS phone         text,
  ADD COLUMN IF NOT EXISTS contact_name  text,
  ADD COLUMN IF NOT EXISTS contact_title text,
  ADD COLUMN IF NOT EXISTS contact_email text;

-- Also store job title on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_title text;

COMMENT ON COLUMN public.organizations.org_type      IS 'e.g. Construction, Engineering, Real Estate …';
COMMENT ON COLUMN public.organizations.contact_name  IS 'Primary contact person full name';
COMMENT ON COLUMN public.organizations.contact_title IS 'Primary contact job title';
COMMENT ON COLUMN public.organizations.contact_email IS 'Primary contact email (may differ from admin login)';
