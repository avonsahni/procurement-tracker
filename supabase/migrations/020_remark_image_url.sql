-- ── 020_remark_image_url.sql ──────────────────────────────────────────────────
-- Adds image_url to remarks so execution progress remarks can carry a photo.
alter table public.remarks add column if not exists image_url text;
