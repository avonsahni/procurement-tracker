-- Web Push subscriptions.
--
-- Stores one row per browser/device push subscription. A single user may have
-- several active subscriptions (phone, laptop, tablet), so the natural key is
-- the push endpoint URL, not the user.
--
-- The API layer (service-role client) is the only writer/reader, so RLS is
-- enabled with no policies — the anon/auth role can never touch this table
-- directly. This mirrors the active_sessions table pattern.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id       UUID        REFERENCES public.organizations(id) ON DELETE CASCADE,
  endpoint     TEXT        NOT NULL UNIQUE,
  p256dh       TEXT        NOT NULL,
  auth         TEXT        NOT NULL,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup of every subscription belonging to a user when fanning out a push.
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only the service-role client (which bypasses RLS)
-- ever touches this table. Direct client access is denied by default.
