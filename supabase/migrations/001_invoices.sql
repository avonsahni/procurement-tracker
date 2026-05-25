-- Migration: add invoices (billing) module
-- Run this AFTER the base schema.sql (in Supabase SQL Editor → New query → Run)

create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  package_id uuid not null references public.packages(id) on delete cascade,
  amount numeric not null check (amount >= 0),
  invoice_number text default '',
  invoice_date timestamptz not null default now(),
  notes text default '',
  username text not null,
  created_at timestamptz not null default now()
);
create index if not exists invoices_package_id_idx on public.invoices(package_id);

alter table public.invoices enable row level security;

drop policy if exists "invoices_via_package" on public.invoices;
create policy "invoices_via_package" on public.invoices
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects p on p.id = pk.project_id
      where pk.id = invoices.package_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects p on p.id = pk.project_id
      where pk.id = invoices.package_id and p.owner_id = auth.uid()
    )
  );
