-- The exercise catalog and the program templates. This file is the template editor:
-- change it here, then re-run it. Every statement is an upsert so it is safe to re-run
-- against a database that already holds logged sessions.
--
-- Users train on their own copy of a template, made when they choose it. Editing a
-- template here changes what the next users get, never an existing user's program.
-- Exercises are never deleted: old sets point at them.

insert into exercises (id, name, load_type, increment_kg) values
  -- Day A
  ('incline-db-press',           'Incline DB press',                 'dumbbell_per_hand', 2.5),
  ('flat-db-press',              'Flat DB press',                    'dumbbell_per_hand', 2.5),
  ('dips',                       'Dips',                             'bodyweight_plus',   2.5),
  ('cable-fly',                  'Cable fly / pec deck',             'machine',           2.5),
  ('overhead-cable-triceps-ext', 'Overhead cable triceps ext.',      'machine',           2.5),
  ('rope-pushdown',              'Rope pushdown',                    'machine',           2.5),
  -- Day B
  ('squat',                      'Squat',                            'barbell',           2.5),
  ('leg-press',                  'Leg press',                        'machine',           2.5),
  ('barbell-rdl',                'Barbell RDL',                      'barbell',           2.5),
  ('seated-leg-curl',            'Seated leg curl',                  'machine',           2.5),
  ('leg-extension',              'Leg extension',                    'machine',           2.5),
  ('standing-calf-raise',        'Standing calf raise',              'machine',           2.5),
  -- Day C
  ('pull-ups',                   'Pull-ups',                         'bodyweight_plus',   2.5),
  ('chest-supported-row',        'Chest-supported row',              'machine',           2.5),
  ('lat-pulldown',               'Lat pulldown',                     'machine',           2.5),
  ('single-arm-db-row',          'Single-arm DB row',                'dumbbell_per_hand', 2.5), -- no longer in the program, kept for history
  ('back-extension',             'Back extension (hyperextension)',  'bodyweight_plus',   2.5),
  ('rear-delt-fly',              'Rear delt fly',                    'machine',           2.5),
  ('incline-db-curl',            'Incline DB curl',                  'dumbbell_per_hand', 1.0),
  ('hammer-curl',                'Hammer curl',                      'dumbbell_per_hand', 1.0),
  -- Day D (seated-leg-curl is shared with Day B)
  ('seated-ohp',                 'Seated OHP',                       'barbell',           2.5),
  ('db-lateral-raise',           'DB lateral raise',                 'dumbbell_per_hand', 1.0),
  ('machine-incline-press',      'Machine / incline press',          'machine',           2.5),
  ('leg-press-or-split-squat',   'Leg press or split squat',         'machine',           2.5),
  ('hanging-leg-raise',          'Hanging leg raise / cable crunch', 'bodyweight_plus',   2.5),
  -- Used by the other templates
  ('barbell-bench-press',        'Barbell bench press',              'barbell',           2.5),
  ('barbell-row',                'Barbell row',                      'barbell',           2.5)
on conflict (id) do update set
  name         = excluded.name,
  load_type    = excluded.load_type,
  increment_kg = excluded.increment_kg;

-- Templates: programs with no owner, found by slug.
insert into programs (slug, name) values
  ('bro-split',   'Bro split'),
  ('ppl',         'Push / Pull / Legs'),
  ('upper-lower', 'Upper / Lower'),
  ('full-body',   'Full body')
on conflict (slug) do update set name = excluded.name;

-- code is the short label shown in the day badge; unique within a template.
insert into program_days (program_id, code, name)
select p.id, d.code, d.name
from (values
  ('bro-split', 'A', 'Chest + Triceps'),
  ('bro-split', 'B', 'Legs'),
  ('bro-split', 'C', 'Back + Biceps'),
  ('bro-split', 'D', 'Shoulders + Upper/Lower'),
  ('ppl', 'Pu', 'Push'),
  ('ppl', 'Pl', 'Pull'),
  ('ppl', 'Lg', 'Legs'),
  ('upper-lower', 'U', 'Upper'),
  ('upper-lower', 'L', 'Lower'),
  ('full-body', 'A', 'Full body A'),
  ('full-body', 'B', 'Full body B'),
  ('full-body', 'C', 'Full body C')
) as d (slug, code, name)
join programs p on p.slug = d.slug
on conflict (program_id, code) do update set name = excluded.name;

