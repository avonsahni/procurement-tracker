\set ON_ERROR_STOP 1
-- ═══ fixtures (as postgres / service role) ═══
insert into auth.users values
  ('00000000-0000-0000-0000-0000000000a1','u1@org1'),
  ('00000000-0000-0000-0000-0000000000a2','u2@org1'),
  ('00000000-0000-0000-0000-0000000000a3','u3@org2');
insert into public.organizations values
  ('00000000-0000-0000-0000-000000000001','Org1'),
  ('00000000-0000-0000-0000-000000000002','Org2');
insert into public.organization_members (org_id,user_id,role) values
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','owner'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a2','viewer'),
  ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a3','owner');
insert into public.projects values ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','Proj1');
insert into public.packages values ('00000000-0000-0000-0000-000000000111','00000000-0000-0000-0000-000000000011','Pumps');
insert into public.package_milestones values ('00000000-0000-0000-0000-000000000211','00000000-0000-0000-0000-000000000111','Installation');

-- ═══ T1: u1 creates channel/thread/message with mentions of u2 (member), u3 (foreign), u1 (self) ═══
set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000a1';
insert into public.channels (id,org_id,name,type,created_by) values
  ('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000001','General','general','00000000-0000-0000-0000-0000000000a1');
insert into public.threads (id,channel_id,org_id,title,created_by) values
  ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000001','Kickoff','00000000-0000-0000-0000-0000000000a1');
insert into public.messages (id,thread_id,channel_id,org_id,author_id,body,body_rich) values
  ('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','hello',
   '{"type":"doc","content":[{"type":"paragraph","content":[
      {"type":"mention","attrs":{"id":"00000000-0000-0000-0000-0000000000a2"}},
      {"type":"mention","attrs":{"id":"00000000-0000-0000-0000-0000000000a3"}},
      {"type":"mention","attrs":{"id":"00000000-0000-0000-0000-0000000000a1"}}]}]}'::jsonb);
reset role;

do $$ begin
  if (select message_count from public.threads where id='00000000-0000-0000-0000-000000000401') <> 1
    then raise exception 'T1 FAIL: message_count should be 1'; end if;
  if (select last_message_at from public.threads where id='00000000-0000-0000-0000-000000000401') is null
    then raise exception 'T1 FAIL: last_message_at not set'; end if;
  if (select count(*) from public.mentions where message_id='00000000-0000-0000-0000-000000000501') <> 1
    then raise exception 'T1 FAIL: expected exactly 1 mention (u2 only — u3 foreign, u1 self), got %',
      (select count(*) from public.mentions where message_id='00000000-0000-0000-0000-000000000501'); end if;
  if not exists (select 1 from public.mentions where message_id='00000000-0000-0000-0000-000000000501'
                 and mentioned_user_id='00000000-0000-0000-0000-0000000000a2')
    then raise exception 'T1 FAIL: u2 mention missing'; end if;
  if not exists (select 1 from public.thread_participants where thread_id='00000000-0000-0000-0000-000000000401'
                 and user_id='00000000-0000-0000-0000-0000000000a1')
    then raise exception 'T1 FAIL: author not auto-added as participant'; end if;
end $$;
\echo 'T1 PASS — counters, mention extraction (org-member + non-self only), auto-participant'

-- ═══ T2: mention visibility — u2 sees own mention, u1 sees none (spec §5.3) ═══
set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000a2';
do $$ begin
  if (select count(*) from public.mentions) <> 1 then raise exception 'T2 FAIL: u2 should see 1 mention'; end if;
end $$;
set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  if (select count(*) from public.mentions) <> 0 then raise exception 'T2 FAIL: u1 should see 0 mentions'; end if;
end $$;
reset role;
\echo 'T2 PASS — mentions visible only to the mentioned user'

-- ═══ T3: edit reconciliation — removing the mention deletes the row ═══
set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000a1';
update public.messages set body_rich='{"type":"doc","content":[]}'::jsonb, edited_at=now()
  where id='00000000-0000-0000-0000-000000000501';
reset role;
do $$ begin
  if (select count(*) from public.mentions where message_id='00000000-0000-0000-0000-000000000501') <> 0
    then raise exception 'T3 FAIL: mention should be removed after edit'; end if;
end $$;
-- re-add for T4
set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000a1';
update public.messages set body_rich='{"type":"doc","content":[{"type":"mention","attrs":{"id":"00000000-0000-0000-0000-0000000000a2"}}]}'::jsonb
  where id='00000000-0000-0000-0000-000000000501';
