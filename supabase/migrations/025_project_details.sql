-- ── 025_project_details.sql ──────────────────────────────────────────────────
-- Extends the projects table with rich project metadata captured at creation.

alter table public.projects
  add column if not exists address               text    not null default '',
  add column if not exists project_type          text    not null default '',
  add column if not exists built_up_area         text    not null default '',
  add column if not exists estimated_start_date  date,
  add column if not exists estimated_duration_months int,
  add column if not exists tendered_cost         numeric,
  add column if not exists project_manager       text    not null default '',
  add column if not exists client_contact_name   text    not null default '',
  add column if not exists client_contact_email  text    not null default '',
  add column if not exists client_contact_phone  text    not null default '',
  add column if not exists project_remarks       text    not null default '';

comment on column public.projects.project_type is
  'Category of project: Building, Infrastructure, Roads & Highways, Hospital, Hotel, Commercial, Industrial, Other';
comment on column public.projects.built_up_area is
  'Built-up / gross floor area with unit, e.g. "12 500 sq.m"';
comment on column public.projects.estimated_duration_months is
  'Planned project duration in whole months';
comment on column public.projects.tendered_cost is
  'Final tendered / contract value — may differ from the internal estimated cost (budget)';
