-- ─────────────────────────────────────────────────────────────────────────────
-- 032: Enforce one-org-per-user at the database level
--
-- organization_members previously had UNIQUE (org_id, user_id), which allowed
-- the same user UUID to appear in multiple orgs. This caused non-deterministic
-- org routing on login (highest-privilege org won, silently). This migration
-- hardens that to UNIQUE (user_id) — one auth identity, one org, full stop.
--
-- Duplicate cleanup: for any user_id that currently appears in more than one
-- org, we keep the row with the highest privilege (owner > admin > viewer).
-- When privilege ties, we keep the oldest row (earliest created_at).
-- All other rows are deleted before the constraint is added.
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Delete duplicate memberships, keeping the best row per user_id.
DELETE FROM public.organization_members
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.organization_members
  ORDER BY
    user_id,
    CASE role
      WHEN 'owner'  THEN 0
      WHEN 'admin'  THEN 1
      WHEN 'viewer' THEN 2
      ELSE 9
    END ASC,
    created_at ASC   -- oldest wins on tie
);

-- Step 2: Drop the old composite unique constraint and add the tighter one.
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_org_id_user_id_key;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_user_id_key UNIQUE (user_id);
