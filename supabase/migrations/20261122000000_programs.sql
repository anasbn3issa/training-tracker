-- One program per user, chosen from templates (bro split, PPL, upper/lower, full body).
--
-- Templates and user programs live in the same tables: a template has user_id null and a slug,
-- a user's program is a copy of a template (template_id) that the user can then edit.
-- Programs are archived, never deleted, so sessions logged on an old program keep their day.
-- Sets never pointed at the program (only at an exercise), so weight history spans programs.

create table programs (
  id          uuid primary key default gen_random_uuid(),
  user_id     text references users (id),
  template_id uuid references programs (id),
  slug        text unique,
  name        text not null,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  -- Templates (no owner) are found by slug; user copies have none.
  constraint programs_template_has_slug check ((user_id is null) = (slug is not null))
);
create unique index programs_one_active_per_user on programs (user_id) where user_id is not null and archived_at is null;
alter table programs enable row level security;

-- The single global program becomes the bro-split template.
insert into programs (slug, name) values ('bro-split', 'Bro split');

-- program_days: keyed by uuid, owned by a program; the code (A, B, Push…) is only a label.
alter table program_days add column id uuid not null default gen_random_uuid();
alter table program_days add column program_id uuid references programs (id);
update program_days set program_id = (select id from programs where slug = 'bro-split');
alter table program_days alter column program_id set not null;

-- Re-key prescriptions and sessions from day code to day id, then swap the primary key.
alter table program_exercises add column day_id uuid;
update program_exercises pe set day_id = d.id from program_days d where d.code = pe.day_code;
alter table sessions add column day_id uuid;

alter table program_exercises drop constraint program_exercises_day_code_fkey;
alter table program_exercises drop constraint program_exercises_day_code_position_key;
alter table sessions drop constraint sessions_day_code_fkey;
alter table program_days drop constraint program_days_pkey;
alter table program_days add primary key (id);
alter table program_days add constraint program_days_program_code_key unique (program_id, code);

-- The weekday moves to a per-program schedule; a day can now repeat in the week.
create table program_schedule (
  program_id uuid not null references programs (id),
  weekday    int  not null check (weekday between 1 and 7),
  day_id     uuid not null references program_days (id),
  primary key (program_id, weekday)
);
alter table program_schedule enable row level security;

-- Template week, from the old weekday column.
insert into program_schedule (program_id, weekday, day_id) select program_id, weekday, id from program_days;
alter table program_days drop column weekday;

alter table program_exercises alter column day_id set not null;
alter table program_exercises add constraint program_exercises_day_id_fkey foreign key (day_id) references program_days (id);
alter table program_exercises add constraint program_exercises_day_position_key unique (day_id, position);
alter table program_exercises drop column day_code;

-- Copies a template (days, prescriptions, default week) for a user and returns the new program.
create function copy_program(p_template uuid, p_user text) returns uuid
language plpgsql as $$
declare
  new_id uuid;
begin
  insert into programs (user_id, template_id, name)
    select p_user, id, name from programs where id = p_template and user_id is null
    returning id into new_id;
  if new_id is null then
    raise exception 'unknown template %', p_template using errcode = '22023';
  end if;

  insert into program_days (program_id, code, name)
    select new_id, code, name from program_days where program_id = p_template;

  -- Template day -> copied day, matched on code (unique per program).
  insert into program_exercises (day_id, exercise_id, position, base_sets, rep_low, rep_high, note)
    select nd.id, pe.exercise_id, pe.position, pe.base_sets, pe.rep_low, pe.rep_high, pe.note
    from program_exercises pe
    join program_days td on td.id = pe.day_id and td.program_id = p_template
    join program_days nd on nd.program_id = new_id and nd.code = td.code;

  insert into program_schedule (program_id, weekday, day_id)
    select new_id, s.weekday, nd.id
    from program_schedule s
    join program_days td on td.id = s.day_id
    join program_days nd on nd.program_id = new_id and nd.code = td.code
    where s.program_id = p_template;

  return new_id;
end $$;

-- Everyone who already logged sessions keeps training the bro split: they get a copy of it,
-- and their sessions point at their copy's days.
select copy_program((select id from programs where slug = 'bro-split'), u.id)
from users u
where exists (select 1 from sessions s where s.user_id = u.id);

update sessions s set day_id = d.id
from programs p
join program_days d on d.program_id = p.id
where p.user_id = s.user_id and d.code = s.day_code;

alter table sessions add constraint sessions_day_id_fkey foreign key (day_id) references program_days (id);
alter table sessions drop constraint sessions_day_or_title;
alter table sessions drop column day_code;
alter table sessions add constraint sessions_day_or_title check (day_id is not null or title is not null);

-- Replaces a program's week. p_schedule: [{"weekday": 1, "code": "A"}, …]; a missing weekday is a rest day.
create function set_schedule(p_program uuid, p_schedule jsonb) returns void
language plpgsql as $$
declare
  inserted int;
begin
  delete from program_schedule where program_id = p_program;
  insert into program_schedule (program_id, weekday, day_id)
    select p_program, (e ->> 'weekday')::int, d.id
    from jsonb_array_elements(p_schedule) e
    join program_days d on d.program_id = p_program and d.code = e ->> 'code';
  get diagnostics inserted = row_count;
  if inserted <> jsonb_array_length(p_schedule) then
    raise exception 'schedule names a day that is not in the program' using errcode = '22023';
  end if;
end $$;

-- Switches a user to a template: the current program is archived, the user's earlier copy of
-- that template comes back (with its swaps) or a fresh copy is made, the week is set, and the
-- 6-week block restarts on p_block_start (the Monday of the user's current week, from the device).
create function choose_program(p_user text, p_template uuid, p_schedule jsonb, p_block_start date) returns uuid
language plpgsql as $$
declare
  target uuid;
begin
  -- One switch at a time per user.
  perform 1 from users where id = p_user for update;
  if not found then
    raise exception 'unknown user %', p_user using errcode = '22023';
  end if;

  update programs set archived_at = now()
    where user_id = p_user and archived_at is null and template_id is distinct from p_template;

  select id into target from programs
    where user_id = p_user and template_id = p_template
    order by created_at desc limit 1;
  if target is null then
    target := copy_program(p_template, p_user);
  else
    update programs set archived_at = null where id = target;
  end if;

  perform set_schedule(target, p_schedule);
  update users set block_start_date = p_block_start where id = p_user;
  return target;
end $$;

-- Replaces a day's exercises. p_rows: [{"exercise_id", "position", "base_sets", "rep_low", "rep_high", "note"}, …].
-- Safe because nothing references program_exercises rows: logged sets point at the exercise.
create function set_day_exercises(p_day uuid, p_rows jsonb) returns void
language plpgsql as $$
begin
  delete from program_exercises where day_id = p_day;
  insert into program_exercises (day_id, exercise_id, position, base_sets, rep_low, rep_high, note)
    select p_day, r.exercise_id, r.position, r.base_sets, r.rep_low, r.rep_high, r.note
    from jsonb_to_recordset(p_rows) as r(exercise_id text, position int, base_sets int, rep_low int, rep_high int, note text);
end $$;

-- Only the server (service role) calls these, like every table access.
revoke execute on function copy_program(uuid, text), set_schedule(uuid, jsonb), choose_program(text, uuid, jsonb, date),
  set_day_exercises(uuid, jsonb) from public, anon, authenticated;