-- Template prescriptions and weeks are replaced wholesale. Only templates (user_id is null):
-- user copies belong to their users.
delete from program_exercises where day_id in (
  select d.id from program_days d join programs p on p.id = d.program_id where p.user_id is null
);

insert into program_exercises (day_id, position, exercise_id, base_sets, rep_low, rep_high, note)
select d.id, x.position, x.exercise_id, x.base_sets, x.rep_low, x.rep_high, x.note
from (values
  ('bro-split', 'A', 1, 'incline-db-press',           4,  8, 10, null),
  ('bro-split', 'A', 2, 'flat-db-press',              3, 10, 12, null),
  ('bro-split', 'A', 3, 'dips',                       3,  8, 12, null),
  ('bro-split', 'A', 4, 'cable-fly',                  3, 12, 15, null),
  ('bro-split', 'A', 5, 'overhead-cable-triceps-ext', 3, 10, 12, null),
  ('bro-split', 'A', 6, 'rope-pushdown',              3, 12, 15, null),

  ('bro-split', 'B', 1, 'squat',                      4,  6,  8, null),
  ('bro-split', 'B', 2, 'leg-press',                  4, 10, 12, null),
  ('bro-split', 'B', 3, 'barbell-rdl',                3,  8, 10, null),
  ('bro-split', 'B', 4, 'seated-leg-curl',            3, 10, 12, null),
  ('bro-split', 'B', 5, 'leg-extension',              3, 12, 15, null),
  ('bro-split', 'B', 6, 'standing-calf-raise',        4, 10, 15, null),

  ('bro-split', 'C', 1, 'pull-ups',                   4,  6, 10, null),
  ('bro-split', 'C', 2, 'chest-supported-row',        4, 10, 12, null),
  ('bro-split', 'C', 3, 'lat-pulldown',               3, 10, 12, null),
  ('bro-split', 'C', 4, 'back-extension',             3, 12, 15, null),
  ('bro-split', 'C', 5, 'rear-delt-fly',              3, 15, 20, null),
  ('bro-split', 'C', 6, 'incline-db-curl',            3, 10, 12, null),
  ('bro-split', 'C', 7, 'hammer-curl',                3, 10, 12, null),

  ('bro-split', 'D', 1, 'seated-ohp',                 4,  6, 10, null),
  ('bro-split', 'D', 2, 'db-lateral-raise',           4, 12, 20, null),
  ('bro-split', 'D', 3, 'machine-incline-press',      3, 10, 12, null),
  ('bro-split', 'D', 4, 'leg-press-or-split-squat',   3, 10, 12, '~80% of Wednesday'),
  ('bro-split', 'D', 5, 'seated-leg-curl',            3, 10, 12, '~80% of Wednesday'),
  ('bro-split', 'D', 6, 'hanging-leg-raise',          3, 10, 15, null),

  ('ppl', 'Pu', 1, 'barbell-bench-press',              4,  6,  8, null),
  ('ppl', 'Pu', 2, 'seated-ohp',                       3,  8, 10, null),
  ('ppl', 'Pu', 3, 'incline-db-press',                 3,  8, 12, null),
  ('ppl', 'Pu', 4, 'db-lateral-raise',                 4, 12, 20, null),
  ('ppl', 'Pu', 5, 'overhead-cable-triceps-ext',       3, 10, 12, null),
  ('ppl', 'Pu', 6, 'rope-pushdown',                    3, 12, 15, null),

  ('ppl', 'Pl', 1, 'pull-ups',                         4,  6, 10, null),
  ('ppl', 'Pl', 2, 'barbell-row',                      4,  8, 10, null),
  ('ppl', 'Pl', 3, 'lat-pulldown',                     3, 10, 12, null),
  ('ppl', 'Pl', 4, 'rear-delt-fly',                    3, 15, 20, null),
  ('ppl', 'Pl', 5, 'incline-db-curl',                  3, 10, 12, null),
  ('ppl', 'Pl', 6, 'hammer-curl',                      3, 10, 12, null),

  ('ppl', 'Lg', 1, 'squat',                            4,  6,  8, null),
  ('ppl', 'Lg', 2, 'barbell-rdl',                      3,  8, 10, null),
  ('ppl', 'Lg', 3, 'leg-press',                        3, 10, 12, null),
  ('ppl', 'Lg', 4, 'seated-leg-curl',                  3, 10, 12, null),
  ('ppl', 'Lg', 5, 'standing-calf-raise',              4, 10, 15, null),
  ('ppl', 'Lg', 6, 'hanging-leg-raise',                3, 10, 15, null),

  ('upper-lower', 'U', 1, 'barbell-bench-press',       4,  6,  8, null),
  ('upper-lower', 'U', 2, 'barbell-row',               4,  6, 10, null),
  ('upper-lower', 'U', 3, 'seated-ohp',                3,  8, 10, null),
  ('upper-lower', 'U', 4, 'lat-pulldown',              3, 10, 12, null),
  ('upper-lower', 'U', 5, 'db-lateral-raise',          3, 12, 20, null),
  ('upper-lower', 'U', 6, 'incline-db-curl',           3, 10, 12, null),
  ('upper-lower', 'U', 7, 'rope-pushdown',             3, 12, 15, null),

  ('upper-lower', 'L', 1, 'squat',                     4,  6,  8, null),
  ('upper-lower', 'L', 2, 'barbell-rdl',               3,  8, 10, null),
  ('upper-lower', 'L', 3, 'leg-press',                 3, 10, 12, null),
  ('upper-lower', 'L', 4, 'seated-leg-curl',           3, 10, 12, null),
  ('upper-lower', 'L', 5, 'standing-calf-raise',       4, 10, 15, null),
  ('upper-lower', 'L', 6, 'hanging-leg-raise',         3, 10, 15, null),

  ('full-body', 'A', 1, 'squat',                       3,  6,  8, null),
  ('full-body', 'A', 2, 'barbell-bench-press',         3,  6,  8, null),
  ('full-body', 'A', 3, 'barbell-row',                 3,  8, 10, null),
  ('full-body', 'A', 4, 'db-lateral-raise',            3, 12, 20, null),
  ('full-body', 'A', 5, 'incline-db-curl',             3, 10, 12, null),

  ('full-body', 'B', 1, 'barbell-rdl',                 3,  8, 10, null),
  ('full-body', 'B', 2, 'seated-ohp',                  3,  8, 10, null),
  ('full-body', 'B', 3, 'pull-ups',                    3,  6, 10, null),
  ('full-body', 'B', 4, 'leg-extension',               3, 12, 15, null),
  ('full-body', 'B', 5, 'rope-pushdown',               3, 12, 15, null),

  ('full-body', 'C', 1, 'leg-press',                   3, 10, 12, null),
  ('full-body', 'C', 2, 'incline-db-press',            3,  8, 12, null),
  ('full-body', 'C', 3, 'lat-pulldown',                3, 10, 12, null),
  ('full-body', 'C', 4, 'seated-leg-curl',             3, 10, 12, null),
  ('full-body', 'C', 5, 'hammer-curl',                 3, 10, 12, null),
  ('full-body', 'C', 6, 'standing-calf-raise',         3, 10, 15, null)
) as x (slug, code, position, exercise_id, base_sets, rep_low, rep_high, note)
join programs p on p.slug = x.slug
join program_days d on d.program_id = p.id and d.code = x.code;

-- The default week offered when choosing a template (1 = Monday … 7 = Sunday). Users change theirs.
delete from program_schedule where program_id in (select id from programs where user_id is null);

insert into program_schedule (program_id, weekday, day_id)
select p.id, w.weekday, d.id
from (values
  ('bro-split', 1, 'A'),
  ('bro-split', 3, 'B'),
  ('bro-split', 5, 'C'),
  ('bro-split', 6, 'D'),
  ('ppl', 1, 'Pu'),
  ('ppl', 2, 'Pl'),
  ('ppl', 3, 'Lg'),
  ('ppl', 4, 'Pu'),
  ('ppl', 5, 'Pl'),
  ('ppl', 6, 'Lg'),
  ('upper-lower', 1, 'U'),
  ('upper-lower', 2, 'L'),
  ('upper-lower', 4, 'U'),
  ('upper-lower', 5, 'L'),
  ('full-body', 1, 'A'),
  ('full-body', 3, 'B'),
  ('full-body', 5, 'C')
) as w (slug, weekday, code)
join programs p on p.slug = w.slug
join program_days d on d.program_id = p.id and d.code = w.code;
