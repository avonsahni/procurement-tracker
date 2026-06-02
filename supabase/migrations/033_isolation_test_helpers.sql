-- ─────────────────────────────────────────────────────────────────────────────
-- 033: Two fixes bundled together.
--
-- A. Fix handle_new_user trigger: migration 032 replaced
--    UNIQUE(org_id, user_id) with UNIQUE(user_id), but the trigger still
--    referenced ON CONFLICT (org_id, user_id), which no longer has a backing
--    constraint. Harmless in practice (new users always get fresh UUIDs and the
--    conflict path never fires), but referencing a non-existent constraint is
--    wrong. Updated to ON CONFLICT (user_id).
--
-- B. _iso_rls_status(): read-only diagnostic helper for the tenant isolation
--    test suite (scripts/test-isolation.mjs). Queries pg_catalog to report RLS
--    enablement and policy coverage per table. Restricted to service_role so
--    regular authenticated users cannot call it.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── A. Fix handle_new_user ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id      uuid;
  provided_org_id text;
  provided_role   text;
  cat             text;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );

  provided_org_id := new.raw_user_meta_data->>'org_id';
  provided_role   := COALESCE(new.raw_user_meta_data->>'org_role', 'viewer');

  IF provided_org_id IS NOT NULL AND provided_org_id <> '' THEN
    -- Admin-created user: join the specified org.
    -- UNIQUE(user_id) constraint (migration 032) means one org per user;
    -- use the correct conflict target.
    INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (provided_org_id::uuid, new.id, provided_role)
    ON CONFLICT (user_id) DO NOTHING;

  ELSE
    -- Self-signup: create a brand-new org.
    INSERT INTO public.organizations (name)
    VALUES ('My Organization')
    RETURNING id INTO new_org_id;

    INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (new_org_id, new.id, 'owner');

    INSERT INTO public.company_info (user_id, org_id, name, tagline)
    VALUES (new.id, new_org_id, 'Procurement Tracker', 'Enterprise Source of Truth')
    ON CONFLICT DO NOTHING;

    FOREACH cat IN ARRAY ARRAY['Civil', 'Electrical', 'Mechanical', 'Instrumentation', 'Services']
    LOOP
      INSERT INTO public.categories (user_id, org_id, name)
      VALUES (new.id, new_org_id, cat)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN new;
END;
$$;

-- ── B. Diagnostic helper ──────────────────────────────────────────────────────
-- Returns one row per public table with:
--   rls_enabled          — whether ALTER TABLE … ENABLE ROW LEVEL SECURITY was run
--   policy_count         — number of policies attached to the table
--   implicit_insert_check — true when a FOR ALL policy has no explicit WITH CHECK
--                           (PostgreSQL uses the USING clause implicitly, which is
--                           correct but less obvious than an explicit WITH CHECK)

CREATE OR REPLACE FUNCTION public._iso_rls_status()
RETURNS TABLE(
  table_name             text,
  rls_enabled            boolean,
  policy_count           bigint,
  implicit_insert_check  boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    c.relname::text,
    c.relrowsecurity,
    COUNT(p.polname),
    COALESCE(
      bool_or(p.polcmd = '*' AND p.polwithcheck IS NULL),
      false
    ) AS implicit_insert_check
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  GROUP BY c.relname, c.relrowsecurity
  ORDER BY c.relname;
$$;

REVOKE EXECUTE ON FUNCTION public._iso_rls_status() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public._iso_rls_status() TO service_role;
