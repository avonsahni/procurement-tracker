-- ── 008_platform_admin.sql ──────────────────────────────────────────────────
-- Platform super-admin: flag on profiles + lifecycle columns on organizations.
-- Run once against your Supabase project.

-- ── 1. Platform-admin flag on profiles ──────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;

-- ── 2. Lifecycle / subscription columns on organizations ─────────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'trial'
    CHECK (plan IN ('trial', 'starter', 'pro', 'enterprise')),
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'paused', 'canceled')),
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_reason text,
  ADD COLUMN IF NOT EXISTS platform_notes text;

-- ── 3. Helper: is the current session a platform admin? ──────────────────────
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ── 4. RLS: platform admins can read / modify ALL organisations ──────────────
--    (existing orgs_select / orgs_write policies only cover own org)

DROP POLICY IF EXISTS "platform_admin_orgs_select" ON public.organizations;
CREATE POLICY "platform_admin_orgs_select" ON public.organizations
  FOR SELECT USING (public.is_platform_admin());

DROP POLICY IF EXISTS "platform_admin_orgs_update" ON public.organizations;
CREATE POLICY "platform_admin_orgs_update" ON public.organizations
  FOR UPDATE USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "platform_admin_orgs_delete" ON public.organizations;
CREATE POLICY "platform_admin_orgs_delete" ON public.organizations
  FOR DELETE USING (public.is_platform_admin());

-- ── 5. Mark the platform owner ───────────────────────────────────────────────
--    Safe no-op if the email does not yet exist in auth.users.
UPDATE public.profiles
  SET is_platform_admin = true
  WHERE id = (
    SELECT id FROM auth.users
    WHERE email = 'avonsahni@hotmail.com'
    LIMIT 1
  );
