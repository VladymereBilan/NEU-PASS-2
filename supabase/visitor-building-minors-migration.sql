-- Run once via `npx supabase db query --linked --file supabase/visitor-building-minors-migration.sql`
-- (Supabase MCP is unauthorized in this environment — CLI is the working fallback).
-- Adds which physical gate (MAIN/SOM/PSB) a registration is for, captured from
-- which gate's QR code the visitor scanned (see buildVisitorQrValue's sibling,
-- the per-station entry URL in admin-web/app/visit/(register)/page.tsx) rather
-- than a visitor-editable dropdown. Also adds a headcount-only accompanying
-- minors field — deliberately no name-capture column, see CLAUDE.md/project
-- memory on why (Data Privacy Act, minors can't consent, no operational need
-- for identity over headcount).

alter table public.visitor_registrations
  add column if not exists building text not null default 'MAIN',
  add column if not exists accompanying_minors smallint not null default 0;

alter table public.visitor_registrations
  drop constraint if exists visitor_registrations_building_check,
  add constraint visitor_registrations_building_check
    check (building in ('SOM', 'PSB', 'MAIN')),
  drop constraint if exists visitor_registrations_accompanying_minors_check,
  add constraint visitor_registrations_accompanying_minors_check
    check (accompanying_minors between 0 and 5);
