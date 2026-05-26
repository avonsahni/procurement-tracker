-- Fix recursive RLS on organization_members.
-- Policies that reference organization_members (including the table's own policy)
-- must go through a SECURITY DEFINER function so Postgres doesn't apply RLS
-- to the membership lookup itself, which causes infinite recursion.

create or replace function public.my_org_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select org_id from public.organization_members where user_id = auth.uid();
$$;

create or replace function public.is_org_admin(check_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where org_id = check_org_id and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

-- ── organization_members ──────────────────────────────────────────────────────
drop policy if exists "org_members_access" on public.organization_members;

create policy "org_members_select" on public.organization_members
  for select using (org_id = any(public.my_org_ids()));

create policy "org_members_insert" on public.organization_members
  for insert with check (public.is_org_admin(org_id));

create policy "org_members_update" on public.organization_members
  for update using (public.is_org_admin(org_id));

create policy "org_members_delete" on public.organization_members
  for delete using (public.is_org_admin(org_id));

-- ── organizations ─────────────────────────────────────────────────────────────
drop policy if exists "orgs_member_access" on public.organizations;

create policy "orgs_select" on public.organizations
  for select using (id = any(public.my_org_ids()));

create policy "orgs_write" on public.organizations
  for all using (public.is_org_admin(id)) with check (public.is_org_admin(id));

-- ── projects ──────────────────────────────────────────────────────────────────
drop policy if exists "projects_via_org" on public.projects;

create policy "projects_via_org" on public.projects
  for all using (org_id = any(public.my_org_ids()))
  with check (org_id = any(public.my_org_ids()));

-- ── packages ─────────────────────────────────────────────────────────────────
drop policy if exists "packages_via_org" on public.packages;

create policy "packages_via_org" on public.packages
  for all using (
    exists (select 1 from public.projects p where p.id = packages.project_id and p.org_id = any(public.my_org_ids()))
  ) with check (
    exists (select 1 from public.projects p where p.id = packages.project_id and p.org_id = any(public.my_org_ids()))
  );

-- ── vendors ───────────────────────────────────────────────────────────────────
drop policy if exists "vendors_via_org" on public.vendors;

create policy "vendors_via_org" on public.vendors
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      where pk.id = vendors.package_id and proj.org_id = any(public.my_org_ids())
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      where pk.id = vendors.package_id and proj.org_id = any(public.my_org_ids())
    )
  );

-- ── remarks ───────────────────────────────────────────────────────────────────
drop policy if exists "remarks_via_org" on public.remarks;

create policy "remarks_via_org" on public.remarks
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      where pk.id = remarks.package_id and proj.org_id = any(public.my_org_ids())
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      where pk.id = remarks.package_id and proj.org_id = any(public.my_org_ids())
    )
  );

-- ── documents ─────────────────────────────────────────────────────────────────
drop policy if exists "documents_via_org" on public.documents;

create policy "documents_via_org" on public.documents
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      where pk.id = documents.package_id and proj.org_id = any(public.my_org_ids())
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      where pk.id = documents.package_id and proj.org_id = any(public.my_org_ids())
    )
  );

-- ── invoices ──────────────────────────────────────────────────────────────────
drop policy if exists "invoices_via_org" on public.invoices;

create policy "invoices_via_org" on public.invoices
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      where pk.id = invoices.package_id and proj.org_id = any(public.my_org_ids())
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      where pk.id = invoices.package_id and proj.org_id = any(public.my_org_ids())
    )
  );

-- ── package_milestones ────────────────────────────────────────────────────────
drop policy if exists "milestones_via_org" on public.package_milestones;

create policy "milestones_via_org" on public.package_milestones
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      where pk.id = package_milestones.package_id and proj.org_id = any(public.my_org_ids())
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      where pk.id = package_milestones.package_id and proj.org_id = any(public.my_org_ids())
    )
  );

-- ── audit_trail ───────────────────────────────────────────────────────────────
drop policy if exists "audit_via_org" on public.audit_trail;

create policy "audit_via_org" on public.audit_trail
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      where pk.id = audit_trail.package_id and proj.org_id = any(public.my_org_ids())
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      where pk.id = audit_trail.package_id and proj.org_id = any(public.my_org_ids())
    )
  );
