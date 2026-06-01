-- Cash inflow: payments received by the organisation for this package
create table if not exists public.cash_inflow (
  id            uuid primary key default gen_random_uuid(),
  package_id    uuid not null references public.packages(id) on delete cascade,
  on_account    text not null default '',
  from_party    text not null default '',
  date_received date not null,
  amount        numeric(20,2) not null check (amount >= 0),
  remarks       text,
  created_by    text not null default '',
  created_at    timestamptz not null default now()
);
create index if not exists cash_inflow_package_id_idx on public.cash_inflow(package_id);
alter table public.cash_inflow enable row level security;
drop policy if exists "cash_inflow_via_package" on public.cash_inflow;
create policy "cash_inflow_via_package" on public.cash_inflow
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects p on p.id = pk.project_id
      where pk.id = cash_inflow.package_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects p on p.id = pk.project_id
      where pk.id = cash_inflow.package_id and p.owner_id = auth.uid()
    )
  );

-- Cash outflow: payments made by the organisation for this package
create table if not exists public.cash_outflow (
  id            uuid primary key default gen_random_uuid(),
  package_id    uuid not null references public.packages(id) on delete cascade,
  to_whom       text not null default '',
  on_account_of text not null default '',
  date_paid     date not null,
  amount        numeric(20,2) not null check (amount >= 0),
  remarks       text,
  created_by    text not null default '',
  created_at    timestamptz not null default now()
);
create index if not exists cash_outflow_package_id_idx on public.cash_outflow(package_id);
alter table public.cash_outflow enable row level security;
drop policy if exists "cash_outflow_via_package" on public.cash_outflow;
create policy "cash_outflow_via_package" on public.cash_outflow
  for all using (
    exists (
      select 1 from public.packages pk
      join public.projects p on p.id = pk.project_id
      where pk.id = cash_outflow.package_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.packages pk
      join public.projects p on p.id = pk.project_id
      where pk.id = cash_outflow.package_id and p.owner_id = auth.uid()
    )
  );
