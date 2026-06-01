-- Fix cash_inflow and cash_outflow RLS policies.
-- Migration 028 used the old owner_id pattern; replace with org-member check
-- (same pattern as invoices/vendors/remarks in 005_fix_org_rls.sql).

drop policy if exists "cash_inflow_via_package" on public.cash_inflow;
drop policy if exists "cash_inflow_via_org"     on public.cash_inflow;

create policy "cash_inflow_via_org" on public.cash_inflow
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      where pk.id = cash_inflow.package_id and proj.org_id = any(public.my_org_ids())
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      where pk.id = cash_inflow.package_id and proj.org_id = any(public.my_org_ids())
    )
  );

drop policy if exists "cash_outflow_via_package" on public.cash_outflow;
drop policy if exists "cash_outflow_via_org"     on public.cash_outflow;

create policy "cash_outflow_via_org" on public.cash_outflow
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      where pk.id = cash_outflow.package_id and proj.org_id = any(public.my_org_ids())
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects proj on proj.id = pk.project_id
      where pk.id = cash_outflow.package_id and proj.org_id = any(public.my_org_ids())
    )
  );
