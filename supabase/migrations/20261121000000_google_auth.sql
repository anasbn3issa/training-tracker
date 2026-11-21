-- Sign in with Google: anyone can sign up, existing users keep their id (and data).
-- Existing users get linked by setting their email once, by hand, outside the repo:
--   update users set email = lower('<gmail>') where id = 'anas';
-- Their first Google sign-in with that (verified) email then claims the row.
alter table users add column email text unique check (email = lower(email));
alter table users add column google_sub text unique; -- Google's stable account id

-- New users start their block on the Monday of the week they sign up (date_trunc('week') is Monday).
alter table users alter column block_start_date set default date_trunc('week', now())::date;
