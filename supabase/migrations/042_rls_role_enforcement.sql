-- 042_rls_role_enforcement.sql
-- Enforce role at the RLS layer so direct-to-DB clients (the mobile app) get the
-- same protection the web app's guard('editor') gives.
--
-- Background: previously every policy on these tables was cmd=ALL gated only on
-- org membership (my_org_ids()). A Viewer writing directly to Supabase — i.e. via
-- the mobile app, which bypasses the Next.js API routes and their guard('editor')
-- check — could therefore INSERT/UPDATE/DELETE financial and milestone records.
-- The web app was protected only because its API layer blocked viewers in code.
--
-- This migration:
--   1. Adds my_write_org_ids(): orgs where the current user has a WRITE role
--      (owner/admin/editor). Viewers are excluded.
--   2. Splits each table's single ALL policy into:
--        - read  (SELECT): any org member  -> viewers keep read access
--        - write (INSERT/UPDATE/DELETE): write-role only
--   3. Unifies milestone_tasks onto the org model. It previously used
--      owner_id = auth.uid(), which blocked every non-owner (e.g. editors) from
--      touching milestone tasks — inconsistent with the org-based tables.
--
-- Reads remain open to all org members; tenant isolation (org scoping) is
-- preserved everywhere. The web app is unaffected (it already gated writes in code).

-- ───────────── write-role helper ─────────────
create or replace function public.my_write_org_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select array(
    select org_id from public.organization_members
    where user_id = auth.uid()
      and role in ('owner','admin','editor')
  );
$$;

-- ───────────── invoices ─────────────
drop policy if exists invoices_via_org on public.invoices;
create policy invoices_read on public.invoices
  for select using (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = invoices.package_id and proj.org_id = any (my_org_ids())));
create policy invoices_write on public.invoices
  for insert with check (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = invoices.package_id and proj.org_id = any (my_write_org_ids())));
create policy invoices_update on public.invoices
  for update using (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = invoices.package_id and proj.org_id = any (my_write_org_ids())))
  with check (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = invoices.package_id and proj.org_id = any (my_write_org_ids())));
create policy invoices_delete on public.invoices
  for delete using (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = invoices.package_id and proj.org_id = any (my_write_org_ids())));

-- ───────────── cash_inflow ─────────────
drop policy if exists cash_inflow_via_org on public.cash_inflow;
create policy cash_inflow_read on public.cash_inflow
  for select using (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = cash_inflow.package_id and proj.org_id = any (my_org_ids())));
create policy cash_inflow_write on public.cash_inflow
  for insert with check (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = cash_inflow.package_id and proj.org_id = any (my_write_org_ids())));
create policy cash_inflow_update on public.cash_inflow
  for update using (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = cash_inflow.package_id and proj.org_id = any (my_write_org_ids())))
  with check (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = cash_inflow.package_id and proj.org_id = any (my_write_org_ids())));
create policy cash_inflow_delete on public.cash_inflow
  for delete using (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = cash_inflow.package_id and proj.org_id = any (my_write_org_ids())));

-- ───────────── cash_outflow ─────────────
drop policy if exists cash_outflow_via_org on public.cash_outflow;
create policy cash_outflow_read on public.cash_outflow
  for select using (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = cash_outflow.package_id and proj.org_id = any (my_org_ids())));
create policy cash_outflow_write on public.cash_outflow
  for insert with check (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = cash_outflow.package_id and proj.org_id = any (my_write_org_ids())));
create policy cash_outflow_update on public.cash_outflow
  for update using (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = cash_outflow.package_id and proj.org_id = any (my_write_org_ids())))
  with check (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = cash_outflow.package_id and proj.org_id = any (my_write_org_ids())));
create policy cash_outflow_delete on public.cash_outflow
  for delete using (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = cash_outflow.package_id and proj.org_id = any (my_write_org_ids())));

-- ───────────── milestone_tasks (also unified off owner_id onto org model) ─────────────
drop policy if exists milestone_tasks_via_package on public.milestone_tasks;
create policy milestone_tasks_read on public.milestone_tasks
  for select using (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = milestone_tasks.package_id and proj.org_id = any (my_org_ids())));
create policy milestone_tasks_write on public.milestone_tasks
  for insert with check (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = milestone_tasks.package_id and proj.org_id = any (my_write_org_ids())));
create policy milestone_tasks_update on public.milestone_tasks
  for update using (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = milestone_tasks.package_id and proj.org_id = any (my_write_org_ids())))
  with check (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = milestone_tasks.package_id and proj.org_id = any (my_write_org_ids())));
create policy milestone_tasks_delete on public.milestone_tasks
  for delete using (
    exists (select 1 from packages pk join projects proj on proj.id = pk.project_id
            where pk.id = milestone_tasks.package_id and proj.org_id = any (my_write_org_ids())));
