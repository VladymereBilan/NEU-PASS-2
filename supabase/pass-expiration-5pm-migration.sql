-- Adviser-directed change (2026-10-23): Registrar/Cashier-adjacent purposes
-- now expire at exactly 5:00 PM rather than 4:45 PM. The 15-minute warning
-- that used to be baked into the cutoff itself is now delivered as an actual
-- alert instead (send-expiration-reminder-emails / send-expiration-reminders
-- both fire ~15 min before expiration_time, so these land at 4:45 PM and
-- 5:45 PM respectively) — the pass itself stays valid right up to the
-- office's real 5:00 PM hard deadline.
--
-- Inquiries/Others keep their 6:00 PM cutoff. 6:00 PM is therefore the latest
-- any pass can be valid, which is what the 6:00 PM–7:00 AM registration
-- closure in the visitor web flow is aligned to.
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
  if auth_account_type() <> 'guard' or
     (select account_status from profiles where id = auth.uid()) <> 'Active' then
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
