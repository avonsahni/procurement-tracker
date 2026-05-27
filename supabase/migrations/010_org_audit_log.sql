-- ── 010_org_audit_log.sql ────────────────────────────────────────────────────
-- Org-level audit log: tracks admin and high-value actions across the org.
-- (Package-field-level changes stay in audit_trail; this captures org events.)

CREATE TABLE IF NOT EXISTS public.org_audit_log (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name   text        NOT NULL,
  action      text        NOT NULL,
  category    text        NOT NULL DEFAULT 'general',
  entity_name text,
  details     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS org_audit_log_org_id_idx     ON public.org_audit_log(org_id);
CREATE INDEX IF NOT EXISTS org_audit_log_created_at_idx ON public.org_audit_log(created_at DESC);

ALTER TABLE public.org_audit_log ENABLE ROW LEVEL SECURITY;

-- Org admins and members can read their own org's log
DROP POLICY IF EXISTS "org_audit_log_select" ON public.org_audit_log;
CREATE POLICY "org_audit_log_select" ON public.org_audit_log
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- No client-side inserts/updates/deletes — only server-side admin client writes
