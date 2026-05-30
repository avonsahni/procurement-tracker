-- ── 022_remark_image_bytes.sql ────────────────────────────────────────────────
-- Tracks total uploaded photo bytes per remark so storage can be
-- accurately summed at the org level (including remark images, not just docs).

ALTER TABLE public.remarks
  ADD COLUMN IF NOT EXISTS image_bytes bigint NOT NULL DEFAULT 0;

-- Rebuild org_storage_bytes to include both document bytes and remark image bytes.
CREATE OR REPLACE VIEW public.org_storage_bytes AS
SELECT
  org_id,
  COALESCE(SUM(used_bytes), 0)::bigint AS used_bytes
FROM (
  -- Document storage
  SELECT p.org_id, d.size_bytes AS used_bytes
  FROM   public.documents  d
  JOIN   public.packages   pk ON pk.id = d.package_id
  JOIN   public.projects   p  ON p.id  = pk.project_id

  UNION ALL

  -- Remark photo storage
  SELECT p.org_id, r.image_bytes AS used_bytes
  FROM   public.remarks  r
  JOIN   public.packages pk ON pk.id = r.package_id
  JOIN   public.projects p  ON p.id  = pk.project_id
  WHERE  r.image_bytes > 0
) combined
GROUP BY org_id;

COMMENT ON VIEW public.org_storage_bytes IS
  'Total storage used (bytes) per organisation — documents + remark photos.';
