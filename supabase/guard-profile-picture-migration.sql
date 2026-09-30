-- Run once in the Supabase SQL Editor.
-- Allows a signed-in guard to update only their own avatar path.

drop function if exists public.update_own_guard_profile(text, text);

alter table public.profiles
  add column if not exists avatar_path text;

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', false)
on conflict (id) do nothing;

create policy "Guards can upload their own profile picture"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.auth_account_type() = 'guard'
);

create policy "Guards can update their own profile picture"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.auth_account_type() = 'guard'
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.auth_account_type() = 'guard'
);

create policy "Guards can read their own profile picture"
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.auth_account_type() = 'guard'
);

create or replace function public.update_own_guard_avatar(p_avatar_path text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if public.auth_account_type() <> 'guard' then
    raise exception 'Only guards can update this profile picture';
  end if;

  update public.profiles
  set avatar_path = p_avatar_path
  where id = auth.uid()
    and account_type = 'guard'
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Guard profile not found';
  end if;

  return updated_profile;
end;
$$;

revoke all on function public.update_own_guard_avatar(text) from public;
grant execute on function public.update_own_guard_avatar(text) to authenticated;