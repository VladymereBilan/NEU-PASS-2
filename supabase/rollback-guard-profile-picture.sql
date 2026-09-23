-- Run once in the Supabase SQL Editor.
-- Reverses supabase/guard-profile-picture-migration.sql — removes the guard
-- profile-picture feature (avatar_path column, profile-avatars bucket + its
-- RLS policies, update_own_guard_avatar RPC). Nothing in admin-web or the
-- mobile app references any of these anymore (confirmed via repo-wide grep),
-- so this is safe to run.

drop policy if exists "Guards can upload their own profile picture" on storage.objects;
drop policy if exists "Guards can update their own profile picture" on storage.objects;
drop policy if exists "Guards can read their own profile picture" on storage.objects;

drop function if exists public.update_own_guard_avatar(text);

-- Removes the object metadata rows for this bucket. If any guard actually
-- uploaded a picture, this deletes their file's row; the underlying blob in
-- storage is removed too when the bucket itself is deleted below via the
-- storage API's cascade — if you instead prefer to confirm blobs are gone
-- from the object store, delete the bucket from the Supabase Dashboard's
-- Storage UI (Storage → profile-avatars → Delete bucket) instead of/after
-- running the two statements below, since the dashboard guarantees the
-- underlying files are purged, not just their metadata rows.
delete from storage.objects where bucket_id = 'profile-avatars';
delete from storage.buckets where id = 'profile-avatars';

alter table public.profiles drop column if exists avatar_path;
