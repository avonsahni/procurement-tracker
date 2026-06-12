-- ─────────────────────────────────────────────────────────────────────────────
-- 039: Team Hub — communication module (Phase 1: schema, indexes, RLS,
--      triggers, entity-channel function).
--
-- Implements the Communication Module spec §3 (tables), §4 (indexes),
-- §5 (RLS), §7.3 (mention extraction + thread denormalisation triggers) and
-- §7.4 (get_or_create_entity_channel).
--
-- SPEC ADAPTATIONS (documented deviations, required to fit this codebase):
--   • tenant_id            → org_id (the platform's tenancy column everywhere)
--   • auth.jwt()->>'tenant_id' predicate → org_id = any(public.my_org_ids())
--     This app's JWTs carry no tenant claim; my_org_ids() (security definer
--     over organization_members, introduced in migration 005) is the
--     established tenancy spine used by every existing policy.
--   • 'entity' channels are tenant-public unless is_private — the spec only
--     classifies project/general; entity channels anchor to org-visible
--     entities (packages/milestones), so the team can see them by default.
--   • user-authored columns (created_by / author_id / uploaded_by) are bare
--     uuids, NOT FKs to auth.users: the admin panel hard-deletes users, and a
--     cascading FK would erase conversation history with them. Membership-ish
--     rows (mentions, participants, members) DO cascade with the user.
--
-- Presence/typing (spec §3.8) are deliberately NOT persisted — they live on
-- Supabase Realtime broadcast/presence channels only (Phase 5).
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════ 1. TABLES (spec §3) ════════════════════════════

-- 3.1 channels — the container for conversations
create table if not exists public.channels (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete cascade,
  name         text not null,
  description  text,
  type         text not null check (type in ('project', 'general', 'direct', 'entity')),
  entity_type  text check (entity_type in ('package', 'milestone', 'budget_line')),
  entity_id    uuid,           -- polymorphic with entity_type; no FK (spec §3.1)
  is_private   boolean not null default false,
  created_by   uuid not null,
  created_at   timestamptz not null default now(),
  archived_at  timestamptz,
  -- entity channels must carry both halves of the polymorphic pair
  check ((type = 'entity') = (entity_type is not null and entity_id is not null))
);

-- 3.2 threads — subject groupings within a channel
create table if not exists public.threads (
  id              uuid primary key default gen_random_uuid(),
  channel_id      uuid not null references public.channels(id) on delete cascade,
  org_id          uuid not null references public.organizations(id) on delete cascade,
  title           text not null,
  status          text not null default 'open' check (status in ('open', 'resolved', 'closed')),
  created_by      uuid not null,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  resolved_by     uuid,
  last_message_at timestamptz,                -- trigger-maintained
  message_count   integer not null default 0  -- trigger-maintained
);

-- 3.3 messages — the chat content (soft-delete only; never hard-deleted)
create table if not exists public.messages (
  id                uuid primary key default gen_random_uuid(),
  thread_id         uuid not null references public.threads(id) on delete cascade,
  channel_id        uuid not null references public.channels(id) on delete cascade,
  org_id            uuid not null references public.organizations(id) on delete cascade,
  author_id         uuid not null,
  body              text not null default '',
  body_rich         jsonb,
  parent_message_id uuid references public.messages(id) on delete set null,
  edited_at         timestamptz,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now()
);

-- 3.4 mentions — denormalised @-mention index, written ONLY by trigger
create table if not exists public.mentions (
  id                uuid primary key default gen_random_uuid(),
  message_id        uuid not null references public.messages(id) on delete cascade,
  thread_id         uuid not null references public.threads(id) on delete cascade,
  channel_id        uuid not null references public.channels(id) on delete cascade,
  org_id            uuid not null references public.organizations(id) on delete cascade,
  mentioned_user_id uuid not null references auth.users(id) on delete cascade,
  read_at           timestamptz,
  created_at        timestamptz not null default now()
);

