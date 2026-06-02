-- Revision rounds per vendor — tracks each negotiation round independently.
-- Adding a round also updates vendors.revised_amount to the latest value (done in the API layer).

CREATE TABLE IF NOT EXISTS public.vendor_revisions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id     UUID        NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  package_id    UUID        NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  round_number  INTEGER     NOT NULL,
  amount        NUMERIC(15,2) NOT NULL,
  notes         TEXT        NOT NULL DEFAULT '',
  created_by    TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vendor_id, round_number)
);

CREATE INDEX IF NOT EXISTS vendor_revisions_vendor_id_idx  ON public.vendor_revisions(vendor_id);
CREATE INDEX IF NOT EXISTS vendor_revisions_package_id_idx ON public.vendor_revisions(package_id);

ALTER TABLE public.vendor_revisions ENABLE ROW LEVEL SECURITY;

-- Same access as vendors: org members can read, org editors can write.
DROP POLICY IF EXISTS "vendor_revisions_read"  ON public.vendor_revisions;
DROP POLICY IF EXISTS "vendor_revisions_write" ON public.vendor_revisions;

CREATE POLICY "vendor_revisions_read" ON public.vendor_revisions
  FOR SELECT USING (
    package_id IN (
      SELECT p.id FROM public.packages p
      JOIN public.projects proj ON proj.id = p.project_id
      WHERE proj.org_id = ANY(public.my_org_ids())
    )
  );

CREATE POLICY "vendor_revisions_write" ON public.vendor_revisions
  FOR ALL USING (
    package_id IN (
      SELECT p.id FROM public.packages p
      JOIN public.projects proj ON proj.id = p.project_id
      WHERE proj.org_id = ANY(public.my_org_ids())
    )
  );
