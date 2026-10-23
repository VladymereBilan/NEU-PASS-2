-- Daily 7:00 AM reset (2026-10-23).
--
-- The gate's registration window closes at 6:00 PM and reopens at 7:00 AM
-- (see isGateRegistrationOpen() in admin-web). Anything still 'Pending' when
-- the new day opens is a registration no guard ever got to — it can never be
-- usefully approved now (its pass would be stamped with yesterday's
-- business), and while it sits Pending it also blocks that visitor's
-- anonymous session from ever starting a new registration, because
-- app/visit/(register)/layout.tsx redirects any session with a Pending/Active
-- row to /visit/status.
--
-- So at 7:00 AM Manila those rows are closed out as 'Rejected' with an
-- explicit reason rather than deleted — the record (and its audit trail)
-- stays, the visitor is simply free to register again.
--
-- Deliberately does NOT touch 'Active' rows. A visitor who never checked out
-- is a real person who may still be on campus; the guard app already surfaces
-- them as "Overdue" (ExpirationService.isOverdue, 30-min grace) in
-- active-visitors.tsx / checkout.tsx / home.tsx. Auto-completing their
-- checkout here would invent a time_out that never happened.
create or replace function public.expire_stale_pending_registrations()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_cutoff timestamptz;
  v_count integer;
begin
  -- Today's 7:00 AM Manila. Using an absolute cutoff rather than now() keeps
  -- this idempotent: re-running it at any later hour of the same day still
  -- only sweeps rows from *before* today's opening, never today's own
  -- registrations.
  v_cutoff := (date_trunc('day', now() at time zone 'Asia/Manila') + interval '7 hours')
                at time zone 'Asia/Manila';

  update visitor_registrations
  set registration_status = 'Rejected',
      rejection_reason = 'Expired — not approved before the gate closed. Cleared by the daily 7:00 AM reset.',
      qr_status = 'Inactive'
  where registration_status = 'Pending'
    and created_at < v_cutoff;

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

-- SECURITY DEFINER + bypasses RLS, so it must not be reachable by a visitor's
-- anonymous session. Postgres grants EXECUTE to PUBLIC by default — revoke it
-- and hand it only to the roles that actually run it.
revoke all on function public.expire_stale_pending_registrations() from public;
revoke all on function public.expire_stale_pending_registrations() from anon, authenticated;
grant execute on function public.expire_stale_pending_registrations() to service_role;

-- pg_cron schedules in UTC; Manila is UTC+8 year-round (no DST), so
-- 23:00 UTC == 07:00 the next day in Manila.
select cron.schedule(
  'expire-stale-pending-registrations',
  '0 23 * * *',
  $cron$ select public.expire_stale_pending_registrations(); $cron$
);
