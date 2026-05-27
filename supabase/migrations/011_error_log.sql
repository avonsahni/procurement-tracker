-- 011_error_log.sql
-- Application error log table.
-- Only the server (service-role / admin client) can INSERT.
-- Only platform admins can SELECT (via RLS helper from migration 008).

CREATE TABLE IF NOT EXISTS public.error_log (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  level       text        NOT NULL DEFAULT 'error'
                CHECK (level IN ('error', 'warn', 'info')),
  source      text        NOT NULL DEFAULT 'server'
                CHECK (source IN ('server', 'client', 'api')),
  route       text,                         -- API path or page URL
  message     text        NOT NULL,
  stack       text,                         -- JS stack trace
  context     jsonb,                        -- extra key/value metadata
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  org_id      uuid REFERENCES public.organizations(id) ON DELETE SET NULL
);

ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;

-- Platform admins can read all errors
CREATE POLICY "platform admins can read error_log"
  ON public.error_log FOR SELECT
  USING (is_platform_admin());

-- No INSERT policy — only the service-role admin client can insert rows.
-- This prevents any user from writing arbitrary entries.

-- Keep the table lean: purge entries older than 90 days.
-- (Run this manually or set up a pg_cron job if your Supabase plan supports it.)
-- DELETE FROM public.error_log WHERE created_at < now() - interval '90 days';

COMMENT ON TABLE public.error_log IS
  'Application error log. Written server-side only via the admin Supabase client. '
  'Readable only by platform admins.';
