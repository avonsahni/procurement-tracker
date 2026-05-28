-- ── contact_messages ──────────────────────────────────────────────────────────
-- Stores enquiries submitted via the public landing page contact form.
-- Readable only by platform admins (via admin client, no RLS needed).

create table if not exists public.contact_messages (
  id          uuid        primary key default uuid_generate_v4(),
  name        text        not null,
  email       text        not null,
  phone       text,
  company     text,
  message     text        not null,
  is_read     boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- No public RLS — only the admin client (service role) reads/writes this table.
-- The POST /api/contact route uses the admin client to insert.
