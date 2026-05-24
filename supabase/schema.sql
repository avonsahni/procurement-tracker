-- Procurement Tracker — Postgres schema with Row Level Security
-- Run this in your Supabase SQL Editor (Project → SQL Editor → New query)
--
-- Multi-tenant model: each authenticated user is their own workspace.
-- projects.owner_id references auth.users.id; everything else inherits
-- ownership through its parent project.

-- ─────────────────────── extensions ───────────────────────
create extension if not exists "uuid-ossp";

-- ─────────────────────── profiles ───────────────────────
-- One row per auth user. Created automatically on signup via trigger.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  can_edit boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─────────────────────── company_info ───────────────────────
-- One row per user (their company branding).
create table if not exists public.company_info (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Procurement Tracker',
  tagline text default 'Enterprise Source of Truth',
  logo_url text,
  contact_email text,
  primary_color text
);

-- ─────────────────────── categories ───────────────────────
-- Per-user.
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  unique (user_id, name)
);

-- ─────────────────────── projects ───────────────────────
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  client text default '',
  budget numeric default 0,
  status text default 'Active' check (status in ('Active', 'On Hold', 'Completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_owner_id_idx on public.projects(owner_id);

-- ─────────────────────── packages ───────────────────────
create table if not exists public.packages (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text default '',
  category text default '',
  origin text default 'Domestic' check (origin in ('Domestic', 'Import')),
  currency text default 'INR' check (currency in ('INR', 'USD', 'GBP', 'EUR')),
  current_stage text default 'Spec Received' check (current_stage in (
    'Spec Received', 'RFQ Float', 'Technical Negotiation', 'Commercial Negotiation', 'Award'
  )),
  rfq_float_date timestamptz,
  award_date timestamptz,
  award_value numeric,
  awarded_vendor_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists packages_project_id_idx on public.packages(project_id);

-- ─────────────────────── vendors ───────────────────────
create table if not exists public.vendors (
  id uuid primary key default uuid_generate_v4(),
  package_id uuid not null references public.packages(id) on delete cascade,
  name text not null,
  quoted_amount numeric default 0,
  revised_amount numeric default 0
);
create index if not exists vendors_package_id_idx on public.vendors(package_id);

-- ─────────────────────── remarks ───────────────────────
create table if not exists public.remarks (
  id uuid primary key default uuid_generate_v4(),
  package_id uuid not null references public.packages(id) on delete cascade,
  username text not null,
  text text not null,
  timestamp timestamptz not null default now()
);
create index if not exists remarks_package_id_idx on public.remarks(package_id);

-- ─────────────────────── documents ───────────────────────
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  package_id uuid not null references public.packages(id) on delete cascade,
  name text not null,
  size text default '',
  type text default '',
  username text not null,
  uploaded_at timestamptz not null default now()
);
create index if not exists documents_package_id_idx on public.documents(package_id);

-- ─────────────────────── audit_trail ───────────────────────
create table if not exists public.audit_trail (
  id uuid primary key default uuid_generate_v4(),
  package_id uuid not null references public.packages(id) on delete cascade,
  username text not null,
  field text not null,
  old_value text default '',
  new_value text default '',
  timestamp timestamptz not null default now()
);
create index if not exists audit_trail_package_id_idx on public.audit_trail(package_id);

-- ─────────────────────── auto-bootstrap on signup ───────────────────────
-- When a new auth user is created, seed their profile + company + categories.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────── Row Level Security ───────────────────────
alter table public.profiles enable row level security;
alter table public.company_info enable row level security;
alter table public.categories enable row level security;
alter table public.projects enable row level security;
alter table public.packages enable row level security;
alter table public.vendors enable row level security;
alter table public.remarks enable row level security;
alter table public.documents enable row level security;
alter table public.audit_trail enable row level security;

-- profiles: each user manages their own row
drop policy if exists "profiles_self" on public.profiles;
create policy "profiles_self" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- company_info: each user manages their own row
drop policy if exists "company_self" on public.company_info;
create policy "company_self" on public.company_info
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- categories: each user manages their own rows
drop policy if exists "categories_self" on public.categories;
create policy "categories_self" on public.categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- projects: owner only
drop policy if exists "projects_owner" on public.projects;
create policy "projects_owner" on public.projects
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- packages: anyone who can access the parent project
drop policy if exists "packages_via_project" on public.packages;
create policy "packages_via_project" on public.packages
  for all using (
    exists (select 1 from public.projects p where p.id = packages.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = packages.project_id and p.owner_id = auth.uid())
  );

-- vendors: via packages → projects
drop policy if exists "vendors_via_package" on public.vendors;
create policy "vendors_via_package" on public.vendors
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects p on p.id = pk.project_id
      where pk.id = vendors.package_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects p on p.id = pk.project_id
      where pk.id = vendors.package_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "remarks_via_package" on public.remarks;
create policy "remarks_via_package" on public.remarks
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects p on p.id = pk.project_id
      where pk.id = remarks.package_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects p on p.id = pk.project_id
      where pk.id = remarks.package_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "documents_via_package" on public.documents;
create policy "documents_via_package" on public.documents
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects p on p.id = pk.project_id
      where pk.id = documents.package_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects p on p.id = pk.project_id
      where pk.id = documents.package_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "audit_via_package" on public.audit_trail;
create policy "audit_via_package" on public.audit_trail
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects p on p.id = pk.project_id
      where pk.id = audit_trail.package_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects p on p.id = pk.project_id
      where pk.id = audit_trail.package_id and p.owner_id = auth.uid()
    )
  );
