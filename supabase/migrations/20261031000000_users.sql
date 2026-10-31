-- Multi-user: Anas (all existing data) and Atef. Same program, separate logs.
-- Each user has their own block start (week 1 of the current 6-week block).
create table users (
  id               text primary key,
  name             text not null,
  block_start_date date not null
);
alter table users enable row level security;

-- Anas is in week 6 during 26 Oct - 1 Nov 2026, so his block started 21 Sep.
-- Atef starts aligned with Anas and adjusts with -/+ on Today.
insert into users (id, name, block_start_date) values
  ('anas', 'Anas', '2026-09-21'),
  ('atef', 'Atef', '2026-09-21');

-- Everything logged so far is Anas's.
alter table sessions add column user_id text references users (id);
update sessions set user_id = 'anas';
alter table sessions alter column user_id set not null;
create index sessions_user_idx on sessions (user_id);

alter table runs add column user_id text references users (id);
update runs set user_id = 'anas';
alter table runs alter column user_id set not null;
create index runs_user_idx on runs (user_id);

-- The single global block start is replaced by users.block_start_date.
drop table settings;
