-- 013_org_email_domain.sql
-- Adds an allowed email domain restriction to each organisation.
-- When set, only users whose email ends with @<email_domain> can be invited.
-- Populated automatically from the founding admin's email at signup.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS email_domain text;

COMMENT ON COLUMN public.organizations.email_domain IS
  'Allowed email domain for user invitations (e.g. "acme.com"). '
  'Derived from the founding admin email at signup. '
  'NULL = no restriction (legacy orgs created before this feature).';
