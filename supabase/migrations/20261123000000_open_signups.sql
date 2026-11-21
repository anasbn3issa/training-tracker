-- Open sign-ups: block one account without logging everyone out, and delete an account with all its data.

-- Set by hand to block someone: update users set disabled_at = now() where id = '<id>';
-- Their cookie stops working on the next request, and Google sign-in refuses them.
alter table users add column disabled_at timestamptz;

-- Deletes a user and everything they own, in one transaction. Nothing references users with
-- "on delete cascade", so children go first: sessions (their set_logs cascade), runs, then the
-- user's program copies, their days, exercises and weeks. Templates (user_id null) are never touched.
create function delete_user(p_user text) returns void
language plpgsql as $$
begin
  delete from sessions where user_id = p_user;
  delete from runs where user_id = p_user;
  delete from program_schedule where program_id in (select id from programs where user_id = p_user);
  delete from program_exercises where day_id in (
    select d.id from program_days d join programs p on p.id = d.program_id where p.user_id = p_user
  );
  delete from program_days where program_id in (select id from programs where user_id = p_user);
  delete from programs where user_id = p_user;
  delete from users where id = p_user;
end;
$$;

revoke execute on function delete_user(text) from public, anon, authenticated;
