-- ── 023_platform_admin_permanent.sql ─────────────────────────────────────────
-- Promotes every org that contains a platform admin user to:
--   plan = 'enterprise', subscription_status = 'active', trial_ends_at = NULL
--
-- Effect: the trial-cleanup cron only targets subscription_status = 'trial',
-- so these orgs are permanently excluded from auto-deletion.
-- Run once; safe to re-run (idempotent UPDATE).

UPDATE public.organizations
SET
  plan                = 'enterprise',
  subscription_status = 'active',
  trial_ends_at       = NULL
WHERE id IN (
  SELECT om.org_id
  FROM   public.organization_members om
  JOIN   public.profiles             p  ON p.id = om.user_id
  WHERE  p.is_platform_admin = TRUE
);
