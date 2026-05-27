-- 014_document_size_bytes.sql
-- Tracks file size in bytes on each document row so we can sum org-level storage.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS size_bytes bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.documents.size_bytes IS
  'Raw file size in bytes. Used to enforce per-org storage quotas.';

-- Helpful view: total bytes used per org (calculated on demand)
CREATE OR REPLACE VIEW public.org_storage_bytes AS
SELECT
  p.org_id,
  COALESCE(SUM(d.size_bytes), 0)::bigint AS used_bytes
FROM public.documents  d
JOIN public.packages   pk ON pk.id = d.package_id
JOIN public.projects   p  ON p.id  = pk.project_id
GROUP BY p.org_id;

COMMENT ON VIEW public.org_storage_bytes IS
  'Total document storage used (bytes) per organisation.';
