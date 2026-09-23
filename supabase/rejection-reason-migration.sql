-- Run this once in the Supabase SQL Editor for the connected project.
-- The existing one-argument reject_visitor function remains available.

create or replace function public.reject_visitor(
  p_id uuid,
  p_rejection_reason text
)
returns public.visitor_registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  rejected public.visitor_registrations;
begin
  if public.auth_account_type() <> 'guard' then
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
$$;

revoke all on function public.reject_visitor(uuid, text) from public;
grant execute on function public.reject_visitor(uuid, text) to authenticated;