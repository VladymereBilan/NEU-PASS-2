-- Security fix (2026-10-23): the role guard in every visitor-state RPC was
-- bypassable by a caller with no profile row.
--
-- The guards were written as:
--     if auth_account_type() <> 'guard' then raise exception ...
--
-- For an unauthenticated caller auth.uid() is null, so auth_account_type()
-- returns NULL, and `NULL <> 'guard'` evaluates to NULL — not TRUE. PL/pgSQL
-- treats a NULL condition as false, so the IF never fired and execution fell
-- straight through to the UPDATE. Because these are SECURITY DEFINER they
-- also bypass RLS, so the write succeeded.
--
-- Verified exploitable before this fix: `set role anon` followed by
-- reject_visitor_with_reason(<pending id>, '...') rejected the registration.
-- Only reject_visitor(uuid,text) and reject_visitor_with_reason had EXECUTE
-- granted to `anon`, so only those two were reachable unauthenticated; the
-- rest carried the same latent flaw behind an authenticated-only grant.
--
-- Fix is twofold: make every guard NULL-safe with IS DISTINCT FROM (NULL IS
-- DISTINCT FROM 'guard' is TRUE, so the exception fires), and drop the anon
-- EXECUTE grants, since guards always call these with a real session.

-- 1. approve_visitor ------------------------------------------------------
create or replace function public.approve_visitor(p_id uuid)
returns visitor_registrations
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row visitor_registrations;
  v_expiration timestamptz;
begin
  if auth_account_type() is distinct from 'guard'::account_type or
     (select account_status from profiles where id = auth.uid()) is distinct from 'Active' then
    raise exception 'Only an active guard can approve a visitor.';
  end if;

  select * into v_row from visitor_registrations where id = p_id;
  if not found then
    raise exception 'Visitor registration not found.';
  end if;

  -- Registrar/Cashier-adjacent purposes: those offices close at 4:00 PM but
  -- process paperwork until 5:00 PM, so the pass stays valid to 5:00 PM.
  -- Inquiries/Others run to 6:00 PM.
  v_expiration := (date_trunc('day', now() at time zone 'Asia/Manila') +
                   (case when v_row.purpose_of_visit in ('Enrollment','Tuition Fee Payment','Other Payments')
                         then interval '17 hours'
                         else interval '18 hours' end)
                  ) at time zone 'Asia/Manila';

  update visitor_registrations
  set registration_status = 'Active',
      time_in = now(),
      visitor_pass_number = 'VP-' || lpad(nextval('visitor_pass_seq')::text, 3, '0'),
      expiration_time = v_expiration,
      qr_status = 'Active',
      checkout_status = 'None',
      checkout_requested_at = null,
      time_out = null,
      face_checkout_verification_status = null
  where id = p_id
  returning * into v_row;

  return v_row;
end;
$function$;

-- 2. reject_visitor(uuid) -------------------------------------------------
create or replace function public.reject_visitor(p_id uuid)
returns visitor_registrations
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row visitor_registrations;
begin
  if auth_account_type() is distinct from 'guard'::account_type or
     (select account_status from profiles where id = auth.uid()) is distinct from 'Active' then
    raise exception 'Only an active guard can reject a visitor.';
  end if;

  update visitor_registrations
  set registration_status = 'Rejected'
  where id = p_id
  returning * into v_row;

  if not found then
    raise exception 'Visitor registration not found.';
  end if;

  return v_row;
end;
$function$;

-- 3. reject_visitor(uuid, text) ------------------------------------------
create or replace function public.reject_visitor(p_id uuid, p_rejection_reason text)
returns visitor_registrations
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  rejected public.visitor_registrations;
begin
  if public.auth_account_type() is distinct from 'guard'::account_type then
    raise exception 'Only guards can reject visitors';
  end if;

  update public.visitor_registrations
  set
    registration_status = 'Rejected',
    rejection_reason = nullif(trim(p_rejection_reason), ''),
    qr_status = 'Inactive'
  where id = p_id
    and registration_status = 'Pending'
  returning * into rejected;

  if rejected.id is null then
    raise exception 'Pending visitor registration not found';
  end if;

  return rejected;
end;
$function$;

-- 4. reject_visitor_with_reason ------------------------------------------
create or replace function public.reject_visitor_with_reason(p_id uuid, p_reason text)
returns visitor_registrations
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row visitor_registrations;
begin
  if auth_account_type() is distinct from 'guard'::account_type then
    raise exception 'Only guards can reject a visitor registration.';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A rejection reason is required.';
  end if;

  update visitor_registrations
  set registration_status = 'Rejected',
      rejection_reason = btrim(p_reason),
      qr_status = 'Inactive'
  where id = p_id
    and registration_status = 'Pending'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Visitor registration not found or not pending.';
  end if;

  return v_row;
end;
$function$;

-- 5. complete_checkout ----------------------------------------------------
create or replace function public.complete_checkout(p_id uuid, p_face_status face_checkout_verification_status)
returns visitor_registrations
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row visitor_registrations;
begin
  if auth_account_type() is distinct from 'guard'::account_type or
     (select account_status from profiles where id = auth.uid()) is distinct from 'Active' then
    raise exception 'Only an active guard can complete a checkout.';
  end if;

  update visitor_registrations
  set checkout_status = 'Completed',
      registration_status = 'Completed',
      time_out = now(),
      qr_status = 'Used/Invalid',
      face_checkout_verification_status = p_face_status
  where id = p_id
  returning * into v_row;

  if not found then
    raise exception 'Visitor registration not found.';
  end if;

  return v_row;
end;
$function$;

-- 6. Drop the anon EXECUTE grants ----------------------------------------
-- Guards always hold a real Supabase session (role `authenticated`), so no
-- legitimate caller of these is anonymous. These two were the only ones that
-- had ever been reachable without signing in.
-- reject_visitor_with_reason still carried Postgres's default PUBLIC EXECUTE
-- grant (visible as `=X/postgres` in proacl), which is what `anon` inherited —
-- revoking from `anon` alone does not remove it, so revoke PUBLIC too.
revoke all on function public.reject_visitor(p_id uuid, p_rejection_reason text) from public, anon;
revoke all on function public.reject_visitor_with_reason(p_id uuid, p_reason text) from public, anon;
grant execute on function public.reject_visitor(p_id uuid, p_rejection_reason text) to authenticated;
grant execute on function public.reject_visitor_with_reason(p_id uuid, p_reason text) to authenticated;
