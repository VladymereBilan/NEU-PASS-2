-- Run once in the Supabase SQL Editor.
-- Reverses supabase/guard-profile-picture-migration.sql — removes the guard
-- profile-picture feature (avatar_path column, profile-avatars bucket + its
-- RLS policies, update_own_guard_avatar RPC). Nothing in admin-web or the
-- mobile app references any of these anymore (confirmed via repo-wide grep),
-- so this is safe to run.
--
-- NOTE: storage.objects/storage.buckets are protected against direct SQL
-- DELETE (Supabase raises 42501 "Use the Storage API instead" via a
-- storage.protect_delete() trigger). So this script only handles the
-- policies/function/column below — delete the profile-avatars bucket itself
-- from the Dashboard instead: Storage → profile-avatars → "..." → Delete
-- bucket. That goes through the Storage API, which both empties and removes
-- it correctly (and works even if it's empty — no guard ever uploaded one).

drop policy if exists "Guards can upload their own profile picture" on storage.objects;
drop policy if exists "Guards can update their own profile picture" on storage.objects;
drop policy if exists "Guards can read their own profile picture" on storage.objects;

drop function if exists public.update_own_guard_avatar(text);

alter table public.profiles drop column if exists avatar_path;
