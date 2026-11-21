-- A daily budget of synced ops per user, so one account can't fill the database by looping /api/sync.
-- A real day of training is ~50 ops and a week offline ~350: the budget (SYNC_DAILY_OPS_MAX) is far above.
create table sync_usage (
  user_id text not null references users (id),
  day     date not null,
  ops     int  not null,
  primary key (user_id, day)
);
alter table sync_usage enable row level security;

-- Counts `p_ops` against today's budget and says whether they fit. Ops that don't fit aren't counted,
-- so a phone retrying tomorrow isn't punished for today's refusals. Keeps a week of history per user.
create function use_sync_budget(p_user text, p_ops int, p_limit int) returns boolean
language plpgsql as $$
declare
  used int;
begin
  delete from sync_usage where user_id = p_user and day < current_date - 7;
  insert into sync_usage (user_id, day, ops) values (p_user, current_date, p_ops)
    on conflict (user_id, day) do update set ops = sync_usage.ops + excluded.ops
    where sync_usage.ops + excluded.ops <= p_limit
    returning ops into used;
  return used is not null and used <= p_limit;
end;
$$;

-- delete_user, now also clearing sync_usage, and locking the user row first: a sync inserting a session
-- meanwhile waits, then fails on the missing user, instead of making the whole deletion fail.
create or replace function delete_user(p_user text) returns void
language plpgsql as $$
begin
  perform 1 from users where id = p_user for update;
  delete from sessions where user_id = p_user;
  delete from runs where user_id = p_user;
  delete from sync_usage where user_id = p_user;
  delete from program_schedule where program_id in (select id from programs where user_id = p_user);
  delete from program_exercises where day_id in (
    select d.id from program_days d join programs p on p.id = d.program_id where p.user_id = p_user
  );
  delete from program_days where program_id in (select id from programs where user_id = p_user);
  delete from programs where user_id = p_user;
  delete from users where id = p_user;
end;
$$;

revoke execute on function use_sync_budget(text, int, int), delete_user(text) from public, anon, authenticated;
