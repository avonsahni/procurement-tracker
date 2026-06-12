-- Supabase environment shims + minimal prerequisite schema for migration 039
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

create schema auth;
create table auth.users (id uuid primary key, email text);
-- GUC-driven auth.uid() so we can impersonate users per-session
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;

-- minimal app tables 039 depends on
create table public.organizations (id uuid primary key default gen_random_uuid(), name text);
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer',
  unique (user_id)
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  name text
);
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text
);
create table public.package_milestones (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references public.packages(id) on delete cascade,
  milestone_name text
);

-- helpers from migration 005 (faithful copies)
create function public.my_org_ids() returns uuid[]
language sql security definer stable set search_path = public as $$
  select array(select org_id from public.organization_members where user_id = auth.uid());
$$;
create function public.is_org_admin(check_org_id uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.organization_members
    where org_id = check_org_id and user_id = auth.uid() and role in ('owner','admin')
  );
$$;

create publication supabase_realtime;

-- non-owner role so RLS actually applies
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin;
  end if;
end $$;
grant usage on schema public, auth to app_user;
grant all on all tables in schema public to app_user;
alter default privileges for role postgres in schema public grant all on tables to app_user;
