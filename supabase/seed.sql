-- The training program. This file is the program editor: change it here,
-- then re-run it. Every statement is an upsert so it is safe to re-run
-- against a database that already holds logged sessions.

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
  ('single-arm-db-row',          'Single-arm DB row',                'dumbbell_per_hand', 2.5),
  ('rear-delt-fly',              'Rear delt fly',                    'machine',           2.5),
  ('incline-db-curl',            'Incline DB curl',                  'dumbbell_per_hand', 1.0),
  ('hammer-curl',                'Hammer curl',                      'dumbbell_per_hand', 1.0),
  -- Day D (seated-leg-curl is shared with Day B)
  ('seated-ohp',                 'Seated OHP',                       'barbell',           2.5),
  ('db-lateral-raise',           'DB lateral raise',                 'dumbbell_per_hand', 1.0),
  ('machine-incline-press',      'Machine / incline press',          'machine',           2.5),
  ('leg-press-or-split-squat',   'Leg press or split squat',         'machine',           2.5),
  ('hanging-leg-raise',          'Hanging leg raise / cable crunch', 'bodyweight_plus',   2.5)
on conflict (id) do update set
  name         = excluded.name,
  load_type    = excluded.load_type,
  increment_kg = excluded.increment_kg;

insert into program_days (code, name, weekday) values
  ('A', 'Chest + Triceps',              1),
  ('B', 'Legs',                         3),
  ('C', 'Back + Biceps',                5),
  ('D', 'Shoulders + Upper/Lower',      6)
on conflict (code) do update set
  name    = excluded.name,
  weekday = excluded.weekday;

-- Nothing references program_exercises.id, so the prescription is simply
-- replaced wholesale.
delete from program_exercises;

insert into program_exercises (day_code, position, exercise_id, base_sets, rep_low, rep_high, note) values
  ('A', 1, 'incline-db-press',           4,  8, 10, null),
  ('A', 2, 'flat-db-press',              3, 10, 12, null),
  ('A', 3, 'dips',                       3,  8, 12, null),
  ('A', 4, 'cable-fly',                  3, 12, 15, null),
  ('A', 5, 'overhead-cable-triceps-ext', 3, 10, 12, null),
  ('A', 6, 'rope-pushdown',              3, 12, 15, null),

  ('B', 1, 'squat',                      4,  6,  8, null),
  ('B', 2, 'leg-press',                  4, 10, 12, null),
  ('B', 3, 'barbell-rdl',                3,  8, 10, null),
  ('B', 4, 'seated-leg-curl',            3, 10, 12, null),
  ('B', 5, 'leg-extension',              3, 12, 15, null),
  ('B', 6, 'standing-calf-raise',        4, 10, 15, null),

  ('C', 1, 'pull-ups',                   4,  6, 10, null),
  ('C', 2, 'chest-supported-row',        4, 10, 12, null),
  ('C', 3, 'lat-pulldown',               3, 10, 12, null),
  ('C', 4, 'single-arm-db-row',          3, 10, 12, null),
  ('C', 5, 'rear-delt-fly',              3, 15, 20, null),
  ('C', 6, 'incline-db-curl',            3, 10, 12, null),
  ('C', 7, 'hammer-curl',                3, 10, 12, null),

  ('D', 1, 'seated-ohp',                 4,  6, 10, null),
  ('D', 2, 'db-lateral-raise',           4, 12, 20, null),
  ('D', 3, 'machine-incline-press',      3, 10, 12, null),
  ('D', 4, 'leg-press-or-split-squat',   3, 10, 12, '~80% of Wednesday'),
  ('D', 5, 'seated-leg-curl',            3, 10, 12, '~80% of Wednesday'),
  ('D', 6, 'hanging-leg-raise',          3, 10, 15, null);

-- Monday of the current block's week 1. Only set on first seed; change it
-- later with: update settings set block_start_date = 'YYYY-MM-DD';
insert into settings (id, block_start_date) values (true, '2026-09-28')
on conflict (id) do nothing;
