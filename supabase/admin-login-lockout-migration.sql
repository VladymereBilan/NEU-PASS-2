-- Persistent admin login lockout.
--
-- admin-web's adminLogin Server Action used to track failed attempts in an
-- in-memory Map, which doesn't survive on Vercel (serverless instances don't
-- share memory and get recycled), so the 5-attempt lockout was bypassable.
-- This moves that state into Postgres, mirroring what guard_login_attempt
-- does for the guard app (5 attempts -> 30 second lockout).
--
-- Only admin-web's service_role client ever calls these: the table has RLS
-- enabled with no policies, and the functions are not granted to anon or
-- authenticated.

create table if not exists public.admin_login_attempts (
  username_key    text primary key,
  failed_count    integer     not null default 0,
  locked_until    timestamptz,
  last_attempt_at timestamptz not null default now()
);

alter table public.admin_login_attempts enable row level security;
revoke all on public.admin_login_attempts from anon, authenticated;

-- Returns locked_until if this username is currently locked out, else null.
create or replace function public.admin_login_check(p_key text)
returns timestamptz
language sql
security definer
set search_path = public
as $$
  select locked_until
  from public.admin_login_attempts
  where username_key = p_key
    and locked_until is not null
    and locked_until > now();
$$;

-- Records one failed attempt atomically. Counts reset if the last failure was
-- more than 5 minutes ago. Returns locked_until when this failure triggers
-- (or lands inside) a lockout, else null.
create or replace function public.admin_login_record_failure(
  p_key text,
  p_max_attempts integer default 5,
  p_lockout_seconds integer default 30
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.admin_login_attempts;
begin
  insert into public.admin_login_attempts as t (username_key, failed_count, last_attempt_at)
  values (p_key, 1, now())
  on conflict (username_key) do update
    set failed_count = case
          when t.last_attempt_at < now() - interval '5 minutes' then 1
          else t.failed_count + 1
        end,
        last_attempt_at = now()
  returning * into v_row;

  if v_row.failed_count >= p_max_attempts then
    update public.admin_login_attempts
       set failed_count = 0,
           locked_until = now() + make_interval(secs => p_lockout_seconds)
     where username_key = p_key
    returning locked_until into v_row.locked_until;
    return v_row.locked_until;
  end if;

  return null;
end;
$$;

-- Clears the counter after a successful sign-in.
create or replace function public.admin_login_reset(p_key text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.admin_login_attempts where username_key = p_key;
$$;

revoke all on function public.admin_login_check(text) from public, anon, authenticated;
revoke all on function public.admin_login_record_failure(text, integer, integer) from public, anon, authenticated;
revoke all on function public.admin_login_reset(text) from public, anon, authenticated;

grant execute on function public.admin_login_check(text) to service_role;
grant execute on function public.admin_login_record_failure(text, integer, integer) to service_role;
grant execute on function public.admin_login_reset(text) to service_role;