-- 3.5 thread_participants
create table if not exists public.thread_participants (
  thread_id            uuid not null references public.threads(id) on delete cascade,
  user_id              uuid not null references auth.users(id) on delete cascade,
  org_id               uuid not null references public.organizations(id) on delete cascade,
  role                 text not null default 'participant' check (role in ('owner', 'participant', 'watcher')),
  muted                boolean not null default false,
  last_read_message_id uuid references public.messages(id) on delete set null,
  joined_at            timestamptz not null default now(),
  primary key (thread_id, user_id)
);

-- 3.6 channel_members — authoritative for direct/private channels
create table if not exists public.channel_members (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  org_id     uuid not null references public.organizations(id) on delete cascade,
  role       text not null default 'member' check (role in ('admin', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (channel_id, user_id)
);

-- 3.7 attachments — metadata only; files live in Supabase Storage (Phase 6)
create table if not exists public.attachments (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid not null references public.messages(id) on delete cascade,
  org_id       uuid not null references public.organizations(id) on delete cascade,
  storage_path text not null,
  mime_type    text not null,
  file_size    bigint not null check (file_size > 0),
  uploaded_by  uuid not null,
  created_at   timestamptz not null default now()
);

-- ═══════════════════════════ 2. INDEXES (spec §4) ═══════════════════════════

create index if not exists messages_thread_created_idx
  on public.messages (thread_id, created_at desc);

create index if not exists threads_channel_status_recency_idx
  on public.threads (channel_id, status, last_message_at desc);

create index if not exists mentions_unread_idx
  on public.mentions (mentioned_user_id, read_at) where read_at is null;

create index if not exists thread_participants_user_org_idx
  on public.thread_participants (user_id, org_id);

create index if not exists channels_org_project_active_idx
  on public.channels (org_id, project_id) where archived_at is null;

-- UNIQUE so get_or_create_entity_channel can upsert race-free (spec §7.4)
create unique index if not exists channels_entity_unique_idx
  on public.channels (org_id, entity_type, entity_id) where entity_id is not null;

-- Supporting indexes (FK lookups, trigger reconciliation, realtime filters)
create index if not exists messages_channel_created_idx on public.messages (channel_id, created_at desc);
create unique index if not exists mentions_message_user_unique_idx on public.mentions (message_id, mentioned_user_id);
create index if not exists attachments_message_idx on public.attachments (message_id);
create index if not exists channel_members_user_idx on public.channel_members (user_id);

-- ═════════════════════ 3. ACCESS HELPER FUNCTIONS ═══════════════════════════
-- SECURITY DEFINER helpers break the policy recursion between channels and
-- channel_members (channels' policy reads membership; membership's policy
-- reads channels — direct references would recurse infinitely).

create or replace function public.is_channel_member(p_channel_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.channel_members
    where channel_id = p_channel_id and user_id = p_user_id
  );
$$;

create or replace function public.is_channel_admin(p_channel_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.channel_members
    where channel_id = p_channel_id and user_id = p_user_id and role = 'admin'
  );
$$;

-- The single access predicate used by every downstream policy (spec §5.2):
-- caller's org owns the channel AND (channel is tenant-public OR caller is a member)
create or replace function public.can_access_channel(p_channel_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.channels c
    where c.id = p_channel_id
      and c.org_id = any (public.my_org_ids())
      and (
        (c.type in ('project', 'general', 'entity') and not c.is_private)
        or exists (
          select 1 from public.channel_members m
          where m.channel_id = c.id and m.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.thread_channel_id(p_thread_id uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select channel_id from public.threads where id = p_thread_id;
$$;

create or replace function public.channel_created_by(p_channel_id uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select created_by from public.channels where id = p_channel_id;
$$;

create or replace function public.channel_is_joinable(p_channel_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.channels c
    where c.id = p_channel_id
      and c.archived_at is null
      and c.type in ('project', 'general', 'entity')
      and not c.is_private
  );
$$;

-- ═══════════════════════ 4. RLS POLICIES (spec §5) ══════════════════════════
-- Default-deny: only the policies below grant access. Every predicate starts
-- from org_id = any(public.my_org_ids()) — the tenancy spine (spec §5.1).

alter table public.channels            enable row level security;
alter table public.threads             enable row level security;
alter table public.messages            enable row level security;
alter table public.mentions            enable row level security;
alter table public.thread_participants enable row level security;
alter table public.channel_members     enable row level security;
alter table public.attachments         enable row level security;

-- ── channels ──────────────────────────────────────────────────────────────
drop policy if exists "channels_select" on public.channels;
create policy "channels_select" on public.channels for select using (
  org_id = any (public.my_org_ids())
  and (
    (type in ('project', 'general', 'entity') and not is_private)
    or public.is_channel_member(id, auth.uid())
  )
);

drop policy if exists "channels_insert" on public.channels;
create policy "channels_insert" on public.channels for insert with check (
  org_id = any (public.my_org_ids())
  and created_by = auth.uid()
  -- a project channel must reference a project inside the same org
  and (project_id is null or exists (
    select 1 from public.projects p
    where p.id = project_id and p.org_id = channels.org_id
  ))
);

drop policy if exists "channels_update" on public.channels;
create policy "channels_update" on public.channels for update using (
  org_id = any (public.my_org_ids())
  and (created_by = auth.uid() or public.is_org_admin(org_id) or public.is_channel_admin(id, auth.uid()))
) with check (
  org_id = any (public.my_org_ids())
);
-- no delete policy: channels are archived (archived_at), never client-deleted

-- ── threads ───────────────────────────────────────────────────────────────
drop policy if exists "threads_select" on public.threads;
create policy "threads_select" on public.threads for select using (
  org_id = any (public.my_org_ids())
  and public.can_access_channel(channel_id)
);

drop policy if exists "threads_insert" on public.threads;
create policy "threads_insert" on public.threads for insert with check (
  org_id = any (public.my_org_ids())
  and created_by = auth.uid()
  and public.can_access_channel(channel_id)
  -- channel must be live and belong to the same org (write gate, spec §5.2)
  and exists (
    select 1 from public.channels c
    where c.id = channel_id and c.org_id = threads.org_id and c.archived_at is null
  )
);

drop policy if exists "threads_update" on public.threads;
create policy "threads_update" on public.threads for update using (
  org_id = any (public.my_org_ids())
  and (
    created_by = auth.uid()
    or public.is_org_admin(org_id)
    or exists (
      select 1 from public.thread_participants tp
      where tp.thread_id = id and tp.user_id = auth.uid()
    )
  )
) with check (
  org_id = any (public.my_org_ids())
);

-- ── messages ──────────────────────────────────────────────────────────────
-- Soft-deleted rows are invisible to ALL client reads (acceptance §10):
-- the deleted_at IS NULL predicate lives in the policy itself.
--
-- IMPORTANT (verified on PG16): the SELECT policy USING clause is also
-- enforced against the NEW row of every UPDATE. Consequence: clients can
-- never set deleted_at via raw UPDATE (the new row would violate the
-- SELECT policy). This is intentional — soft deletion goes exclusively
-- through public.soft_delete_message() below, and un-deletion is
-- impossible from the client.
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages for select using (
  org_id = any (public.my_org_ids())
  and deleted_at is null
  and public.can_access_channel(channel_id)
);

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert with check (
  org_id = any (public.my_org_ids())
  and author_id = auth.uid()
  and public.can_access_channel(channel_id)
  and exists (
    select 1 from public.channels c
    where c.id = channel_id and c.org_id = messages.org_id and c.archived_at is null
  )
  -- thread must belong to the claimed channel
  and exists (
    select 1 from public.threads t
    where t.id = thread_id and t.channel_id = messages.channel_id
  )
);

drop policy if exists "messages_update" on public.messages;
create policy "messages_update" on public.messages for update using (
  org_id = any (public.my_org_ids())
  and (author_id = auth.uid() or public.is_org_admin(org_id))
) with check (
  org_id = any (public.my_org_ids())
);
-- no delete policy: soft delete via UPDATE deleted_at only (spec §3.3)

-- ── mentions ──────────────────────────────────────────────────────────────
-- Users see ONLY their own mentions (spec §5.3). No insert/delete policies:
-- rows are written exclusively by the SECURITY DEFINER trigger below.
drop policy if exists "mentions_select" on public.mentions;
create policy "mentions_select" on public.mentions for select using (
  org_id = any (public.my_org_ids())
  and mentioned_user_id = auth.uid()
);

drop policy if exists "mentions_update" on public.mentions;
create policy "mentions_update" on public.mentions for update using (
  org_id = any (public.my_org_ids())
  and mentioned_user_id = auth.uid()
) with check (
  org_id = any (public.my_org_ids())
  and mentioned_user_id = auth.uid()
);

-- ── thread_participants ───────────────────────────────────────────────────
drop policy if exists "thread_participants_select" on public.thread_participants;
create policy "thread_participants_select" on public.thread_participants for select using (
  org_id = any (public.my_org_ids())
  and (
    user_id = auth.uid()
    or public.can_access_channel(public.thread_channel_id(thread_id))
  )
);

drop policy if exists "thread_participants_insert" on public.thread_participants;
create policy "thread_participants_insert" on public.thread_participants for insert with check (
  org_id = any (public.my_org_ids())
  and user_id = auth.uid()
  and public.can_access_channel(public.thread_channel_id(thread_id))
);

drop policy if exists "thread_participants_update" on public.thread_participants;
create policy "thread_participants_update" on public.thread_participants for update using (
  org_id = any (public.my_org_ids()) and user_id = auth.uid()
) with check (
  org_id = any (public.my_org_ids()) and user_id = auth.uid()
);

drop policy if exists "thread_participants_delete" on public.thread_participants;
create policy "thread_participants_delete" on public.thread_participants for delete using (
  org_id = any (public.my_org_ids()) and user_id = auth.uid()
);

-- ── channel_members ───────────────────────────────────────────────────────
drop policy if exists "channel_members_select" on public.channel_members;
create policy "channel_members_select" on public.channel_members for select using (
  org_id = any (public.my_org_ids())
  and (user_id = auth.uid() or public.can_access_channel(channel_id))
);

drop policy if exists "channel_members_insert" on public.channel_members;
create policy "channel_members_insert" on public.channel_members for insert with check (
  org_id = any (public.my_org_ids())
  -- the member being added must belong to the same org
  and exists (
    select 1 from public.organization_members om
    where om.org_id = channel_members.org_id and om.user_id = channel_members.user_id
  )
  and (
    public.is_org_admin(org_id)                                   -- org admins manage membership
    or public.is_channel_admin(channel_id, auth.uid())            -- channel admins add members
    or (user_id = auth.uid() and public.channel_is_joinable(channel_id))      -- self-join public
    or (user_id = auth.uid() and public.channel_created_by(channel_id) = auth.uid()) -- creator bootstraps self
  )
);

drop policy if exists "channel_members_update" on public.channel_members;
create policy "channel_members_update" on public.channel_members for update using (
  org_id = any (public.my_org_ids())
  and (public.is_org_admin(org_id) or public.is_channel_admin(channel_id, auth.uid()))
) with check (
  org_id = any (public.my_org_ids())
);

drop policy if exists "channel_members_delete" on public.channel_members;
create policy "channel_members_delete" on public.channel_members for delete using (
  org_id = any (public.my_org_ids())
  and (
    user_id = auth.uid()                                          -- leave channel
    or public.is_org_admin(org_id)
    or public.is_channel_admin(channel_id, auth.uid())
  )
);

-- ── attachments ───────────────────────────────────────────────────────────
-- Reads ride on messages RLS (the EXISTS subquery applies the caller's
-- messages policy, so attachments of soft-deleted/foreign messages vanish).
drop policy if exists "attachments_select" on public.attachments;
create policy "attachments_select" on public.attachments for select using (
  org_id = any (public.my_org_ids())
  and exists (select 1 from public.messages m where m.id = message_id)
);

drop policy if exists "attachments_insert" on public.attachments;
create policy "attachments_insert" on public.attachments for insert with check (
  org_id = any (public.my_org_ids())
  and uploaded_by = auth.uid()
  and exists (
    select 1 from public.messages m
    where m.id = message_id and m.author_id = auth.uid()
  )
);

drop policy if exists "attachments_delete" on public.attachments;
create policy "attachments_delete" on public.attachments for delete using (
  org_id = any (public.my_org_ids())
  and (uploaded_by = auth.uid() or public.is_org_admin(org_id))
);

-- ═══════════════ 5. MENTION EXTRACTION + DENORMALISATION (spec §7.3) ════════

-- Walks body_rich for {"type":"mention","attrs":{"id":"<uuid>"}} nodes
-- (TipTap/ProseMirror convention; attrs.user_id also accepted).
create or replace function public.extract_mention_user_ids(p_body jsonb)
returns uuid[] language sql immutable set search_path = public as $$
  select coalesce(array_agg(distinct uid), '{}'::uuid[])
  from (
    select (coalesce(node -> 'attrs' ->> 'id', node -> 'attrs' ->> 'user_id'))::uuid as uid
    from jsonb_path_query(coalesce(p_body, 'null'::jsonb), '$.** ? (@.type == "mention")') as node
    where coalesce(node -> 'attrs' ->> 'id', node -> 'attrs' ->> 'user_id')
          ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) ids;
$$;

-- Reconciles the mentions table with the current body_rich of a message.
-- Only org members (and never the author) are indexed; soft-deleted messages
-- contribute zero mentions (acceptance §10).
create or replace function public.sync_message_mentions(p_msg public.messages)
returns void language plpgsql security definer set search_path = public as $$
declare
  desired uuid[];
begin
  if p_msg.deleted_at is not null then
    delete from public.mentions where message_id = p_msg.id;
    return;
  end if;

  select coalesce(array_agg(u), '{}'::uuid[]) into desired
  from unnest(public.extract_mention_user_ids(p_msg.body_rich)) as u
  join public.organization_members om on om.user_id = u and om.org_id = p_msg.org_id
  where u <> p_msg.author_id;

  -- drop mentions no longer present in the body
  delete from public.mentions
  where message_id = p_msg.id and mentioned_user_id <> all (desired);

  -- add new ones (unique index makes this idempotent)
  insert into public.mentions (message_id, thread_id, channel_id, org_id, mentioned_user_id)
  select p_msg.id, p_msg.thread_id, p_msg.channel_id, p_msg.org_id, u
  from unnest(desired) as u
  on conflict (message_id, mentioned_user_id) do nothing;
end;
$$;

-- AFTER INSERT: thread counters + auto-participant + mention extraction
create or replace function public.fn_message_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is null then
    update public.threads
    set last_message_at = greatest(coalesce(last_message_at, '-infinity'::timestamptz), new.created_at),
        message_count   = message_count + 1
    where id = new.thread_id;

    -- author becomes a participant on first activity (spec §5.4)
    insert into public.thread_participants (thread_id, user_id, org_id, role)
    values (new.thread_id, new.author_id, new.org_id, 'participant')
    on conflict (thread_id, user_id) do nothing;
  end if;

  perform public.sync_message_mentions(new);
  return new;
end;
$$;

drop trigger if exists trg_message_after_insert on public.messages;
create trigger trg_message_after_insert
  after insert on public.messages
  for each row execute function public.fn_message_after_insert();

-- AFTER UPDATE: handle edits (mention reconcile) and soft-delete (counters)
create or replace function public.fn_message_after_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- soft-delete transition: recompute counters from surviving messages
  if old.deleted_at is null and new.deleted_at is not null then
    update public.threads t
    set message_count   = (select count(*) from public.messages m
                           where m.thread_id = t.id and m.deleted_at is null),
        last_message_at = (select max(m.created_at) from public.messages m
                           where m.thread_id = t.id and m.deleted_at is null)
    where t.id = new.thread_id;
  end if;

  if (new.body_rich is distinct from old.body_rich)
     or (new.deleted_at is distinct from old.deleted_at) then
    perform public.sync_message_mentions(new);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_message_after_update on public.messages;
create trigger trg_message_after_update
  after update on public.messages
  for each row execute function public.fn_message_after_update();

-- ═══════════════ 6. ENTITY-ANCHORED CHANNELS (spec §7.4) ════════════════════
-- Find-or-create with the race condition handled by the partial unique index.
-- Entity→org integrity is validated here (the polymorphic pair has no FK).

create or replace function public.get_or_create_entity_channel(
  p_org_id      uuid,
  p_entity_type text,
  p_entity_id   uuid,
  p_creator_id  uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_channel_id uuid;
  v_name       text;
  v_project_id uuid;
begin
  -- caller must be a member of the org they claim
  if not exists (
    select 1 from public.organization_members
    where org_id = p_org_id and user_id = p_creator_id
  ) then
    raise exception 'creator is not a member of this organisation';
  end if;

  if p_entity_type not in ('package', 'milestone', 'budget_line') then
    raise exception 'unsupported entity_type %', p_entity_type;
  end if;

  -- resolve a display name + project anchor, verifying the entity is in-org
  if p_entity_type = 'package' then
    select pk.name, pr.id into v_name, v_project_id
    from public.packages pk
    join public.projects pr on pr.id = pk.project_id
    where pk.id = p_entity_id and pr.org_id = p_org_id;
    if v_name is null then
      raise exception 'package not found in this organisation';
    end if;
  elsif p_entity_type = 'milestone' then
    select pm.milestone_name || ' — ' || pk.name, pr.id into v_name, v_project_id
    from public.package_milestones pm
    join public.packages pk on pk.id = pm.package_id
    join public.projects pr on pr.id = pk.project_id
    where pm.id = p_entity_id and pr.org_id = p_org_id;
    if v_name is null then
      raise exception 'milestone not found in this organisation';
    end if;
  else
    v_name := 'Budget line discussion';   -- no budget_line table yet (spec §3.1)
  end if;

  insert into public.channels (org_id, project_id, name, type, entity_type, entity_id, created_by)
  values (p_org_id, v_project_id, v_name, 'entity', p_entity_type, p_entity_id, p_creator_id)
  on conflict (org_id, entity_type, entity_id) where entity_id is not null
  do nothing
  returning id into v_channel_id;

  if v_channel_id is null then
    select id into v_channel_id
    from public.channels
    where org_id = p_org_id and entity_type = p_entity_type and entity_id = p_entity_id;
  end if;

  insert into public.channel_members (channel_id, user_id, org_id, role)
  values (v_channel_id, p_creator_id, p_org_id, 'admin')
  on conflict (channel_id, user_id) do nothing;

  return v_channel_id;
end;
$$;

-- Clients may call the function; everything else is locked behind RLS.
grant execute on function public.get_or_create_entity_channel(uuid, text, uuid, uuid) to authenticated;

-- ═══════════════ 6b. SOFT DELETE (the only way to delete a message) ═════════
-- Raw UPDATEs setting deleted_at are blocked by the SELECT policy's
-- new-row check (see messages policy note above), so deletion is funnelled
-- through this definer function: author or org admin only.

create or replace function public.soft_delete_message(p_message_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_msg public.messages;
begin
  select * into v_msg from public.messages
  where id = p_message_id and deleted_at is null;

  if v_msg.id is null then
    raise exception 'message not found';
  end if;

  if v_msg.author_id <> auth.uid() and not public.is_org_admin(v_msg.org_id) then
    raise exception 'only the author or an org admin can delete a message';
  end if;

  -- definer update; the AFTER UPDATE trigger purges mentions and
  -- recomputes thread counters.
  update public.messages set deleted_at = now() where id = p_message_id;
end;
$$;

grant execute on function public.soft_delete_message(uuid) to authenticated;

-- ═══════════════ 7. REALTIME PUBLICATION (enables Phase 4) ══════════════════
-- postgres_changes subscriptions require the tables in the publication.
-- RLS still applies to what each subscriber receives.

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.mentions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
