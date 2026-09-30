-- Add visitor context for the destination building and accompanying children.
alter table public.visitor_registrations
  add column if not exists building text,
  add column if not exists children_included smallint not null default 0,
  add column if not exists children_names text not null default '';

alter table public.visitor_registrations
  drop constraint if exists visitor_registrations_building_check,
  add constraint visitor_registrations_building_check
    check (building is null or building in ('SOM', 'PSB', 'MAIN')),
  drop constraint if exists visitor_registrations_children_included_check,
  add constraint visitor_registrations_children_included_check
    check (children_included between 0 and 5);