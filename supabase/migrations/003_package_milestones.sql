create table if not exists public.package_milestones (
  id uuid primary key default uuid_generate_v4(),
  package_id uuid not null references public.packages(id) on delete cascade,
  milestone_name text not null,
  display_order int not null,
  progress numeric not null default 0 check (progress >= 0 and progress <= 100),
  completed_at timestamptz,
  completed_by text,
  unique (package_id, milestone_name)
);

create index if not exists milestones_package_id_idx on public.package_milestones(package_id);

alter table public.package_milestones enable row level security;

drop policy if exists "milestones_via_package" on public.package_milestones;
create policy "milestones_via_package" on public.package_milestones
  for all using (
    exists (
      select 1 from public.packages pkg
      join public.projects proj on proj.id = pkg.project_id
      where pkg.id = package_milestones.package_id and proj.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.packages pkg
      join public.projects proj on proj.id = pkg.project_id
      where pkg.id = package_milestones.package_id and proj.owner_id = auth.uid()
    )
  );
