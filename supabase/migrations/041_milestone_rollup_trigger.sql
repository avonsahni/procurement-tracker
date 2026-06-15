-- 041_milestone_rollup_trigger.sql
-- Keeps package_milestones, packages date span, and projects date span in sync
-- whenever milestone_tasks change — regardless of which client writes (web app,
-- mobile app, SQL editor, etc). This mirrors the JS logic in
-- src/lib/db.ts -> rollUpMilestoneTasks, moving it into the database so the DB
-- is the single source of truth.
--
-- Background: previously the roll-up was performed ONLY in the web app's API
-- routes (via rollUpMilestoneTasks). The React Native mobile app writes directly
-- to milestone_tasks and never recomputed package_milestones / package dates /
-- project dates, so any mobile-only edit left those stale. This trigger closes
-- that gap.
--
-- The web JS rollUpMilestoneTasks is intentionally LEFT IN PLACE as a backup;
-- it can be retired in a follow-up migration once the trigger is fully trusted.
--
-- Recursion safety: the trigger only writes to package_milestones / packages /
-- projects, never back to milestone_tasks, so it cannot trigger itself.

-- ─────────────────────── roll-up function ───────────────────────
create or replace function public.roll_up_package_milestones(p_package_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_pkg_start  date;
  v_pkg_end    date;
  v_milestones text[] := array[
    'Mobilisation','Preliminaries','Procurement',
    'Installation','Testing and Commissioning','Handover'
  ];
  v_name  text;
  v_idx   int;
  v_avg   numeric;
  v_cnt   int;
begin
  if p_package_id is null then
    return;
  end if;

  -- 1. Roll up each of the 6 milestones (upsert avg progress + completed_at)
  for v_idx in 1 .. array_length(v_milestones, 1) loop
    v_name := v_milestones[v_idx];

    select count(*), coalesce(round(avg(coalesce(progress, 0))), 0)
      into v_cnt, v_avg
    from public.milestone_tasks
    where package_id = p_package_id
      and milestone_name = v_name;

    if v_cnt = 0 then
      v_avg := 0;
    end if;

    insert into public.package_milestones
      (package_id, milestone_name, display_order, progress, completed_at, completed_by)
    values
      (p_package_id, v_name, v_idx, v_avg,
       case when v_avg = 100 then now() else null end, null)
    on conflict (package_id, milestone_name)
    do update set
      display_order = excluded.display_order,
      progress      = excluded.progress,
      completed_at  = case
                        when excluded.progress = 100 and public.package_milestones.completed_at is not null
                          then public.package_milestones.completed_at  -- preserve original completion time
                        when excluded.progress = 100
                          then now()
                        else null
                      end;
  end loop;

  -- 2. Package date span = min(start) / max(end) across its tasks
  select min(start_date), max(end_date)
    into v_pkg_start, v_pkg_end
  from public.milestone_tasks
  where package_id = p_package_id;

  update public.packages
     set start_date = v_pkg_start,
         end_date   = v_pkg_end
   where id = p_package_id
  returning project_id into v_project_id;

  -- 3. Cascade: project date span = min/max across all sibling packages
  if v_project_id is not null then
    update public.projects p
       set start_date = sub.min_start,
           end_date   = sub.max_end
      from (
        select min(start_date) as min_start, max(end_date) as max_end
        from public.packages
        where project_id = v_project_id
      ) sub
     where p.id = v_project_id;
  end if;
end;
$$;

-- ─────────────────────── trigger dispatch fn ───────────────────────
-- Calls the roll-up for the affected package. Handles task moving between
-- packages on UPDATE by refreshing both old and new package.
create or replace function public.trg_milestone_tasks_rollup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.roll_up_package_milestones(old.package_id);
    return old;
  else
    perform public.roll_up_package_milestones(new.package_id);
    if tg_op = 'UPDATE' and new.package_id is distinct from old.package_id then
      perform public.roll_up_package_milestones(old.package_id);
    end if;
    return new;
  end if;
end;
$$;

-- ─────────────────────── trigger ───────────────────────
drop trigger if exists trg_milestone_tasks_rollup on public.milestone_tasks;

create trigger trg_milestone_tasks_rollup
after insert or update or delete on public.milestone_tasks
for each row
execute function public.trg_milestone_tasks_rollup();
