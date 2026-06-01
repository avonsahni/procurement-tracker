-- ── 023_project_is_sample.sql ─────────────────────────────────────────────────
-- Flags projects that were created by the sample-data seeder so that
-- "Delete Sample Data" can remove ONLY seeded demo projects and never
-- touch real user-created projects.

alter table public.projects
  add column if not exists is_sample boolean not null default false;

comment on column public.projects.is_sample is
  'True if this project was created by the sample-data seeder. Used so admins can delete only demo data without affecting real projects.';

-- Backfill: mark existing seeded demo projects by their known seed names so
-- orgs that were auto-seeded before this column existed can clean them up.
update public.projects
set is_sample = true
where is_sample = false
  and name in (
    'Skyline Residency',
    'Hyperion Data Center',
    'Metro Line Expansion',
    'Oceanic Oil Refinery',
    'Aviation Terminal 3'
  );

create index if not exists projects_is_sample_idx on public.projects(is_sample);
