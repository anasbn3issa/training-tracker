-- Custom workouts: a session with a title (and notes) instead of a program day.
alter table sessions alter column day_code drop not null;
alter table sessions add column title text check (length(trim(title)) between 1 and 80);
alter table sessions add constraint sessions_day_or_title check (day_code is not null or title is not null);
