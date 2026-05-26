-- ─────────────────────── organizations ───────────────────────
create table if not exists public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'My Organization',
  created_at timestamptz not null default now()
);

-- ─────────────────────── organization_members ───────────────────────
create table if not exists public.organization_members (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'viewer')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index if not exists org_members_org_id_idx on public.organization_members(org_id);
create index if not exists org_members_user_id_idx on public.organization_members(user_id);

-- ─────────────────────── add org_id to projects ───────────────────────
alter table public.projects add column if not exists org_id uuid references public.organizations(id) on delete cascade;

-- Migrate: one org per existing project owner
do $$
declare
  r record;
  new_org_id uuid;
begin
  for r in select distinct owner_id from public.projects loop
    insert into public.organizations (name) values ('My Organization') returning id into new_org_id;
    insert into public.organization_members (org_id, user_id, role)
      values (new_org_id, r.owner_id, 'owner')
      on conflict (org_id, user_id) do nothing;
    update public.projects set org_id = new_org_id where owner_id = r.owner_id and org_id is null;
  end loop;
end $$;

-- Migrate: create org for profile rows with no projects yet
do $$
declare
  r record;
  new_org_id uuid;
begin
  for r in
    select id from public.profiles
    where not exists (select 1 from public.organization_members where user_id = profiles.id)
  loop
    insert into public.organizations (name) values ('My Organization') returning id into new_org_id;
    insert into public.organization_members (org_id, user_id, role) values (new_org_id, r.id, 'owner');
  end loop;
end $$;

alter table public.projects alter column org_id set not null;

-- ─────────────────────── RLS — new tables ───────────────────────
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

drop policy if exists "orgs_member_access" on public.organizations;
create policy "orgs_member_access" on public.organizations
  for all using (
    exists (select 1 from public.organization_members om where om.org_id = organizations.id and om.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.organization_members om where om.org_id = organizations.id and om.user_id = auth.uid() and om.role in ('owner', 'admin'))
  );

drop policy if exists "org_members_access" on public.organization_members;
create policy "org_members_access" on public.organization_members
  for all using (
    exists (select 1 from public.organization_members om where om.org_id = organization_members.org_id and om.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.organization_members om where om.org_id = organization_members.org_id and om.user_id = auth.uid() and om.role in ('owner', 'admin'))
  );

-- ─────────────────────── RLS — projects ───────────────────────
drop policy if exists "projects_owner" on public.projects;
create policy "projects_via_org" on public.projects
  for all using (
    exists (select 1 from public.organization_members om where om.org_id = projects.org_id and om.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.organization_members om where om.org_id = projects.org_id and om.user_id = auth.uid())
  );

-- ─────────────────────── RLS — packages ───────────────────────
drop policy if exists "packages_via_project" on public.packages;
create policy "packages_via_org" on public.packages
  for all using (
    exists (
      select 1 from public.projects proj
      join public.organization_members om on om.org_id = proj.org_id
      where proj.id = packages.project_id and om.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.projects proj
      join public.organization_members om on om.org_id = proj.org_id
      where proj.id = packages.project_id and om.user_id = auth.uid()
    )
  );

-- ─────────────────────── RLS — child tables (vendors/remarks/docs/invoices/milestones/audit) ───────────────────────
drop policy if exists "vendors_via_package" on public.vendors;
create policy "vendors_via_org" on public.vendors
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      join public.organization_members om on om.org_id = proj.org_id
      where pk.id = vendors.package_id and om.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      join public.organization_members om on om.org_id = proj.org_id
      where pk.id = vendors.package_id and om.user_id = auth.uid()
    )
  );

drop policy if exists "remarks_via_package" on public.remarks;
create policy "remarks_via_org" on public.remarks
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      join public.organization_members om on om.org_id = proj.org_id
      where pk.id = remarks.package_id and om.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      join public.organization_members om on om.org_id = proj.org_id
      where pk.id = remarks.package_id and om.user_id = auth.uid()
    )
  );

drop policy if exists "documents_via_package" on public.documents;
create policy "documents_via_org" on public.documents
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      join public.organization_members om on om.org_id = proj.org_id
      where pk.id = documents.package_id and om.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      join public.organization_members om on om.org_id = proj.org_id
      where pk.id = documents.package_id and om.user_id = auth.uid()
    )
  );

drop policy if exists "invoices_via_package" on public.invoices;
create policy "invoices_via_org" on public.invoices
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      join public.organization_members om on om.org_id = proj.org_id
      where pk.id = invoices.package_id and om.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      join public.organization_members om on om.org_id = proj.org_id
      where pk.id = invoices.package_id and om.user_id = auth.uid()
    )
  );

drop policy if exists "milestones_via_package" on public.package_milestones;
create policy "milestones_via_org" on public.package_milestones
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      join public.organization_members om on om.org_id = proj.org_id
      where pk.id = package_milestones.package_id and om.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      join public.organization_members om on om.org_id = proj.org_id
      where pk.id = package_milestones.package_id and om.user_id = auth.uid()
    )
  );

drop policy if exists "audit_via_package" on public.audit_trail;
create policy "audit_via_org" on public.audit_trail
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      join public.organization_members om on om.org_id = proj.org_id
      where pk.id = audit_trail.package_id and om.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      join public.organization_members om on om.org_id = proj.org_id
      where pk.id = audit_trail.package_id and om.user_id = auth.uid()
    )
  );

-- ─────────────────────── updated handle_new_user trigger ───────────────────────
-- If user_metadata contains org_id, join that org (admin-created user).
-- Otherwise create a fresh org (self-signup).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  provided_org_id text;
  provided_role text;
  cat text;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));

  insert into public.company_info (user_id, name, tagline)
  values (new.id, 'Procurement Tracker', 'Enterprise Source of Truth');

  foreach cat in array array['Civil', 'Electrical', 'Mechanical', 'Instrumentation', 'Services']
  loop
    insert into public.categories (user_id, name) values (new.id, cat);
  end loop;

  provided_org_id := new.raw_user_meta_data->>'org_id';
  provided_role   := coalesce(new.raw_user_meta_data->>'org_role', 'viewer');

  if provided_org_id is not null and provided_org_id != '' then
    insert into public.organization_members (org_id, user_id, role)
    values (provided_org_id::uuid, new.id, provided_role)
    on conflict (org_id, user_id) do nothing;
  else
    insert into public.organizations (name) values ('My Organization') returning id into new_org_id;
    insert into public.organization_members (org_id, user_id, role)
    values (new_org_id, new.id, 'owner');
  end if;

  return new;
end;
$$;
