-- Training Tracker schema.
-- All access goes through Next.js route handlers using the service-role key.
-- RLS is enabled with no policies so the anon key can read/write nothing.

create type load_type as enum (
  'barbell',
  'dumbbell_per_hand',
  'machine',
  'bodyweight',
  'bodyweight_plus'
);

create type run_kind as enum ('easy', 'long', 'intervals', 'race');

create table exercises (
  id           text primary key,
  name         text not null,
  load_type    load_type not null,
  increment_kg numeric(4, 2) not null check (increment_kg > 0)
);

create table program_days (
  code    text primary key,
  name    text not null,
  weekday int  not null unique check (weekday between 1 and 7)
);

create table program_exercises (
  id          serial primary key,
  day_code    text not null references program_days (code),
  exercise_id text not null references exercises (id),
  position    int  not null,
  base_sets   int  not null check (base_sets > 0),
  rep_low     int  not null check (rep_low > 0),
  rep_high    int  not null check (rep_high >= rep_low),
  note        text,
  unique (day_code, position)
);

-- Single-row table: the id column can only ever be true.
create table settings (
  id               boolean primary key default true check (id),
  block_start_date date not null
);

create table sessions (
  id           uuid primary key,
  day_code     text not null references program_days (code),
  date         date not null,
  block_week   int  not null check (block_week between 1 and 6),
  notes        text,
  completed_at timestamptz
);

create index sessions_date_idx on sessions (date desc);

create table set_logs (
  id          uuid primary key,
  session_id  uuid not null references sessions (id) on delete cascade,
  exercise_id text not null references exercises (id),
  set_index   int  not null check (set_index >= 1),
  weight_kg   numeric(6, 2) check (weight_kg >= 0),
  reps        int  not null check (reps >= 0),
  done_at     timestamptz not null
);

create index set_logs_session_idx on set_logs (session_id);
create index set_logs_exercise_idx on set_logs (exercise_id);

create table runs (
  id           uuid primary key,
  date         date not null,
  kind         run_kind not null,
  distance_km  numeric(6, 2) not null check (distance_km > 0),
  duration_sec int not null check (duration_sec > 0),
  effort       int check (effort between 1 and 10),
  notes        text
);

create index runs_date_idx on runs (date desc);

alter table exercises         enable row level security;
alter table program_days      enable row level security;
alter table program_exercises enable row level security;
alter table settings          enable row level security;
alter table sessions          enable row level security;
alter table set_logs          enable row level security;
alter table runs              enable row level security;
