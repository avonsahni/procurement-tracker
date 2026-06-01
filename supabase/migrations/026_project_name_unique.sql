-- Prevent duplicate project names within the same organisation.
-- Case-insensitive and trimmed so "Skyline" and " skyline " are treated as the same.
create unique index if not exists projects_org_name_unique
  on public.projects (org_id, lower(trim(name)));
