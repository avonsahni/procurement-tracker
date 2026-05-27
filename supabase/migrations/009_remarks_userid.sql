-- ── 009_remarks_userid.sql ───────────────────────────────────────────────────
-- Adds user_id to remarks so ownership can be verified server-side.
-- Existing rows get NULL (no owner — cannot be edited/deleted by individuals,
-- only by admins).

ALTER TABLE public.remarks
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
