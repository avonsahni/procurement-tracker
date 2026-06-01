-- Fix milestone_tasks RLS policy.
-- Migration 019 used the old owner_id pattern; replace with org-member check
-- (same pattern as invoices/vendors/remarks in 005_fix_org_rls.sql).

drop policy if exists "milestone_tasks_via_package" on public.milestone_tasks;

create policy "milestone_tasks_via_org" on public.milestone_tasks
  for all using (
    exists (
      select 1 from public.packages pkg
      join public.projects proj on proj.id = pkg.project_id
      where pkg.id = milestone_tasks.package_id
        and proj.org_id = any(public.my_org_ids())
    )
  ) with check (
    exists (
      select 1 from public.packages pkg
      join public.projects proj on proj.id = pkg.project_id
      where pkg.id = milestone_tasks.package_id
        and proj.org_id = any(public.my_org_ids())
    )
  );