reset role;
do $$ begin
  if (select count(*) from public.mentions where message_id='00000000-0000-0000-0000-000000000501') <> 1
    then raise exception 'T3 FAIL: mention should be re-added'; end if;
end $$;
\echo 'T3 PASS — edit reconciles mentions both directions'

-- ═══ T4: soft delete — counters drop, mentions purged, invisible to reads ═══
set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000a1';
select public.soft_delete_message('00000000-0000-0000-0000-000000000501');
set test.uid = '00000000-0000-0000-0000-0000000000a2';
do $$ begin
  if (select count(*) from public.messages) <> 0
    then raise exception 'T4 FAIL: soft-deleted message visible to reader'; end if;
end $$;
reset role;
do $$ begin
  if (select message_count from public.threads where id='00000000-0000-0000-0000-000000000401') <> 0
    then raise exception 'T4 FAIL: message_count should be 0 after soft delete'; end if;
  if (select count(*) from public.mentions where message_id='00000000-0000-0000-0000-000000000501') <> 0
    then raise exception 'T4 FAIL: mentions should be purged on soft delete'; end if;
end $$;
\echo 'T4 PASS — soft_delete_message() hides message, purges mentions, recomputes counters'

-- ═══ T5: get_or_create_entity_channel — idempotent, named, project-anchored ═══
set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$
declare c1 uuid; c2 uuid;
begin
  c1 := public.get_or_create_entity_channel(
    '00000000-0000-0000-0000-000000000001','package','00000000-0000-0000-0000-000000000111',
    '00000000-0000-0000-0000-0000000000a1');
  c2 := public.get_or_create_entity_channel(
    '00000000-0000-0000-0000-000000000001','package','00000000-0000-0000-0000-000000000111',
    '00000000-0000-0000-0000-0000000000a1');
  if c1 <> c2 then raise exception 'T5 FAIL: not idempotent (% vs %)', c1, c2; end if;
  if not exists (select 1 from public.channels where id=c1 and name='Pumps'
                 and type='entity' and project_id='00000000-0000-0000-0000-000000000011')
    then raise exception 'T5 FAIL: entity channel name/project wrong'; end if;
  if not exists (select 1 from public.channel_members where channel_id=c1
                 and user_id='00000000-0000-0000-0000-0000000000a1' and role='admin')
    then raise exception 'T5 FAIL: creator not admin member'; end if;
end $$;
reset role;
\echo 'T5 PASS — entity channel find-or-create idempotent, creator is admin'

-- ═══ T6: cross-tenant SELECT isolation — u3 (org2) sees nothing of org1 ═══
set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000a3';
do $$ begin
  if (select count(*) from public.channels) <> 0 then raise exception 'T6 FAIL: foreign channels visible'; end if;
  if (select count(*) from public.threads)  <> 0 then raise exception 'T6 FAIL: foreign threads visible'; end if;
  if (select count(*) from public.messages) <> 0 then raise exception 'T6 FAIL: foreign messages visible'; end if;
  if (select count(*) from public.mentions) <> 0 then raise exception 'T6 FAIL: foreign mentions visible'; end if;
  if (select count(*) from public.thread_participants) <> 0 then raise exception 'T6 FAIL: foreign participants visible'; end if;
  if (select count(*) from public.channel_members) <> 0 then raise exception 'T6 FAIL: foreign members visible'; end if;
end $$;
reset role;
\echo 'T6 PASS — zero cross-tenant rows visible'

-- ═══ T7: private channel — invisible to non-members, creator bootstraps self ═══
set role app_user;
set test.uid = '00000000-0000-0000-0000-0000000000a1';
insert into public.channels (id,org_id,name,type,is_private,created_by) values
  ('00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000001','DM','direct',true,'00000000-0000-0000-0000-0000000000a1');
insert into public.channel_members (channel_id,user_id,org_id,role) values
  ('00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000001','admin');
set test.uid = '00000000-0000-0000-0000-0000000000a2';
do $$ begin
  if exists (select 1 from public.channels where id='00000000-0000-0000-0000-000000000302')
    then raise exception 'T7 FAIL: private channel visible to non-member'; end if;
end $$;
set test.uid = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  if not exists (select 1 from public.channels where id='00000000-0000-0000-0000-000000000302')
    then raise exception 'T7 FAIL: private channel invisible to member'; end if;
end $$;
reset role;
\echo 'T7 PASS — private channel membership gating works'
