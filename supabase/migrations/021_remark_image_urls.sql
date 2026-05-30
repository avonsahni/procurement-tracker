-- ── 021_remark_image_urls.sql ────────────────────────────────────────────────
-- Replaces the single image_url column with image_urls text[] to support
-- bulk photo attachments (up to 10 images per remark).
alter table public.remarks add column if not exists image_urls text[] default '{}';

-- Migrate any existing single-image rows into the array
update public.remarks
  set image_urls = array[image_url]
  where image_url is not null and image_url <> '';

alter table public.remarks drop column if exists image_url;
