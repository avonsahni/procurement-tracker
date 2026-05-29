-- Subtasks under execution milestones, with progress % and date roll-up.

create table if not exists public.milestone_tasks (
  id             uuid primary key default gen_random_uuid(),
  package_id     uuid not null references public.packages(id) on delete cascade,
  org_id         uuid not null references public.organizations(id) on delete cascade,
  milestone_name text not null,
  name           text not null,
  description    text,
  progress       integer not null default 0 check (progress >= 0 and progress <= 100),
  start_date     date,
  end_date       date,
  sort_order     integer not null default 0,
  created_by     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists milestone_tasks_package_id_idx on public.milestone_tasks(package_id);
create index if not exists milestone_tasks_org_id_idx     on public.milestone_tasks(org_id);

alter table public.milestone_tasks enable row level security;

drop policy if exists "milestone_tasks_via_package" on public.milestone_tasks;
create policy "milestone_tasks_via_package" on public.milestone_tasks
  for all using (
    exists (
      select 1 from public.packages pkg
      join  public.projects proj on proj.id = pkg.project_id
      where pkg.id = milestone_tasks.package_id
        and proj.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.packages pkg
      join  public.projects proj on proj.id = pkg.project_id
      where pkg.id = milestone_tasks.package_id
        and proj.owner_id = auth.uid()
    )
  );

-- Date columns on packages and projects for automatic roll-up
alter table public.packages
  add column if not exists start_date date,
  add column if not exists end_date   date;

alter table public.projects
  add column if not exists start_date date,
  add column if not exists end_date   date;
