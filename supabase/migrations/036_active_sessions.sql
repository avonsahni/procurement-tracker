-- Single active session per user.
--
-- Enforces that one user account can be logged in from only ONE browser/device
-- at a time. A second login while a session is still "fresh" (recently active)
-- is rejected by the API layer with a "user already logged in" message.
--
-- One row per user. The API layer (service-role client) is the only writer, so
-- RLS is enabled with no policies — the anon/auth role can never read or write
-- this table directly.

CREATE TABLE IF NOT EXISTS public.active_sessions (
  user_id      UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id   TEXT        NOT NULL,
  user_agent   TEXT,
  ip           TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lets the staleness sweep / lookups filter on recency efficiently.
CREATE INDEX IF NOT EXISTS active_sessions_last_seen_idx ON public.active_sessions(last_seen_at);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only the service-role client (which bypasses RLS)
-- ever touches this table. Direct client access is denied by default.
