-- Add 'Paused' as a valid project status.
-- The inline check in 000_initial_schema.sql generates the constraint name
-- projects_status_check. We drop it and recreate with the new value.
alter table public.projects
  drop constraint if exists projects_status_check;

alter table public.projects
  add constraint projects_status_check
    check (status in ('Active', 'Paused', 'On Hold', 'Completed'));
