-- 040_org_number.sql
-- Adds a human-readable, auto-assigned sequential organisation number.
-- Every organisation keeps its UUID primary key (used internally for all data
-- scoping); this column is a short numeric identifier shown in the admin
-- dashboard and the super-admin platform panel for easy reference/support.

-- Sequence that hands out the numbers. Starts at 1001 so every org number is a
-- clean 4-digit value and looks established from day one.
CREATE SEQUENCE IF NOT EXISTS public.org_number_seq START WITH 1001;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS org_number bigint;

-- Backfill existing orgs in registration order so older orgs get lower numbers.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM public.organizations
    WHERE org_number IS NULL
    ORDER BY created_at ASC
  LOOP
    UPDATE public.organizations
    SET org_number = nextval('public.org_number_seq')
    WHERE id = r.id;
  END LOOP;
END $$;

-- New orgs (created by the handle_new_user trigger, the signup route, or a
-- platform admin) get their number automatically — no app code needed.
ALTER TABLE public.organizations
  ALTER COLUMN org_number SET DEFAULT nextval('public.org_number_seq');

-- Tie the sequence lifecycle to the column and enforce integrity.
ALTER SEQUENCE public.org_number_seq OWNED BY public.organizations.org_number;

ALTER TABLE public.organizations
  ALTER COLUMN org_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_org_number_key
  ON public.organizations(org_number);
